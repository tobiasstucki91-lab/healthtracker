// ============================================================================
// ADAPTIVES KALORIENZIEL
// ----------------------------------------------------------------------------
// 1) Startwert per Formel: Grundumsatz (Mifflin-St Jeor) × Aktivitätsfaktor.
// 2) Selbstlernend: Aus gegessenen Kalorien und Gewichtstrend der letzten
//    Wochen wird der tatsächliche Verbrauch geschätzt:
//      Verbrauch ≈ Ø Aufnahme − (Trendänderung kg × 7700 kcal) / Tage
//    Je mehr verwertbare Daten, desto stärker zählt dieser Messwert.
// 3) Ziel = Verbrauch − Defizit (aus dem Wunschtempo in % Körpergewicht/Woche),
//    mit Untergrenzen (Grundumsatz, 1.200/1.500 kcal) und max. 25 % Defizit.
// Reine Funktionen ohne React, damit sie testbar sind.
// ============================================================================

export type Sex = 'm' | 'f';
export type Goal = 'lose' | 'maintain' | 'gain';

export interface EnergyProfile {
  enabled: boolean;
  sex: Sex;
  heightCm: number;
  birthYear: number;
  /** PAL-Faktor, nur Startwert */
  activity: number;
  goal: Goal;
  /** Tempo in % Körpergewicht pro Woche (abnehmen bzw. zunehmen) */
  ratePct: number;
  proteinPerKg: number;
  /** Datum (YYYY-MM-DD) der letzten Wochen-Prüfung */
  lastReview: string | null;
}

export const DEFAULT_ENERGY_PROFILE: EnergyProfile = {
  enabled: false,
  sex: 'm',
  heightCm: 180,
  birthYear: 1991,
  activity: 1.375,
  goal: 'lose',
  ratePct: 0.5,
  proteinPerKg: 2.0,
  lastReview: null,
};

export const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Kaum Bewegung (Büro, kein Sport)' },
  { value: 1.375, label: 'Leicht aktiv (1–3× Sport/Woche)' },
  { value: 1.55, label: 'Aktiv (3–5× Sport/Woche)' },
  { value: 1.725, label: 'Sehr aktiv (täglich Sport)' },
];

export const RATE_OPTIONS = [
  { value: 0.25, label: 'Sanft' },
  { value: 0.5, label: 'Normal' },
  { value: 0.75, label: 'Zügig' },
];

export const KCAL_PER_KG = 7700;
const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 28;
const TREND_ALPHA = 0.15;
const WEEKLY_STEP_LIMIT = 150;

// ---------------------------------------------------------------------------
// Datum
// ---------------------------------------------------------------------------

const toUtc = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDaysKey = (key: string, delta: number) => fromUtc(toUtc(key) + delta * DAY_MS);
export const daysBetween = (a: string, b: string) => Math.round((toUtc(b) - toUtc(a)) / DAY_MS);

// ---------------------------------------------------------------------------
// Grundumsatz & Formel-Verbrauch
// ---------------------------------------------------------------------------

export function ageFrom(birthYear: number, today: string): number {
  return Math.max(14, Number(today.slice(0, 4)) - birthYear);
}

/** Mifflin-St Jeor: kcal/Tag in Ruhe */
export function bmrMifflin(kg: number, cm: number, age: number, sex: Sex): number {
  return 10 * kg + 6.25 * cm - 5 * age + (sex === 'm' ? 5 : -161);
}

// ---------------------------------------------------------------------------
// Gewichtstrend (geglättet, Lücken linear gefüllt)
// ---------------------------------------------------------------------------

export interface TrendPoint {
  date: string;
  trend: number;
}

export function weightTrend(weightsByDate: Record<string, number>, endDate: string): TrendPoint[] {
  // Werte können als Text gespeichert sein ("80.4")
  const entries = Object.entries(weightsByDate)
    .map(([d, w]) => [d, Number(w)] as [string, number])
    .filter(([d, w]) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= endDate && Number.isFinite(w) && w > 20)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  if (entries.length === 0) return [];

  const out: TrendPoint[] = [];
  let trend = entries[0][1];
  let idx = 0;
  for (let day = entries[0][0]; day <= endDate; day = addDaysKey(day, 1)) {
    while (idx + 1 < entries.length && entries[idx + 1][0] <= day) idx++;
    const [d0, w0] = entries[idx];
    let value = w0;
    if (d0 !== day && idx + 1 < entries.length) {
      const [d1, w1] = entries[idx + 1];
      value = w0 + ((w1 - w0) * daysBetween(d0, day)) / daysBetween(d0, d1);
    }
    trend = trend + TREND_ALPHA * (value - trend);
    out.push({ date: day, trend });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Schätzung
// ---------------------------------------------------------------------------

export interface EnergyInput {
  profile: EnergyProfile;
  weightsByDate: Record<string, number>;
  intakeByDate: Record<string, number>;
  today: string;
  currentTarget: number;
}

export interface EnergyEstimate {
  weightKg: number;
  bmr: number;
  formulaTdee: number;
  observedTdee: number | null;
  tdee: number;
  /** 0 = nur Formel, 1 = voll gemessen */
  confidence: number;
  validDays: number;
  weighIns: number;
  trendPerWeek: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Tageskalorien-Differenz zum Verbrauch (negativ = Defizit) */
  delta: number;
}

const round10 = (n: number) => Math.round(n / 10) * 10;

export function macrosFor(calories: number, weightKg: number, proteinPerKg: number) {
  const protein = Math.round(weightKg * proteinPerKg);
  const fat = Math.round(Math.max(0.8 * weightKg, (0.25 * calories) / 9));
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { protein, carbs, fat };
}

export function estimateEnergy(input: EnergyInput): EnergyEstimate | null {
  const { profile, weightsByDate, intakeByDate, today, currentTarget } = input;
  const end = addDaysKey(today, -1); // heute ist noch nicht vollständig
  const start = addDaysKey(end, -(WINDOW_DAYS - 1));

  const trend = weightTrend(weightsByDate, today);
  const latestWeight =
    trend.length > 0
      ? trend[trend.length - 1].trend
      : null;
  if (!latestWeight) return null;

  const age = ageFrom(profile.birthYear, today);
  const bmr = bmrMifflin(latestWeight, profile.heightCm, age, profile.sex);
  const formulaTdee = bmr * profile.activity;

  // Verwertbare Tage: deutlich unter dem Ziel = vermutlich unvollständig geloggt
  const minValid = Math.max(800, 0.5 * (currentTarget || formulaTdee));
  const intakes: number[] = [];
  for (let d = start; d <= end; d = addDaysKey(d, 1)) {
    const kcal = intakeByDate[d] || 0;
    if (kcal >= minValid) intakes.push(kcal);
  }
  const weighIns = Object.entries(weightsByDate).filter(
    ([d, w]) => d >= start && d <= end && Number(w) > 20
  ).length;

  const trendAt = (date: string) => trend.find((p) => p.date === date)?.trend ?? null;
  const firstTrendDate = trend.length ? trend[0].date : end;
  const fromDate = firstTrendDate > start ? firstTrendDate : start;
  const span = daysBetween(fromDate, end);
  const tStart = trendAt(fromDate);
  const tEnd = trendAt(end);

  let observedTdee: number | null = null;
  let confidence = 0;
  let trendPerWeek: number | null = null;
  if (tStart !== null && tEnd !== null && span >= 10) {
    trendPerWeek = ((tEnd - tStart) / span) * 7;
  }
  if (intakes.length >= 7 && weighIns >= 4 && span >= 10 && tStart !== null && tEnd !== null) {
    const avgIntake = intakes.reduce((a, b) => a + b, 0) / intakes.length;
    const raw = avgIntake - ((tEnd - tStart) * KCAL_PER_KG) / span;
    observedTdee = Math.min(formulaTdee * 1.3, Math.max(formulaTdee * 0.75, raw));
    confidence = Math.min(1, intakes.length / 21) * Math.min(1, weighIns / 8);
  }

  const tdee = observedTdee === null ? formulaTdee : confidence * observedTdee + (1 - confidence) * formulaTdee;

  const weeklyKg = (latestWeight * profile.ratePct) / 100;
  let delta = 0;
  if (profile.goal === 'lose') delta = -Math.min((weeklyKg * KCAL_PER_KG) / 7, 0.25 * tdee);
  if (profile.goal === 'gain') delta = Math.min((weeklyKg * KCAL_PER_KG) / 7, 0.15 * tdee);

  const floor = Math.max(bmr, profile.sex === 'm' ? 1500 : 1200);
  const calories = round10(Math.max(floor, tdee + delta));
  const macros = macrosFor(calories, latestWeight, profile.proteinPerKg);

  return {
    weightKg: Math.round(latestWeight * 10) / 10,
    bmr: Math.round(bmr),
    formulaTdee: Math.round(formulaTdee),
    observedTdee: observedTdee === null ? null : Math.round(observedTdee),
    tdee: Math.round(tdee),
    confidence: Math.round(confidence * 100) / 100,
    validDays: intakes.length,
    weighIns,
    trendPerWeek: trendPerWeek === null ? null : Math.round(trendPerWeek * 100) / 100,
    calories,
    ...macros,
    delta: Math.round(calories - tdee),
  };
}

/**
 * Wochen-Vorschlag: nur wenn die letzte Prüfung ≥ 7 Tage her ist und sich das
 * Ziel spürbar ändert; Sprünge werden pro Woche auf ±150 kcal begrenzt.
 */
export function weeklySuggestion(
  estimate: EnergyEstimate | null,
  profile: EnergyProfile,
  currentCalories: number,
  today: string
): { calories: number; protein: number; carbs: number; fat: number } | null {
  if (!estimate || !profile.enabled) return null;
  if (profile.lastReview && daysBetween(profile.lastReview, today) < 7) return null;
  const diff = estimate.calories - currentCalories;
  if (Math.abs(diff) < 50) return null;
  const step = Math.max(-WEEKLY_STEP_LIMIT, Math.min(WEEKLY_STEP_LIMIT, diff));
  const calories = round10(currentCalories + step);
  return { calories, ...macrosFor(calories, estimate.weightKg, profile.proteinPerKg) };
}

export function normalizeProfile(raw: unknown): EnergyProfile {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Partial<EnergyProfile>;
  const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
  return {
    enabled: Boolean(p.enabled),
    sex: p.sex === 'f' ? 'f' : 'm',
    heightCm: num(p.heightCm, DEFAULT_ENERGY_PROFILE.heightCm),
    birthYear: num(p.birthYear, DEFAULT_ENERGY_PROFILE.birthYear),
    activity: num(p.activity, DEFAULT_ENERGY_PROFILE.activity),
    goal: p.goal === 'maintain' || p.goal === 'gain' ? p.goal : 'lose',
    ratePct: num(p.ratePct, DEFAULT_ENERGY_PROFILE.ratePct),
    proteinPerKg: num(p.proteinPerKg, DEFAULT_ENERGY_PROFILE.proteinPerKg),
    lastReview: typeof p.lastReview === 'string' ? p.lastReview : null,
  };
}
