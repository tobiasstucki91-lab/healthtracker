// ============================================================================
// HABIT-HÄUFIGKEIT: täglich oder X-mal pro Woche (Woche = Mo–So)
// ----------------------------------------------------------------------------
// Ein Habit speichert `perWeek` (1–6). Fehlt der Wert (oder ist er 7), ist das
// Habit täglich. Abhaken bleibt pro Tag; ausgewertet wird pro Woche.
// ============================================================================

export interface HabitLike {
  id: string;
  perWeek?: number | null;
}

export type ChecksByDate = Record<string, Record<string, boolean>>;

const DAY_MS = 24 * 60 * 60 * 1000;
const toUtc = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDaysKey = (key: string, delta: number) => fromUtc(toUtc(key) + delta * DAY_MS);

/** Wöchentliches Ziel (1–6) oder null für täglich */
export function weeklyTarget(habit: HabitLike): number | null {
  const n = Number(habit.perWeek);
  return Number.isInteger(n) && n >= 1 && n <= 6 ? n : null;
}

/** Montag der Woche, in der `date` liegt */
export function weekStart(date: string): string {
  const weekday = new Date(toUtc(date)).getUTCDay(); // 0 = So
  return addDaysKey(date, -((weekday + 6) % 7));
}

export function weekDays(date: string): string[] {
  const start = weekStart(date);
  return Array.from({ length: 7 }, (_, i) => addDaysKey(start, i));
}

/** Wie oft wurde das Habit in der Woche von `date` abgehakt (ganze Woche Mo–So) */
export function weekCount(checks: ChecksByDate, habitId: string, date: string): number {
  return weekDays(date).filter((d) => checks[d]?.[habitId]).length;
}

/**
 * Gilt das Habit an `date` als erledigt?
 * Täglich: an dem Tag abgehakt. Wöchentlich: an dem Tag abgehakt oder
 * Wochenziel bereits erreicht.
 */
export function isSatisfied(habit: HabitLike, checks: ChecksByDate, date: string): boolean {
  if (checks[date]?.[habit.id]) return true;
  const target = weeklyTarget(habit);
  return target !== null && weekCount(checks, habit.id, date) >= target;
}

/**
 * Serie: täglich = Tage am Stück, wöchentlich = Wochen am Stück mit erreichtem Ziel.
 * Der laufende Tag bzw. die laufende Woche zählt mit, sobald erfüllt; sonst
 * beginnt die Zählung beim Tag bzw. der Woche davor.
 */
export function streak(habit: HabitLike, checks: ChecksByDate, date: string): { count: number; unit: 'day' | 'week' } {
  const target = weeklyTarget(habit);
  if (target === null) {
    let cursor = checks[date]?.[habit.id] ? date : addDaysKey(date, -1);
    let count = 0;
    while (count < 3650 && checks[cursor]?.[habit.id]) {
      count++;
      cursor = addDaysKey(cursor, -1);
    }
    return { count, unit: 'day' };
  }
  let cursor = weekStart(date);
  if (weekCount(checks, habit.id, cursor) < target) cursor = addDaysKey(cursor, -7);
  let count = 0;
  while (count < 520 && weekCount(checks, habit.id, cursor) >= target) {
    count++;
    cursor = addDaysKey(cursor, -7);
  }
  return { count, unit: 'week' };
}

export const FREQUENCY_OPTIONS = [
  { value: 0, label: 'Täglich' },
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: `${n}× pro Woche` })),
];

export function frequencyLabel(habit: HabitLike): string {
  const t = weeklyTarget(habit);
  return t === null ? 'Täglich' : `${t}× pro Woche`;
}
