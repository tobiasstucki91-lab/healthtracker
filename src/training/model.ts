// ============================================================================
// TRAININGSLOGGER: Datenmodell & Hilfsfunktionen (ohne React, testbar)
// ----------------------------------------------------------------------------
// exercises         Übungs-Bibliothek            { id, name, custom? }
// workoutTemplates  gespeicherte Workouts         { id, name, exerciseIds[] }
// workoutsByDate    absolvierte Einheiten je Tag  Session (siehe unten)
// ============================================================================

export interface Exercise {
  id: string;
  name: string;
  custom?: boolean;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exerciseIds: string[];
}

export interface SetEntry {
  kg: number | null;
  reps: number | null;
  done: boolean;
}

export interface SessionExercise {
  uid: string;
  exerciseId: string;
  name: string;
  sets: SetEntry[];
}

export interface Session {
  id: string;
  templateId: string | null;
  name: string;
  startedAt: string;
  exercises: SessionExercise[];
}

export type WorkoutsByDate = Record<string, Session[]>;

export const DEFAULT_EXERCISES: Exercise[] = [
  { id: 'ex-bench', name: 'Bankdrücken' },
  { id: 'ex-incline-db', name: 'Schrägbankdrücken (Kurzhantel)' },
  { id: 'ex-ohp', name: 'Schulterdrücken' },
  { id: 'ex-lateral', name: 'Seitheben' },
  { id: 'ex-dips', name: 'Dips' },
  { id: 'ex-triceps', name: 'Trizepsdrücken (Kabel)' },
  { id: 'ex-pullup', name: 'Klimmzüge' },
  { id: 'ex-latpull', name: 'Latziehen' },
  { id: 'ex-row', name: 'Langhantelrudern' },
  { id: 'ex-cablerow', name: 'Rudern am Kabel' },
  { id: 'ex-curl', name: 'Bizepscurls' },
  { id: 'ex-squat', name: 'Kniebeuge' },
  { id: 'ex-deadlift', name: 'Kreuzheben' },
  { id: 'ex-rdl', name: 'Rumänisches Kreuzheben' },
  { id: 'ex-legpress', name: 'Beinpresse' },
  { id: 'ex-lunge', name: 'Ausfallschritte' },
  { id: 'ex-legcurl', name: 'Beinbeuger' },
  { id: 'ex-legext', name: 'Beinstrecker' },
  { id: 'ex-calf', name: 'Wadenheben' },
  { id: 'ex-plank', name: 'Plank (Sekunden)' },
];

const DEFAULT_SET_COUNT = 3;

export function emptySets(n = DEFAULT_SET_COUNT): SetEntry[] {
  return Array.from({ length: n }, () => ({ kg: null, reps: null, done: false }));
}

const hasValues = (s: SetEntry) => (s.reps ?? 0) > 0 || (s.kg ?? 0) > 0;

/**
 * Letzte Leistung einer Übung vor `date` (bzw. am selben Tag in einer anderen
 * Einheit). Liefert nur Sätze mit Werten.
 */
export function lastPerformance(
  workoutsByDate: WorkoutsByDate,
  exerciseId: string,
  date: string,
  excludeSessionId: string | null = null
): { date: string; sets: SetEntry[] } | null {
  const dates = Object.keys(workoutsByDate)
    .filter((d) => d <= date)
    .sort()
    .reverse();
  for (const d of dates) {
    const sessions = [...(workoutsByDate[d] || [])].reverse();
    for (const session of sessions) {
      if (!session || session.id === excludeSessionId) continue;
      for (const ex of session.exercises || []) {
        if (ex.exerciseId !== exerciseId) continue;
        const sets = (ex.sets || []).filter(hasValues);
        if (sets.length > 0) return { date: d, sets };
      }
    }
  }
  return null;
}

/** Neue Einheit; Sätze werden mit den Werten vom letzten Mal vorbelegt. */
export function createSession(opts: {
  template: WorkoutTemplate | null;
  exercises: Exercise[];
  workoutsByDate: WorkoutsByDate;
  date: string;
  newId: (prefix: string) => string;
  now?: Date;
}): Session {
  const { template, exercises, workoutsByDate, date, newId } = opts;
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const ids = template ? template.exerciseIds.filter((id) => byId.has(id)) : [];
  return {
    id: newId('wo'),
    templateId: template ? template.id : null,
    name: template ? template.name : 'Freies Training',
    startedAt: (opts.now ?? new Date()).toISOString(),
    exercises: ids.map((id) => sessionExercise(byId.get(id)!, workoutsByDate, date, newId)),
  };
}

export function sessionExercise(
  exercise: Exercise,
  workoutsByDate: WorkoutsByDate,
  date: string,
  newId: (prefix: string) => string
): SessionExercise {
  const last = lastPerformance(workoutsByDate, exercise.id, date);
  return {
    uid: newId('wex'),
    exerciseId: exercise.id,
    name: exercise.name,
    sets: last
      ? last.sets.map((s) => ({ kg: s.kg, reps: s.reps, done: false }))
      : emptySets(),
  };
}

/** Bewegtes Gewicht (kg × Wdh.) aller abgehakten Sätze */
export function sessionVolume(session: Session): number {
  let total = 0;
  for (const ex of session.exercises || []) {
    for (const s of ex.sets || []) {
      if (s.done) total += (s.kg ?? 0) * (s.reps ?? 0);
    }
  }
  return Math.round(total);
}

export function doneSetCount(session: Session): number {
  return (session.exercises || []).reduce(
    (n, ex) => n + (ex.sets || []).filter((s) => s.done).length,
    0
  );
}

const fmtKg = (kg: number | null) =>
  kg === null || kg === undefined ? '–' : Number(kg).toLocaleString('de-DE', { maximumFractionDigits: 2 });

/** "3 × 8 · 80 kg" bei gleichen Sätzen, sonst "80×8 · 80×7 · 75×8" */
export function formatSets(sets: SetEntry[]): string {
  const valid = sets.filter(hasValues);
  if (valid.length === 0) return '';
  const first = valid[0];
  const uniform = valid.every((s) => s.kg === first.kg && s.reps === first.reps);
  if (uniform) {
    return first.kg
      ? `${valid.length} × ${first.reps ?? '–'} · ${fmtKg(first.kg)} kg`
      : `${valid.length} × ${first.reps ?? '–'}`;
  }
  return valid.map((s) => (s.kg ? `${fmtKg(s.kg)}×${s.reps ?? '–'}` : `${s.reps ?? '–'}`)).join(' · ');
}

/** Geschätztes 1-Wiederholungs-Maximum (Epley) */
export function estimateOneRepMax(kg: number, reps: number): number {
  if (!kg || !reps) return 0;
  return reps === 1 ? kg : kg * (1 + reps / 30);
}

/** Bester Satz (höchstes geschätztes 1RM) einer Übung über alle Einheiten */
export function personalBest(
  workoutsByDate: WorkoutsByDate,
  exerciseId: string
): { date: string; kg: number; reps: number; oneRm: number } | null {
  let best: { date: string; kg: number; reps: number; oneRm: number } | null = null;
  for (const [date, sessions] of Object.entries(workoutsByDate)) {
    for (const session of sessions || []) {
      for (const ex of session.exercises || []) {
        if (ex.exerciseId !== exerciseId) continue;
        for (const s of ex.sets || []) {
          if (!s.done || !s.kg || !s.reps) continue;
          const oneRm = estimateOneRepMax(s.kg, s.reps);
          if (!best || oneRm > best.oneRm) best = { date, kg: s.kg, reps: s.reps, oneRm };
        }
      }
    }
  }
  return best;
}

/** Letzte Einheiten (neueste zuerst) */
export function recentSessions(workoutsByDate: WorkoutsByDate, limit = 10): Array<{ date: string; session: Session }> {
  const out: Array<{ date: string; session: Session }> = [];
  for (const date of Object.keys(workoutsByDate).sort().reverse()) {
    for (const session of [...(workoutsByDate[date] || [])].reverse()) {
      out.push({ date, session });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export function parseNum(raw: string): number | null {
  const v = parseFloat(String(raw).replace(',', '.'));
  return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : null;
}
