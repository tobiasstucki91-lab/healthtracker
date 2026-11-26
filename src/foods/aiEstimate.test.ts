import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAiEstimatePayload, rankGeminiFlashModels } from './aiEstimate.ts';

test('parseAiEstimatePayload wandelt Gemini-JSON sauber in Food-Objekt um', () => {
  const food = parseAiEstimatePayload({
    name: 'Pad Thai mit Hähnchen',
    portionGrams: 380,
    portionLabel: '1 Teller',
    caloriesPer100g: 168.4,
    proteinPer100g: 9.52,
    carbsPer100g: 20.51,
    fatPer100g: 5.24,
    note: 'Reisnudeln, Hähnchen, Ei, Erdnüsse & Tamarindensauce',
  });
  assert.ok(food);
  assert.equal(food.name, 'Pad Thai mit Hähnchen');
  assert.equal(food.calories, 168);
  assert.equal(food.protein, 9.5);
  assert.equal(food.carbs, 20.5);
  assert.equal(food.fat, 5.2);
  assert.equal(food.servingQuantity, 380);
  assert.equal(food.servingSize, '1 Teller (380g)');
  assert.equal(food.source, 'ai');
});

test('parseAiEstimatePayload lehnt ungültige oder negative Nährwerte ab', () => {
  assert.equal(parseAiEstimatePayload({ caloriesPer100g: -10, proteinPer100g: 5, carbsPer100g: 10, fatPer100g: 2 }), null);
  assert.equal(parseAiEstimatePayload({ caloriesPer100g: 'abc' }), null);
});

test('rankGeminiFlashModels bevorzugt aktuelle stabile Flash-Lite- und Flash-Modelle', () => {
  const ranked = rankGeminiFlashModels([
    { name: 'models/gemini-2.5-flash-tts', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-2.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-2.0-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/embedding-001', supportedGenerationMethods: ['embedContent'] },
  ]);
  assert.deepEqual(ranked, [
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
  ]);
});
