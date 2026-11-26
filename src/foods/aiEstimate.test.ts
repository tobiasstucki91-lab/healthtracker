import assert from 'node:assert/strict';
import test from 'node:test';
import {
  estimateMealWithAi,
  extractResponseText,
  parseAiEstimatePayload,
  rankGeminiFlashModels,
  thinkingConfigForModel,
} from './aiEstimate.ts';

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

test('rankGeminiFlashModels bevorzugt aktuelle stabile Flash-Lite- und Flash-Modelle vor Preview', () => {
  const ranked = rankGeminiFlashModels([
    { name: 'models/gemini-2.5-flash-tts', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-3-flash-preview', supportedGenerationMethods: ['generateContent'] },
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
    'gemini-3-flash-preview',
  ]);
});

test('thinkingConfigForModel wählt je Generation die passenden Parameter', () => {
  assert.deepEqual(thinkingConfigForModel('gemini-3-flash-preview'), { thinkingLevel: 'minimal' });
  assert.deepEqual(thinkingConfigForModel('gemini-3.5-flash'), { thinkingLevel: 'minimal' });
  assert.deepEqual(thinkingConfigForModel('gemini-2.5-flash'), { thinkingBudget: 0 });
  assert.deepEqual(thinkingConfigForModel('gemini-2.5-flash-lite'), { thinkingBudget: 0 });
  assert.deepEqual(thinkingConfigForModel('gemini-flash-latest'), { thinkingBudget: 0 });
  assert.deepEqual(thinkingConfigForModel('gemini-flash-lite-latest'), { thinkingBudget: 0 });
  assert.equal(thinkingConfigForModel('gemini-2.0-flash'), undefined);
});

test('extractResponseText überspringt Thought-Parts und liefert das JSON-Part', () => {
  const payload = {
    candidates: [
      {
        content: {
          parts: [
            { thought: true, text: 'internes Nachdenken' },
            { text: '{"name":"Apfel"}' },
          ],
        },
      },
    ],
  };
  assert.equal(extractResponseText(payload), '{"name":"Apfel"}');
});

test('estimateMealWithAi wechselt bei 503 sofort auf das nächste Modell', async () => {
  const origFetch = globalThis.fetch;
  const calledModels: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/v1beta/models?')) {
      return new Response(
        JSON.stringify({
          models: [
            { name: 'models/gemini-2.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const match = url.match(/models\/([^:]+):generateContent/);
    const model = match ? decodeURIComponent(match[1]) : 'unknown';
    calledModels.push(model);
    if (model === 'gemini-2.5-flash-lite') {
      return new Response(JSON.stringify({ error: { message: 'overloaded' } }), { status: 503 });
    }
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    name: 'Apfel',
                    portionGrams: 150,
                    portionLabel: 'Stück',
                    caloriesPer100g: 52,
                    proteinPer100g: 0.3,
                    carbsPer100g: 13.8,
                    fatPer100g: 0.2,
                    note: 'Frischer Apfel',
                  }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    const food = await estimateMealWithAi({
      query: '1 Apfel Failover Test',
      apiKey: 'test-key-failover-1',
      bypassCache: true,
    });
    assert.equal(food.name, 'Apfel');
    assert.equal(food.usedModel, 'gemini-2.5-flash');
    assert.deepEqual(calledModels, ['gemini-2.5-flash-lite', 'gemini-2.5-flash']);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('estimateMealWithAi zeigt bei Totalausfall getestete Modelle und Fehlergründe an', async () => {
  const origFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/v1beta/models?')) {
      return new Response(
        JSON.stringify({
          models: [
            { name: 'models/gemini-2.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (url.includes('gemini-2.5-flash-lite')) {
      return new Response(JSON.stringify({ error: { message: 'busy' } }), { status: 503 });
    }
    return new Response(JSON.stringify({ error: { message: 'quota' } }), { status: 429 });
  }) as typeof fetch;

  try {
    await assert.rejects(
      () =>
        estimateMealWithAi({
          query: '1 Banane Diagnosetest',
          apiKey: 'test-key-fail-all-2',
          bypassCache: true,
        }),
      (err: Error) => {
        assert.match(err.message, /gemini-2\.5-flash-lite: 503/);
        assert.match(err.message, /gemini-2\.5-flash: 429/);
        return true;
      }
    );
  } finally {
    globalThis.fetch = origFetch;
  }
});
