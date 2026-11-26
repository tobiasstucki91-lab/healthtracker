// ============================================================================
// KI-NÄHRWERTSCHÄTZUNG VIA GOOGLE GEMINI API (DIREKT IM BROWSER, OHNE SERVER)
// ----------------------------------------------------------------------------
// Unterstützt Freitext („Pad Thai mit Hähnchen, 1 Teller“) sowie Tellerfotos.
// Nutzt den persönlichen Gemini API-Key des Nutzers (gespeichert in
// localStorage) und strukturiertes JSON-Output (responseSchema).
// ============================================================================

export const GEMINI_KEY_STORAGE = 'hht_gemini_api_key_v1';
export const GEMINI_MODEL_STORAGE = 'hht_gemini_model_v1';
const LAST_WORKING_MODEL_KEY = 'hht_gemini_last_model_v1';
const AI_CACHE_KEY = 'hht_ai_food_cache_v1';
const AI_CACHE_MAX = 60;

export const GEMINI_FALLBACK_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
] as const;

export interface AiEstimatedFood {
  id: string;
  name: string;
  brand: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingQuantity: number;
  servingSize: string;
  aiNote: string;
  usedModel?: string;
  source: 'ai';
}

export interface RawAiNutritionPayload {
  name?: unknown;
  portionGrams?: unknown;
  portionLabel?: unknown;
  caloriesPer100g?: unknown;
  proteinPer100g?: unknown;
  carbsPer100g?: unknown;
  fatPer100g?: unknown;
  note?: unknown;
}

export function loadGeminiApiKey(): string {
  try {
    return (localStorage.getItem(GEMINI_KEY_STORAGE) || '').trim();
  } catch {
    return '';
  }
}

export function loadLastWorkingModel(): string {
  try {
    return (localStorage.getItem(LAST_WORKING_MODEL_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function saveLastWorkingModel(model: string): void {
  try {
    const clean = model.trim();
    if (clean) localStorage.setItem(LAST_WORKING_MODEL_KEY, clean);
    else localStorage.removeItem(LAST_WORKING_MODEL_KEY);
  } catch {
    // ignorieren
  }
}

export function saveGeminiApiKey(key: string): void {
  try {
    const clean = key.trim();
    if (clean) localStorage.setItem(GEMINI_KEY_STORAGE, clean);
    else localStorage.removeItem(GEMINI_KEY_STORAGE);
  } catch {
    // ignorieren
  }
  saveLastWorkingModel('');
}

export function loadGeminiModel(): string {
  try {
    return (localStorage.getItem(GEMINI_MODEL_STORAGE) || '').trim();
  } catch {
    return '';
  }
}

export function saveGeminiModel(model: string): void {
  try {
    const clean = model.trim();
    if (clean) localStorage.setItem(GEMINI_MODEL_STORAGE, clean);
    else localStorage.removeItem(GEMINI_MODEL_STORAGE);
  } catch {
    // ignorieren
  }
  saveLastWorkingModel('');
}

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
const round1 = (val: number) => Math.round(val * 10) / 10;

/**
 * Validiert und normiert das JSON-Ergebnis von Gemini in das interne Food-Format
 * (Nährwerte je 100 g + geschätzte Portionsgröße).
 */
export function parseAiEstimatePayload(
  raw: RawAiNutritionPayload,
  fallbackName = 'Geschätztes Gericht'
): AiEstimatedFood | null {
  if (!raw || typeof raw !== 'object') return null;
  const name =
    typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 90) : fallbackName;

  const p = Number(raw.proteinPer100g);
  const c = Number(raw.carbsPer100g);
  const f = Number(raw.fatPer100g);
  const kcalRaw = Number(raw.caloriesPer100g);
  const portionRaw = Number(raw.portionGrams);

  if (![p, c, f, kcalRaw].every((n) => Number.isFinite(n) && n >= 0)) return null;

  const protein = round1(clamp(p, 0, 100));
  const carbs = round1(clamp(c, 0, 100));
  const fat = round1(clamp(f, 0, 100));
  const macroKcal = protein * 4 + carbs * 4 + fat * 9;
  const calories = Math.round(
    clamp(kcalRaw > 0 ? kcalRaw : macroKcal, 0, 950)
  );
  const servingQuantity = Math.round(
    clamp(Number.isFinite(portionRaw) && portionRaw > 0 ? portionRaw : 300, 10, 2500)
  );
  const labelRaw =
    typeof raw.portionLabel === 'string' && raw.portionLabel.trim()
      ? raw.portionLabel.trim().slice(0, 30)
      : 'Portion';
  const portionLabel = labelRaw.replace(/^1\s+/i, '');
  const aiNote =
    typeof raw.note === 'string' ? raw.note.trim().slice(0, 180) : '';

  return {
    id: `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    brand: 'KI-Schätzung',
    category: 'KI-Schätzung',
    calories,
    protein,
    carbs,
    fat,
    servingQuantity,
    servingSize: `1 ${portionLabel} (${servingQuantity}g)`,
    aiNote,
    source: 'ai',
  };
}

function readAiCache(): Record<string, { t: number; food: AiEstimatedFood }> {
  try {
    return JSON.parse(localStorage.getItem(AI_CACHE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function getCachedAiEstimate(queryKey: string): AiEstimatedFood | null {
  const entry = readAiCache()[queryKey];
  if (!entry?.food) return null;
  // 30 Tage gültig
  if (Date.now() - entry.t > 30 * 24 * 60 * 60 * 1000) return null;
  return entry.food;
}

function putCachedAiEstimate(queryKey: string, food: AiEstimatedFood): void {
  try {
    const cache = readAiCache();
    cache[queryKey] = { t: Date.now(), food };
    const keys = Object.keys(cache);
    if (keys.length > AI_CACHE_MAX) {
      keys
        .sort((a, b) => cache[a].t - cache[b].t)
        .slice(0, keys.length - AI_CACHE_MAX)
        .forEach((k) => delete cache[k]);
    }
    localStorage.setItem(AI_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignorieren
  }
}

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    portionGrams: { type: 'NUMBER' },
    portionLabel: { type: 'STRING' },
    caloriesPer100g: { type: 'NUMBER' },
    proteinPer100g: { type: 'NUMBER' },
    carbsPer100g: { type: 'NUMBER' },
    fatPer100g: { type: 'NUMBER' },
    note: { type: 'STRING' },
  },
  required: [
    'name',
    'portionGrams',
    'portionLabel',
    'caloriesPer100g',
    'proteinPer100g',
    'carbsPer100g',
    'fatPer100g',
    'note',
  ],
};

function buildPrompt(query: string, hasImage: boolean): string {
  const base = [
    'Du bist eine deutsche Ernährungs-Datenbank für Kalorien- und Makro-Tracking.',
    'Schätze realistische Durchschnittswerte für ein Gericht oder Lebensmittel in Deutschland (Restaurant, Imbiss oder hausgemacht).',
    'Gib IMMER die Nährwerte pro 100 g an (caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g) sowie die geschätzte realistische Portionsgröße in Gramm (portionGrams) und ein kurzes deutsches Portionslabel ohne Zahl davor (z. B. "Teller", "Schüssel", "Portion", "Stück", "Döner").',
    'Falls der Nutzer eine konkrete Menge nennt (z. B. "2 Stück", "großer Teller", "350g"), berücksichtige diese in portionGrams.',
    'Halte `note` sehr kurz auf Deutsch (max. 1 kurzer Satz mit den angenommenen Hauptzutaten).',
  ];
  if (hasImage) {
    base.push('Analysiere das beigefügte Foto der Mahlzeit und schätze das Gericht sowie die sichtbare Portionsgröße.');
    if (query.trim()) base.push(`Zusätzlicher Hinweis des Nutzers: "${query.trim()}"`);
  } else {
    base.push(`Eingabe des Nutzers: "${query.trim()}"`);
  }
  return base.join('\n');
}

export interface EstimateMealOptions {
  query: string;
  apiKey: string;
  model?: string;
  imageBase64?: string;
  mimeType?: string;
  signal?: AbortSignal;
  bypassCache?: boolean;
  onProgress?: (text: string) => void;
}

/**
 * Verkleinert ein Foto im Browser auf max. 512 px (JPEG 0.70), damit
 * das Foto nur ~20–35 KB groß ist (1 Vision-Tile) und mobil blitzschnell lädt.
 */
export async function compressImageForAi(
  file: File,
  maxSide = 512
): Promise<{ base64: string; mimeType: string }> {
  const drawScaled = (source: CanvasImageSource, width: number, height: number) => {
    const scale = Math.min(1, maxSide / Math.max(width, height, 1));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas nicht verfügbar');
    ctx.drawImage(source, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    return { base64: dataUrl.split(',')[1] || '', mimeType: 'image/jpeg' };
  };

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      try {
        return drawScaled(bitmap, bitmap.width, bitmap.height);
      } finally {
        bitmap.close();
      }
    } catch {
      // Fallback auf Image()
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    return drawScaled(img, img.width, img.height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface RawModelInfo {
  name?: string;
  supportedGenerationMethods?: string[];
}

/**
 * Filtert und sortiert die vom API-Key unterstützten Gemini-Flash-Modelle
 * für schnelle, günstige Makro- & Foto-Schätzungen.
 * Stabile Modelle schlagen immer `preview`/`exp`, Flash-Lite wird bevorzugt.
 */
export function rankGeminiFlashModels(models: RawModelInfo[]): string[] {
  const candidates: Array<{ id: string; score: number }> = [];
  for (const m of models) {
    if (!m?.name) continue;
    const methods = Array.isArray(m.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
    if (methods.length > 0 && !methods.includes('generateContent')) continue;
    const id = m.name.replace(/^models\//, '').trim();
    if (!/^gemini-/i.test(id)) continue;
    if (!/flash/i.test(id)) continue;
    if (/(tts|audio|image|live|native|thinking|computer|robotics|embedding|vision|001$)/i.test(id)) continue;

    const verMatch = id.match(/^gemini-(\d+)(?:\.(\d+))?/i);
    const major = verMatch ? Number(verMatch[1]) : 0;
    const minor = verMatch && verMatch[2] ? Number(verMatch[2]) : 0;
    const versionScore = major * 100 + minor * 10;
    const isLite = /lite/i.test(id);
    const isPreview = /(preview|exp)/i.test(id);
    const isLatestAlias = /latest/i.test(id);

    let score = (isPreview ? 0 : 10000) + versionScore * 10 + (isLite ? 25 : 0);
    if (isLatestAlias) score = 12200 + (isLite ? 25 : 0);

    candidates.push({ id, score });
  }

  const seen = new Set<string>();
  return candidates
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .map((c) => c.id)
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
}

let discoveredModelsCache: { key: string; models: string[]; t: number } | null = null;

function getCachedDiscoveredModels(apiKey: string): string[] | null {
  const key = apiKey.trim();
  if (
    discoveredModelsCache &&
    discoveredModelsCache.key === key &&
    Date.now() - discoveredModelsCache.t < 15 * 60 * 1000
  ) {
    return discoveredModelsCache.models;
  }
  return null;
}

export async function discoverGeminiModels(apiKey: string, signal?: AbortSignal): Promise<string[]> {
  const key = apiKey.trim();
  if (!key) return [...GEMINI_FALLBACK_MODELS];
  const cached = getCachedDiscoveredModels(key);
  if (cached) return cached;

  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}&pageSize=100`,
      { signal: ctrl.signal }
    );
    if (!res.ok) return [...GEMINI_FALLBACK_MODELS];
    const json = await res.json();
    const ranked = rankGeminiFlashModels(Array.isArray(json?.models) ? json.models : []);
    if (ranked.length > 0) {
      discoveredModelsCache = { key, models: ranked, t: Date.now() };
      return ranked;
    }
  } catch {
    // Fallback auf Standardliste
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
  return [...GEMINI_FALLBACK_MODELS];
}

export function thinkingConfigForModel(model: string): Record<string, unknown> | undefined {
  if (/^gemini-3/i.test(model)) return { thinkingLevel: 'minimal' };
  if (/^gemini-2\.5-/i.test(model) || /^gemini-flash(-lite)?-latest$/i.test(model)) {
    return { thinkingBudget: 0 };
  }
  return undefined;
}

export function extractResponseText(json: unknown): string | null {
  const parts = (json as { candidates?: Array<{ content?: { parts?: Array<{ text?: unknown; thought?: unknown }> } }> })
    ?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const nonThought = parts.find((p) => typeof p?.text === 'string' && !p.thought);
  if (typeof nonThought?.text === 'string') return nonThought.text;
  const anyText = parts.find((p) => typeof p?.text === 'string');
  return typeof anyText?.text === 'string' ? anyText.text : null;
}

const HEDGE_DELAY_MS = 5000;

class ModelCallError extends Error {
  fatal: boolean;
  shortReason: string;
  constructor(message: string, shortReason: string, fatal = false) {
    super(message);
    this.shortReason = shortReason;
    this.fatal = fatal;
  }
}

async function callGeminiOnce(opts: {
  model: string;
  key: string;
  parts: Array<Record<string, unknown>>;
  thinkingConfig?: Record<string, unknown>;
  timeoutMs: number;
  signal?: AbortSignal;
}): Promise<Response> {
  const generationConfig: Record<string, unknown> = {
    temperature: 0.2,
    maxOutputTokens: 512,
    responseMimeType: 'application/json',
    responseSchema: RESPONSE_SCHEMA,
  };
  if (opts.thinkingConfig) {
    generationConfig.thinkingConfig = opts.thinkingConfig;
  }

  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  opts.signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
  try {
    return await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(opts.model)}:generateContent?key=${encodeURIComponent(opts.key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: opts.parts }],
          generationConfig,
        }),
        signal: ctrl.signal,
      }
    );
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

async function trySingleModel(opts: {
  model: string;
  key: string;
  parts: Array<Record<string, unknown>>;
  queryClean: string;
  timeoutMs: number;
  signal: AbortSignal;
}): Promise<AiEstimatedFood> {
  const thinkingConfig = thinkingConfigForModel(opts.model);
  let res: Response;
  try {
    res = await callGeminiOnce({
      model: opts.model,
      key: opts.key,
      parts: opts.parts,
      thinkingConfig,
      timeoutMs: opts.timeoutMs,
      signal: opts.signal,
    });

    if (res.status === 400 && thinkingConfig) {
      const errClone = await res.clone().json().catch(() => null);
      const errMsg = String(errClone?.error?.message || '');
      if (!/api key/i.test(errMsg)) {
        res = await callGeminiOnce({
          model: opts.model,
          key: opts.key,
          parts: opts.parts,
          thinkingConfig: undefined,
          timeoutMs: opts.timeoutMs,
          signal: opts.signal,
        });
      }
    }
  } catch (err) {
    if (opts.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ModelCallError('Zeitüberschreitung bei der KI-Schätzung. Bitte erneut versuchen.', 'Timeout');
    }
    throw new ModelCallError(err instanceof Error ? err.message : 'KI-Schätzung fehlgeschlagen.', 'Netzwerk');
  }

  if (res.status === 404) {
    throw new ModelCallError(`Modell ${opts.model} nicht verfügbar`, '404');
  }
  if (res.status === 503) {
    throw new ModelCallError('Google Gemini ist gerade kurzfristig überlastet (503). Bitte gleich nochmal tippen.', '503');
  }
  if (res.status === 429) {
    throw new ModelCallError('Gemini Free-Tier-Limit kurzzeitig erreicht (429). Bitte kurz warten.', '429');
  }
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    let msg = '';
    try {
      msg = (await res.json())?.error?.message || '';
    } catch {
      // ignorieren
    }
    if (res.status === 401 || res.status === 403 || /api key/i.test(msg)) {
      throw new ModelCallError(
        msg && /api key/i.test(msg)
          ? 'Gemini API-Key ungültig. Bitte unter Einstellungen → KI-Suche prüfen.'
          : `Gemini-Anfrage abgelehnt (${res.status})${msg ? `: ${msg}` : ''}`,
        String(res.status),
        true
      );
    }
    throw new ModelCallError(`Modell ${opts.model} hat die Anfrage abgelehnt (400)${msg ? `: ${msg}` : ''}`, '400');
  }
  if (!res.ok) {
    throw new ModelCallError(`Gemini-Fehler (${res.status})`, `HTTP ${res.status}`);
  }

  const json = await res.json();
  const text = extractResponseText(json);
  if (typeof text !== 'string' || !text.trim()) {
    throw new ModelCallError('Gemini hat keine verwertbare Antwort geliefert.', 'Leer');
  }
  let parsedJson: RawAiNutritionPayload;
  try {
    parsedJson = JSON.parse(text.replace(/^```json\s*|\s*```$/g, '').trim()) as RawAiNutritionPayload;
  } catch {
    throw new ModelCallError('Die KI-Antwort enthielt keine gültigen Nährwerte.', 'Ungültig');
  }
  const food = parseAiEstimatePayload(parsedJson, opts.queryClean || 'Foto-Mahlzeit');
  if (!food) {
    throw new ModelCallError('Die KI-Antwort enthielt keine gültigen Nährwerte.', 'Ungültig');
  }
  food.usedModel = opts.model;
  return food;
}

export async function estimateMealWithAi(opts: EstimateMealOptions): Promise<AiEstimatedFood> {
  const key = opts.apiKey.trim();
  if (!key) {
    throw new Error('Bitte zuerst deinen kostenlosen Gemini API-Key unter Einstellungen → KI-Suche eintragen.');
  }
  const hasImage = Boolean(opts.imageBase64);
  const queryClean = opts.query.trim();
  if (!hasImage && queryClean.length < 2) {
    throw new Error('Bitte gib ein Gericht oder Lebensmittel ein.');
  }

  const cacheKey = !hasImage ? `txt:${queryClean.toLowerCase()}` : null;
  if (cacheKey && !opts.bypassCache) {
    const cached = getCachedAiEstimate(cacheKey);
    if (cached) return cached;
  }

  const parts: Array<Record<string, unknown>> = [{ text: buildPrompt(queryClean, hasImage) }];
  if (hasImage && opts.imageBase64) {
    parts.push({
      inline_data: {
        mime_type: opts.mimeType || 'image/jpeg',
        data: opts.imageBase64,
      },
    });
  }

  const preferred = opts.model?.trim();
  const lastWorking = preferred ? '' : loadLastWorkingModel();
  let discovered: string[] = [];
  if (!preferred) {
    const cachedDiscovered = getCachedDiscoveredModels(key);
    if (cachedDiscovered) {
      discovered = cachedDiscovered;
    } else if (lastWorking) {
      // Mit bekanntem Modell sofort starten (0 ms) und Liste im Hintergrund aktualisieren
      discoverGeminiModels(key).catch(() => {});
    } else {
      discovered = await discoverGeminiModels(key, opts.signal);
    }
  }

  const models: string[] = [];
  for (const m of [preferred, lastWorking, ...discovered, ...GEMINI_FALLBACK_MODELS]) {
    if (m && !models.includes(m)) models.push(m);
  }
  const tryModels = models.slice(0, 4);
  const timeoutMs = hasImage ? 30000 : 20000;

  // Hedged Execution: startet Modell #1 sofort; antwortet es nicht in 5 s oder scheitert,
  // läuft das nächste Backup-Modell parallel mit – die erste gültige Antwort gewinnt und bricht den Rest ab.
  const winner = await new Promise<AiEstimatedFood>((resolve, reject) => {
    const raceCtrl = new AbortController();
    let hedgeTimer: ReturnType<typeof setTimeout> | null = null;
    let settled = false;
    let nextIndex = 0;
    let active = 0;
    let firstSpecificError: ModelCallError | null = null;
    let lastError: Error | null = null;
    const attempts: string[] = [];

    const clearHedgeTimer = () => {
      if (hedgeTimer !== null) {
        clearTimeout(hedgeTimer);
        hedgeTimer = null;
      }
    };

    const cleanup = () => {
      clearHedgeTimer();
      opts.signal?.removeEventListener('abort', onParentAbort);
    };

    const finishSuccess = (food: AiEstimatedFood) => {
      if (settled) return;
      settled = true;
      cleanup();
      raceCtrl.abort();
      resolve(food);
    };

    const finishError = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      raceCtrl.abort();
      reject(err);
    };

    const onParentAbort = () => finishError(new DOMException('Aborted', 'AbortError'));
    if (opts.signal?.aborted) {
      onParentAbort();
      return;
    }
    opts.signal?.addEventListener('abort', onParentAbort, { once: true });

    const launchNext = () => {
      if (settled || nextIndex >= tryModels.length) return;
      clearHedgeTimer();
      const idx = nextIndex++;
      const model = tryModels[idx];
      active += 1;

      if (idx === 0) {
        opts.onProgress?.(hasImage ? `Analysiere Foto (${model})…` : `Schätze mit ${model}…`);
      } else {
        opts.onProgress?.(`Prüfe parallel ${model}…`);
      }

      if (nextIndex < tryModels.length) {
        hedgeTimer = setTimeout(() => {
          hedgeTimer = null;
          launchNext();
        }, HEDGE_DELAY_MS);
      }

      trySingleModel({
        model,
        key,
        parts,
        queryClean,
        timeoutMs,
        signal: raceCtrl.signal,
      })
        .then((food) => {
          finishSuccess(food);
        })
        .catch((err) => {
          active -= 1;
          if (settled) return;
          if (err instanceof ModelCallError && err.fatal) {
            finishError(err);
            return;
          }
          if (err instanceof Error && err.name !== 'AbortError') {
            const shortReason = err instanceof ModelCallError ? err.shortReason : 'Fehler';
            attempts.push(`${model}: ${shortReason}`);
            lastError = err;
            if (err instanceof ModelCallError && err.shortReason !== 'Timeout' && !firstSpecificError) {
              firstSpecificError = err;
            }
          }
          if (nextIndex < tryModels.length) {
            launchNext();
          } else if (active === 0) {
            if (lastWorking) saveLastWorkingModel('');
            const baseErr = firstSpecificError || lastError || new Error('KI-Schätzung fehlgeschlagen.');
            const diag = attempts.length > 0 ? ` (${attempts.join(', ')})` : '';
            finishError(new Error(`${baseErr.message}${diag}`));
          }
        });
    };

    launchNext();
  });

  if (winner.usedModel) saveLastWorkingModel(winner.usedModel);
  if (cacheKey) putCachedAiEstimate(cacheKey, winner);
  return winner;
}
