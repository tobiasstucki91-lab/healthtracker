import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSession,
  lastPerformance,
  sessionVolume,
  formatSets,
  personalBest,
  DEFAULT_EXERCISES,
  type WorkoutsByDate,
} from './model.ts';

let n = 0;
const newId = (p: string) => `${p}-${++n}`;

const history: WorkoutsByDate = {
  '2026-11-10': [
    {
      id: 'wo-a',
      templateId: 'wtpl-push',
      name: 'Push',
      startedAt: '2026-11-10T18:00:00Z',
      exercises: [
        {
          uid: 'u1',
          exerciseId: 'ex-bench',
          name: 'Bankdrücken',
          sets: [
            { kg: 80, reps: 8, done: true },
            { kg: 80, reps: 8, done: true },
            { kg: 80, reps: 7, done: true },
          ],
        },
      ],
    },
  ],
  '2026-11-17': [
    {
      id: 'wo-b',
      templateId: 'wtpl-push',
      name: 'Push',
      startedAt: '2026-11-17T18:00:00Z',
      exercises: [
        {
          uid: 'u2',
          exerciseId: 'ex-bench',
          name: 'Bankdrücken',
          sets: [
            { kg: 82.5, reps: 8, done: true },
            { kg: 82.5, reps: 8, done: true },
            { kg: null, reps: null, done: false },
          ],
        },
      ],
    },
  ],
};

test('Letzte Leistung: neueste Einheit, leere Sätze ignoriert', () => {
  const last = lastPerformance(history, 'ex-bench', '2026-11-22')!;
  assert.equal(last.date, '2026-11-17');
  assert.equal(last.sets.length, 2);
  assert.equal(lastPerformance(history, 'ex-bench', '2026-11-12')!.date, '2026-11-10');
  assert.equal(lastPerformance(history, 'ex-squat', '2026-11-22'), null);
});

test('Neues Workout aus Vorlage übernimmt Werte vom letzten Mal', () => {
  const s = createSession({
    template: { id: 'wtpl-push', name: 'Push', exerciseIds: ['ex-bench', 'ex-ohp', 'ex-gibtsnicht'] },
    exercises: DEFAULT_EXERCISES,
    workoutsByDate: history,
    date: '2026-11-24',
    newId,
  });
  assert.equal(s.name, 'Push');
  assert.equal(s.exercises.length, 2);
  assert.deepEqual(s.exercises[0].sets, [
    { kg: 82.5, reps: 8, done: false },
    { kg: 82.5, reps: 8, done: false },
  ]);
  assert.equal(s.exercises[1].sets.length, 3);
  assert.equal(s.exercises[1].sets[0].kg, null);
});

test('Volumen zählt nur abgehakte Sätze', () => {
  assert.equal(sessionVolume(history['2026-11-10'][0]), 80 * 8 + 80 * 8 + 80 * 7);
  assert.equal(sessionVolume(history['2026-11-17'][0]), 82.5 * 16);
});

test('Satz-Zusammenfassung', () => {
  assert.equal(formatSets([{ kg: 80, reps: 8, done: true }, { kg: 80, reps: 8, done: true }]), '2 × 8 · 80 kg');
  assert.equal(formatSets([{ kg: 80, reps: 8, done: true }, { kg: 75, reps: 10, done: true }]), '80×8 · 75×10');
  assert.equal(formatSets([{ kg: null, reps: 12, done: true }]), '1 × 12');
});

test('Bestwert nach geschätztem 1RM', () => {
  const pb = personalBest(history, 'ex-bench')!;
  assert.equal(pb.kg, 82.5);
  assert.equal(pb.reps, 8);
});
