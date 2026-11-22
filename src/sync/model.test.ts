import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  flatten,
  unflatten,
  trackChanges,
  initialMeta,
  merge,
  sameState,
  fromRemoteFile,
  type AppData,
  type SyncState,
} from './model.ts';

const TARGETS = { calories: 1900, protein: 160, carbs: 175, fat: 60, weight: null };

function base(): AppData {
  return {
    targets: { ...TARGETS },
    favorites: [{ id: 'fav-a', name: 'A' }, { id: 'fav-b', name: 'B' }],
    savedMeals: [],
    habits: [{ id: 'hab-1', title: 'Workout' }],
    logsByDate: {
      '2026-11-17': [
        { id: 'meal-1', name: 'Frühstück', calories: 400 },
        { id: 'meal-2', name: 'Mittag', calories: 700 },
      ],
    },
    habitChecksByDate: { '2026-11-17': { 'hab-1': true } },
    weightsByDate: { '2026-11-17': 81.4 },
    exercises: [{ id: 'ex-bench', name: 'Bankdrücken' }, { id: 'ex-squat', name: 'Kniebeuge' }],
    workoutTemplates: [{ id: 'wtpl-1', name: 'Push', exerciseIds: ['ex-bench'] }],
    workoutsByDate: {
      '2026-11-17': [
        {
          id: 'wo-1',
          name: 'Push',
          exercises: [{ uid: 'u1', exerciseId: 'ex-bench', sets: [{ kg: 80, reps: 8, done: true }] }],
        },
      ],
    },
  };
}

/** Simuliert ein Gerät: Daten + Meta, Änderungen werden mit Zeit `t` gestempelt. */
function device(data: AppData): SyncState {
  const records = flatten(data);
  return { records, meta: initialMeta(records) };
}
function edit(state: SyncState, fn: (d: AppData) => AppData, t: number): SyncState {
  const next = flatten(fn(unflatten(state.records, TARGETS)));
  const meta = trackChanges(state.records, next, state.meta, t) ?? state.meta;
  return { records: next, meta };
}
const view = (s: SyncState) => unflatten(s.records, TARGETS);

test('flatten/unflatten ist verlustfrei inkl. Reihenfolge', () => {
  const data = base();
  assert.deepEqual(unflatten(flatten(data), TARGETS), data);
});

test('habit check "false" gilt als nicht gesetzt', () => {
  const data = base();
  data.habitChecksByDate['2026-11-17']['hab-1'] = false;
  assert.deepEqual(view(device(data)).habitChecksByDate, {});
});

test('Offline-Einträge beider Geräte am selben Tag bleiben erhalten', () => {
  const start = device(base());
  const phone = edit(start, (d) => {
    d.logsByDate['2026-11-17'].push({ id: 'meal-phone', name: 'Snack', calories: 200 });
    return d;
  }, 1000);
  const pc = edit(start, (d) => {
    d.logsByDate['2026-11-17'].push({ id: 'meal-pc', name: 'Abend', calories: 600 });
    return d;
  }, 2000);

  const merged = merge(phone, pc, { now: 3000 });
  const ids = view(merged).logsByDate['2026-11-17'].map((m) => m.id).sort();
  assert.deepEqual(ids, ['meal-1', 'meal-2', 'meal-pc', 'meal-phone']);
});

test('Löschungen werden übertragen und nicht wiederbelebt', () => {
  const start = device(base());
  const pc = edit(start, (d) => {
    delete d.weightsByDate['2026-11-17'];
    d.logsByDate['2026-11-17'] = d.logsByDate['2026-11-17'].filter((m) => m.id !== 'meal-1');
    return d;
  }, 5000);

  // Handy kennt die Löschung noch nicht -> nach Merge trotzdem gelöscht
  const merged = merge(start, pc, { now: 6000 });
  const v = view(merged);
  assert.equal(v.weightsByDate['2026-11-17'], undefined);
  assert.deepEqual(v.logsByDate['2026-11-17'].map((m) => m.id), ['meal-2']);
  // und auch in umgekehrter Richtung
  assert.deepEqual(view(merge(pc, start, { now: 6000 })), v);
});

test('Jüngere Änderung desselben Eintrags gewinnt', () => {
  const start = device(base());
  const a = edit(start, (d) => ({ ...d, targets: { ...d.targets, calories: 2000 } }), 100);
  const b = edit(start, (d) => ({ ...d, targets: { ...d.targets, calories: 2200 } }), 200);
  assert.equal(view(merge(a, b, { now: 300 })).targets.calories, 2200);
  assert.equal(view(merge(b, a, { now: 300 })).targets.calories, 2200);
});

test('Neues Gerät übernimmt Drive-Stand statt Standardwerte zu mischen', () => {
  const fresh = device({ ...base(), favorites: [{ id: 'fav-default', name: 'Default' }] });
  const remote = edit(device(base()), (d) => d, 10);
  const merged = merge(fresh, remote, { now: 20, dropUntrackedLocal: true });
  assert.deepEqual(view(merged).favorites.map((f) => f.id), ['fav-a', 'fav-b']);
});

test('Merge ist idempotent', () => {
  const a = edit(device(base()), (d) => {
    d.weightsByDate['2026-11-18'] = 81.0;
    return d;
  }, 10);
  const b = device(base());
  const once = merge(a, b, { now: 20 });
  assert.ok(sameState(merge(once, b, { now: 20 }), once));
  assert.ok(sameState(merge(once, once, { now: 20 }), once));
});

test('Alte Sync-Datei (Version 1) wird gelesen', () => {
  const legacy = { version: 1, updatedAt: 'x', data: base() };
  const state = fromRemoteFile(legacy, (d) => d as AppData);
  assert.deepEqual(view(state), base());
});
