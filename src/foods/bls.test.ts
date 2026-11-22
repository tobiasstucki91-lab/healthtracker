import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildIndex, searchIndex, type BlsRow } from './bls.ts';

const rows = JSON.parse(fs.readFileSync(new URL('../data/bls-4.0.json', import.meta.url), 'utf8')) as BlsRow[];
const index = buildIndex(rows);
const top = (q: string) => searchIndex(index, q, 3)[0]?.name;

test('BLS-Daten vollständig geladen', () => {
  assert.ok(rows.length > 7000);
  const ei = index.find((i) => i.food.name === 'Hühnerei roh')!.food;
  assert.equal(ei.calories, 135);
  assert.equal(ei.servingSize, '1 Ei (60g)');
});

test('Alltagsbegriffe finden das passende Grundlebensmittel', () => {
  assert.equal(top('Eier'), 'Hühnerei roh');
  assert.equal(top('Ei'), 'Hühnerei roh');
  assert.equal(top('Haferflocken'), 'Hafer Flocken');
  assert.equal(top('Hähnchenbrust'), 'Hähnchen Brustfilet, roh');
  assert.equal(top('Banane'), 'Banane roh');
  assert.equal(top('Möhren'), 'Karotte/Möhre, roh');
  assert.match(top('Brokkoli') ?? '', /^Broccoli/);
  assert.match(top('Magerquark') ?? '', /Magerquark/);
});

test('Mehrere Suchwörter müssen alle passen', () => {
  const res = searchIndex(index, 'Joghurt 1,5', 5);
  assert.ok(res.length > 0);
  assert.ok(res.every((f) => f.name.includes('Joghurt') && f.name.includes('1,5')));
});
