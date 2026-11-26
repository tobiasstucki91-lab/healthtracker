import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronDown,
  Dumbbell,
  Pencil,
  Play,
  Plus,
  Search,
  Timer,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { ZoneHeader } from './ZoneHeader';
import { useUi } from '../ui/UiContext';
import {
  DEFAULT_EXERCISES,
  createSession,
  doneSetCount,
  estimateOneRepMax,
  formatSets,
  lastPerformance,
  parseNum,
  personalBest,
  recentSessions,
  sessionExercise,
  sessionVolume,
  type Exercise,
  type Session,
  type SessionExercise,
  type SetEntry,
  type WorkoutTemplate,
  type WorkoutsByDate,
} from '../training/model';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppDataLike = Record<string, any>;

interface Props {
  appData: AppDataLike;
  setAppData: (fn: (prev: AppDataLike) => AppDataLike) => void;
  selectedDate: string;
  dateLabel: string;
  onSelectDate: (date: string) => void;
  notify: (message: string, snapshot?: AppDataLike | null, accent?: 'emerald' | 'amber' | 'rose' | 'sky') => void;
}

const REST_STORAGE_KEY = 'hht_rest_timer_sec';
const REST_OPTIONS = [
  { sec: 0, label: 'Aus' },
  { sec: 60, label: '60s' },
  { sec: 90, label: '90s' },
  { sec: 120, label: '2m' },
  { sec: 180, label: '3m' },
];

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    // ignorieren
  }
}

function formatTimer(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const card = 'ui-card rounded-2xl';
const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none';
const btnPrimary = `${btn} bg-emerald-400 text-zinc-950 hover:bg-emerald-300`;
const btnSecondary = `${btn} bg-zinc-800 text-zinc-100 border border-zinc-700 hover:bg-zinc-700`;
const btnGhost = `${btn} text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800`;
const field =
  'w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500';

const formatDateDE = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
};

/** Zahlenfeld, das Zwischenstände wie "82," zulässt und beim Verlassen übernimmt */
function NumInput({
  value,
  onCommit,
  label,
  placeholder,
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
  label: string;
  placeholder?: string;
}) {
  const [text, setText] = useState(value === null || value === undefined ? '' : String(value).replace('.', ','));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(value === null || value === undefined ? '' : String(value).replace('.', ','));
  }, [value, focused]);
  return (
    <input
      type="text"
      inputMode="decimal"
      enterKeyHint="done"
      aria-label={label}
      value={text}
      placeholder={placeholder}
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onChange={(e) => {
        setText(e.target.value);
        if (!/[.,]$/.test(e.target.value)) onCommit(parseNum(e.target.value));
      }}
      onBlur={() => {
        setFocused(false);
        onCommit(parseNum(text));
      }}
      className="w-full h-11 px-2 text-center text-sm font-bold tabular-nums bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
    />
  );
}

export function TrainingView({ appData, setAppData, selectedDate, dateLabel, onSelectDate, notify }: Props) {
  const { uiVariant } = useUi();
  const exercises: Exercise[] =
    Array.isArray(appData.exercises) && appData.exercises.length > 0 ? appData.exercises : DEFAULT_EXERCISES;
  const templates: WorkoutTemplate[] = Array.isArray(appData.workoutTemplates) ? appData.workoutTemplates : [];
  const workoutsByDate: WorkoutsByDate = appData.workoutsByDate || {};
  const sessions: Session[] = workoutsByDate[selectedDate] || [];
  const exById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const sortedExercises = useMemo(
    () => [...exercises].sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [exercises]
  );

  const [editing, setEditing] = useState<WorkoutTemplate | null>(null);
  // Aufgeklappte Einheiten; ohne Eintrag ist nur die neueste des Tages offen
  const [openSessions, setOpenSessions] = useState<Record<string, boolean>>({});
  const newestId = sessions.length > 0 ? sessions[sessions.length - 1].id : null;
  const isOpen = (id: string) => openSessions[id] ?? id === newestId;
  const [newExerciseName, setNewExerciseName] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);

  // Pausentimer (Zeitstempel-basiert, damit er auch bei gesperrtem Android-Bildschirm exakt bleibt)
  const [restPreset, setRestPreset] = useState<number>(() => {
    try {
      const raw = Number(localStorage.getItem(REST_STORAGE_KEY));
      return Number.isFinite(raw) && raw >= 0 ? raw : 90;
    } catch {
      return 90;
    }
  });
  const [restEndAt, setRestEndAt] = useState<number | null>(null);
  const [restTotalSec, setRestTotalSec] = useState<number>(90);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const notifyRef = useRef(notify);
  notifyRef.current = notify;

  const updateRestPreset = (sec: number) => {
    setRestPreset(sec);
    try {
      localStorage.setItem(REST_STORAGE_KEY, String(sec));
    } catch {
      // ignorieren
    }
    if (sec === 0) setRestEndAt(null);
  };

  const startRestTimer = (seconds = restPreset) => {
    if (seconds <= 0) return;
    const now = Date.now();
    setNowMs(now);
    setRestTotalSec(seconds);
    setRestEndAt(now + seconds * 1000);
  };

  const adjustRestTimer = (deltaSec: number) => {
    setRestEndAt((prev) => {
      if (!prev) return null;
      const next = Math.max(Date.now() + 1000, prev + deltaSec * 1000);
      if (deltaSec > 0) setRestTotalSec((t) => Math.max(t, Math.ceil((next - Date.now()) / 1000)));
      return next;
    });
  };

  useEffect(() => {
    if (!restEndAt) return;
    const tick = () => {
      const now = Date.now();
      setNowMs(now);
      if (now >= restEndAt) {
        setRestEndAt(null);
        vibrate([120, 80, 120]);
        notifyRef.current('Pause vorbei – nächster Satz!', null, 'emerald');
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [restEndAt]);

  const restRemainingSec = restEndAt ? Math.max(0, Math.ceil((restEndAt - nowMs) / 1000)) : 0;
  const restPct =
    restEndAt && restTotalSec > 0
      ? Math.max(0, Math.min(100, ((restEndAt - nowMs) / (restTotalSec * 1000)) * 100))
      : 0;

  // ---------------------------------------------------------------------------
  // Daten ändern
  // ---------------------------------------------------------------------------
  const updateSessions = (fn: (list: Session[]) => Session[]) =>
    setAppData((prev) => {
      const all = { ...(prev.workoutsByDate || {}) };
      const next = fn(all[selectedDate] || []);
      if (next.length > 0) all[selectedDate] = next;
      else delete all[selectedDate];
      return { ...prev, workoutsByDate: all };
    });

  const updateSession = (sessionId: string, fn: (s: Session) => Session) =>
    updateSessions((list) => list.map((s) => (s.id === sessionId ? fn(s) : s)));

  const updateExercise = (sessionId: string, uid: string, fn: (e: SessionExercise) => SessionExercise) =>
    updateSession(sessionId, (s) => ({ ...s, exercises: s.exercises.map((e) => (e.uid === uid ? fn(e) : e)) }));

  const updateSet = (sessionId: string, uid: string, idx: number, patch: Partial<SetEntry>) =>
    updateExercise(sessionId, uid, (e) => ({
      ...e,
      sets: e.sets.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));

  const setExercises = (list: Exercise[]) => setAppData((prev) => ({ ...prev, exercises: list }));
  const setTemplates = (fn: (list: WorkoutTemplate[]) => WorkoutTemplate[]) =>
    setAppData((prev) => ({
      ...prev,
      workoutTemplates: fn(Array.isArray(prev.workoutTemplates) ? prev.workoutTemplates : []),
    }));

  const startSession = (template: WorkoutTemplate | null) => {
    const session = createSession({ template, exercises, workoutsByDate, date: selectedDate, newId });
    updateSessions((list) => [...list, session]);
    // neue Einheit aufklappen, die übrigen zuklappen
    setOpenSessions(Object.fromEntries([...sessions.map((x) => [x.id, false]), [session.id, true]]));
    notify(template ? `Workout „${template.name}“ gestartet` : 'Freies Training gestartet');
  };

  const addExerciseToSession = (sessionId: string, exerciseId: string) => {
    const ex = exById.get(exerciseId);
    if (!ex) return;
    updateSession(sessionId, (s) => ({
      ...s,
      exercises: [...s.exercises, sessionExercise(ex, workoutsByDate, selectedDate, newId)],
    }));
  };

  const saveSessionAsTemplate = (session: Session, name: string) => {
    const tpl: WorkoutTemplate = { id: newId('wtpl'), name, exerciseIds: session.exercises.map((e) => e.exerciseId) };
    setTemplates((list) => [...list, tpl]);
    updateSession(session.id, (s) => ({ ...s, templateId: tpl.id, name }));
    notify(`Workout „${name}“ gespeichert`);
  };

  const createExercise = (name: string): Exercise | null => {
    const clean = name.trim();
    if (!clean) return null;
    const existing = exercises.find((e) => e.name.toLowerCase() === clean.toLowerCase());
    if (existing) return existing;
    const ex: Exercise = { id: newId('ex'), name: clean, custom: true };
    setExercises([...exercises, ex]);
    return ex;
  };

  const saveTemplate = () => {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name || editing.exerciseIds.length === 0) return;
    const tpl = { ...editing, name };
    setTemplates((list) => (list.some((t) => t.id === tpl.id) ? list.map((t) => (t.id === tpl.id ? tpl : t)) : [...list, tpl]));
    setEditing(null);
    notify(`Workout „${name}“ gespeichert`);
  };

  const history = recentSessions(workoutsByDate, 8);

  return (
    <div className={uiVariant === 'kinetic' ? 'space-y-8 sm:space-y-10 max-w-4xl' : 'space-y-8 sm:space-y-10 max-w-4xl mx-auto'}>
      {/* ================================================================ */}
      {/* TRAINING AM GEWÄHLTEN TAG                                       */}
      {/* ================================================================ */}
      <section aria-labelledby="zone-training" className="space-y-3">
        <ZoneHeader
          id="zone-training"
          title={`Training · ${dateLabel}`}
          right={
            <div className="flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-zinc-500" />
              <select
                value={restPreset}
                onChange={(e) => updateRestPreset(Number(e.target.value))}
                aria-label="Automatischer Pausentimer nach Satz"
                className="h-7 px-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-semibold text-zinc-300 focus:outline-none focus:border-emerald-500"
              >
                {REST_OPTIONS.map((o) => (
                  <option key={o.sec} value={o.sec}>
                    Pause: {o.label}
                  </option>
                ))}
              </select>
            </div>
          }
        />

        {restEndAt && (
          <div className="sticky top-[4.5rem] z-20 rounded-2xl border border-emerald-500/40 bg-zinc-900/95 backdrop-blur-md p-3 shadow-[0_12px_32px_rgba(0,0,0,0.55)] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Timer className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-zinc-300">Satzpause</span>
                <span className="text-lg font-bold text-emerald-400 tabular-nums">
                  {formatTimer(restRemainingSec)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => adjustRestTimer(-15)}
                  className={`${btnSecondary} h-9 px-2.5 text-xs tabular-nums`}
                >
                  -15s
                </button>
                <button
                  type="button"
                  onClick={() => adjustRestTimer(30)}
                  className={`${btnSecondary} h-9 px-2.5 text-xs tabular-nums`}
                >
                  +30s
                </button>
                <button
                  type="button"
                  onClick={() => setRestEndAt(null)}
                  aria-label="Pausentimer stoppen"
                  className={`${btnGhost} w-9 h-9`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-950 overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-200"
                style={{ width: `${restPct}%` }}
              />
            </div>
          </div>
        )}

        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            open={isOpen(session.id)}
            onToggle={() => setOpenSessions((m) => ({ ...m, [session.id]: !isOpen(session.id) }))}
            selectedDate={selectedDate}
            workoutsByDate={workoutsByDate}
            exercises={sortedExercises}
            onUpdateSet={updateSet}
            onUpdateExercise={updateExercise}
            onAddExercise={addExerciseToSession}
            onRemoveExercise={(sid, uid, exName) => {
              const snapshot = appData;
              updateSession(sid, (s) => ({ ...s, exercises: s.exercises.filter((e) => e.uid !== uid) }));
              notify(`Übung „${exName}“ entfernt`, snapshot, 'amber');
            }}
            onRemoveSet={(sid, uid, idx) => {
              const snapshot = appData;
              updateExercise(sid, uid, (e) => ({ ...e, sets: e.sets.filter((_, i) => i !== idx) }));
              notify(`Satz ${idx + 1} entfernt`, snapshot, 'amber');
            }}
            onRemoveSession={() => {
              const snapshot = appData;
              updateSessions((list) => list.filter((s) => s.id !== session.id));
              notify(`Training „${session.name}“ gelöscht`, snapshot, 'amber');
            }}
            onSetCompleted={() => {
              vibrate(30);
              startRestTimer();
            }}
            onSaveAsTemplate={(name) => saveSessionAsTemplate(session, name)}
            onCreateExercise={createExercise}
          />
        ))}

        <div className={`${card} p-4 space-y-3`}>
          <div className="text-xs text-zinc-400">
            {sessions.length === 0
              ? 'Noch kein Training an diesem Tag. Starte ein gespeichertes Workout:'
              : 'Weiteres Workout starten:'}
          </div>
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <button key={t.id} type="button" onClick={() => startSession(t)} className={`${btnPrimary} h-11 px-4 text-sm`}>
                <Play className="w-4 h-4" />
                {t.name}
              </button>
            ))}
            <button type="button" onClick={() => startSession(null)} className={`${btnSecondary} h-11 px-4 text-sm`}>
              <Plus className="w-4 h-4" />
              Freies Training
            </button>
          </div>
          {templates.length === 0 && (
            <div className="text-[11px] text-zinc-500">
              Tipp: Lege unten unter „Meine Workouts“ ein Workout aus mehreren Übungen an.
            </div>
          )}
        </div>
      </section>

      {/* ================================================================ */}
      {/* GESPEICHERTE WORKOUTS                                            */}
      {/* ================================================================ */}
      <section aria-labelledby="zone-workouts" className="space-y-3">
        <ZoneHeader
          id="zone-workouts"
          title="Meine Workouts"
          right={
            !editing && (
              <button
                type="button"
                onClick={() => setEditing({ id: newId('wtpl'), name: '', exerciseIds: [] })}
                className={`${btnGhost} h-8 px-2.5 text-xs`}
              >
                <Plus className="w-3.5 h-3.5" />
                Neues Workout
              </button>
            )
          }
        />

        {editing && (
          <TemplateEditor
            value={editing}
            onChange={setEditing}
            exercises={sortedExercises}
            exById={exById}
            onCreateExercise={createExercise}
            onSave={saveTemplate}
            onCancel={() => setEditing(null)}
          />
        )}

        {templates.length === 0 && !editing ? (
          <div className={`${card} p-5 text-center text-xs text-zinc-400`}>
            Noch keine Workouts gespeichert.{' '}
            <button
              type="button"
              onClick={() => setEditing({ id: newId('wtpl'), name: '', exerciseIds: [] })}
              className="text-emerald-400 font-semibold hover:underline"
            >
              Jetzt anlegen
            </button>
          </div>
        ) : (
          <ul className={`${card} divide-y divide-zinc-800 overflow-hidden`}>
            {templates.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-zinc-100">{t.name}</div>
                  <div className="text-[11px] text-zinc-500 truncate">
                    {t.exerciseIds.map((id) => exById.get(id)?.name).filter(Boolean).join(' · ') || 'Keine Übungen'}
                  </div>
                </div>
                <button type="button" onClick={() => startSession(t)} className={`${btnPrimary} h-9 px-3 text-xs`}>
                  <Play className="w-3.5 h-3.5" />
                  Start
                </button>
                <button
                  type="button"
                  onClick={() => setEditing({ ...t, exerciseIds: [...t.exerciseIds] })}
                  aria-label={`${t.name} bearbeiten`}
                  className={`${btnGhost} w-9 h-9`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const snapshot = appData;
                    setTemplates((list) => list.filter((x) => x.id !== t.id));
                    notify(`Workout „${t.name}“ gelöscht`, snapshot, 'amber');
                  }}
                  aria-label={`${t.name} löschen`}
                  className={`${btnGhost} w-10 h-10 hover:text-rose-400`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ================================================================ */}
      {/* VERLAUF                                                          */}
      {/* ================================================================ */}
      <section aria-labelledby="zone-verlauf" className="space-y-3">
        <ZoneHeader id="zone-verlauf" title="Verlauf" />
        {history.length === 0 ? (
          <div className={`${card} p-5 text-center text-xs text-zinc-400`}>Noch keine Trainings geloggt.</div>
        ) : (
          <ul className={`${card} divide-y divide-zinc-800 overflow-hidden`}>
            {history.map(({ date, session }) => (
              <li key={session.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectDate(date);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800/60 transition"
                >
                  <span className="w-24 shrink-0 text-xs text-zinc-400 tabular-nums">{formatDateDE(date)}</span>
                  <span className="flex-1 min-w-0 text-sm text-zinc-100 truncate">{session.name}</span>
                  <span className="text-[11px] text-zinc-400 tabular-nums text-right">
                    {doneSetCount(session)} {doneSetCount(session) === 1 ? 'Satz' : 'Sätze'}
                    <span className="hidden sm:inline"> · {sessionVolume(session).toLocaleString('de-DE')} kg</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ================================================================ */}
      {/* ÜBUNGEN                                                          */}
      {/* ================================================================ */}
      <section aria-labelledby="zone-uebungen" className="space-y-3">
        <ZoneHeader
          id="zone-uebungen"
          title="Übungen"
          right={
            <button type="button" onClick={() => setShowLibrary((v) => !v)} className={`${btnGhost} h-8 px-2.5 text-xs`}>
              {showLibrary ? 'Ausblenden' : `Alle ${exercises.length} anzeigen`}
            </button>
          }
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const ex = createExercise(newExerciseName);
            if (ex) {
              notify(`Übung „${ex.name}“ angelegt`);
              setNewExerciseName('');
            }
          }}
          className="flex gap-2"
        >
          <label htmlFor="new-exercise" className="sr-only">Neue Übung</label>
          <input
            id="new-exercise"
            value={newExerciseName}
            onChange={(e) => setNewExerciseName(e.target.value)}
            placeholder="Neue Übung, z. B. Hip Thrust"
            className={field}
          />
          <button type="submit" disabled={!newExerciseName.trim()} className={`${btnSecondary} h-10 px-3 text-sm shrink-0`}>
            <Plus className="w-4 h-4" />
            Anlegen
          </button>
        </form>
        {showLibrary && (
          <ul className={`${card} divide-y divide-zinc-800 overflow-hidden`}>
            {sortedExercises.map((ex) => {
              const pb = personalBest(workoutsByDate, ex.id);
              return (
                <li key={ex.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex-1 min-w-0 text-sm text-zinc-100 truncate">{ex.name}</span>
                  {pb && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 tabular-nums">
                      <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                      {pb.kg.toLocaleString('de-DE')} kg × {pb.reps}
                    </span>
                  )}
                  {ex.custom && (
                    <button
                      type="button"
                      onClick={() => {
                        const snapshot = appData;
                        setExercises(exercises.filter((e) => e.id !== ex.id));
                        notify(`Übung „${ex.name}“ gelöscht`, snapshot, 'amber');
                      }}
                      aria-label={`${ex.name} löschen`}
                      className={`${btnGhost} w-9 h-9 hover:text-rose-400`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

// =============================================================================
// Eine Trainingseinheit mit Übungen und Sätzen
// =============================================================================

function SessionCard({
  session,
  open,
  onToggle,
  selectedDate,
  workoutsByDate,
  exercises,
  onUpdateSet,
  onUpdateExercise,
  onAddExercise,
  onRemoveExercise,
  onRemoveSet,
  onRemoveSession,
  onSetCompleted,
  onSaveAsTemplate,
  onCreateExercise,
}: {
  session: Session;
  open: boolean;
  onToggle: () => void;
  selectedDate: string;
  workoutsByDate: WorkoutsByDate;
  exercises: Exercise[];
  onUpdateSet: (sessionId: string, uid: string, idx: number, patch: Partial<SetEntry>) => void;
  onUpdateExercise: (sessionId: string, uid: string, fn: (e: SessionExercise) => SessionExercise) => void;
  onAddExercise: (sessionId: string, exerciseId: string) => void;
  onRemoveExercise: (sessionId: string, uid: string, name: string) => void;
  onRemoveSet: (sessionId: string, uid: string, idx: number) => void;
  onRemoveSession: () => void;
  onSetCompleted: () => void;
  onSaveAsTemplate: (name: string) => void;
  onCreateExercise: (name: string) => Exercise | null;
}) {
  const [adding, setAdding] = useState(false);
  const [exerciseFilter, setExerciseFilter] = useState('');
  const [savingName, setSavingName] = useState<string | null>(null);
  const done = doneSetCount(session);
  const volume = sessionVolume(session);
  const totalSets = session.exercises.reduce((n, e) => n + e.sets.length, 0);
  // Übungen als Akkordeon: offen ist die gewählte, sonst die erste unfertige
  const [openUid, setOpenUid] = useState<string | null | undefined>(undefined);
  const autoUid = session.exercises.find((e) => e.sets.length === 0 || e.sets.some((x) => !x.done))?.uid ?? null;
  const activeUid = openUid === undefined ? autoUid : openUid;

  const filteredExercises = useMemo(() => {
    const q = exerciseFilter.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((x) => x.name.toLowerCase().includes(q));
  }, [exercises, exerciseFilter]);


  return (
    <article className="ui-card rounded-2xl overflow-hidden">
      <header className={`flex items-center gap-2 pl-2 pr-3 py-2 bg-zinc-900 ${open ? 'border-b border-zinc-800' : ''}`}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex-1 min-w-0 flex items-center gap-3 px-2 py-1.5 rounded-xl text-left hover:bg-zinc-800/60 transition"
        >
          <Dumbbell className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-zinc-100 truncate">{session.name}</span>
            <span className="block text-[11px] text-zinc-500 tabular-nums truncate">
              {session.exercises.length} {session.exercises.length === 1 ? 'Übung' : 'Übungen'} · {done}/{totalSets} Sätze
              {volume > 0 ? ` · ${volume.toLocaleString('de-DE')} kg` : ''}
            </span>
            {!open && session.exercises.length > 0 && (
              <span className="block text-[11px] text-zinc-400 truncate">
                {session.exercises.map((e) => e.name).join(' · ')}
              </span>
            )}
          </span>
          <ChevronDown className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>
        <button
          type="button"
          onClick={onRemoveSession}
          aria-label="Training löschen"
          className={`${btnGhost} w-10 h-10 hover:text-rose-400`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </header>

      {open && (<>
      <div className="divide-y divide-zinc-800">
        {session.exercises.map((ex) => {
            const last = lastPerformance(workoutsByDate, ex.exerciseId, selectedDate, session.id);
            const lastText = last ? formatSets(last.sets) : '';
            const pb = personalBest(workoutsByDate, ex.exerciseId);
            const hasSessionPb =
              pb !== null &&
              ex.sets.some(
                (s) => s.done && s.kg && s.reps && estimateOneRepMax(s.kg, s.reps) >= pb.oneRm - 0.01
              );
            const exDone = ex.sets.filter((x) => x.done).length;
            const allDone = ex.sets.length > 0 && exDone === ex.sets.length;
            const expanded = activeUid === ex.uid;
            if (!expanded) {
              const doneText = formatSets(ex.sets.filter((x) => x.done));
              return (
                <button
                  key={ex.uid}
                  type="button"
                  onClick={() => setOpenUid(ex.uid)}
                  aria-expanded={false}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-zinc-800/50 transition"
                >
                  {allDone ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <span className="w-5 h-5 rounded-full border border-zinc-600 shrink-0" aria-hidden="true" />
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className={`text-sm font-semibold truncate ${allDone ? 'text-zinc-300' : 'text-zinc-100'}`}>
                        {ex.name}
                      </span>
                      {hasSessionPb && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-300 shrink-0">
                          <Trophy className="w-3 h-3" />
                          PR
                        </span>
                      )}
                    </span>
                    <span className="block text-[11px] text-zinc-500 tabular-nums truncate">
                      {exDone}/{ex.sets.length} Sätze{doneText ? ` · ${doneText}` : lastText ? ` · Letztes Mal: ${lastText}` : ''}
                    </span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0 -rotate-90" />
                </button>
              );
            }
            return (
              <div key={ex.uid} className="px-4 py-3.5 space-y-2.5 bg-zinc-900">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenUid(null)}
                    aria-expanded={true}
                    className="flex-1 min-w-0 text-left py-0.5"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-100">
                      <span className="truncate">{ex.name}</span>
                      {hasSessionPb && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-300 shrink-0">
                          <Trophy className="w-3 h-3" />
                          PR
                        </span>
                      )}
                      <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                    </span>
                    {lastText && (
                      <span className="block text-[11px] text-zinc-500 tabular-nums">
                        Letztes Mal: {lastText}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveExercise(session.id, ex.uid, ex.name)}
                    aria-label={`${ex.name} entfernen`}
                    className={`${btnGhost} w-9 h-9 hover:text-rose-400 shrink-0`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)_3rem_2.25rem] items-center gap-2 text-[11px] text-zinc-500">
                  <span className="text-center">Satz</span>
                  <span className="text-center">kg</span>
                  <span className="text-center">Wdh.</span>
                  <span className="text-center">Fertig</span>
                  <span />
                  {ex.sets.map((set, idx) => (
                    <SetRow
                      key={idx}
                      index={idx}
                      set={set}
                      onChange={(patch) => {
                        onUpdateSet(session.id, ex.uid, idx, patch);
                        if (patch.done === true) {
                          onSetCompleted();
                          // Alle Sätze dieser Übung jetzt fertig? Automatisch zur nächsten offenen Übung springen
                          const willAllBeDone = ex.sets.every((s, i) => (i === idx ? true : s.done));
                          if (willAllBeDone) setOpenUid(undefined);
                        }
                      }}
                      onRemove={() => onRemoveSet(session.id, ex.uid, idx)}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateExercise(session.id, ex.uid, (e) => {
                      const prev = e.sets[e.sets.length - 1];
                      return { ...e, sets: [...e.sets, { kg: prev?.kg ?? null, reps: prev?.reps ?? null, done: false }] };
                    })
                  }
                  className={`${btnGhost} h-10 px-3 text-xs`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Satz hinzufügen
                </button>
              </div>
            );
          })}
      </div>

      <footer className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-zinc-800 bg-zinc-950/60">
        {adding ? (
          <div className="w-full space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  autoFocus
                  value={exerciseFilter}
                  onChange={(e) => setExerciseFilter(e.target.value)}
                  placeholder="Übung suchen oder neu eingeben…"
                  aria-label="Übung suchen oder neu eingeben"
                  className="w-full h-10 pl-9 pr-3 text-sm bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setExerciseFilter('');
                }}
                aria-label="Abbrechen"
                className={`${btnGhost} w-10 h-10 shrink-0`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 divide-y divide-zinc-800/80">
              {filteredExercises.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => {
                    onAddExercise(session.id, x.id);
                    setOpenUid(undefined);
                    setExerciseFilter('');
                    setAdding(false);
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-zinc-800/80 transition"
                >
                  <span className="truncate">{x.name}</span>
                  <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
                </button>
              ))}
              {exerciseFilter.trim() &&
                !exercises.some((x) => x.name.toLowerCase() === exerciseFilter.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => {
                      const ex = onCreateExercise(exerciseFilter);
                      if (ex) {
                        onAddExercise(session.id, ex.id);
                        setOpenUid(undefined);
                        setExerciseFilter('');
                        setAdding(false);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-emerald-400 hover:bg-emerald-500/10 transition"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>„{exerciseFilter.trim()}“ neu anlegen &amp; hinzufügen</span>
                  </button>
                )}
            </div>
          </div>
        ) : savingName !== null ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (savingName.trim()) {
                onSaveAsTemplate(savingName.trim());
                setSavingName(null);
              }
            }}
            className="w-full flex gap-2"
          >
            <input
              autoFocus
              value={savingName}
              onChange={(e) => setSavingName(e.target.value)}
              placeholder="Name des Workouts, z. B. Push"
              aria-label="Name des Workouts"
              className={field}
            />
            <button type="submit" disabled={!savingName.trim()} className={`${btnPrimary} h-10 px-3 text-sm shrink-0`}>
              Speichern
            </button>
            <button type="button" onClick={() => setSavingName(null)} aria-label="Abbrechen" className={`${btnGhost} w-10 h-10 shrink-0`}>
              <X className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <>
            <button type="button" onClick={() => setAdding(true)} className={`${btnSecondary} h-10 px-3 text-sm`}>
              <Plus className="w-4 h-4" />
              Übung hinzufügen
            </button>
            {!session.templateId && session.exercises.length > 0 && (
              <button type="button" onClick={() => setSavingName('')} className={`${btnGhost} h-10 px-3 text-sm`}>
                Als Workout speichern
              </button>
            )}
          </>
        )}
      </footer>
      </>)}
    </article>
  );
}

function SetRow({
  index,
  set,
  onChange,
  onRemove,
}: {
  index: number;
  set: SetEntry;
  onChange: (patch: Partial<SetEntry>) => void;
  onRemove: () => void;
}) {
  return (
    <>
      <span className="text-center text-sm font-bold text-zinc-400 tabular-nums">{index + 1}</span>
      <NumInput value={set.kg} onCommit={(kg) => onChange({ kg })} label={`Satz ${index + 1} Gewicht in kg`} placeholder="kg" />
      <NumInput value={set.reps} onCommit={(reps) => onChange({ reps })} label={`Satz ${index + 1} Wiederholungen`} placeholder="Wdh." />
      <button
        type="button"
        onClick={() => onChange({ done: !set.done })}
        aria-pressed={set.done}
        aria-label={`Satz ${index + 1} erledigt`}
        className={`h-11 rounded-xl border flex items-center justify-center active:scale-95 transition ${
          set.done
            ? 'bg-emerald-400 border-emerald-300 text-zinc-950'
            : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:text-zinc-300'
        }`}
      >
        <Check className="w-4 h-4" />
      </button>
      <button type="button" onClick={onRemove} aria-label={`Satz ${index + 1} löschen`} className={`${btnGhost} w-9 h-11 hover:text-rose-400`}>
        <X className="w-4 h-4" />
      </button>
    </>
  );
}

// =============================================================================
// Workout anlegen / bearbeiten
// =============================================================================

function TemplateEditor({
  value,
  onChange,
  exercises,
  exById,
  onCreateExercise,
  onSave,
  onCancel,
}: {
  value: WorkoutTemplate;
  onChange: (t: WorkoutTemplate) => void;
  exercises: Exercise[];
  exById: Map<string, Exercise>;
  onCreateExercise: (name: string) => Exercise | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [newName, setNewName] = useState('');
  const move = (idx: number, dir: -1 | 1) => {
    const ids = [...value.exerciseIds];
    const j = idx + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    onChange({ ...value, exerciseIds: ids });
  };
  const add = (id: string) => onChange({ ...value, exerciseIds: [...value.exerciseIds, id] });

  return (
    <div className="rounded-2xl border border-zinc-700/80 bg-zinc-900 p-4 space-y-4 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
      <div>
        <label htmlFor="tpl-name" className="block text-xs font-medium text-zinc-300 mb-1">Name des Workouts</label>
        <input
          id="tpl-name"
          autoFocus
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="z. B. Push, Pull, Beine, Ganzkörper"
          className={field}
        />
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-zinc-300">Übungen (Reihenfolge wie im Training)</div>
        {value.exerciseIds.length === 0 ? (
          <div className="text-[11px] text-zinc-500">Noch keine Übungen – füge unten welche hinzu.</div>
        ) : (
          <ol className="rounded-xl border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
            {value.exerciseIds.map((id, idx) => (
              <li key={`${id}-${idx}`} className="flex items-center gap-2 px-3 py-2 bg-zinc-950/60">
                <span className="w-5 text-xs text-zinc-500 tabular-nums">{idx + 1}.</span>
                <span className="flex-1 min-w-0 text-sm text-zinc-100 truncate">{exById.get(id)?.name ?? 'Gelöschte Übung'}</span>
                <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Nach oben" className={`${btnGhost} w-8 h-8`}>
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === value.exerciseIds.length - 1}
                  aria-label="Nach unten"
                  className={`${btnGhost} w-8 h-8`}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...value, exerciseIds: value.exerciseIds.filter((_, i) => i !== idx) })}
                  aria-label="Entfernen"
                  className={`${btnGhost} w-8 h-8 hover:text-rose-400`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ol>
        )}

        <label htmlFor="tpl-add" className="sr-only">Übung hinzufügen</label>
        <select
          id="tpl-add"
          value=""
          onChange={(e) => e.target.value && add(e.target.value)}
          className={field}
        >
          <option value="">+ Übung hinzufügen …</option>
          {exercises.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="… oder neue Übung anlegen"
            aria-label="Neue Übung anlegen"
            className={field}
          />
          <button
            type="button"
            disabled={!newName.trim()}
            onClick={() => {
              const ex = onCreateExercise(newName);
              if (ex) {
                add(ex.id);
                setNewName('');
              }
            }}
            className={`${btnSecondary} h-10 px-3 text-sm shrink-0`}
          >
            Anlegen
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className={`${btnGhost} h-10 px-4 text-sm`}>
          Abbrechen
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!value.name.trim() || value.exerciseIds.length === 0}
          className={`${btnPrimary} h-10 px-4 text-sm`}
        >
          Workout speichern
        </button>
      </div>
    </div>
  );
}
