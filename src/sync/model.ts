// ============================================================================
// SYNC-DATENMODELL
// ----------------------------------------------------------------------------
// Der App-State (AppData) bleibt unverändert, damit die UI nicht umgebaut werden
// muss. Für den Sync wird er in einzelne "Records" zerlegt (ein Record pro
// Mahlzeit, Habit-Haken, Gewichtswert, Favorit ...). Jeder Record hat einen
// Zeitstempel; Löschungen werden als Tombstone gemerkt. Beim Zusammenführen
// gewinnt pro Record die jüngere Änderung.
// ============================================================================

export type Id = string;

export interface Targets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  weight: number | null;
  [key: string]: unknown;
}

export interface ListItem {
  id: Id;
  [key: string]: unknown;
}

export interface AppData {
  targets: Targets;
  favorites: ListItem[];
  savedMeals: ListItem[];
  habits: ListItem[];
  logsByDate: Record<string, ListItem[]>;
  habitChecksByDate: Record<string, Record<Id, boolean>>;
  weightsByDate: Record<string, number>;
}

/** t = Zeitpunkt der letzten Änderung (ms), d = gelöscht */
export interface RecordMeta {
  t: number;
  d?: 1;
}

export type FlatRecords = Record<string, unknown>;
export type MetaMap = Record<string, RecordMeta>;

export interface SyncState {
  records: FlatRecords;
  meta: MetaMap;
}

const SEP = '|';
const LIST_KINDS = [
  ['fav', 'favorites'],
  ['smeal', 'savedMeals'],
  ['habit', 'habits'],
] as const;

/** Tombstones älter als das werden beim Merge verworfen. */
export const TOMBSTONE_TTL_MS = 180 * 24 * 60 * 60 * 1000;

// ----------------------------------------------------------------------------
// AppData <-> Records
// ----------------------------------------------------------------------------

export function flatten(data: AppData): FlatRecords {
  const out: FlatRecords = {};
  out.targets = data.targets;

  for (const [prefix, field] of LIST_KINDS) {
    const list = Array.isArray(data[field]) ? data[field] : [];
    const order: Id[] = [];
    for (const item of list) {
      if (!item || typeof item.id !== 'string') continue;
      const key = `${prefix}${SEP}${item.id}`;
      if (key in out) continue;
      out[key] = item;
      order.push(item.id);
    }
    out[`ord${SEP}${field}`] = order;
  }

  for (const [date, entries] of Object.entries(data.logsByDate || {})) {
    if (!Array.isArray(entries) || entries.length === 0) continue;
    const order: Id[] = [];
    for (const entry of entries) {
      if (!entry || typeof entry.id !== 'string') continue;
      const key = `log${SEP}${date}${SEP}${entry.id}`;
      if (key in out) continue;
      out[key] = entry;
      order.push(entry.id);
    }
    if (order.length > 0) out[`ord${SEP}log${SEP}${date}`] = order;
  }

  for (const [date, checks] of Object.entries(data.habitChecksByDate || {})) {
    if (!checks || typeof checks !== 'object') continue;
    for (const [habitId, value] of Object.entries(checks)) {
      // "false" und "nicht vorhanden" sind gleichbedeutend -> nur true speichern
      if (value === true) out[`chk${SEP}${date}${SEP}${habitId}`] = true;
    }
  }

  for (const [date, weight] of Object.entries(data.weightsByDate || {})) {
    if (typeof weight === 'number' && Number.isFinite(weight)) out[`w${SEP}${date}`] = weight;
  }

  return out;
}

function orderedList(items: Map<Id, ListItem>, order: unknown): ListItem[] {
  const result: ListItem[] = [];
  const seen = new Set<Id>();
  if (Array.isArray(order)) {
    for (const id of order) {
      const item = items.get(id);
      if (item && !seen.has(id)) {
        result.push(item);
        seen.add(id);
      }
    }
  }
  // Einträge, die (noch) nicht in der Reihenfolge stehen, hinten anhängen
  const rest = [...items.entries()]
    .filter(([id]) => !seen.has(id))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, item]) => item);
  return result.concat(rest);
}

export function unflatten(records: FlatRecords, defaultTargets: Targets): AppData {
  const lists: Record<string, Map<Id, ListItem>> = {
    favorites: new Map(),
    savedMeals: new Map(),
    habits: new Map(),
  };
  const logs: Record<string, Map<Id, ListItem>> = {};
  const habitChecksByDate: AppData['habitChecksByDate'] = {};
  const weightsByDate: AppData['weightsByDate'] = {};
  let targets: Targets = { ...defaultTargets };

  for (const [key, value] of Object.entries(records)) {
    const parts = key.split(SEP);
    const kind = parts[0];
    if (key === 'targets') {
      targets = { ...defaultTargets, ...(value as Targets) };
    } else if (kind === 'ord') {
      continue;
    } else if (kind === 'log' && parts.length >= 3) {
      const date = parts[1];
      (logs[date] ||= new Map()).set(parts.slice(2).join(SEP), value as ListItem);
    } else if (kind === 'chk' && parts.length >= 3) {
      const date = parts[1];
      (habitChecksByDate[date] ||= {})[parts.slice(2).join(SEP)] = true;
    } else if (kind === 'w' && parts.length === 2) {
      weightsByDate[parts[1]] = value as number;
    } else {
      const listKind = LIST_KINDS.find(([prefix]) => prefix === kind);
      if (listKind) lists[listKind[1]].set(parts.slice(1).join(SEP), value as ListItem);
    }
  }

  const logsByDate: AppData['logsByDate'] = {};
  for (const [date, items] of Object.entries(logs)) {
    logsByDate[date] = orderedList(items, records[`ord${SEP}log${SEP}${date}`]);
  }

  return {
    targets,
    favorites: orderedList(lists.favorites, records[`ord${SEP}favorites`]),
    savedMeals: orderedList(lists.savedMeals, records[`ord${SEP}savedMeals`]),
    habits: orderedList(lists.habits, records[`ord${SEP}habits`]),
    logsByDate,
    habitChecksByDate,
    weightsByDate,
  };
}

// ----------------------------------------------------------------------------
// Änderungen erkennen
// ----------------------------------------------------------------------------

function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Vergleicht zwei Record-Stände und stempelt alle geänderten, neuen und
 * gelöschten Records mit `now`. Gibt null zurück, wenn sich nichts geändert hat.
 */
export function trackChanges(
  prev: FlatRecords,
  next: FlatRecords,
  meta: MetaMap,
  now: number
): MetaMap | null {
  let changed = false;
  const out: MetaMap = { ...meta };
  for (const [key, value] of Object.entries(next)) {
    if (!(key in prev) || !same(prev[key], value)) {
      out[key] = { t: now };
      changed = true;
    }
  }
  for (const key of Object.keys(prev)) {
    if (!(key in next)) {
      out[key] = { t: now, d: 1 };
      changed = true;
    }
  }
  return changed ? out : null;
}

/** Meta für Daten ohne Historie (Migration aus Version 1): alles mit t = 0. */
export function initialMeta(records: FlatRecords): MetaMap {
  const meta: MetaMap = {};
  for (const key of Object.keys(records)) meta[key] = { t: 0 };
  return meta;
}

// ----------------------------------------------------------------------------
// Zusammenführen
// ----------------------------------------------------------------------------

export interface MergeOptions {
  now: number;
  /**
   * Frisch installiertes Gerät: lokale Records ohne echte Änderung (t = 0, also
   * nur Standardwerte) werden verworfen, wenn sie in Drive fehlen.
   */
  dropUntrackedLocal?: boolean;
}

export function merge(local: SyncState, remote: SyncState, opts: MergeOptions): SyncState {
  const records: FlatRecords = {};
  const meta: MetaMap = {};
  const keys = new Set([
    ...Object.keys(local.meta),
    ...Object.keys(local.records),
    ...Object.keys(remote.meta),
    ...Object.keys(remote.records),
  ]);

  for (const key of keys) {
    const lm = local.meta[key] ?? (key in local.records ? { t: 0 } : undefined);
    const rm = remote.meta[key] ?? (key in remote.records ? { t: 0 } : undefined);

    if (opts.dropUntrackedLocal && !rm && lm && lm.t === 0 && !lm.d) continue;

    let winner: 'local' | 'remote';
    if (!rm) winner = 'local';
    else if (!lm) winner = 'remote';
    else if (lm.t !== rm.t) winner = lm.t > rm.t ? 'local' : 'remote';
    // Gleichstand: Löschung gewinnt nicht automatisch – vorhandener Wert bleibt
    else if (lm.d && !rm.d) winner = 'remote';
    else if (rm.d && !lm.d) winner = 'local';
    else winner = 'remote';

    const winMeta = (winner === 'local' ? lm : rm)!;
    const winSource = winner === 'local' ? local.records : remote.records;
    const otherSource = winner === 'local' ? remote.records : local.records;

    if (winMeta.d) {
      if (opts.now - winMeta.t < TOMBSTONE_TTL_MS) meta[key] = { t: winMeta.t, d: 1 };
      continue;
    }

    const value = key in winSource ? winSource[key] : otherSource[key];
    if (value === undefined) continue;
    records[key] = value;
    meta[key] = { t: winMeta.t };
  }

  return { records, meta };
}

/** Prüft, ob zwei Record-Stände inhaltlich gleich sind (Werte und Tombstones). */
export function sameState(a: SyncState, b: SyncState): boolean {
  const aKeys = Object.keys(a.meta);
  if (aKeys.length !== Object.keys(b.meta).length) return false;
  for (const key of aKeys) {
    const am = a.meta[key];
    const bm = b.meta[key];
    if (!bm || am.t !== bm.t || Boolean(am.d) !== Boolean(bm.d)) return false;
  }
  const rKeys = Object.keys(a.records);
  if (rKeys.length !== Object.keys(b.records).length) return false;
  return rKeys.every((key) => key in b.records && same(a.records[key], b.records[key]));
}

// ----------------------------------------------------------------------------
// Dateiformat in Google Drive
// ----------------------------------------------------------------------------

export interface RemoteFileV2 {
  format: 'health-habit-tracker';
  version: 2;
  updatedAt: string;
  records: FlatRecords;
  meta: MetaMap;
}

export function toRemoteFile(state: SyncState): RemoteFileV2 {
  return {
    format: 'health-habit-tracker',
    version: 2,
    updatedAt: new Date().toISOString(),
    records: state.records,
    meta: state.meta,
  };
}

/**
 * Liest eine Sync-Datei. Version 1 (alte App: `{ version: 1, data }`) oder ein
 * nackter JSON-Export werden ohne Historie übernommen.
 */
export function fromRemoteFile(
  raw: unknown,
  normalize: (data: unknown) => AppData
): SyncState {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (obj.version === 2 && obj.records && obj.meta) {
      return { records: obj.records as FlatRecords, meta: obj.meta as MetaMap };
    }
    const data = normalize('data' in obj ? obj.data : obj);
    const records = flatten(data);
    return { records, meta: initialMeta(records) };
  }
  return { records: {}, meta: {} };
}
