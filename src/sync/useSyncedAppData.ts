// ============================================================================
// useSyncedAppData
// ----------------------------------------------------------------------------
// Hält den App-State, speichert ihn lokal (offline-first) und gleicht ihn mit
// Google Drive ab:
//   • beim Öffnen der App (Start oder Rückkehr aus dem Hintergrund)
//   • beim Schließen bzw. Verlassen (App geht in den Hintergrund)
//   • manuell per Button
// Ein Sync ist immer: Drive lesen → zusammenführen → hochladen → lokal anwenden.
// Ist das Google-Token (1 Std.) abgelaufen, zeigt die App einen Hinweis; ein
// Tipp darauf meldet neu an. Ungesyncte Änderungen bleiben markiert und werden
// beim nächsten erfolgreichen Sync übertragen.
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  flatten,
  unflatten,
  trackChanges,
  initialMeta,
  merge,
  sameState,
  toRemoteFile,
  fromRemoteFile,
  type AppData,
  type FlatRecords,
  type MetaMap,
  type SyncState,
  type Targets,
} from './model';
import {
  SYNC_FILE_NAME,
  DriveAuthError,
  loadToken,
  startGoogleSignIn,
  consumeOAuthRedirect,
  revokeToken,
  ensureFolder,
  findFile,
  getVersion,
  downloadJson,
  createJsonFile,
  updateJsonFile,
  dailyBackup,
  redirectUri,
} from './drive';

export type SyncStatus = 'off' | 'needs-auth' | 'syncing' | 'synced' | 'error' | 'hold';
export type HoldReason = 'reset' | 'import';
type Accent = 'emerald' | 'amber' | 'rose' | 'sky';

const SYNC_STATE_KEY = 'hht_sync_state_v2';
const SYNC_CONFIG_KEY = 'hht_sync_config_v2';
const LEGACY_GDRIVE_CONFIG_KEY = 'health_habit_gdrive_config_v1';
const SILENT_RETRY_MS = 10 * 60 * 1000;
const RESUME_SYNC_MIN_GAP_MS = 60 * 1000;

interface PersistedSyncState {
  meta: MetaMap;
  dirty: boolean;
  fresh: boolean;
  lastSyncAt: string | null;
  hold: HoldReason | null;
  lastBackupDay: string | null;
  lastSilentAttempt: number;
}

interface SyncConfig {
  clientId: string;
  autoSignIn: boolean;
}

function readJson<T>(key: string): Partial<T> {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}') as Partial<T>;
  } catch {
    return {};
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Speichern von ${key} fehlgeschlagen:`, err);
  }
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface UseSyncedAppDataOptions {
  storageKey: string;
  defaultTargets: Targets;
  /** Lädt den lokalen Stand; `fresh` = es gab noch gar keine gespeicherten Daten. */
  loadInitial: () => { data: AppData; fresh: boolean };
  /** Macht aus beliebigem JSON gültige AppData (für alte Sync-Dateien). */
  normalize: (raw: unknown) => AppData;
  notify?: (message: string, accent: Accent) => void;
}

export function useSyncedAppData(opts: UseSyncedAppDataOptions) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // --------------------------------------------------------------------------
  // Initialer Zustand
  // --------------------------------------------------------------------------
  const init = useMemo(() => {
    const { data, fresh } = opts.loadInitial();
    const records = flatten(data);
    const stored = readJson<PersistedSyncState>(SYNC_STATE_KEY);
    const persisted: PersistedSyncState = {
      meta: stored.meta && typeof stored.meta === 'object' ? stored.meta : initialMeta(records),
      dirty: stored.dirty ?? !fresh,
      fresh: stored.fresh ?? fresh,
      lastSyncAt: stored.lastSyncAt ?? null,
      hold: stored.hold ?? null,
      lastBackupDay: stored.lastBackupDay ?? null,
      lastSilentAttempt: stored.lastSilentAttempt ?? 0,
    };
    const config = readJson<SyncConfig>(SYNC_CONFIG_KEY);
    const legacy = readJson<{ clientId?: string }>(LEGACY_GDRIVE_CONFIG_KEY);
    return {
      data,
      records,
      persisted,
      config: {
        clientId: (config.clientId ?? legacy.clientId ?? '').trim(),
        autoSignIn: config.autoSignIn ?? false,
      } as SyncConfig,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [appData, setAppData] = useState<AppData>(init.data);
  const [clientId, setClientIdState] = useState(init.config.clientId);
  const [autoSignIn, setAutoSignInState] = useState(init.config.autoSignIn);
  const [status, setStatus] = useState<SyncStatus>(() =>
    !init.config.clientId ? 'off' : init.persisted.hold ? 'hold' : loadToken() ? 'synced' : 'needs-auth'
  );
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(init.persisted.lastSyncAt);
  const [hold, setHoldState] = useState<HoldReason | null>(init.persisted.hold);
  const [dirty, setDirtyState] = useState<boolean>(init.persisted.dirty);
  const [hasToken, setHasToken] = useState<boolean>(() => Boolean(loadToken()));

  const flatRef = useRef<FlatRecords>(init.records);
  const persistedRef = useRef<PersistedSyncState>(init.persisted);
  const appliedDataRef = useRef<AppData | null>(init.data);
  const folderIdRef = useRef<string | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const lastAttemptRef = useRef(0);
  const clientIdRef = useRef(clientId);
  clientIdRef.current = clientId;
  const autoSignInRef = useRef(autoSignIn);
  autoSignInRef.current = autoSignIn;

  const persistSync = useCallback((patch: Partial<PersistedSyncState>) => {
    persistedRef.current = { ...persistedRef.current, ...patch };
    writeJson(SYNC_STATE_KEY, persistedRef.current);
    if ('dirty' in patch) setDirtyState(persistedRef.current.dirty);
    if ('hold' in patch) setHoldState(persistedRef.current.hold);
  }, []);

  // --------------------------------------------------------------------------
  // Lokale Änderungen erkennen & speichern
  // --------------------------------------------------------------------------
  useEffect(() => {
    try {
      localStorage.setItem(optsRef.current.storageKey, JSON.stringify(appData));
    } catch (err) {
      console.error('Fehler beim Speichern in localStorage:', err);
    }
    if (appliedDataRef.current === appData) return;
    appliedDataRef.current = appData;

    const next = flatten(appData);
    const meta = trackChanges(flatRef.current, next, persistedRef.current.meta, Date.now());
    flatRef.current = next;
    if (meta) persistSync({ meta, dirty: true });
  }, [appData, persistSync]);

  const applyLocal = useCallback((state: SyncState) => {
    const data = unflatten(state.records, optsRef.current.defaultTargets);
    flatRef.current = flatten(data);
    appliedDataRef.current = data;
    persistSync({ meta: state.meta });
    setAppData(data);
  }, [persistSync]);

  // --------------------------------------------------------------------------
  // Sync
  // --------------------------------------------------------------------------
  const runSync = useCallback(
    async (reason: 'open' | 'close' | 'manual', mode: 'merge' | 'take-remote' = 'merge') => {
      const token = loadToken();
      setHasToken(Boolean(token));
      if (!clientIdRef.current) {
        setStatus('off');
        return;
      }
      if (!token) {
        setStatus('needs-auth');
        return;
      }
      if (persistedRef.current.hold && mode === 'merge' && reason !== 'manual') {
        setStatus('hold');
        return;
      }

      lastAttemptRef.current = Date.now();
      setStatus('syncing');
      setError(null);

      try {
        const accessToken = token.accessToken;
        folderIdRef.current ||= await ensureFolder(accessToken);
        const folderId = folderIdRef.current;

        for (let attempt = 0; attempt < 3; attempt++) {
          const startFlat = flatRef.current;
          const local: SyncState = { records: startFlat, meta: persistedRef.current.meta };
          const file = await findFile(accessToken, folderId, SYNC_FILE_NAME);
          const rawRemote = file ? await downloadJson(accessToken, file.id) : null;
          const remote = file ? fromRemoteFile(rawRemote, optsRef.current.normalize) : null;

          let merged: SyncState;
          if (!remote) merged = local;
          else if (mode === 'take-remote') merged = remote;
          else merged = merge(local, remote, { now: Date.now(), dropUntrackedLocal: persistedRef.current.fresh });

          if (!remote || !sameState(merged, remote)) {
            if (file) {
              // Hat ein anderes Gerät inzwischen geschrieben? Dann neu zusammenführen.
              const currentVersion = await getVersion(accessToken, file.id);
              if (currentVersion !== file.version) continue;
              await updateJsonFile(accessToken, file.id, toRemoteFile(merged));
            } else {
              await createJsonFile(accessToken, folderId, SYNC_FILE_NAME, toRemoteFile(merged));
            }
          }

          // Während des Syncs gemachte Eingaben nicht verlieren
          const editedMeanwhile = flatRef.current !== startFlat;
          const finalLocal = editedMeanwhile
            ? merge({ records: flatRef.current, meta: persistedRef.current.meta }, merged, { now: Date.now() })
            : merged;
          if (!sameState(finalLocal, { records: flatRef.current, meta: persistedRef.current.meta })) {
            applyLocal(finalLocal);
          }

          const nowIso = new Date().toISOString();
          setLastSyncAt(nowIso);
          persistSync({
            dirty: editedMeanwhile,
            fresh: false,
            lastSyncAt: nowIso,
            ...(mode === 'take-remote' || reason === 'manual' ? { hold: null } : {}),
          });
          setStatus('synced');

          if (rawRemote && reason !== 'close' && persistedRef.current.lastBackupDay !== todayKey()) {
            dailyBackup(accessToken, folderId, todayKey(), rawRemote)
              .then(() => persistSync({ lastBackupDay: todayKey() }))
              .catch((err) => console.warn('Tages-Backup fehlgeschlagen:', err));
          }
          if (reason === 'manual') optsRef.current.notify?.('Mit Google Drive synchronisiert', 'emerald');
          return;
        }
        throw new Error('Drive-Datei wurde gleichzeitig geändert. Bitte erneut synchronisieren.');
      } catch (err) {
        if (err instanceof DriveAuthError) {
          setHasToken(false);
          setStatus('needs-auth');
          return;
        }
        console.error('Google Drive Sync Fehler:', err);
        setError(err instanceof Error ? err.message : 'Google Drive Sync fehlgeschlagen.');
        setStatus('error');
      }
    },
    [applyLocal, persistSync]
  );

  const syncNow = useCallback(
    (reason: 'open' | 'close' | 'manual' = 'manual', mode: 'merge' | 'take-remote' = 'merge') => {
      if (inFlightRef.current) return inFlightRef.current;
      const p = runSync(reason, mode).finally(() => {
        inFlightRef.current = null;
      });
      inFlightRef.current = p;
      return p;
    },
    [runSync]
  );

  const signIn = useCallback((silent = false) => {
    const id = clientIdRef.current;
    if (!id) {
      setError('Bitte zuerst die Google OAuth Client-ID eintragen.');
      setStatus('off');
      return;
    }
    if (silent) persistSync({ lastSilentAttempt: Date.now() });
    startGoogleSignIn(id, { silent });
  }, [persistSync]);

  /** Wird beim Öffnen bzw. bei der Rückkehr in die App aufgerufen. */
  const onOpen = useCallback(() => {
    if (!clientIdRef.current) return;
    if (loadToken()) {
      syncNow('open');
      return;
    }
    setHasToken(false);
    const canTrySilent =
      autoSignInRef.current &&
      Date.now() - persistedRef.current.lastSilentAttempt > SILENT_RETRY_MS &&
      navigator.onLine;
    if (canTrySilent) signIn(true);
    else setStatus(persistedRef.current.hold ? 'hold' : 'needs-auth');
  }, [signIn, syncNow]);

  // Start: OAuth-Rückkehr auswerten, dann Sync beim Öffnen
  useEffect(() => {
    const result = consumeOAuthRedirect();
    if (result.kind === 'token') {
      setHasToken(true);
      // Nach Reset/Import erst die Entscheidung im Banner abwarten
      if (persistedRef.current.hold) setStatus('hold');
      else syncNow('open');
      return;
    }
    if (result.kind === 'error') {
      setStatus('needs-auth');
      if (!result.silent) setError(`Google-Anmeldung fehlgeschlagen: ${result.error}`);
      return;
    }
    onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rückkehr aus dem Hintergrund = Öffnen, in den Hintergrund = Schließen
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (persistedRef.current.dirty && !persistedRef.current.hold && loadToken()) {
          syncNow('close');
        }
      } else if (Date.now() - lastAttemptRef.current > RESUME_SYNC_MIN_GAP_MS) {
        onOpen();
      }
    };
    const onPageHide = () => {
      if (persistedRef.current.dirty && !persistedRef.current.hold && loadToken()) syncNow('close');
    };
    const onOnline = () => {
      if (persistedRef.current.dirty) onOpen();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('online', onOnline);
    };
  }, [onOpen, syncNow]);

  // --------------------------------------------------------------------------
  // Einstellungen & Aktionen für die UI
  // --------------------------------------------------------------------------
  const saveConfig = (next: SyncConfig) => writeJson(SYNC_CONFIG_KEY, next);

  const setClientId = useCallback((value: string) => {
    setClientIdState(value);
    const trimmed = value.trim();
    clientIdRef.current = trimmed;
    saveConfig({ clientId: trimmed, autoSignIn: autoSignInRef.current });
    const token = loadToken();
    setHasToken(Boolean(token));
    setStatus(!trimmed ? 'off' : persistedRef.current.hold ? 'hold' : token ? 'synced' : 'needs-auth');
  }, []);

  const setAutoSignIn = useCallback((value: boolean) => {
    setAutoSignInState(value);
    saveConfig({ clientId: clientIdRef.current, autoSignIn: value });
  }, []);

  const disconnect = useCallback(async () => {
    const token = loadToken();
    if (token) await revokeToken(token.accessToken);
    setHasToken(false);
    folderIdRef.current = null;
    setStatus(clientIdRef.current ? 'needs-auth' : 'off');
    optsRef.current.notify?.('Google Drive abgemeldet', 'amber');
  }, []);

  /** Nach Reset/Import: Sync anhalten, bis entschieden ist, welcher Stand gilt. */
  const markHold = useCallback((reason: HoldReason) => {
    if (!clientIdRef.current) return;
    persistSync({ hold: reason });
    setStatus('hold');
  }, [persistSync]);

  /** 'upload' = lokaler Stand ersetzt Drive, 'download' = Drive-Stand ersetzt lokalen. */
  const resolveHold = useCallback(
    (choice: 'upload' | 'download') => syncNow('manual', choice === 'download' ? 'take-remote' : 'merge'),
    [syncNow]
  );

  return {
    appData,
    setAppData,
    sync: {
      status,
      error,
      lastSyncAt,
      dirty,
      hold,
      hasToken,
      clientId,
      setClientId,
      autoSignIn,
      setAutoSignIn,
      redirectUri: redirectUri(),
      signIn: () => signIn(false),
      syncNow: () => syncNow('manual'),
      disconnect,
      markHold,
      resolveHold,
    },
  };
}

export type SyncApi = ReturnType<typeof useSyncedAppData>['sync'];
