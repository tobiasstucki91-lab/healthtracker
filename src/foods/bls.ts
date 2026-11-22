// Bundeslebensmittelschlüssel (BLS) 4.0 als Offline-Lebensmitteldatenbank.
//
// Quelle: Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS),
// Version 4.0 – Deutsche Nährstoffdatenbank. Karlsruhe.
// DOI: 10.25826/Data20251217-134202-0 · Lizenz: CC BY 4.0
//
// Die Daten (src/data/bls-4.0.json) sind ein Auszug: je Lebensmittel
// [BLS-Code, Name, kcal, Protein, Kohlenhydrate (verfügbar), Fett,
//  Ballaststoffe, Zucker], alle Werte pro 100 g.

export type BlsRow = [string, string, number, number, number, number, number, number];

export interface BlsFood {
  id: string;
  name: string;
  brand: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  servingQuantity: number | null;
  servingSize: string | null;
  source: 'bls';
}

interface IndexItem {
  food: BlsFood;
  norm: string;
  compact: string;
  words: string[];
  group: string;
}

// Hauptgruppen laut BLS-Code (erster Buchstabe)
const GROUPS: Record<string, string> = {
  B: 'Brot & Brötchen',
  C: 'Getreide',
  D: 'Backwaren',
  E: 'Eier & Teigwaren',
  F: 'Obst',
  G: 'Gemüse',
  H: 'Hülsenfrüchte & Nüsse',
  K: 'Kartoffeln & Pilze',
  M: 'Milch & Käse',
  N: 'Getränke',
  P: 'Alkoholische Getränke',
  Q: 'Fette & Öle',
  R: 'Gewürze & Zutaten',
  S: 'Süßwaren',
  T: 'Fisch',
  U: 'Fleisch',
  V: 'Geflügel, Wild & Innereien',
  W: 'Wurst',
  X: 'Gerichte & Saucen',
  Y: 'Gerichte',
};

// Zusammengesetzte Gerichte und Gebäck rutschen in der Trefferliste nach hinten
const GROUP_PENALTY: Record<string, number> = { X: 2, Y: 2, D: 1, R: 1 };

// Übliche Stückgewichte für die Angabe in Stück/Scheiben (essbarer Anteil)
const PIECE_RULES: Array<[RegExp, string, number]> = [
  [/^Hühnerei roh$/, 'Ei', 60],
  [/^Apfel (roh|geschält, roh)$/, 'Apfel', 150],
  [/^Birne roh$/, 'Birne', 160],
  [/^Banane roh$/, 'Banane', 120],
  [/^Orange roh$/, 'Orange', 150],
  [/^(Mandarine|Clementine) roh$/, 'Stück', 60],
  [/^Kiwi roh$/, 'Kiwi', 75],
  [/^Pfirsich roh$/, 'Pfirsich', 120],
  [/^Tomate roh$/, 'Tomate', 70],
  [/^Avocado roh$/, 'Avocado', 150],
  [/brötchen$/, 'Brötchen', 55],
  [/^Laugenbrezel/, 'Brezel', 70],
  [/toastbrot/i, 'Scheibe', 25],
  [/knäckebrot$/, 'Scheibe', 10],
  [/(vollkornbrot|mischbrot|roggenbrot|weizenbrot)$/i, 'Scheibe', 50],
];

// Alltagswörter -> Schreibweise im BLS (bereits normalisiert, siehe norm())
const SYNONYMS: Record<string, string[]> = {
  ei: ['huehnerei'],
  eier: ['huehnerei'],
  huehnchen: ['haehnchen'],
  huhn: ['haehnchen', 'huhn'],
  nudeln: ['teigwaren'],
  pasta: ['teigwaren'],
  spaghetti: ['teigwaren'],
  moehre: ['moehre', 'karotte'],
  moehren: ['moehre', 'karotte'],
  karotten: ['karotte', 'moehre'],
  quark: ['quark'],
  hack: ['hackfleisch'],
  pute: ['pute', 'truthahn'],
  kartoffeln: ['kartoffel'],
  haferflocken: ['haferflocken'],
  oel: ['oel'],
  brokkoli: ['broccoli'],
  zucchini: ['zucchini'],
};

// Suchwörter, die nur über ihr Synonym gesucht werden ("ei" träfe sonst "Eisbergsalat")
const REPLACE_ONLY = new Set(['ei', 'eier']);

export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9%,.]+/g, ' ')
    .trim();
}

const compactOf = (s: string) => s.replace(/[^a-z0-9]/g, '');

export function buildIndex(rows: BlsRow[]): IndexItem[] {
  return rows.map(([code, name, kcal, p, c, f, fib, sug]) => {
    const rule = PIECE_RULES.find(([re]) => re.test(name));
    const n = norm(name);
    return {
      food: {
        id: `bls4-${code}`,
        name,
        brand: 'BLS',
        category: GROUPS[code[0]] || 'Lebensmittel',
        calories: kcal,
        protein: p,
        carbs: c,
        fat: f,
        fiber: fib,
        sugar: sug,
        servingQuantity: rule ? rule[2] : null,
        servingSize: rule ? `1 ${rule[1]} (${rule[2]}g)` : null,
        source: 'bls',
      },
      norm: n,
      compact: compactOf(n),
      words: n.split(' ').filter(Boolean),
      group: code[0],
    };
  });
}

// Varianten eines Suchworts: Synonyme und einfache Pluralformen
function variantsOf(token: string): string[] {
  if (REPLACE_ONLY.has(token)) return SYNONYMS[token];
  const out = new Set([token, ...(SYNONYMS[token] || [])]);
  for (const suffix of ['en', 'n', 'e', 's']) {
    if (token.length - suffix.length >= 4 && token.endsWith(suffix)) out.add(token.slice(0, -suffix.length));
  }
  return [...out];
}

export function searchIndex(index: IndexItem[], query: string, limit = 40): BlsFood[] {
  const tokens = norm(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return [];
  const tokenVariants = tokens.map((t) => variantsOf(t).map((v) => [v, compactOf(v)] as const));
  const first = tokenVariants[0];

  const scored: Array<{ food: BlsFood; score: number }> = [];
  for (const item of index) {
    const ok = tokenVariants.every((vs) => vs.some(([v, c]) => item.norm.includes(v) || (c.length >= 4 && item.compact.includes(c))));
    if (!ok) continue;

    let score: number;
    if (first.some(([v, c]) => item.norm.startsWith(v) || item.compact.startsWith(c))) score = 0;
    else if (first.some(([v]) => item.words.some((w) => w.startsWith(v)))) score = 1;
    else score = 2;

    score += GROUP_PENALTY[item.group] || 0;
    if (/\broh\b/.test(item.norm)) score -= 0.4;
    if (/(getrocknet|pulver|konserve|tiefgefroren)/.test(item.norm)) score += 0.4;
    score += item.norm.length / 80;
    scored.push({ food: item.food, score });
  }

  return scored
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((s) => s.food);
}

let indexPromise: Promise<IndexItem[]> | null = null;

// Lädt die Daten erst bei der ersten Suche (eigene Datei, offline im Cache)
export function loadBlsIndex(): Promise<IndexItem[]> {
  if (!indexPromise) {
    indexPromise = import('../data/bls-4.0.json')
      .then((m) => buildIndex(m.default as unknown as BlsRow[]))
      .catch((err) => {
        indexPromise = null;
        throw err;
      });
  }
  return indexPromise;
}

export const BLS_ATTRIBUTION =
  'Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0. Lizenz CC BY 4.0';
