import assert from 'node:assert/strict';
import test from 'node:test';
import { DISH_FOODS, searchDishes } from './dishes.ts';

test('Gerichte-DB enthält internationale Klassiker inkl. Pad Thai', () => {
  assert.ok(DISH_FOODS.length >= 80);
  const hits = searchDishes('Pad Thai');
  assert.ok(hits.length >= 2);
  assert.match(hits[0].name, /Pad Thai/i);
  assert.ok(hits[0].servingQuantity > 200);
  assert.equal(hits[0].source, 'dish');
});

test('Suche findet Gerichte über Synonyme, Umlaute und mehrere Begriffe', () => {
  const doener = searchDishes('doener');
  assert.ok(doener.some((d) => d.name.includes('Döner')));

  const curry = searchDishes('thai curry');
  assert.ok(curry.some((d) => /Thai-Curry/i.test(d.name)));

  const poke = searchDishes('poke lachs');
  assert.ok(poke.some((d) => /Poké Bowl mit Lachs/i.test(d.name)));
});
