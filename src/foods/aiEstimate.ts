// ============================================================================
// KI-NÄHRWERTSCHÄTZUNG VIA GOOGLE GEMINI API (DIREKT IM BROWSER, OHNE SERVER)
// ----------------------------------------------------------------------------
// Unterstützt Freitext („Pad Thai mit Hähnchen, 1 Teller“) sowie Tellerfotos.
// Nutzt den persönlichen Gemini API-Key des Nutzers (gespeichert in
// localStorage) und strukturiertes JSON-Output (responseSchema).
// ============================================================================

export const GEMINI_KEY_STORAGE = 'hht_gemini_api_key_v1';
export const GEMINI_MODEL_STORAGE = 'hht_gemini_model_v1';
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

export function saveGeminiApiKey(key: string): void {
  try {
    const clean = key.trim();
    if (clean) localStorage.setItem(GEMINI_KEY_STORAGE, clean);
    else localStorage.removeItem(GEMINI_KEY_STORAGE);
  } catch {
    // ignorieren
  }
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
}

/**
 * Verkleinert ein Foto im Browser auf max. 1024 px (JPEG), damit die
 * KI-Analyse auch im Mobilfunknetz in unter 2 Sekunden durchläuft.
 */
export async function compressImageForAi(
  file: File,
  maxSide = 1024
): Promise<{ base64: string; mimeType: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height, 1));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas nicht verfügbar');
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    const base64 = dataUrl.split(',')[1] || '';
    return { base64, mimeType: 'image/jpeg' };
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
 * für schnelle, günstige Makro- & Foto-Schätzungen (neueste stabile zuerst,
 * Flash-Lite bevorzugt wegen höherer Verfügbarkeit im Free Tier).
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

    let score = versionScore * 10;
    if (isLite) score += 25;
    if (!isPreview) score += 40;
    if (isLatestAlias) score = 2200 + (isLite ? 25 : 0);

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

export async function discoverGeminiModels(apiKey: string, signal?: AbortSignal): Promise<string[]> {
  const key = apiKey.trim();
  if (!key) return [...GEMINI_FALLBACK_MODELS];
  if (
    discoveredModelsCache &&
    discoveredModelsCache.key === key &&
    Date.now() - discoveredModelsCache.t < 15 * 60 * 1000
  ) {
    return discoveredModelsCache.models;
  }

  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => ctrl.abort(), 8000);
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

function waitMs(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}

async function callGeminiOnce(opts: {
  model: string;
  key: string;
  parts: Array<Record<string, unknown>>;
  disableThinking: boolean;
  signal?: AbortSignal;
}): Promise<Response> {
  const generationConfig: Record<string, unknown> = {
    temperature: 0.2,
    maxOutputTokens: 320,
    responseMimeType: 'application/json',
    responseSchema: RESPONSE_SCHEMA,
  };
  if (opts.disableThinking) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  opts.signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => ctrl.abort(), 20000);
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
  const discovered = preferred ? [] : await discoverGeminiModels(key, opts.signal);
  const pool = [...discovered, ...GEMINI_FALLBACK_MODELS];
  const models: string[] = [];
  if (preferred) models.push(preferred);
  for (const m of pool) {
    if (!models.includes(m)) models.push(m);
  }
  const tryModels = models.slice(0, 5);

  let lastError: Error | null = null;
  let saw503 = false;

  for (let pass = 0; pass < 2; pass++) {
    if (pass > 0) {
      if (!saw503) break;
      await waitMs(1500, opts.signal);
    }

    for (const model of tryModels) {
      const wantsNoThink = /^gemini-(2\.5-|3\.|flash-latest)/i.test(model);
      try {
        let res = await callGeminiOnce({
          model,
          key,
          parts,
          disableThinking: wantsNoThink,
          signal: opts.signal,
        });

        // Falls ein Modell thinkingConfig nicht unterstützt (400), einmal ohne wiederholen
        if (res.status === 400 && wantsNoThink) {
          const errClone = await res.clone().json().catch(() => null);
          const errMsg = String(errClone?.error?.message || '');
          if (/thinking/i.test(errMsg)) {
            res = await callGeminiOnce({
              model,
              key,
              parts,
              disableThinking: false,
              signal: opts.signal,
            });
          }
        }

        if (res.status === 404) {
          lastError = new Error(`Modell ${model} nicht verfügbar`);
          continue;
        }
        if (res.status === 503) {
          saw503 = true;
          lastError = new Error('Google Gemini ist gerade kurzfristig überlastet (503). Bitte gleich nochmal tippen.');
          continue;
        }
        if (res.status === 429) {
          saw503 = true;
          lastError = new Error('Gemini Free-Tier-Limit kurzzeitig erreicht (429). Bitte kurz warten.');
          continue;
        }
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          let msg = '';
          try {
            msg = (await res.json())?.error?.message || '';
          } catch {
            // ignorieren
          }
          throw new Error(
            msg && /api key/i.test(msg)
              ? 'Gemini API-Key ungültig. Bitte unter Einstellungen → KI-Suche prüfen.'
              : `Gemini-Anfrage abgelehnt (${res.status})${msg ? `: ${msg}` : ''}`
          );
        }
        if (!res.ok) {
          lastError = new Error(`Gemini-Fehler (${res.status})`);
          continue;
        }

        const json = await res.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof text !== 'string' || !text.trim()) {
          lastError = new Error('Gemini hat keine verwertbare Antwort geliefert.');
          continue;
        }
        const parsedJson = JSON.parse(text.replace(/^```json\s*|\s*```$/g, '').trim()) as RawAiNutritionPayload;
        const food = parseAiEstimatePayload(parsedJson, queryClean || 'Foto-Mahlzeit');
        if (!food) {
          lastError = new Error('Die KI-Antwort enthielt keine gültigen Nährwerte.');
          continue;
        }
        food.usedModel = model;
        if (cacheKey) putCachedAiEstimate(cacheKey, food);
        return food;
      } catch (err) {
        if (opts.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        if (err instanceof Error && err.name === 'AbortError') {
          lastError = new Error('Zeitüberschreitung bei der KI-Schätzung. Bitte erneut versuchen.');
          continue;
        }
        lastError = err instanceof Error ? err : new Error('KI-Schätzung fehlgeschlagen.');
        if (/API-Key ungültig|abgelehnt/i.test(lastError.message)) throw lastError;
      }
    }
  }

  throw lastError || new Error('KI-Schätzung fehlgeschlagen.');
}
