import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysKey,
  bmrMifflin,
  estimateEnergy,
  weeklySuggestion,
  DEFAULT_ENERGY_PROFILE,
  type EnergyProfile,
} from './adaptive.ts';

const profile: EnergyProfile = {
  ...DEFAULT_ENERGY_PROFILE,
  enabled: true,
  sex: 'm',
  heightCm: 180,
  birthYear: 1996,
  activity: 1.375,
  goal: 'lose',
  ratePct: 0.5,
};
const today = '2026-11-22';

// Testdaten: täglich 2.000 kcal, Gewicht fällt linear 0,5 kg/Woche (mit ±0,4 kg Rauschen)
function history(days: number, kcal = 2000, kgPerWeek = -0.5, noise = true) {
  const weightsByDate: Record<string, number> = {};
  const intakeByDate: Record<string, number> = {};
  for (let i = days; i >= 1; i--) {
    const d = addDaysKey(today, -i);
    const t = days - i;
    weightsByDate[d] = 85 + (kgPerWeek / 7) * t + (noise ? (t % 3 === 0 ? 0.4 : t % 3 === 1 ? -0.4 : 0) : 0);
    intakeByDate[d] = kcal;
  }
  return { weightsByDate, intakeByDate };
}

test('Grundumsatz nach Mifflin-St Jeor', () => {
  assert.equal(bmrMifflin(80, 180, 30, 'm'), 1780);
  assert.equal(bmrMifflin(65, 168, 35, 'f'), 1364);
});

test('Ohne Verlauf: Formel-Verbrauch, Defizit 0,5 %/Woche', () => {
  const est = estimateEnergy({
    profile,
    weightsByDate: { [today]: 85 },
    intakeByDate: {},
    today,
    currentTarget: 1900,
  })!;
  assert.equal(est.observedTdee, null);
  assert.equal(est.confidence, 0);
  // BMR 85 kg/180 cm/30 J ≈ 1830, × 1,375 ≈ 2516
  assert.ok(Math.abs(est.tdee - 2516) <= 2, String(est.tdee));
  // Defizit 85 × 0,5 % × 7700 / 7 ≈ 468 kcal
  assert.ok(Math.abs(est.delta + 468) <= 10, String(est.delta));
});

test('Mit 4 Wochen Daten: gemessener Verbrauch ≈ Aufnahme + Abnahme', () => {
  const { weightsByDate, intakeByDate } = history(42);
  const est = estimateEnergy({ profile, weightsByDate, intakeByDate, today, currentTarget: 2000 })!;
  // 2000 + 0,5 kg × 7700 / 7 = 2550
  assert.ok(est.observedTdee !== null);
  assert.ok(Math.abs(est.observedTdee! - 2550) < 150, String(est.observedTdee));
  assert.equal(est.confidence, 1);
  assert.ok(est.trendPerWeek! < -0.35 && est.trendPerWeek! > -0.65, String(est.trendPerWeek));
});

test('Unvollständig geloggte Tage werden ignoriert', () => {
  const { weightsByDate, intakeByDate } = history(42);
  for (let i = 1; i <= 28; i += 4) intakeByDate[addDaysKey(today, -i)] = 400;
  const est = estimateEnergy({ profile, weightsByDate, intakeByDate, today, currentTarget: 2000 })!;
  assert.ok(Math.abs(est.observedTdee! - 2550) < 150, String(est.observedTdee));
});

test('Untergrenze: Ziel nie unter Grundumsatz bzw. 1.500 kcal (Mann)', () => {
  const est = estimateEnergy({
    profile: { ...profile, activity: 1.2, ratePct: 0.75 },
    weightsByDate: { [today]: 60 },
    intakeByDate: {},
    today,
    currentTarget: 1500,
  })!;
  assert.ok(est.calories >= Math.max(est.bmr, 1500));
});

test('Wochen-Vorschlag: höchstens ±150 kcal, frühestens nach 7 Tagen', () => {
  const { weightsByDate, intakeByDate } = history(42);
  const est = estimateEnergy({ profile, weightsByDate, intakeByDate, today, currentTarget: 1700 })!;
  const s = weeklySuggestion(est, profile, 1700, today)!;
  assert.equal(s.calories, 1850);
  assert.equal(weeklySuggestion(est, { ...profile, lastReview: addDaysKey(today, -3) }, 1700, today), null);
});
