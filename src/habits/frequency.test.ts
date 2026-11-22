import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekStart, weekCount, isSatisfied, streak, weeklyTarget, type ChecksByDate } from './frequency.ts';

// 2026-11-16 ist ein Montag, 2026-11-22 ein Sonntag
const daily = { id: 'h1' };
const gym3 = { id: 'h2', perWeek: 3 };

test('Woche beginnt am Montag', () => {
  assert.equal(weekStart('2026-11-16'), '2026-11-16');
  assert.equal(weekStart('2026-11-22'), '2026-11-16');
  assert.equal(weekStart('2026-11-23'), '2026-11-23');
});

test('Häufigkeit: fehlend oder 7 = täglich', () => {
  assert.equal(weeklyTarget(daily), null);
  assert.equal(weeklyTarget({ id: 'x', perWeek: 7 }), null);
  assert.equal(weeklyTarget(gym3), 3);
});

test('Wochenziel: erfüllt ab 3 Haken in der Woche, auch an Tagen ohne Haken', () => {
  const checks: ChecksByDate = {
    '2026-11-16': { h2: true },
    '2026-11-18': { h2: true },
  };
  assert.equal(weekCount(checks, 'h2', '2026-11-20'), 2);
  assert.equal(isSatisfied(gym3, checks, '2026-11-20'), false);
  checks['2026-11-20'] = { h2: true };
  assert.equal(isSatisfied(gym3, checks, '2026-11-21'), true);
  assert.equal(isSatisfied(gym3, checks, '2026-11-23'), false);
});

test('Serie täglich und wöchentlich', () => {
  const checks: ChecksByDate = {};
  for (const d of ['2026-11-20', '2026-11-21', '2026-11-22']) checks[d] = { h1: true };
  assert.deepEqual(streak(daily, checks, '2026-11-22'), { count: 3, unit: 'day' });
  // heute noch nicht abgehakt -> Serie bis gestern zählt weiter
  assert.deepEqual(streak(daily, checks, '2026-11-23'), { count: 3, unit: 'day' });

  // zwei volle Wochen mit 3 Haken, laufende Woche erst 1
  for (const d of ['2026-11-09', '2026-11-11', '2026-11-13', '2026-11-16', '2026-11-17', '2026-11-19', '2026-11-23']) {
    checks[d] = { ...(checks[d] || {}), h2: true };
  }
  assert.deepEqual(streak(gym3, checks, '2026-11-24'), { count: 2, unit: 'week' });
});
