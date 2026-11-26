// @ts-nocheck -- UI-Code aus Version 1, noch nicht typisiert (Sync-Module unter src/sync sind typisiert)
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { loadBlsIndex, searchIndex as searchBlsIndex } from './foods/bls';
import { searchDishes } from './foods/dishes';
import {
  compressImageForAi,
  estimateMealWithAi,
  GEMINI_FALLBACK_MODELS,
  loadGeminiApiKey,
  loadGeminiModel,
  saveGeminiApiKey,
  saveGeminiModel,
} from './foods/aiEstimate';
import {
  estimateEnergy,
  weeklySuggestion,
  normalizeProfile,
  ACTIVITY_LEVELS,
  RATE_OPTIONS,
} from './energy/adaptive';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  Plus,
  Trash2,
  Copy,
  Star,
  Settings,
  Flame,
  Check,
  Download,
  Upload,
  RotateCcw,
  Edit3,
  X,
  TrendingUp,
  Utensils,
  CheckCircle2,
  Zap,
  SlidersHorizontal,
  ClipboardCheck,
  Search,
  Database,
  Globe,
  Scale,
  Layers,
  Loader2,
  AlertCircle,
  Barcode,
  Sparkles,
  Camera,
  ScanLine,
  Image as ImageIcon,
  TrendingDown,
  Minus,
  Target,
  RefreshCw,
  Cloud,
  Wifi,
  Radio,
  House,
  SquareCheckBig,
  ScanBarcode,
  Dumbbell,
} from 'lucide-react';
import { useSyncedAppData } from './sync/useSyncedAppData';
import { SyncBanner, SyncHeaderButton, SyncSettingsPanel } from './components/SyncUi';
import { ZoneHeader } from './components/ZoneHeader';
import { TrainingView } from './components/TrainingView';
import { DEFAULT_EXERCISES } from './training/model';
import {
  isSatisfied as isHabitSatisfied,
  streak as habitStreak,
  weeklyTarget,
  weekCount,
  weekDays,
  FREQUENCY_OPTIONS,
} from './habits/frequency';

// ============================================================================
// KONSTANTEN & STANDARDWERTE
// ============================================================================

const STORAGE_KEY = 'dark_industrial_macro_habit_v1';

const DEFAULT_TARGETS = {
  calories: 1900,
  protein: 160,
  carbs: 175,
  fat: 60,
  weight: null,
};

const DEFAULT_FAVORITES = [
  {
    id: 'fav-skyr-bowl',
    name: 'Skyr Bowl mit Beeren & Flohsamenschalen',
    calories: 415,
    protein: 56,
    carbs: 37,
    fat: 2,
  },
  {
    id: 'fav-whey-isolate',
    name: 'Whey Isolate Shake (35g)',
    calories: 132,
    protein: 30,
    carbs: 1,
    fat: 0.5,
  },
  {
    id: 'fav-chicken-basmati',
    name: 'Hähnchenbrust & Basmatireis',
    calories: 572,
    protein: 54,
    carbs: 78,
    fat: 3.5,
  },
  {
    id: 'fav-eggs-bread',
    name: 'Rührei & Vollkornbrot',
    calories: 495,
    protein: 32,
    carbs: 42,
    fat: 21,
  },
  {
    id: 'fav-quark-almonds',
    name: 'Magerquark & Mandeln',
    calories: 342,
    protein: 37,
    carbs: 13,
    fat: 15.5,
  },
];

const DEFAULT_HABITS = [
  { id: 'hab-steps', title: '10.000 Schritte' },
  { id: 'hab-protein', title: '160g+ Proteinziel erreicht' },
  { id: 'hab-water', title: '3L Wasser / Elektrolyte' },
  { id: 'hab-workout', title: 'Workout' },
  { id: 'hab-clean', title: 'Clean Eating / Kein Zucker' },
];

const DEFAULT_SAVED_MEALS = [
  {
    id: 'meal-tpl-skyr-bowl',
    name: 'High-Protein Skyr & Beeren Bowl',
    items: [
      {
        grams: 250,
        food: {
          id: 'bls-skyr',
          name: 'Skyr natur (0,2% Fett)',
          brand: 'Basis-DB',
          calories: 62,
          protein: 11.0,
          carbs: 4.0,
          fat: 0.2,
          source: 'basis',
        },
      },
      {
        grams: 50,
        food: {
          id: 'bls-haferflocken',
          name: 'Haferflocken (zart/kernig)',
          brand: 'Basis-DB',
          calories: 372,
          protein: 13.5,
          carbs: 58.7,
          fat: 7.0,
          source: 'basis',
        },
      },
      {
        grams: 100,
        food: {
          id: 'bls-blaubeeren',
          name: 'Blaubeeren / Heidelbeeren',
          brand: 'Basis-DB',
          calories: 46,
          protein: 0.7,
          carbs: 9.5,
          fat: 0.3,
          source: 'basis',
        },
      },
      {
        grams: 15,
        food: {
          id: 'bls-mandeln',
          name: 'Mandeln',
          brand: 'Basis-DB',
          calories: 579,
          protein: 21.2,
          carbs: 9.5,
          fat: 49.9,
          source: 'basis',
        },
      },
    ],
  },
  {
    id: 'meal-tpl-chicken-rice',
    name: 'Hähnchenbrust, Basmatireis & Brokkoli',
    items: [
      {
        grams: 200,
        food: {
          id: 'bls-haehnchen-roh',
          name: 'Hähnchenbrustfilet (roh)',
          brand: 'Basis-DB',
          calories: 110,
          protein: 23.1,
          carbs: 0.0,
          fat: 1.2,
          source: 'basis',
        },
      },
      {
        grams: 90,
        food: {
          id: 'bls-basmatireis-roh',
          name: 'Basmatireis (roh / Trockengewicht)',
          brand: 'Basis-DB',
          calories: 352,
          protein: 7.5,
          carbs: 77.5,
          fat: 0.8,
          source: 'basis',
        },
      },
      {
        grams: 150,
        food: {
          id: 'bls-brokkoli',
          name: 'Brokkoli',
          brand: 'Basis-DB',
          calories: 34,
          protein: 2.8,
          carbs: 4.0,
          fat: 0.4,
          source: 'basis',
        },
      },
      {
        grams: 8,
        food: {
          id: 'bls-olivenoel',
          name: 'Olivenöl (nativ extra)',
          brand: 'Basis-DB',
          calories: 884,
          protein: 0.0,
          carbs: 0.0,
          fat: 100.0,
          source: 'basis',
        },
      },
    ],
  },
  {
    id: 'meal-tpl-eggs-bread',
    name: 'Rührei & Vollkornbrot mit Avocado',
    items: [
      {
        grams: 180,
        food: {
          id: 'bls-vollei',
          name: 'Eier / Vollei (Größe M)',
          brand: 'Basis-DB',
          calories: 143,
          protein: 12.6,
          carbs: 0.7,
          fat: 9.5,
          source: 'basis',
        },
      },
      {
        grams: 100,
        food: {
          id: 'bls-vollkornbrot',
          name: 'Vollkornbrot / Roggenvollkornbrot',
          brand: 'Basis-DB',
          calories: 213,
          protein: 7.2,
          carbs: 40.5,
          fat: 1.3,
          source: 'basis',
        },
      },
      {
        grams: 60,
        food: {
          id: 'bls-avocado',
          name: 'Avocado (Fruchtfleisch)',
          brand: 'Basis-DB',
          calories: 160,
          protein: 2.0,
          carbs: 1.8,
          fat: 14.7,
          source: 'basis',
        },
      },
    ],
  },
];

const MULTIPLIERS = [0.5, 1, 1.5, 2];
const GRAM_PRESETS = [10, 25, 50, 100, 150, 200, 250, 350, 500];

const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS_SHORT = [
  'Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni',
  'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.',
];

// ============================================================================
// LOKALES DEUTSCHES BASIS-LEXIKON (~85 BLS-REFERENZWERTE PRO 100G, 0-MS SUCHE)
// ============================================================================

const GERMAN_BASIS_FOODS = [
  // Salate & Blattgemüse
  { id: 'bls-blattsalat', name: 'Blattsalat / Kopfsalat', brand: 'Basis-DB', category: 'Gemüse & Salat', keywords: 'salat grüner salat pflücksalat lollo rosso bionda eichblattsalat batavia', calories: 14, protein: 1.3, carbs: 1.1, fat: 0.2, servingQuantity: 80, servingSize: '1 Portion (80g)' },
  { id: 'bls-eisbergsalat', name: 'Eisbergsalat', brand: 'Basis-DB', category: 'Gemüse & Salat', keywords: 'salat blattsalat knackiger salat', calories: 14, protein: 0.9, carbs: 1.9, fat: 0.2, servingQuantity: 100, servingSize: '1 Portion (100g)' },
  { id: 'bls-feldsalat', name: 'Feldsalat / Rapunzel', brand: 'Basis-DB', category: 'Gemüse & Salat', keywords: 'salat blattsalat ackersalat vogerlsalat nüsslisalat', calories: 14, protein: 1.8, carbs: 0.7, fat: 0.4, servingQuantity: 75, servingSize: '1 Portion (75g)' },
  { id: 'bls-rucola', name: 'Rucola / Rauke', brand: 'Basis-DB', category: 'Gemüse & Salat', keywords: 'salat blattsalat rucolasalat', calories: 25, protein: 2.6, carbs: 2.1, fat: 0.7, servingQuantity: 50, servingSize: '1 Portion (50g)' },
  { id: 'bls-roemersalat', name: 'Römersalat / Romanasalat', brand: 'Basis-DB', category: 'Gemüse & Salat', keywords: 'salat blattsalat caesar salat herzsalat', calories: 17, protein: 1.2, carbs: 2.0, fat: 0.3, servingQuantity: 100, servingSize: '1 Portion (100g)' },

  // Milchprodukte & Käse
  { id: 'bls-magerquark', name: 'Magerquark (0,2% Fett)', brand: 'Basis-DB', category: 'Milchprodukte', keywords: 'quark speisequark', calories: 67, protein: 12.2, carbs: 4.0, fat: 0.2, servingQuantity: 250, servingSize: '1 Becher (250g)' },
  { id: 'bls-skyr', name: 'Skyr natur (0,2% Fett)', brand: 'Basis-DB', category: 'Milchprodukte', keywords: 'joghurt quark island', calories: 62, protein: 11.0, carbs: 4.0, fat: 0.2, servingQuantity: 450, servingSize: '1 Becher (450g)' },
  { id: 'bls-quark-20', name: 'Speisequark (20% Fett)', brand: 'Basis-DB', category: 'Milchprodukte', keywords: 'quark halbfett', calories: 99, protein: 11.1, carbs: 3.6, fat: 4.4, servingQuantity: 250, servingSize: '1 Becher (250g)' },
  { id: 'bls-quark-40', name: 'Speisequark (40% Fett)', brand: 'Basis-DB', category: 'Milchprodukte', keywords: 'quark sahnequark', calories: 145, protein: 9.8, carbs: 3.3, fat: 10.5 },
  { id: 'bls-griech-joghurt-2', name: 'Griechischer Joghurt (2% Fett)', brand: 'Basis-DB', category: 'Milchprodukte', keywords: 'joghurt griechisch fettarm', calories: 73, protein: 9.0, carbs: 4.0, fat: 2.0, servingQuantity: 150, servingSize: '1 Portion (150g)' },
  { id: 'bls-griech-joghurt-10', name: 'Griechischer Joghurt (10% Fett)', brand: 'Basis-DB', category: 'Milchprodukte', keywords: 'joghurt griechisch sahnejoghurt', calories: 133, protein: 5.7, carbs: 4.0, fat: 10.0 },
  { id: 'bls-naturjoghurt', name: 'Naturjoghurt (1,5% Fett)', brand: 'Basis-DB', category: 'Milchprodukte', keywords: 'joghurt fettarm', calories: 51, protein: 4.3, carbs: 4.9, fat: 1.5 },
  { id: 'bls-buttermilch', name: 'Reine Buttermilch (1% Fett)', brand: 'Basis-DB', category: 'Milchprodukte', keywords: 'milch drink', calories: 38, protein: 3.5, carbs: 4.0, fat: 0.9, servingQuantity: 250, servingSize: '1 Glas (250ml)' },
  { id: 'bls-kefir', name: 'Kefir mild (1,5% Fett)', brand: 'Basis-DB', category: 'Milchprodukte', keywords: 'milch drink joghurt', calories: 45, protein: 3.4, carbs: 4.4, fat: 1.5, servingQuantity: 250, servingSize: '1 Glas (250ml)' },
  { id: 'bls-schlagsahne', name: 'Schlagsahne (30% Fett)', brand: 'Basis-DB', category: 'Milchprodukte', keywords: 'sahne rahm süße sahne', calories: 292, protein: 2.4, carbs: 3.2, fat: 30.0, servingQuantity: 30, servingSize: '2 EL (30g)' },
  { id: 'bls-kochsahne', name: 'Kochsahne / Cremefine (15% Fett)', brand: 'Basis-DB', category: 'Milchprodukte', keywords: 'sahne light kochcreme', calories: 162, protein: 2.7, carbs: 4.1, fat: 15.0, servingQuantity: 50, servingSize: '1 Portion (50g)' },
  { id: 'bls-schmand', name: 'Schmand (24% Fett)', brand: 'Basis-DB', category: 'Milchprodukte', keywords: 'sauerrahm sahne', calories: 240, protein: 2.7, carbs: 3.1, fat: 24.0, servingQuantity: 30, servingSize: '1 EL (30g)' },
  { id: 'bls-creme-fraiche', name: 'Crème fraîche (30% Fett)', brand: 'Basis-DB', category: 'Milchprodukte', keywords: 'creme fraiche sahne', calories: 292, protein: 2.4, carbs: 2.7, fat: 30.0, servingQuantity: 30, servingSize: '1 EL (30g)' },
  { id: 'bls-frischkaese', name: 'Frischkäse Doppelrahmstufe', brand: 'Basis-DB', category: 'Käse', keywords: 'philadelphia brotaufstrich', calories: 245, protein: 5.5, carbs: 3.2, fat: 23.5, servingQuantity: 30, servingSize: '1 Portion (30g)' },
  { id: 'bls-frischkaese-light', name: 'Frischkäse Light / Balance (0,2-5% Fett)', brand: 'Basis-DB', category: 'Käse', keywords: 'philadelphia balance fettreduziert brotaufstrich', calories: 98, protein: 10.5, carbs: 4.2, fat: 4.2, servingQuantity: 30, servingSize: '1 Portion (30g)' },
  { id: 'bls-huettenkaese', name: 'Hüttenkäse / Körniger Frischkäse (4% Fett)', brand: 'Basis-DB', category: 'Käse', calories: 98, protein: 12.5, carbs: 2.7, fat: 4.0, servingQuantity: 200, servingSize: '1 Becher (200g)' },
  { id: 'bls-huettenkaese-light', name: 'Hüttenkäse Light (0,8% Fett)', brand: 'Basis-DB', category: 'Käse', calories: 72, protein: 13.0, carbs: 2.8, fat: 0.8, servingQuantity: 200, servingSize: '1 Becher (200g)' },
  { id: 'bls-mozzarella-light', name: 'Mozzarella light (8,5% Fett)', brand: 'Basis-DB', category: 'Käse', calories: 157, protein: 19.0, carbs: 1.5, fat: 8.5, servingQuantity: 125, servingSize: '1 Kugel (125g)' },
  { id: 'bls-mozzarella', name: 'Mozzarella Klassik (19% Fett)', brand: 'Basis-DB', category: 'Käse', calories: 245, protein: 18.0, carbs: 1.0, fat: 19.0, servingQuantity: 125, servingSize: '1 Kugel (125g)' },
  { id: 'bls-gouda', name: 'Gouda jung (48% i. Tr.)', brand: 'Basis-DB', category: 'Käse', keywords: 'schnittkäse', calories: 356, protein: 24.5, carbs: 0.0, fat: 28.5, servingQuantity: 30, servingSize: '1 Scheibe (30g)' },
  { id: 'bls-emmentaler', name: 'Emmentaler (45% i. Tr.)', brand: 'Basis-DB', category: 'Käse', keywords: 'hartkäse schnittkäse', calories: 382, protein: 28.5, carbs: 0.0, fat: 29.7, servingQuantity: 30, servingSize: '1 Scheibe (30g)' },
  { id: 'bls-cheddar', name: 'Cheddar', brand: 'Basis-DB', category: 'Käse', keywords: 'burgerkäse hartkäse', calories: 403, protein: 25.0, carbs: 0.5, fat: 33.0, servingQuantity: 25, servingSize: '1 Scheibe (25g)' },
  { id: 'bls-camembert', name: 'Camembert (45% i. Tr.)', brand: 'Basis-DB', category: 'Käse', keywords: 'weichkäse brie', calories: 290, protein: 20.5, carbs: 0.2, fat: 23.0, servingQuantity: 40, servingSize: '1 Portion (40g)' },
  { id: 'bls-feta', name: 'Feta / Schafskäse', brand: 'Basis-DB', category: 'Käse', keywords: 'hirtenkäse salatkäse', calories: 264, protein: 17.0, carbs: 0.7, fat: 21.5 },
  { id: 'bls-parmesan', name: 'Parmesan / Parmigiano Reggiano', brand: 'Basis-DB', category: 'Käse', keywords: 'hartkäse reibekäse grana padano', calories: 392, protein: 35.6, carbs: 0.0, fat: 28.4, servingQuantity: 20, servingSize: '1 Portion (20g)' },
  { id: 'bls-harzer', name: 'Harzer Käse / Handkäse', brand: 'Basis-DB', category: 'Käse', keywords: 'sauermilchkäse protein', calories: 126, protein: 30.0, carbs: 0.1, fat: 0.7, servingQuantity: 100, servingSize: '1 Rolle (100g)' },
  { id: 'bls-milch-15', name: 'Milch (1,5% Fett)', brand: 'Basis-DB', category: 'Milch & Drinks', keywords: 'fettarme milch kuhmilch', calories: 47, protein: 3.4, carbs: 4.9, fat: 1.5, servingQuantity: 250, servingSize: '1 Glas (250ml)' },
  { id: 'bls-milch-35', name: 'Vollmilch (3,5% Fett)', brand: 'Basis-DB', category: 'Milch & Drinks', keywords: 'milch kuhmilch', calories: 64, protein: 3.3, carbs: 4.8, fat: 3.5, servingQuantity: 250, servingSize: '1 Glas (250ml)' },
  { id: 'bls-haferdrink', name: 'Haferdrink / Hafermilch (ungesüßt)', brand: 'Basis-DB', category: 'Milch & Drinks', keywords: 'hafermilch pflanzenmilch oatly', calories: 44, protein: 0.8, carbs: 6.7, fat: 1.5, servingQuantity: 250, servingSize: '1 Glas (250ml)' },
  { id: 'bls-sojadrink', name: 'Sojadrink / Sojamilch (ungesüßt)', brand: 'Basis-DB', category: 'Milch & Drinks', keywords: 'sojamilch pflanzenmilch alpro', calories: 33, protein: 3.3, carbs: 0.5, fat: 1.8, servingQuantity: 250, servingSize: '1 Glas (250ml)' },
  { id: 'bls-mandeldrink', name: 'Mandeldrink / Mandelmilch (ungesüßt)', brand: 'Basis-DB', category: 'Milch & Drinks', keywords: 'mandelmilch pflanzenmilch alpro', calories: 13, protein: 0.5, carbs: 0.1, fat: 1.1, servingQuantity: 250, servingSize: '1 Glas (250ml)' },

  // Fleisch, Fisch, Eier & Pflanzliche Proteine
  { id: 'bls-haehnchen-roh', name: 'Hähnchenbrustfilet (roh)', brand: 'Basis-DB', category: 'Geflügel', keywords: 'hühnchen hähnchenfleisch geflügel', calories: 110, protein: 23.1, carbs: 0.0, fat: 1.2, servingQuantity: 200, servingSize: '1 Filet (200g)' },
  { id: 'bls-haehnchen-gebraten', name: 'Hähnchenbrustfilet (gebraten)', brand: 'Basis-DB', category: 'Geflügel', keywords: 'hühnchen hähnchenfleisch geflügel', calories: 165, protein: 31.0, carbs: 0.0, fat: 3.6, servingQuantity: 160, servingSize: '1 Filet (160g)' },
  { id: 'bls-putenbrust-roh', name: 'Putenbrustfilet (roh)', brand: 'Basis-DB', category: 'Geflügel', keywords: 'pute putenfleisch geflügel', calories: 107, protein: 24.1, carbs: 0.0, fat: 1.0 },
  { id: 'bls-putenbrust-aufschnitt', name: 'Putenbrust Aufschnitt', brand: 'Basis-DB', category: 'Aufschnitt', keywords: 'wurst geflügelwurst schinken', calories: 106, protein: 21.5, carbs: 1.0, fat: 1.5, servingQuantity: 40, servingSize: '2 Scheiben (40g)' },
  { id: 'bls-kochschinken', name: 'Kochschinken / Hinterschinken (mager)', brand: 'Basis-DB', category: 'Aufschnitt', keywords: 'schinken wurst', calories: 108, protein: 19.5, carbs: 1.0, fat: 3.0, servingQuantity: 40, servingSize: '2 Scheiben (40g)' },
  { id: 'bls-lachsschinken', name: 'Lachsschinken', brand: 'Basis-DB', category: 'Aufschnitt', keywords: 'schinken mager', calories: 118, protein: 24.0, carbs: 0.5, fat: 2.2, servingQuantity: 30, servingSize: '2 Scheiben (30g)' },
  { id: 'bls-salami', name: 'Salami', brand: 'Basis-DB', category: 'Aufschnitt', keywords: 'wurst dauerwurst', calories: 385, protein: 21.0, carbs: 1.0, fat: 33.0, servingQuantity: 30, servingSize: '3 Scheiben (30g)' },
  { id: 'bls-bratwurst', name: 'Bratwurst (gebraten)', brand: 'Basis-DB', category: 'Fleisch & Wurst', keywords: 'wurst grillwurst', calories: 295, protein: 13.5, carbs: 0.5, fat: 26.5, servingQuantity: 100, servingSize: '1 Wurst (100g)' },
  { id: 'bls-bacon', name: 'Frühstücksspeck / Bacon (gebraten)', brand: 'Basis-DB', category: 'Fleisch & Wurst', keywords: 'speck schinkenspeck', calories: 468, protein: 34.0, carbs: 1.2, fat: 36.0, servingQuantity: 30, servingSize: '3 Scheiben (30g)' },
  { id: 'bls-rinderhack-mager', name: 'Rinderhackfleisch mager (5% Fett, roh)', brand: 'Basis-DB', category: 'Fleisch', keywords: 'hackfleisch rind tartar', calories: 137, protein: 21.4, carbs: 0.0, fat: 5.0 },
  { id: 'bls-rinderhack-15', name: 'Rinderhackfleisch (15% Fett, roh)', brand: 'Basis-DB', category: 'Fleisch', keywords: 'hackfleisch rind faschiertes', calories: 215, protein: 19.0, carbs: 0.0, fat: 15.0 },
  { id: 'bls-rindersteak', name: 'Rindersteak / Hüftsteak (roh)', brand: 'Basis-DB', category: 'Fleisch', keywords: 'rindfleisch rumpsteak filet', calories: 125, protein: 22.0, carbs: 0.0, fat: 4.0 },
  { id: 'bls-schweinefilet', name: 'Schweinefilet (roh)', brand: 'Basis-DB', category: 'Fleisch', keywords: 'schwein lende', calories: 112, protein: 22.0, carbs: 0.0, fat: 2.5 },
  { id: 'bls-lachs', name: 'Lachsfilet (roh)', brand: 'Basis-DB', category: 'Fisch', keywords: 'lachs fisch', calories: 208, protein: 20.4, carbs: 0.0, fat: 13.6, servingQuantity: 150, servingSize: '1 Filet (150g)' },
  { id: 'bls-raeucherlachs', name: 'Räucherlachs', brand: 'Basis-DB', category: 'Fisch', keywords: 'lachs fisch', calories: 182, protein: 22.0, carbs: 0.5, fat: 10.0, servingQuantity: 100, servingSize: '1 Packung (100g)' },
  { id: 'bls-thunfisch', name: 'Thunfisch im eigenen Saft (abgetropft)', brand: 'Basis-DB', category: 'Fisch', keywords: 'thunfisch dose fisch', calories: 111, protein: 25.5, carbs: 0.0, fat: 0.8, servingQuantity: 150, servingSize: '1 Dose (150g)' },
  { id: 'bls-kabeljau', name: 'Kabeljaufilet / Seelachs (roh)', brand: 'Basis-DB', category: 'Fisch', keywords: 'weißfisch fisch', calories: 82, protein: 18.0, carbs: 0.0, fat: 0.7 },
  { id: 'bls-forelle', name: 'Forellenfilet (roh)', brand: 'Basis-DB', category: 'Fisch', keywords: 'forelle fisch', calories: 119, protein: 19.5, carbs: 0.0, fat: 4.3 },
  { id: 'bls-garnelen', name: 'Garnelen / Shrimps (geschält)', brand: 'Basis-DB', category: 'Fisch', keywords: 'scampi meeresfrüchte', calories: 85, protein: 18.5, carbs: 0.5, fat: 0.9 },
  { id: 'bls-vollei', name: 'Eier / Vollei (Größe M)', brand: 'Basis-DB', category: 'Eier', keywords: 'ei rührei spiegelei', calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5, servingQuantity: 60, servingSize: '1 Ei (60g)' },
  { id: 'bls-eiklar', name: 'Eiklar / Eiweiß (flüssig)', brand: 'Basis-DB', category: 'Eier', keywords: 'ei', calories: 48, protein: 10.8, carbs: 0.7, fat: 0.1 },
  { id: 'bls-tofu', name: 'Tofu Natur', brand: 'Basis-DB', category: 'Pflanzlich', keywords: 'soja vegan', calories: 126, protein: 13.5, carbs: 1.8, fat: 7.2, servingQuantity: 200, servingSize: '1 Block (200g)' },
  { id: 'bls-raeuchertofu', name: 'Räuchertofu', brand: 'Basis-DB', category: 'Pflanzlich', keywords: 'tofu soja vegan', calories: 175, protein: 18.5, carbs: 2.2, fat: 10.0 },
  { id: 'bls-edamame', name: 'Edamame (geschält)', brand: 'Basis-DB', category: 'Pflanzlich', keywords: 'sojabohnen vegan', calories: 122, protein: 11.9, carbs: 8.9, fat: 5.2 },
  { id: 'bls-whey-isolat', name: 'Whey Isolat (Pulver)', brand: 'Basis-DB', category: 'Supplements', keywords: 'proteinpulver eiweißshake shake', calories: 375, protein: 85.0, carbs: 2.5, fat: 1.5, servingQuantity: 30, servingSize: '1 Scoop (30g)' },
  { id: 'bls-whey-konzentrat', name: 'Whey Protein Konzentrat (Pulver)', brand: 'Basis-DB', category: 'Supplements', keywords: 'proteinpulver eiweißshake shake', calories: 395, protein: 78.0, carbs: 6.0, fat: 5.5, servingQuantity: 30, servingSize: '1 Scoop (30g)' },
  { id: 'bls-casein', name: 'Casein Protein (Pulver)', brand: 'Basis-DB', category: 'Supplements', keywords: 'proteinpulver eiweißshake', calories: 365, protein: 80.0, carbs: 4.0, fat: 1.8, servingQuantity: 30, servingSize: '1 Scoop (30g)' },

  // Kohlenhydrate, Getreide & Hülsenfrüchte
  { id: 'bls-haferflocken', name: 'Haferflocken (zart/kernig)', brand: 'Basis-DB', category: 'Getreide', keywords: 'porridge hafer oats müsli', calories: 372, protein: 13.5, carbs: 58.7, fat: 7.0, servingQuantity: 60, servingSize: '1 Portion (60g)' },
  { id: 'bls-dinkelflocken', name: 'Dinkelflocken', brand: 'Basis-DB', category: 'Getreide', keywords: 'porridge dinkel müsli', calories: 354, protein: 12.0, carbs: 66.0, fat: 2.5 },
  { id: 'bls-basismuesli', name: 'Basismüsli / Hafermüsli (ungesüßt)', brand: 'Basis-DB', category: 'Getreide', keywords: 'müsli cerealien', calories: 365, protein: 11.5, carbs: 61.0, fat: 6.8, servingQuantity: 60, servingSize: '1 Portion (60g)' },
  { id: 'bls-cornflakes', name: 'Cornflakes (ungesüßt)', brand: 'Basis-DB', category: 'Getreide', keywords: 'cerealien maisflocken', calories: 374, protein: 7.4, carbs: 83.0, fat: 0.9, servingQuantity: 40, servingSize: '1 Portion (40g)' },
  { id: 'bls-griess', name: 'Weichweizengrieß / Grieß (roh)', brand: 'Basis-DB', category: 'Getreide', keywords: 'grießbrei', calories: 342, protein: 10.5, carbs: 70.5, fat: 1.1, servingQuantity: 50, servingSize: '1 Portion (50g)' },
  { id: 'bls-basmatireis-roh', name: 'Basmatireis (roh / Trockengewicht)', brand: 'Basis-DB', category: 'Reis', keywords: 'reis jasminreis langkornreis', calories: 352, protein: 7.5, carbs: 77.5, fat: 0.8, servingQuantity: 80, servingSize: '1 Portion (80g)' },
  { id: 'bls-basmatireis-gekocht', name: 'Basmatireis (gekocht)', brand: 'Basis-DB', category: 'Reis', keywords: 'reis jasminreis langkornreis', calories: 125, protein: 2.7, carbs: 27.5, fat: 0.3, servingQuantity: 200, servingSize: '1 Portion (200g)' },
  { id: 'bls-vollkornreis-roh', name: 'Vollkornreis (roh / Trockengewicht)', brand: 'Basis-DB', category: 'Reis', keywords: 'naturreis reis', calories: 350, protein: 7.8, carbs: 72.5, fat: 2.6 },
  { id: 'bls-kartoffeln', name: 'Kartoffeln (festkochend, roh)', brand: 'Basis-DB', category: 'Gemüse & Knollen', keywords: 'salzkartoffeln pellkartoffeln', calories: 73, protein: 2.0, carbs: 15.4, fat: 0.1, servingQuantity: 250, servingSize: '1 Portion (250g)' },
  { id: 'bls-suesskartoffeln', name: 'Süßkartoffeln (roh)', brand: 'Basis-DB', category: 'Gemüse & Knollen', keywords: 'kartoffel batate', calories: 86, protein: 1.6, carbs: 20.1, fat: 0.1, servingQuantity: 250, servingSize: '1 Portion (250g)' },
  { id: 'bls-pasta-roh', name: 'Pasta / Hartweizennudeln (roh)', brand: 'Basis-DB', category: 'Pasta', keywords: 'nudeln spaghetti penne fusilli makkaroni', calories: 356, protein: 12.5, carbs: 70.5, fat: 1.8, servingQuantity: 100, servingSize: '1 Portion (100g)' },
  { id: 'bls-pasta-gekocht', name: 'Pasta / Nudeln (gekocht)', brand: 'Basis-DB', category: 'Pasta', keywords: 'spaghetti penne fusilli', calories: 148, protein: 5.2, carbs: 29.5, fat: 0.8, servingQuantity: 250, servingSize: '1 Portion (250g)' },
  { id: 'bls-vollkornpasta-roh', name: 'Vollkornpasta (roh)', brand: 'Basis-DB', category: 'Pasta', keywords: 'vollkornnudeln spaghetti penne', calories: 342, protein: 13.4, carbs: 64.0, fat: 2.5 },
  { id: 'bls-quinoa-roh', name: 'Quinoa (roh / Trockengewicht)', brand: 'Basis-DB', category: 'Getreide', calories: 368, protein: 14.1, carbs: 64.2, fat: 6.1 },
  { id: 'bls-couscous-roh', name: 'Couscous (roh)', brand: 'Basis-DB', category: 'Getreide', keywords: 'bulgur', calories: 356, protein: 12.8, carbs: 72.4, fat: 0.6 },
  { id: 'bls-vollkornbrot', name: 'Vollkornbrot / Roggenvollkornbrot', brand: 'Basis-DB', category: 'Brot', keywords: 'brot schwarzbrot körnerbrot', calories: 213, protein: 7.2, carbs: 40.5, fat: 1.3, servingQuantity: 50, servingSize: '1 Scheibe (50g)' },
  { id: 'bls-mischbrot', name: 'Mischbrot / Graubrot / Bauernbrot', brand: 'Basis-DB', category: 'Brot', keywords: 'brot roggenmischbrot sauerteigbrot', calories: 235, protein: 7.0, carbs: 47.0, fat: 1.1, servingQuantity: 50, servingSize: '1 Scheibe (50g)' },
  { id: 'bls-toastbrot', name: 'Toastbrot / Sandwich-Toast', brand: 'Basis-DB', category: 'Brot', keywords: 'toast weißbrot', calories: 264, protein: 8.5, carbs: 48.5, fat: 3.4, servingQuantity: 28, servingSize: '1 Scheibe (28g)' },
  { id: 'bls-knaeckebrot', name: 'Knäckebrot (Roggen)', brand: 'Basis-DB', category: 'Brot', keywords: 'brot wasa', calories: 334, protein: 10.2, carbs: 65.0, fat: 1.6, servingQuantity: 12, servingSize: '1 Scheibe (12g)' },
  { id: 'bls-dinkelbroetchen', name: 'Dinkelbrötchen / Weizenbrötchen', brand: 'Basis-DB', category: 'Brot', keywords: 'brötchen semmel schrippe', calories: 265, protein: 9.2, carbs: 51.0, fat: 2.1, servingQuantity: 65, servingSize: '1 Brötchen (65g)' },
  { id: 'bls-baguette', name: 'Baguette / Ciabatta', brand: 'Basis-DB', category: 'Brot', keywords: 'weißbrot brot', calories: 274, protein: 8.8, carbs: 54.0, fat: 1.8, servingQuantity: 60, servingSize: '1 Portion (60g)' },
  { id: 'bls-brezel', name: 'Laugenbrezel', brand: 'Basis-DB', category: 'Brot', keywords: 'brezel laugengebäck', calories: 265, protein: 8.6, carbs: 51.5, fat: 2.3, servingQuantity: 85, servingSize: '1 Brezel (85g)' },
  { id: 'bls-croissant', name: 'Buttercroissant', brand: 'Basis-DB', category: 'Backwaren', keywords: 'croissant gebäck', calories: 406, protein: 8.2, carbs: 45.0, fat: 21.0, servingQuantity: 60, servingSize: '1 Stück (60g)' },
  { id: 'bls-reiswaffeln', name: 'Reiswaffeln (ungesalzen)', brand: 'Basis-DB', category: 'Snacks', keywords: 'maiswaffeln', calories: 387, protein: 8.1, carbs: 81.5, fat: 2.8, servingQuantity: 10, servingSize: '1 Waffel (10g)' },
  { id: 'bls-kichererbsen', name: 'Kichererbsen (gekocht / abgetropft)', brand: 'Basis-DB', category: 'Hülsenfrüchte', calories: 139, protein: 7.2, carbs: 19.5, fat: 2.6 },
  { id: 'bls-rote-linsen', name: 'Rote Linsen (roh / Trockengewicht)', brand: 'Basis-DB', category: 'Hülsenfrüchte', keywords: 'linsen tellerinsen', calories: 328, protein: 25.0, carbs: 50.0, fat: 1.6 },
  { id: 'bls-kidneybohnen', name: 'Kidneybohnen (Dose abgetropft)', brand: 'Basis-DB', category: 'Hülsenfrüchte', keywords: 'bohnen rote bohnen', calories: 105, protein: 7.5, carbs: 14.5, fat: 0.6 },
  { id: 'bls-flohsamenschalen', name: 'Flohsamenschalen', brand: 'Basis-DB', category: 'Ballaststoffe', calories: 190, protein: 2.4, carbs: 4.0, fat: 0.6, servingQuantity: 10, servingSize: '1 EL (10g)' },

  // Gesunde Fette, Nüsse, Samen & Dips
  { id: 'bls-olivenoel', name: 'Olivenöl (nativ extra)', brand: 'Basis-DB', category: 'Öle & Fette', keywords: 'öl speiseöl', calories: 884, protein: 0.0, carbs: 0.0, fat: 100.0, servingQuantity: 10, servingSize: '1 EL (10g)' },
  { id: 'bls-rapsoel', name: 'Rapsöl', brand: 'Basis-DB', category: 'Öle & Fette', keywords: 'öl speiseöl sonnenblumenöl', calories: 884, protein: 0.0, carbs: 0.0, fat: 100.0, servingQuantity: 10, servingSize: '1 EL (10g)' },
  { id: 'bls-butter', name: 'Butter', brand: 'Basis-DB', category: 'Öle & Fette', keywords: 'streichfett', calories: 741, protein: 0.7, carbs: 0.6, fat: 82.0, servingQuantity: 10, servingSize: '1 Portion (10g)' },
  { id: 'bls-walnuesse', name: 'Walnüsse', brand: 'Basis-DB', category: 'Nüsse & Samen', keywords: 'nüsse walnusskerne', calories: 654, protein: 15.2, carbs: 7.0, fat: 65.2, servingQuantity: 30, servingSize: '1 Handvoll (30g)' },
  { id: 'bls-mandeln', name: 'Mandeln', brand: 'Basis-DB', category: 'Nüsse & Samen', keywords: 'nüsse', calories: 579, protein: 21.2, carbs: 9.5, fat: 49.9, servingQuantity: 30, servingSize: '1 Handvoll (30g)' },
  { id: 'bls-cashews', name: 'Cashewkerne', brand: 'Basis-DB', category: 'Nüsse & Samen', keywords: 'nüsse cashews', calories: 553, protein: 18.2, carbs: 26.9, fat: 43.8, servingQuantity: 30, servingSize: '1 Handvoll (30g)' },
  { id: 'bls-erdnussbutter', name: 'Erdnussbutter / Erdnussmus (100% Erdnüsse)', brand: 'Basis-DB', category: 'Nüsse & Samen', keywords: 'erdnussmus erdnüsse', calories: 598, protein: 25.8, carbs: 12.0, fat: 49.2, servingQuantity: 20, servingSize: '1 EL (20g)' },
  { id: 'bls-chiasamen', name: 'Chiasamen', brand: 'Basis-DB', category: 'Nüsse & Samen', keywords: 'samen chia', calories: 486, protein: 16.5, carbs: 7.7, fat: 30.7, servingQuantity: 15, servingSize: '1 EL (15g)' },
  { id: 'bls-leinsamen', name: 'Leinsamen (geschrotet)', brand: 'Basis-DB', category: 'Nüsse & Samen', keywords: 'samen', calories: 492, protein: 18.3, carbs: 1.6, fat: 42.2, servingQuantity: 15, servingSize: '1 EL (15g)' },
  { id: 'bls-kuerbiskerne', name: 'Kürbiskerne', brand: 'Basis-DB', category: 'Nüsse & Samen', keywords: 'kerne samen', calories: 559, protein: 30.2, carbs: 4.7, fat: 49.0, servingQuantity: 20, servingSize: '1 Portion (20g)' },
  { id: 'bls-avocado', name: 'Avocado (Fruchtfleisch)', brand: 'Basis-DB', category: 'Obst & Gemüse', keywords: 'guacamole', calories: 160, protein: 2.0, carbs: 1.8, fat: 14.7, servingQuantity: 120, servingSize: '1 Avocado (120g)' },
  { id: 'bls-hummus', name: 'Hummus / Kichererbsenpüree', brand: 'Basis-DB', category: 'Dips & Saucen', keywords: 'dip brotaufstrich', calories: 235, protein: 7.5, carbs: 14.0, fat: 16.0, servingQuantity: 30, servingSize: '1 EL (30g)' },
  { id: 'bls-pesto', name: 'Pesto Genovese (grün)', brand: 'Basis-DB', category: 'Dips & Saucen', keywords: 'basilikumpesto pastasauce', calories: 450, protein: 5.0, carbs: 6.0, fat: 45.0, servingQuantity: 25, servingSize: '1 EL (25g)' },
  { id: 'bls-passierte-tomaten', name: 'Passierte Tomaten / Tomatensauce', brand: 'Basis-DB', category: 'Dips & Saucen', keywords: 'tomatenmark polpa', calories: 26, protein: 1.3, carbs: 4.2, fat: 0.2, servingQuantity: 150, servingSize: '1 Portion (150g)' },
  { id: 'bls-ketchup', name: 'Tomatenketchup', brand: 'Basis-DB', category: 'Dips & Saucen', keywords: 'sauce', calories: 112, protein: 1.2, carbs: 25.5, fat: 0.2, servingQuantity: 20, servingSize: '1 EL (20g)' },
  { id: 'bls-mayonnaise', name: 'Mayonnaise (80% Fett)', brand: 'Basis-DB', category: 'Dips & Saucen', keywords: 'mayo sauce', calories: 720, protein: 1.1, carbs: 1.5, fat: 79.0, servingQuantity: 15, servingSize: '1 EL (15g)' },
  { id: 'bls-senf', name: 'Senf (mittelscharf)', brand: 'Basis-DB', category: 'Dips & Saucen', keywords: 'sauce', calories: 95, protein: 5.8, carbs: 5.5, fat: 4.8, servingQuantity: 15, servingSize: '1 EL (15g)' },

  // Obst & Beeren
  { id: 'bls-blaubeeren', name: 'Blaubeeren / Heidelbeeren', brand: 'Basis-DB', category: 'Obst', keywords: 'beeren', calories: 46, protein: 0.7, carbs: 9.5, fat: 0.3, servingQuantity: 100, servingSize: '1 Portion (100g)' },
  { id: 'bls-himbeeren', name: 'Himbeeren', brand: 'Basis-DB', category: 'Obst', keywords: 'beeren', calories: 36, protein: 1.2, carbs: 4.8, fat: 0.3, servingQuantity: 100, servingSize: '1 Portion (100g)' },
  { id: 'bls-erdbeeren', name: 'Erdbeeren', brand: 'Basis-DB', category: 'Obst', keywords: 'beeren', calories: 32, protein: 0.8, carbs: 5.5, fat: 0.4, servingQuantity: 150, servingSize: '1 Portion (150g)' },
  { id: 'bls-banane', name: 'Banane (geschält)', brand: 'Basis-DB', category: 'Obst', keywords: 'obst', calories: 89, protein: 1.1, carbs: 20.0, fat: 0.3, servingQuantity: 120, servingSize: '1 Banane (120g)' },
  { id: 'bls-apfel', name: 'Apfel', brand: 'Basis-DB', category: 'Obst', keywords: 'äpfel obst', calories: 52, protein: 0.3, carbs: 11.4, fat: 0.2, servingQuantity: 150, servingSize: '1 Apfel (150g)' },
  { id: 'bls-birne', name: 'Birne', brand: 'Basis-DB', category: 'Obst', keywords: 'birnen obst', calories: 57, protein: 0.4, carbs: 12.4, fat: 0.1, servingQuantity: 150, servingSize: '1 Birne (150g)' },
  { id: 'bls-weintrauben', name: 'Weintrauben (hell/dunkel)', brand: 'Basis-DB', category: 'Obst', keywords: 'trauben obst', calories: 69, protein: 0.7, carbs: 15.6, fat: 0.2, servingQuantity: 125, servingSize: '1 Portion (125g)' },
  { id: 'bls-orange', name: 'Orange (geschält)', brand: 'Basis-DB', category: 'Obst', keywords: 'apfelsine zitrusfrucht', calories: 47, protein: 0.9, carbs: 9.2, fat: 0.2, servingQuantity: 160, servingSize: '1 Orange (160g)' },
  { id: 'bls-mandarine', name: 'Mandarine / Clementine', brand: 'Basis-DB', category: 'Obst', keywords: 'clementinen zitrusfrucht', calories: 50, protein: 0.8, carbs: 10.2, fat: 0.2, servingQuantity: 70, servingSize: '1 Stück (70g)' },
  { id: 'bls-kiwi', name: 'Kiwi (geschält)', brand: 'Basis-DB', category: 'Obst', keywords: 'obst', calories: 61, protein: 1.1, carbs: 11.5, fat: 0.5, servingQuantity: 75, servingSize: '1 Kiwi (75g)' },
  { id: 'bls-mango', name: 'Mango (Fruchtfleisch)', brand: 'Basis-DB', category: 'Obst', keywords: 'obst', calories: 60, protein: 0.8, carbs: 13.5, fat: 0.4, servingQuantity: 150, servingSize: '1 Portion (150g)' },
  { id: 'bls-ananas', name: 'Ananas (frisch)', brand: 'Basis-DB', category: 'Obst', keywords: 'obst', calories: 55, protein: 0.5, carbs: 12.4, fat: 0.1, servingQuantity: 150, servingSize: '1 Portion (150g)' },
  { id: 'bls-wassermelone', name: 'Wassermelone', brand: 'Basis-DB', category: 'Obst', keywords: 'melone obst', calories: 37, protein: 0.6, carbs: 8.0, fat: 0.2, servingQuantity: 250, servingSize: '1 Scheibe (250g)' },
  { id: 'bls-pfirsich', name: 'Pfirsich / Nektarine', brand: 'Basis-DB', category: 'Obst', keywords: 'nektarine obst', calories: 42, protein: 0.9, carbs: 8.9, fat: 0.2, servingQuantity: 120, servingSize: '1 Stück (120g)' },
  { id: 'bls-kirschen', name: 'Kirschen / Süßkirschen', brand: 'Basis-DB', category: 'Obst', keywords: 'obst', calories: 63, protein: 1.0, carbs: 13.3, fat: 0.3, servingQuantity: 125, servingSize: '1 Portion (125g)' },

  // Gemüse
  { id: 'bls-brokkoli', name: 'Brokkoli', brand: 'Basis-DB', category: 'Gemüse', keywords: 'kohl gemüse', calories: 34, protein: 2.8, carbs: 4.0, fat: 0.4 },
  { id: 'bls-blumenkohl', name: 'Blumenkohl', brand: 'Basis-DB', category: 'Gemüse', keywords: 'kohl gemüse', calories: 25, protein: 2.0, carbs: 3.0, fat: 0.3 },
  { id: 'bls-rosenkohl', name: 'Rosenkohl', brand: 'Basis-DB', category: 'Gemüse', keywords: 'kohl gemüse', calories: 43, protein: 3.4, carbs: 5.2, fat: 0.5 },
  { id: 'bls-rotkohl', name: 'Rotkohl / Blaukraut (roh)', brand: 'Basis-DB', category: 'Gemüse', keywords: 'kohl krautsalat', calories: 29, protein: 1.4, carbs: 4.8, fat: 0.2 },
  { id: 'bls-weisskohl', name: 'Weißkohl / Spitzkohl (roh)', brand: 'Basis-DB', category: 'Gemüse', keywords: 'kohl krautsalat', calories: 25, protein: 1.3, carbs: 4.2, fat: 0.2 },
  { id: 'bls-kohlrabi', name: 'Kohlrabi', brand: 'Basis-DB', category: 'Gemüse', keywords: 'gemüse', calories: 27, protein: 1.7, carbs: 3.8, fat: 0.1, servingQuantity: 150, servingSize: '1 Knolle (150g)' },
  { id: 'bls-spinat', name: 'Spinat / Blattspinat', brand: 'Basis-DB', category: 'Gemüse', keywords: 'blattgemüse salat', calories: 23, protein: 2.9, carbs: 1.4, fat: 0.4 },
  { id: 'bls-paprika', name: 'Paprika (rot)', brand: 'Basis-DB', category: 'Gemüse', keywords: 'gemüsepaprika', calories: 37, protein: 1.0, carbs: 6.4, fat: 0.3, servingQuantity: 160, servingSize: '1 Paprika (160g)' },
  { id: 'bls-tomate', name: 'Tomate / Cocktailtomaten', brand: 'Basis-DB', category: 'Gemüse', keywords: 'tomaten cherrytomaten', calories: 18, protein: 0.9, carbs: 2.6, fat: 0.2, servingQuantity: 100, servingSize: '1 Tomate (100g)' },
  { id: 'bls-gurke', name: 'Salatgurke / Schlangengurke', brand: 'Basis-DB', category: 'Gemüse', keywords: 'gurke salat', calories: 12, protein: 0.6, carbs: 1.8, fat: 0.2 },
  { id: 'bls-zucchini', name: 'Zucchini', brand: 'Basis-DB', category: 'Gemüse', keywords: 'gemüse', calories: 19, protein: 1.6, carbs: 2.2, fat: 0.4 },
  { id: 'bls-aubergine', name: 'Aubergine', brand: 'Basis-DB', category: 'Gemüse', keywords: 'gemüse', calories: 24, protein: 1.0, carbs: 3.1, fat: 0.2 },
  { id: 'bls-champignons', name: 'Champignons / Pilze', brand: 'Basis-DB', category: 'Gemüse', keywords: 'pilze', calories: 22, protein: 3.1, carbs: 0.6, fat: 0.3 },
  { id: 'bls-karotten', name: 'Karotten / Möhren', brand: 'Basis-DB', category: 'Gemüse', keywords: 'möhre wurzeln', calories: 39, protein: 1.0, carbs: 7.6, fat: 0.2 },
  { id: 'bls-zwiebel', name: 'Zwiebel / Gemüsezwiebel', brand: 'Basis-DB', category: 'Gemüse', keywords: 'zwiebeln schalotte rote zwiebel', calories: 28, protein: 1.2, carbs: 4.9, fat: 0.2, servingQuantity: 80, servingSize: '1 Zwiebel (80g)' },
  { id: 'bls-lauch', name: 'Lauch / Porree', brand: 'Basis-DB', category: 'Gemüse', keywords: 'frühlingszwiebel lauchzwiebel', calories: 31, protein: 2.0, carbs: 4.5, fat: 0.3 },
  { id: 'bls-spargel', name: 'Spargel (weiß / grün)', brand: 'Basis-DB', category: 'Gemüse', keywords: 'gemüse', calories: 20, protein: 2.1, carbs: 2.0, fat: 0.2, servingQuantity: 250, servingSize: '1 Portion (250g)' },
  { id: 'bls-kuerbis', name: 'Hokkaidokürbis / Kürbis', brand: 'Basis-DB', category: 'Gemüse', keywords: 'kürbis butternut', calories: 45, protein: 1.5, carbs: 8.5, fat: 0.4 },
  { id: 'bls-radieschen', name: 'Radieschen', brand: 'Basis-DB', category: 'Gemüse', keywords: 'salat', calories: 16, protein: 1.0, carbs: 2.1, fat: 0.1 },
  { id: 'bls-mais', name: 'Zuckermais (Dose abgetropft)', brand: 'Basis-DB', category: 'Gemüse', keywords: 'mais', calories: 86, protein: 2.9, carbs: 15.8, fat: 1.2, servingQuantity: 100, servingSize: '1 Portion (100g)' },
  { id: 'bls-erbsen', name: 'Erbsen (grün, TK/gekocht)', brand: 'Basis-DB', category: 'Gemüse', keywords: 'gemüse', calories: 81, protein: 5.4, carbs: 11.5, fat: 0.5, servingQuantity: 100, servingSize: '1 Portion (100g)' },
  { id: 'bls-rote-bete', name: 'Rote Bete (gekocht)', brand: 'Basis-DB', category: 'Gemüse', keywords: 'rote rübe', calories: 43, protein: 1.6, carbs: 8.4, fat: 0.1 },

  // Extras & Getränke
  { id: 'bls-honig', name: 'Honig', brand: 'Basis-DB', category: 'Extras', keywords: 'blütenhonig waldhonig', calories: 304, protein: 0.3, carbs: 82.0, fat: 0.0, servingQuantity: 15, servingSize: '1 TL (15g)' },
  { id: 'bls-marmelade', name: 'Marmelade / Konfitüre', brand: 'Basis-DB', category: 'Extras', keywords: 'fruchtaufstrich erdbeermarmelade', calories: 245, protein: 0.4, carbs: 60.0, fat: 0.1, servingQuantity: 20, servingSize: '1 EL (20g)' },
  { id: 'bls-zartbitter-85', name: 'Zartbitterschokolade (85% Kakao)', brand: 'Basis-DB', category: 'Extras', keywords: 'schokolade dunkle schokolade', calories: 598, protein: 11.0, carbs: 19.0, fat: 50.0, servingQuantity: 20, servingSize: '2 Stücke (20g)' },
  { id: 'bls-vollmilchschokolade', name: 'Vollmilchschokolade', brand: 'Basis-DB', category: 'Extras', keywords: 'schokolade', calories: 535, protein: 7.5, carbs: 56.0, fat: 30.5, servingQuantity: 25, servingSize: '1 Rippe (25g)' },
  { id: 'bls-cappuccino', name: 'Cappuccino (mit Milch 1,5%)', brand: 'Basis-DB', category: 'Getränke', keywords: 'kaffee milchkaffee', calories: 35, protein: 2.3, carbs: 3.4, fat: 1.1, servingQuantity: 200, servingSize: '1 Tasse (200ml)' },
  { id: 'bls-kaffee-schwarz', name: 'Kaffee schwarz / Espresso', brand: 'Basis-DB', category: 'Getränke', keywords: 'americano filterkaffee', calories: 2, protein: 0.1, carbs: 0.2, fat: 0.0, servingQuantity: 200, servingSize: '1 Tasse (200ml)' },
  { id: 'bls-orangensaft', name: 'Orangensaft (100% Direktsaft)', brand: 'Basis-DB', category: 'Getränke', keywords: 'saft o-saft', calories: 45, protein: 0.7, carbs: 9.5, fat: 0.2, servingQuantity: 200, servingSize: '1 Glas (200ml)' },
  { id: 'bls-apfelsaft', name: 'Apfelsaft / Apfelschorle', brand: 'Basis-DB', category: 'Getränke', keywords: 'saft', calories: 46, protein: 0.1, carbs: 11.0, fat: 0.1, servingQuantity: 200, servingSize: '1 Glas (200ml)' },
  { id: 'bls-cola', name: 'Cola / Limonade (gezuckert)', brand: 'Basis-DB', category: 'Getränke', keywords: 'softdrink fanta sprite', calories: 42, protein: 0.0, carbs: 10.6, fat: 0.0, servingQuantity: 330, servingSize: '1 Dose (330ml)' },
  { id: 'bls-cola-zero', name: 'Cola Zero / Light', brand: 'Basis-DB', category: 'Getränke', keywords: 'softdrink zero light', calories: 1, protein: 0.0, carbs: 0.0, fat: 0.0, servingQuantity: 330, servingSize: '1 Dose (330ml)' },
  { id: 'bls-bier', name: 'Bier / Pils (ca. 4,9% Vol.)', brand: 'Basis-DB', category: 'Getränke', keywords: 'alkohol helles weizen', calories: 43, protein: 0.5, carbs: 3.1, fat: 0.0, servingQuantity: 330, servingSize: '1 Flasche (330ml)' },
  { id: 'bls-wein', name: 'Wein trocken (Weißwein / Rotwein)', brand: 'Basis-DB', category: 'Getränke', keywords: 'alkohol weinschorle', calories: 72, protein: 0.1, carbs: 1.5, fat: 0.0, servingQuantity: 200, servingSize: '1 Glas (200ml)' },
].map((item) => ({ ...item, source: 'basis' }));

const QUICK_PICK_IDS = [
  'bls-magerquark',
  'bls-skyr',
  'bls-haehnchen-roh',
  'bls-haferflocken',
  'bls-basmatireis-roh',
  'bls-vollei',
  'bls-whey-isolat',
  'bls-olivenoel',
];

// ============================================================================
// SHADCN/UI + RADIX UI + BEAUTIFUL UI PRIMITIVES
// ============================================================================

/**
 * Karte im Design „Graphite & Lime“: flache Graphite-Fläche mit feinem Rand,
 * ohne Glas-Effekt und ohne Glow. `spotlightColor` wird aus Kompatibilität
 * angenommen, aber nicht mehr verwendet.
 */
function SpotlightCard({
  children,
  className = '',
  spotlightColor: _spotlightColor,
  ...props
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

const ENERGY_FIELD_CLS =
  'w-full px-3 py-2 text-xs font-bold tabular-nums bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-emerald-500';

const formatKgDelta = (kg) =>
  `${kg > 0 ? '+' : ''}${kg.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`;

/**
 * shadcn/ui Button Primitive
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98] select-none';

  const variants = {
    primary:
      'bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400',
    secondary:
      'bg-zinc-800/90 text-zinc-100 hover:bg-zinc-700/85 border border-zinc-700/70',
    outline:
      'bg-zinc-950/60 text-zinc-200 hover:bg-zinc-800/80 hover:text-zinc-50 border border-zinc-800 hover:border-zinc-700',
    ghost:
      'bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70',
    destructive:
      'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30',
  };

  const sizes = {
    xs: 'h-7 px-2.5 text-[11px] rounded-lg',
    sm: 'h-8 px-3 text-xs rounded-xl',
    md: 'h-9 px-4 text-xs sm:text-sm rounded-xl',
    lg: 'h-10 px-5 text-sm rounded-xl',
    icon: 'h-8 w-8 rounded-lg p-0',
  };

  return (
    <button
      type={type}
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * shadcn/ui Badge Primitive
 */
function Badge({ children, variant = 'secondary', className = '' }) {
  const variants = {
    default: 'bg-zinc-100 text-zinc-950 border-transparent font-semibold',
    secondary: 'bg-zinc-800/90 text-zinc-300 border-zinc-700/60',
    outline: 'bg-transparent text-zinc-400 border-zinc-800',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    sky: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    destructive: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-none tabular-nums transition-colors ${
        variants[variant] || variants.secondary
      } ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Radix-style SegmentedTabs with data-state="active" & smooth pill highlight
 */
function SegmentedTabs({ items, value, onValueChange, className = '', variant = 'default' }) {
  // variant "band": Reiter in einer Kopfleiste (Handy: 4 gleich breite Spalten, Symbol über Text)
  const band = variant === 'band';
  return (
    <div
      role="tablist"
      className={
        band
          ? `grid ${className.includes('grid-cols-3') ? '' : 'grid-cols-4 sm:flex'} items-stretch gap-1 ${className}`
          : `inline-flex flex-wrap sm:flex-nowrap items-center gap-1 rounded-xl bg-zinc-950/90 p-1 border border-zinc-800/90 ${className}`
      }
    >
      {items.map((item) => {
        const isActive = item.value === value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-state={isActive ? 'active' : 'inactive'}
            onClick={() => onValueChange(item.value)}
            className={`relative flex-1 sm:flex-initial inline-flex items-center justify-center rounded-lg font-semibold whitespace-nowrap ${
              band
                ? 'flex-col sm:flex-row gap-1 sm:gap-1.5 min-h-[48px] sm:min-h-[40px] px-1 sm:px-3 py-1.5 text-[11px] sm:text-xs'
                : 'gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs'
            } transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
              isActive
                ? 'bg-zinc-800 text-zinc-50 border border-zinc-700/80 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            {Icon && (
              <Icon
                className={`w-3.5 h-3.5 transition-colors ${
                  isActive ? item.activeIconClass || 'text-emerald-400' : 'text-zinc-500'
                }`}
              />
            )}
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge !== null && (
              <span
                className={`${band ? 'hidden sm:inline ' : ''}ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
                  isActive
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * shadcn/ui + Radix-style ProgressBar
 */
function ProgressBar({ value = 0, color = 'emerald', height = 'md', className = '' }) {
  const clamped = Math.max(0, Math.min(100, value));
  const colors = {
    emerald: 'bg-emerald-400',
    light: 'bg-zinc-100',
    amber: 'bg-amber-500',
    sky: 'bg-sky-400',
    rose: 'bg-rose-500',
  };
  const heights = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-2.5',
  };

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full overflow-hidden rounded-full bg-zinc-950/90 border border-zinc-800/80 ${
        heights[height] || heights.md
      } ${className}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${
          colors[color] || colors.emerald
        }`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/**
 * Radix-style SwitchToggle with data-state="checked" | "unchecked"
 */
function SwitchToggle({ checked, onCheckedChange, label, id }) {
  return (
    <div className="inline-flex items-center gap-2">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        data-state={checked ? 'checked' : 'unchecked'}
        onClick={() => onCheckedChange(!checked)}
        className={`peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
          checked ? 'bg-emerald-500' : 'bg-zinc-800 border-zinc-700/80'
        }`}
      >
        <span
          data-state={checked ? 'checked' : 'unchecked'}
          className={`pointer-events-none block h-4 w-4 rounded-full bg-zinc-950 shadow-sm ring-0 transition-transform duration-200 ${
            checked ? 'translate-x-4 bg-zinc-950' : 'translate-x-0.5 bg-zinc-300'
          }`}
        />
      </button>
      {label && (
        <label
          htmlFor={id}
          onClick={() => onCheckedChange(!checked)}
          className="text-xs font-medium text-zinc-300 hover:text-zinc-100 cursor-pointer select-none"
        >
          {label}
        </label>
      )}
    </div>
  );
}

/**
 * Radix-style ModalDialog with Backdrop-Blur, Escape handling & ARIA attributes
 */
function ModalDialog({ open, onOpenChange, title, description, children }) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pt-[max(0.75rem,env(safe-area-inset-top))] bg-zinc-950/80 backdrop-blur-md animate-fadeIn"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="radix-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg flex flex-col max-h-[calc(100dvh-0.75rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden rounded-t-2xl sm:rounded-2xl bg-zinc-900 border border-zinc-800 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.85)]"
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-zinc-800/90">
          <div className="min-w-0">
            <h3
              id="radix-dialog-title"
              className="text-base font-semibold tracking-tight text-zinc-100 flex items-center gap-2"
            >
              <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
              {title}
            </h3>
            {description && (
              <p className="text-xs text-zinc-400 mt-1">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Dialog schließen"
            className="shrink-0 w-10 h-10 -mr-2 -mt-1 flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Sonner-style Floating Undo Toast (bottom-right)
 */
function SonnerToast({ toast, onUndo, onDismiss }) {
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-28 sm:bottom-4 right-4 z-50 w-[calc(100%-2rem)] sm:w-auto sm:min-w-[320px] sm:max-w-md"
    >
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-900/95 border border-zinc-800 backdrop-blur-xl px-4 py-3 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.85)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${
              toast.accent === 'amber'
                ? 'bg-amber-400'
                : 'bg-emerald-400'
            }`}
          />
          <span className="text-xs sm:text-[13px] font-medium text-zinc-100 truncate">
            {toast.message}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {toast.canUndo && (
            <button
              type="button"
              onClick={onUndo}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition"
            >
              <RotateCcw className="w-3 h-3" />
              Rückgängig
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Benachrichtigung schließen"
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BARCODE-DECODER (NATIVE BARCODEDETECTOR + ZXING BROWSER-FALLBACK)
// ============================================================================

let zxingReaderPromise = null;

async function getZxingReader() {
  if (!zxingReaderPromise) {
    zxingReaderPromise = import('@zxing/browser')
      .then((mod) => new mod.BrowserMultiFormatReader())
      .catch((err) => {
        zxingReaderPromise = null;
        throw err;
      });
  }
  return zxingReaderPromise;
}

/**
 * Erstellt skalierte & rotierte Canvas-Varianten eines Bildes (0°, 90°, 270°),
 * damit auch hochkant fotografierte Barcodes zuverlässig erkannt werden.
 */
function buildRotatedCanvases(sourceEl, width, height) {
  const maxDim = 1400;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const angles = [0, 90, 270];
  return angles.map((angle) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (angle === 90 || angle === 270) {
      canvas.width = h;
      canvas.height = w;
    } else {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(sourceEl, -w / 2, -h / 2, w, h);
    ctx.restore();
    return canvas;
  });
}

/**
 * Dekodiert EAN/UPC/Code128 Barcodes aus einem Bild- oder Canvas-Element.
 */
async function decodeBarcodeFromImage(imgElement) {
  const width = imgElement.naturalWidth || imgElement.videoWidth || imgElement.width;
  const height = imgElement.naturalHeight || imgElement.videoHeight || imgElement.height;
  if (!width || !height) return null;

  const canvases = buildRotatedCanvases(imgElement, width, height);

  // 1. Versuch: Native Browser BarcodeDetector API (schnell & hardwarebeschleunigt)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
      });
      for (const canvas of canvases) {
        const barcodes = await detector.detect(canvas);
        const match = barcodes.find((b) => b.rawValue && /^\d{8,14}$/.test(b.rawValue.trim()));
        if (match) return match.rawValue.trim();
        if (barcodes[0]?.rawValue) return barcodes[0].rawValue.trim();
      }
    } catch {
      // Fallback auf ZXing unten
    }
  }

  // 2. Versuch: Cross-Browser Fallback über ZXing (Safari, Firefox, iOS)
  try {
    const reader = await getZxingReader();
    for (const canvas of canvases) {
      try {
        const result = reader.decodeFromCanvas(canvas);
        const text = result?.getText?.()?.trim();
        if (text) return text;
      } catch {
        // Nächste Rotation testen
      }
    }
  } catch (err) {
    console.warn('ZXing Decoder nicht verfügbar:', err);
  }

  return null;
}

/**
 * Prüft die Prüfziffer von EAN-8, UPC-A (12), EAN-13 und GTIN-14.
 */
function isValidGtin(code) {
  if (!/^(\d{8}|\d{12,14})$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop();
  let sum = 0;
  for (let i = digits.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) {
    sum += digits[i] * w;
  }
  return (10 - (sum % 10)) % 10 === check;
}

let nativeDetectorPromise = null;

/** Nativer BarcodeDetector (Android Chrome), falls vorhanden – sonst null. */
async function getNativeDetector() {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return null;
  if (!nativeDetectorPromise) {
    nativeDetectorPromise = (async () => {
      const wanted = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];
      try {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        const formats = wanted.filter((f) => supported.includes(f));
        return formats.length ? new window.BarcodeDetector({ formats }) : null;
      } catch {
        return null;
      }
    })();
  }
  return nativeDetectorPromise;
}

/**
 * Schneidet den mittleren Bereich des Kamerabilds (dort, wo der Zielrahmen ist)
 * aus und dreht ihn optional um 90°, damit auch hochkant gehaltene Barcodes
 * erkannt werden.
 */
function grabCenterCrop(video, rotate) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const cropW = Math.round(vw * 0.9);
  const cropH = Math.round(vh * (rotate ? 0.9 : 0.5));
  const sx = Math.round((vw - cropW) / 2);
  const sy = Math.round((vh - cropH) / 2);
  const scale = Math.min(1, 1000 / Math.max(cropW, cropH));
  const w = Math.round(cropW * scale);
  const h = Math.round(cropH * scale);
  const canvas = document.createElement('canvas');
  canvas.width = rotate ? h : w;
  canvas.height = rotate ? w : h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (rotate) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(video, sx, sy, cropW, cropH, -w / 2, -h / 2, w, h);
  } else {
    ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, w, h);
  }
  return canvas;
}

/** Ein Erkennungsversuch auf dem aktuellen Videobild. */
async function decodeVideoFrame(video, tick) {
  const native = await getNativeDetector();
  if (native) {
    try {
      const found = await native.detect(video);
      const hit = found.find((b) => b.rawValue && /^\d{8,14}$/.test(b.rawValue.trim())) || found[0];
      return hit?.rawValue?.trim() || null;
    } catch {
      return null;
    }
  }
  const reader = await getZxingReader();
  const canvas = grabCenterCrop(video, tick % 3 === 2);
  if (!canvas) return null;
  try {
    return reader.decodeFromCanvas(canvas)?.getText?.()?.trim() || null;
  } catch {
    return null; // kein Barcode in diesem Bild
  }
}

/**
 * BarcodeScannerModal:
 * Öffnet direkt den Live-Scanner: Die Kamera läuft im Fenster und ein Barcode
 * wird automatisch erkannt – ohne Foto und ohne Bestätigung. Die Kamera-
 * Erlaubnis fragt der Browser nur beim ersten Mal ab. Foto/Bild und manuelle
 * Eingabe bleiben als Ausweichweg.
 */
function BarcodeScannerModal({ open, onOpenChange, onBarcodeDetected }) {
  const [scanMode, setScanMode] = useState('live'); // 'live' | 'photo'
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [manualEan, setManualEan] = useState('');
  const [cameraState, setCameraState] = useState('idle'); // 'idle' | 'starting' | 'active' | 'error'
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const cameraCaptureInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const sessionRef = useRef(0);
  const onDetectedRef = useRef(onBarcodeDetected);
  onDetectedRef.current = onBarcodeDetected;

  const stopCamera = () => {
    sessionRef.current += 1; // laufende Scan-Schleife & Kamerastart abbrechen
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setTorchAvailable(false);
    setTorchOn(false);
    setCameraState('idle');
  };

  const startCamera = async () => {
    stopCamera();
    const session = sessionRef.current;
    setScanError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('error');
      setScanError('Die Live-Kamera wird in diesem Browser nicht unterstützt. Nutze „Foto / Bild".');
      return;
    }

    setCameraState('starting');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          advanced: [{ focusMode: 'continuous' }],
        },
      });
    } catch (err) {
      if (session !== sessionRef.current) return;
      setCameraState('error');
      setScanError(
        err?.name === 'NotAllowedError'
          ? 'Kamerazugriff wurde verweigert. Erlaube ihn in Chrome über das Schloss-Symbol neben der Adresse (bzw. in der installierten App: lange auf das App-Symbol tippen → App-Info → Berechtigungen → Kamera). Bis dahin funktioniert „Foto / Bild".'
          : 'Kamera konnte nicht gestartet werden. Ist sie in einer anderen App geöffnet? Alternativ „Foto / Bild" nutzen.'
      );
      return;
    }

    // Fenster wurde inzwischen geschlossen oder neu gestartet
    if (session !== sessionRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    streamRef.current = stream;
    const track = stream.getVideoTracks()[0];
    try {
      setTorchAvailable(Boolean(track?.getCapabilities?.().torch));
    } catch {
      setTorchAvailable(false);
    }

    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      await video.play().catch(() => {});
    }
    if (session !== sessionRef.current) return;
    setCameraState('active');

    // Scan-Schleife: so schnell wie der Decoder es zulässt, ohne das Handy zu überlasten
    let tick = 0;
    let lastCode = null;
    const loop = async () => {
      if (session !== sessionRef.current) return;
      const v = videoRef.current;
      if (v && v.readyState >= 2) {
        const code = await decodeVideoFrame(v, tick++);
        if (session !== sessionRef.current) return;
        // Gültige EAN/UPC sofort übernehmen, alles andere erst nach zweimaligem Lesen
        if (code && (isValidGtin(code) || code === lastCode)) {
          stopCamera();
          onDetectedRef.current(code);
          return;
        }
        lastCode = code;
      }
      setTimeout(loop, 120);
    };
    loop();
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(!torchOn);
    } catch {
      setTorchAvailable(false);
    }
  };

  // Beim Öffnen sofort die Kamera starten, beim Schließen alles aufräumen
  useEffect(() => {
    if (open && scanMode === 'live') {
      startCamera();
    } else {
      stopCamera();
    }
    if (!open) {
      setScanError(null);
      setIsDecoding(false);
      setManualEan('');
      setScanMode('live');
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scanMode]);

  // Kamera freigeben, wenn die App in den Hintergrund geht; bei Rückkehr neu starten
  useEffect(() => {
    if (!open || scanMode !== 'live') return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') stopCamera();
      else startCamera();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scanMode]);

  // Foto-Datei verarbeiten & Barcode auslesen
  const processImageFile = async (file) => {
    if (!file) return;
    setScanError(null);
    setIsDecoding(true);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);

    try {
      const img = new window.Image();
      img.src = nextUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const code = await decodeBarcodeFromImage(img);
      if (code) {
        onBarcodeDetected(code);
      } else {
        setScanError(
          'Kein Barcode auf dem Foto erkannt. Achte auf scharfes Licht ohne Spiegelungen und fotografiere den EAN-Code möglichst frontal.'
        );
      }
    } catch {
      setScanError('Foto konnte nicht verarbeitet werden. Bitte erneut versuchen.');
    } finally {
      setIsDecoding(false);
    }
  };

  // Zwischenablage-Paste (z. B. Strg+V Foto am Desktop)
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          setScanMode('photo');
          processImageFile(file);
          break;
        }
      }
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const cleaned = manualEan.replace(/\D/g, '');
    if (cleaned.length >= 8) {
      onBarcodeDetected(cleaned);
    }
  };

  return (
    <ModalDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Barcode-Scanner"
      description="Halte den Barcode in den Rahmen – er wird automatisch erkannt."
    >
      <div onPaste={handlePaste} className="p-5 space-y-4">
        <SegmentedTabs
          value={scanMode}
          onValueChange={(nextMode) => {
            setScanMode(nextMode);
            setScanError(null);
          }}
          className="w-full"
          items={[
            {
              value: 'live',
              label: 'Live-Scanner',
              icon: ScanLine,
              activeIconClass: 'text-emerald-400',
            },
            {
              value: 'photo',
              label: 'Foto / Bild',
              icon: Camera,
              activeIconClass: 'text-emerald-400',
            },
          ]}
        />

        {/* MODUS 1: LIVE-KAMERA MIT AUTOMATISCHER ERKENNUNG */}
        {scanMode === 'live' && (
          <div className="relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 aspect-[4/3] flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 w-full h-full object-cover"
            />

            {cameraState === 'active' && (
              <>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                  <div className="w-full max-w-[300px] h-32 rounded-xl border-2 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(9,9,11,0.45)] relative overflow-hidden">
                    <div className="absolute inset-x-2 top-1/2 h-0.5 bg-emerald-400/80 animate-pulse" />
                  </div>
                </div>
                <div className="pointer-events-none absolute bottom-2 inset-x-0 text-center text-[11px] font-medium text-zinc-200 drop-shadow">
                  Suche Barcode…
                </div>
                {torchAvailable && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    aria-pressed={torchOn}
                    className={`absolute top-2 right-2 h-9 px-3 rounded-xl border text-xs font-medium backdrop-blur transition ${
                      torchOn
                        ? 'bg-amber-400/90 border-amber-300 text-zinc-950'
                        : 'bg-zinc-950/70 border-zinc-700 text-zinc-200'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                    Licht
                  </button>
                )}
              </>
            )}

            {cameraState === 'starting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-400">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                <span className="text-xs">Starte Kamera…</span>
              </div>
            )}

            {cameraState === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
                <Camera className="w-7 h-7 text-zinc-500" />
                <Button variant="secondary" size="sm" onClick={startCamera}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Kamera erneut starten</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* MODUS 2: FOTO AUFNEHMEN / BILD AUSWÄHLEN (Ausweichweg) */}
        {scanMode === 'photo' && (
          <div className="space-y-3">
            <input
              ref={cameraCaptureInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processImageFile(f);
                e.target.value = '';
              }}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) processImageFile(f);
                e.target.value = '';
              }}
              className="hidden"
            />

            {previewUrl && (
              <div className="relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 aspect-[16/10] flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Aufgenommener Barcode"
                  className="max-h-full max-w-full object-contain"
                />
                {isDecoding && (
                  <div className="absolute inset-0 bg-zinc-950/75 flex flex-col items-center justify-center gap-2 text-emerald-400">
                    <Loader2 className="w-7 h-7 animate-spin" />
                    <span className="text-xs font-semibold tracking-wide">Analysiere Barcode...</span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="primary"
                size="md"
                onClick={() => cameraCaptureInputRef.current?.click()}
                disabled={isDecoding}
              >
                <Camera className="w-4 h-4" />
                <span>{previewUrl ? 'Neues Foto' : 'Foto machen'}</span>
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isDecoding}
              >
                <ImageIcon className="w-4 h-4 text-sky-400" />
                <span>Bild wählen</span>
              </Button>
            </div>
          </div>
        )}

        {scanError && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{scanError}</span>
          </div>
        )}

        {/* Fallback: EAN-Ziffern direkt eintippen */}
        <form
          onSubmit={handleManualSubmit}
          className="pt-3 border-t border-zinc-800/90 flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Barcode className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              inputMode="numeric"
              value={manualEan}
              onChange={(e) => setManualEan(e.target.value)}
              placeholder="Oder EAN-Nummer eintippen (z. B. 4008400...)"
              className="w-full pl-8 pr-3 py-2 text-xs tabular-nums bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={manualEan.replace(/\D/g, '').length < 8}
          >
            Suchen
          </Button>
        </form>
      </div>
    </ModalDialog>
  );
}

// ============================================================================
// OPEN FOOD FACTS PARSER & VALIDIERUNG
// ============================================================================

function extractLocalizedProductName(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const candidate =
      value.de ||
      value.main ||
      value.en ||
      Object.values(value).find((entry) => typeof entry === 'string' && entry.trim());
    return candidate ? String(candidate).trim() : '';
  }
  return '';
}

// ============================================================================
// OPEN FOOD FACTS: ROBUSTER ABRUF (RETRY + CACHE)
// ============================================================================
// Open Food Facts ist ein ehrenamtlich betriebener Dienst.
// - Die schnelle Suche (search.openfoodfacts.org) erlaubt keine Aufrufe aus
//   fremden Web-Apps (kein CORS-Header) und ist für uns daher nicht nutzbar.
// - Die Volltextsuche (cgi/search.pl) liefert oft "503 überlastet" und ist auf
//   ~10 Anfragen/Minute begrenzt; die Produkt-API blockt kurze Serien mit 429.
// Darum: wiederholen bei vorübergehenden Fehlern, Ergebnisse lokal merken.

const OFF_FIELDS =
  'code,product_name,product_name_de,brands,nutriments,serving_size,serving_quantity,nutrition_grades,nutriscore_grade';
const OFF_CACHE_KEY = 'hht_off_cache_v1';
const OFF_CACHE_MAX = 200;
const OFF_CACHE_FRESH_MS = 14 * 24 * 60 * 60 * 1000;
let offCacheMem = null;

class OffHttpError extends Error {
  constructor(status) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

const isTransientOffError = (err) =>
  err && err.name !== 'AbortError' && (!(err instanceof OffHttpError) || err.status === 429 || err.status >= 500);

function waitWithSignal(ms, signal) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}

const OFF_BACKOFF_MS = [600, 1400];

// Einzelner Abruf mit eigenem Timeout und Wiederholung bei 429/5xx/Netzfehler
async function offFetchJson(url, signal, { retries = 1, timeoutMs = 5500 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await waitWithSignal(OFF_BACKOFF_MS[attempt - 1] ?? 1400, signal);
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new OffHttpError(res.status);
      return await res.json();
    } catch (err) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      // Eigenes Timeout zählt als vorübergehender Fehler
      lastErr = err.name === 'AbortError' ? new Error('Timeout') : err;
      if (!isTransientOffError(lastErr)) throw lastErr;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
  throw lastErr;
}

function readOffCache() {
  if (offCacheMem !== null) return offCacheMem;
  try {
    offCacheMem = JSON.parse(localStorage.getItem(OFF_CACHE_KEY) || '{}') || {};
  } catch {
    offCacheMem = {};
  }
  return offCacheMem;
}

function getOffCache(key) {
  const entry = readOffCache()[key];
  if (!entry || !Array.isArray(entry.results)) return null;
  return { results: entry.results, fresh: Date.now() - entry.t < OFF_CACHE_FRESH_MS };
}

// Durchsucht alle früher geladenen Produkte im Speicher (0 ms)
function searchOffCacheLocal(query) {
  const tokens = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const seen = new Set();
  const out = [];
  for (const entry of Object.values(readOffCache())) {
    for (const item of entry?.results || []) {
      if (!item || seen.has(item.id)) continue;
      const hay = normalizeSearchText(`${item.name} ${item.brand || ''}`);
      if (tokens.every((t) => hay.includes(t))) {
        seen.add(item.id);
        out.push(item);
      }
    }
  }
  return out.slice(0, 15);
}

function putOffCache(key, results) {
  try {
    const cache = { ...readOffCache() };
    cache[key] = { t: Date.now(), results };
    const keys = Object.keys(cache);
    if (keys.length > OFF_CACHE_MAX) {
      keys
        .sort((a, b) => cache[a].t - cache[b].t)
        .slice(0, keys.length - OFF_CACHE_MAX)
        .forEach((k) => delete cache[k]);
    }
    offCacheMem = cache;
    localStorage.setItem(OFF_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Speicher voll o. ä.: Cache ist optional
  }
}

// Barcode-Lookup über die Produkt-API (schnell, mit Wiederholungen)
async function offLookupBarcode(code, signal) {
  try {
    const data = await offFetchJson(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`,
      signal,
      { retries: 2, timeoutMs: 5000 }
    );
    if (data.status === 1 && data.product) return { found: true, product: data.product };
    return { found: false };
  } catch (err) {
    if (err instanceof OffHttpError && err.status === 404) return { found: false };
    throw err;
  }
}

// Textsuche über die Volltextsuche (schlanke Antwort & kurzes Timeout)
async function offSearchText(query, signal) {
  const data = await offFetchJson(
    `https://de.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
      query
    )}&search_simple=1&action=process&json=1&page_size=12&fields=${OFF_FIELDS}`,
    signal,
    { retries: 1, timeoutMs: 5500 }
  );
  const products = Array.isArray(data.products) ? data.products : [];
  const parsedList = products.map(parseOpenFoodFactsProduct).filter(Boolean);

  const queryLower = query.toLowerCase();
  parsedList.sort((a, b) => {
    const aMatch = a.name.toLowerCase().includes(queryLower) ? 0 : 1;
    const bMatch = b.name.toLowerCase().includes(queryLower) ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return (a.hasGermanName ? 0 : 1) - (b.hasGermanName ? 0 : 1);
  });
  return parsedList.slice(0, 12);
}

// ============================================================================
// STÜCK-ANGABEN: "1 Ei (60g)" -> 60 g pro Stück
// ============================================================================

const MEASURE_NOUNS = new Set([
  'Portion', 'EL', 'TL', 'Glas', 'Tasse', 'Becher', 'Scoop', 'Handvoll', 'Dose', 'Flasche',
  'Packung', 'Scheibe', 'Block', 'Riegel',
]);
const NOUN_SINGULAR = { Scheiben: 'Scheibe', Stücke: 'Stück', Portionen: 'Portion', Gläser: 'Glas' };

// Liefert { label, grams } für eine zählbare Einheit oder null
function getPieceUnit(food) {
  if (!food) return null;
  const qty = Number(food.servingQuantity);
  const m = String(food.servingSize || '').match(
    /^\s*(\d+(?:[.,]\d+)?)\s+([A-Za-zÄÖÜäöüß]+)[^(]*\(\s*(\d+(?:[.,]\d+)?)\s*(g|ml)\s*\)/
  );
  if (m) {
    const count = parseFloat(m[1].replace(',', '.'));
    const total = parseFloat(m[3].replace(',', '.'));
    if (count > 0 && total > 0) {
      const noun = NOUN_SINGULAR[m[2]] || m[2];
      const isMeasure = MEASURE_NOUNS.has(noun);
      return {
        label: isMeasure ? noun : 'Stk.',
        hint: isMeasure ? null : noun,
        grams: Math.round((total / count) * 10) / 10,
        natural: !isMeasure,
      };
    }
  }
  if (qty > 0) return { label: 'Portion', hint: null, grams: qty, natural: false };
  return null;
}

function formatAmountDE(num) {
  return Number(num).toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

function parseOpenFoodFactsProduct(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const germanName = extractLocalizedProductName(raw.product_name_de);
  const name = germanName || extractLocalizedProductName(raw.product_name);
  if (!name) return null;

  const n = raw.nutriments || raw.nutriments_estimated || {};
  const rawProtein = n['proteins_100g'];
  const rawCarbs = n['carbohydrates_100g'];
  const rawFat = n['fat_100g'];
  const rawKcal = n['energy-kcal_100g'] ?? n['energy_kcal_100g'];
  const rawKj = n['energy-kj_100g'] ?? n['energy_kj_100g'] ?? n['energy_100g'];

  const hasProtein = rawProtein !== undefined && rawProtein !== null && rawProtein !== '';
  const hasCarbs = rawCarbs !== undefined && rawCarbs !== null && rawCarbs !== '';
  const hasFat = rawFat !== undefined && rawFat !== null && rawFat !== '';
  const hasKcal = rawKcal !== undefined && rawKcal !== null && rawKcal !== '';
  const hasKj = rawKj !== undefined && rawKj !== null && rawKj !== '';

  if (!hasProtein && !hasCarbs && !hasFat && !hasKcal && !hasKj) {
    return null;
  }

  const protein = Math.max(0, Math.round((parseFloat(rawProtein) || 0) * 10) / 10);
  const carbs = Math.max(0, Math.round((parseFloat(rawCarbs) || 0) * 10) / 10);
  const fat = Math.max(0, Math.round((parseFloat(rawFat) || 0) * 10) / 10);

  let calories = 0;
  const parsedKcal = parseFloat(rawKcal);
  const parsedKj = parseFloat(rawKj);

  if (!isNaN(parsedKcal) && parsedKcal >= 0) {
    calories = Math.round(parsedKcal);
  } else if (!isNaN(parsedKj) && parsedKj > 0) {
    calories = Math.round(parsedKj / 4.184);
  } else {
    calories = Math.round(protein * 4 + carbs * 4 + fat * 9);
  }

  const brand = Array.isArray(raw.brands)
    ? raw.brands
        .map((b) => String(b).trim())
        .filter(Boolean)[0] || ''
    : String(raw.brands || '')
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean)[0] || '';

  const parsedServingQty = parseFloat(raw.serving_quantity);
  const servingQuantity =
    !isNaN(parsedServingQty) && parsedServingQty > 0 ? Math.round(parsedServingQty) : null;

  const gradeRaw = (raw.nutrition_grades || raw.nutriscore_grade || '')
    .toString()
    .trim()
    .toUpperCase();
  const nutriScore = ['A', 'B', 'C', 'D', 'E'].includes(gradeRaw) ? gradeRaw : null;

  return {
    id: `off-${raw.code || generateId('prod')}`,
    code: raw.code || '',
    name,
    brand,
    calories,
    protein,
    carbs,
    fat,
    servingQuantity,
    servingSize: raw.serving_size ? String(raw.serving_size).trim() : null,
    nutriScore,
    hasGermanName: Boolean(germanName),
    source: 'off',
  };
}

function normalizeSearchText(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .trim();
}

// ============================================================================
// DATUMS- & FORMATIERUNGS-HILFSFUNKTIONEN
// ============================================================================

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getTodayKey() {
  return formatDateKey(new Date());
}

function addDays(dateKey, delta) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + delta);
  return formatDateKey(date);
}

function formatGermanDateHeader(dateKey, todayKey) {
  const date = parseDateKey(dateKey);
  const weekday = WEEKDAYS_SHORT[date.getDay()];
  const day = date.getDate();
  const month = MONTHS_SHORT[date.getMonth()];

  if (dateKey === todayKey) {
    return { badge: 'Heute', sub: `${weekday}., ${day}. ${month}` };
  }
  if (dateKey === addDays(todayKey, -1)) {
    return { badge: 'Gestern', sub: `${weekday}., ${day}. ${month}` };
  }
  if (dateKey === addDays(todayKey, 1)) {
    return { badge: 'Morgen', sub: `${weekday}., ${day}. ${month}` };
  }
  return { badge: `${weekday}., ${day}. ${month}`, sub: String(date.getFullYear()) };
}

function formatNumberDE(num) {
  return Math.round(num).toLocaleString('de-DE');
}

function formatWeightDE(num) {
  if (num === null || num === undefined || isNaN(Number(num))) return '–';
  return Number(num).toLocaleString('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ============================================================================
// INITIALER STATE AUS LOCALSTORAGE
// ============================================================================

function defaultAppData() {
  return {
    targets: { ...DEFAULT_TARGETS },
    favorites: [...DEFAULT_FAVORITES],
    savedMeals: [...DEFAULT_SAVED_MEALS],
    habits: [...DEFAULT_HABITS],
    logsByDate: {},
    habitChecksByDate: {},
    weightsByDate: {},
    exercises: [...DEFAULT_EXERCISES],
    workoutTemplates: [],
    workoutsByDate: {},
  };
}

function normalizeAppData(parsed) {
  if (!parsed || typeof parsed !== 'object') return defaultAppData();
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  return {
    targets: { ...DEFAULT_TARGETS, ...(isObj(parsed.targets) ? parsed.targets : {}) },
    favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [...DEFAULT_FAVORITES],
    savedMeals: Array.isArray(parsed.savedMeals) ? parsed.savedMeals : [...DEFAULT_SAVED_MEALS],
    habits: Array.isArray(parsed.habits) ? parsed.habits : [...DEFAULT_HABITS],
    logsByDate: isObj(parsed.logsByDate) ? parsed.logsByDate : {},
    habitChecksByDate: isObj(parsed.habitChecksByDate) ? parsed.habitChecksByDate : {},
    weightsByDate: isObj(parsed.weightsByDate) ? parsed.weightsByDate : {},
    exercises:
      Array.isArray(parsed.exercises) && parsed.exercises.length > 0
        ? parsed.exercises
        : [...DEFAULT_EXERCISES],
    workoutTemplates: Array.isArray(parsed.workoutTemplates) ? parsed.workoutTemplates : [],
    workoutsByDate: isObj(parsed.workoutsByDate) ? parsed.workoutsByDate : {},
  };
}

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { data: defaultAppData(), fresh: true };
    return { data: normalizeAppData(JSON.parse(raw)), fresh: false };
  } catch (err) {
    console.error('Fehler beim Laden aus localStorage:', err);
    return { data: defaultAppData(), fresh: true };
  }
}

// ============================================================================
// HAUPTKOMPONENTE
// ============================================================================

const OAUTH_RETURN_VIEW_KEY = 'hht_oauth_return_view';
let cachedOAuthReturnView;

function consumeOAuthReturnView() {
  if (cachedOAuthReturnView !== undefined) return cachedOAuthReturnView;
  cachedOAuthReturnView = null;
  try {
    const raw = sessionStorage.getItem(OAUTH_RETURN_VIEW_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(OAUTH_RETURN_VIEW_KEY);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    // Nur innerhalb von 2 Minuten nach dem Redirect wiederherstellen
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > 120_000) return null;
    cachedOAuthReturnView = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export default function App() {
  const restoredNav = useMemo(() => consumeOAuthReturnView(), []);
  const notifyRef = useRef(null);
  const navStateRef = useRef(null);
  const { appData, setAppData, sync } = useSyncedAppData({
    storageKey: STORAGE_KEY,
    defaultTargets: DEFAULT_TARGETS,
    loadInitial: loadInitialState,
    normalize: normalizeAppData,
    notify: (message, accent) => notifyRef.current?.(message, accent),
    beforeRedirect: () => {
      try {
        if (navStateRef.current) {
          sessionStorage.setItem(
            OAUTH_RETURN_VIEW_KEY,
            JSON.stringify({ ...navStateRef.current, savedAt: Date.now() })
          );
        }
      } catch {
        // ignorieren
      }
    },
  });
  const [selectedDate, setSelectedDate] = useState(() =>
    typeof restoredNav?.selectedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(restoredNav.selectedDate)
      ? restoredNav.selectedDate
      : getTodayKey()
  );
  const [multiplier, setMultiplier] = useState(1);

  // Hauptansicht: 'daily' (Kalorien, Makros & Habits) | 'training' | 'weight' (Gewichtsdaten)
  const [activeView, setActiveView] = useState(() =>
    restoredNav?.activeView === 'training' || restoredNav?.activeView === 'weight'
      ? restoredNav.activeView
      : 'daily'
  );

  // Gewichtsdaten State
  const [weightInput, setWeightInput] = useState('');
  const [weightRange, setWeightRange] = useState('30d');
  const [hoveredWeightKey, setHoveredWeightKey] = useState(null);
  const [isEditingGoalWeight, setIsEditingGoalWeight] = useState(false);
  const [goalWeightInput, setGoalWeightInput] = useState('');

  // Mobile Filter-Ansicht ('all' | 'food' | 'habits')
  const [mobileSection, setMobileSection] = useState(() =>
    restoredNav?.mobileSection === 'habits' || restoredNav?.mobileSection === 'food'
      ? restoredNav.mobileSection
      : 'all'
  );

  // Haupt-Tabs in der Mahlzeitenerfassung: 'search' | 'meals' | 'favorites' | 'manual'
  const [entryTab, setEntryTab] = useState(() =>
    ['search', 'meals', 'favorites', 'manual'].includes(restoredNav?.entryTab)
      ? restoredNav.entryTab
      : 'search'
  );

  navStateRef.current = { selectedDate, activeView, mobileSection, entryTab };

  // Nahrungsmittel-Suche & Filter-Pills ('all' | 'basis' | 'off')
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickPicks, setShowQuickPicks] = useState(() => {
    try { return localStorage.getItem('hht_show_quick_picks') === '1'; } catch { return false; }
  });
  const toggleQuickPicks = () => {
    setShowQuickPicks((v) => {
      try { localStorage.setItem('hht_show_quick_picks', v ? '0' : '1'); } catch {}
      return !v;
    });
  };
  const [sourceFilter, setSourceFilter] = useState('all');
  const [offResults, setOffResults] = useState([]);
  const [isSearchingOff, setIsSearchingOff] = useState(false);
  const [offError, setOffError] = useState(null);
  const [blsResults, setBlsResults] = useState([]);
  const offErrorRef = useRef(null);
  offErrorRef.current = offError;
  const [offRetryNonce, setOffRetryNonce] = useState(0);

  // Grammatur-Rechner State
  const [selectedFood, setSelectedFood] = useState(null);
  const [gramsInput, setGramsInput] = useState('100');
  const [amountUnit, setAmountUnit] = useState('g');
  const [unitCountInput, setUnitCountInput] = useState('1');
  const [saveFoodAsFav, setSaveFoodAsFav] = useState(false);

  // Mahlzeiten Baukasten State (integriert in Tab 1)
  const [mealBuilderItems, setMealBuilderItems] = useState([]);
  const [builderMealName, setBuilderMealName] = useState('');
  const [saveBuilderAsMeal, setSaveBuilderAsMeal] = useState(true);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  // Gespeicherte Mahlzeiten Tab State
  const [expandedMealId, setExpandedMealId] = useState(null);
  const [editingSavedMeals, setEditingSavedMeals] = useState(false);
  const [lastLoggedMealId, setLastLoggedMealId] = useState(null);

  // 1-Tap Favoriten Feedback & Bearbeitung
  const [lastLoggedFavId, setLastLoggedFavId] = useState(null);
  const [editingFavorites, setEditingFavorites] = useState(false);
  const [editingFavItem, setEditingFavItem] = useState(null);
  const [editingLogItem, setEditingLogItem] = useState(null);

  // Manuelle Schnelleingabe State
  const [mealName, setMealName] = useState('');
  const [proteinInput, setProteinInput] = useState('');
  const [carbsInput, setCarbsInput] = useState('');
  const [fatInput, setFatInput] = useState('');
  const [caloriesInput, setCaloriesInput] = useState('');
  const [saveAsFav, setSaveAsFav] = useState(false);

  // Habit-Tracker Bearbeitungsmodus
  const [editingHabits, setEditingHabits] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitPerWeek, setNewHabitPerWeek] = useState(0);

  // Einstellungs-Modal & Backup
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('targets');
  const [targetForm, setTargetForm] = useState(appData.targets);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importFeedback, setImportFeedback] = useState(null);

  // KI-Nährwertschätzung (Gemini API, lokal konfiguriert)
  const [geminiApiKey, setGeminiApiKeyState] = useState(loadGeminiApiKey);
  const [geminiModel, setGeminiModelState] = useState(loadGeminiModel);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [isEstimatingAi, setIsEstimatingAi] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiTestStatus, setAiTestStatus] = useState(null);
  const aiPhotoInputRef = useRef(null);
  const aiAbortRef = useRef(null);

  // Barcode-Foto-Scanner Modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const autoSelectBarcodeRef = useRef(false);
  const [barcodeScrollNonce, setBarcodeScrollNonce] = useState(0);

  // Sonner-Toast & Undo Historie
  const [toast, setToast] = useState(null);
  const undoSnapshotRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const foodEntrySectionRef = useRef(null);

  const todayKey = getTodayKey();

  // Seitentitel aktualisieren
  useEffect(() => {
    document.title = 'Health & Habit Tracker';
  }, []);

  // ==========================================================================
  // ADAPTIVES KALORIENZIEL
  // ==========================================================================
  const [energyForm, setEnergyForm] = useState(() => normalizeProfile(appData.targets.energy));
  const todayKeyForEnergy = getTodayKey();

  const intakeByDate = useMemo(() => {
    const out = {};
    for (const [date, list] of Object.entries(appData.logsByDate || {})) {
      out[date] = (Array.isArray(list) ? list : []).reduce(
        (sum, e) => sum + (Number(e?.calories) || 0),
        0
      );
    }
    return out;
  }, [appData.logsByDate]);

  const energyProfile = useMemo(
    () => normalizeProfile(appData.targets.energy),
    [appData.targets.energy]
  );

  const energyEstimate = useMemo(
    () =>
      energyProfile.enabled
        ? estimateEnergy({
            profile: energyProfile,
            weightsByDate: appData.weightsByDate || {},
            intakeByDate,
            today: todayKeyForEnergy,
            currentTarget: appData.targets.calories,
          })
        : null,
    [energyProfile, appData.weightsByDate, intakeByDate, todayKeyForEnergy, appData.targets.calories]
  );

  const energySuggestion = useMemo(
    () => weeklySuggestion(energyEstimate, energyProfile, appData.targets.calories, todayKeyForEnergy),
    [energyEstimate, energyProfile, appData.targets.calories, todayKeyForEnergy]
  );

  // Vorschau im Einstellungs-Dialog (mit den gerade eingegebenen Profilwerten)
  const energyPreview = useMemo(
    () =>
      isSettingsOpen && energyForm.enabled
        ? estimateEnergy({
            profile: normalizeProfile(energyForm),
            weightsByDate: appData.weightsByDate || {},
            intakeByDate,
            today: todayKeyForEnergy,
            currentTarget: appData.targets.calories,
          })
        : null,
    [isSettingsOpen, energyForm, appData.weightsByDate, intakeByDate, todayKeyForEnergy, appData.targets.calories]
  );

  // Synchronisiere Einstellungs-Formular beim Öffnen
  useEffect(() => {
    if (isSettingsOpen) {
      setTargetForm(appData.targets);
      setEnergyForm(normalizeProfile(appData.targets.energy));
      setConfirmReset(false);
      setImportFeedback(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSettingsOpen]);

  // ==========================================================================
  // LIVE-SUCHE: OPEN FOOD FACTS (SEARCH-A-LICIOUS + EAN-BARCODE + FALLBACK)
  // ==========================================================================

  const isBarcodeQuery = useMemo(() => /^\d{8,14}$/.test(searchQuery.trim()), [searchQuery]);

  // BLS 4.0 (7.100 Lebensmittel) im Leerlauf vorladen, damit die erste Suche bei 0 ms startet
  useEffect(() => {
    let timer = null;
    let idleId = null;
    const warm = () => {
      loadBlsIndex().catch(() => {});
    };
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(warm, { timeout: 1500 });
    } else {
      timer = setTimeout(warm, 800);
    }
    return () => {
      if (idleId !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timer !== null) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    const isCode = /^\d{8,14}$/.test(trimmed);

    if (trimmed.length < 2) {
      setOffResults([]);
      setIsSearchingOff(false);
      setOffError(null);
      return;
    }

    const cacheKey = isCode ? `ean:${trimmed}` : `q:${trimmed.toLowerCase()}`;
    const cached = getOffCache(cacheKey);
    const instantLocalOff = cached ? cached.results : isCode ? [] : searchOffCacheLocal(trimmed);

    // 0-ms Sofort-Treffer aus lokalem Cache (auch Teil-Übereinstimmungen früherer Suchen)
    setOffResults(instantLocalOff);
    setOffError(null);

    // Frischer exakter Cache-Treffer, zu kurzer Suchbegriff (< 3) oder reiner Lokal-Filter: kein Netzabruf nötig
    if ((cached && cached.fresh && offRetryNonce === 0) || (!isCode && trimmed.length < 3) || (!isCode && sourceFilter === 'local')) {
      setIsSearchingOff(false);
      setOffError(
        cached && cached.fresh && isCode && cached.results.length === 0
          ? `Kein Produkt für Barcode ${trimmed} gefunden.`
          : null
      );
      return;
    }

    const controller = new AbortController();
    const delayMs = isCode ? 100 : 350;

    const timer = setTimeout(async () => {
      setIsSearchingOff(true);
      setOffError(null);

      try {
        if (isCode) {
          const result = await offLookupBarcode(trimmed, controller.signal);
          if (result.found) {
            const parsed = parseOpenFoodFactsProduct(result.product);
            setOffResults(parsed ? [parsed] : []);
            if (parsed) putOffCache(cacheKey, [parsed]);
            else setOffError('Barcode gefunden, aber keine Nährwerte hinterlegt.');
          } else {
            setOffResults([]);
            putOffCache(cacheKey, []);
            setOffError(`Kein Produkt für Barcode ${trimmed} gefunden.`);
          }
        } else {
          const results = await offSearchText(trimmed, controller.signal);
          if (results.length > 0) {
            const seenIds = new Set(results.map((r) => r.id));
            const merged = [...results, ...instantLocalOff.filter((r) => !seenIds.has(r.id))].slice(0, 15);
            setOffResults(merged);
            putOffCache(cacheKey, results);
          } else if (instantLocalOff.length === 0) {
            setOffResults([]);
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        if (instantLocalOff.length > 0) {
          setOffResults(instantLocalOff);
          setOffError({
            text: offline
              ? 'Offline – zeige gespeicherte Markenprodukte.'
              : 'Open Food Facts antwortet gerade langsam – zeige gespeicherte Treffer.',
            retry: !offline,
          });
        } else {
          setOffResults([]);
          setOffError({
            text: offline
              ? 'Offline – Basis-DB und BLS sind weiter verfügbar.'
              : 'Open Food Facts antwortet gerade langsam. Basis-DB und BLS bleiben sofort verfügbar.',
            retry: !offline,
          });
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearchingOff(false);
        }
      }
    }, delayMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, offRetryNonce, sourceFilter]);

  // Neue Suchanfrage: manuellen Retry-Zähler zurücksetzen
  useEffect(() => {
    setOffRetryNonce(0);
  }, [searchQuery]);

  // Wieder online: fehlgeschlagene Suche automatisch erneut ausführen
  useEffect(() => {
    const onOnline = () => {
      if (offErrorRef.current && typeof offErrorRef.current === 'object') {
        setOffRetryNonce((n) => n + 1);
      }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  // BLS 4.0 (offline, ~7.100 Lebensmittel): wird bei der ersten Suche geladen
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2 || /^\d{8,14}$/.test(trimmed)) {
      setBlsResults([]);
      return;
    }
    let cancelled = false;
    loadBlsIndex()
      .then((index) => {
        if (!cancelled) setBlsResults(searchBlsIndex(index, trimmed, 30));
      })
      .catch(() => {
        if (!cancelled) setBlsResults([]);
      });
    return () => {
      cancelled = true;
    };
  }, [searchQuery]);

  // Stufe 1: 0-ms Sofort-Filterung im deutschen Basis-Lexikon mit Synonym- & Relevanz-Ranking
  const localBasisResults = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return [];

    const normQuery = normalizeSearchText(trimmed);
    const rawTokens = trimmed.split(/\s+/).filter(Boolean);
    const normTokens = normQuery.split(/\s+/).filter(Boolean);

    const scored = [];

    for (const item of GERMAN_BASIS_FOODS) {
      const nameLower = item.name.toLowerCase();
      const catLower = (item.category || '').toLowerCase();
      const kwLower = (item.keywords || '').toLowerCase();
      const haystackRaw = `${nameLower} ${catLower} ${kwLower}`;
      const haystackNorm = normalizeSearchText(haystackRaw);

      const matchesRaw = rawTokens.every((tok) => haystackRaw.includes(tok));
      const matchesNorm = normTokens.every((tok) => haystackNorm.includes(tok));

      if (!matchesRaw && !matchesNorm) continue;

      let score = 5;
      if (nameLower === trimmed || normalizeSearchText(nameLower) === normQuery) {
        score = 0;
      } else if (
        nameLower.startsWith(trimmed) ||
        normalizeSearchText(nameLower).startsWith(normQuery)
      ) {
        score = 1;
      } else if (
        nameLower.split(/[\s/()-]+/).some((w) => w.startsWith(trimmed)) ||
        normalizeSearchText(nameLower)
          .split(/[\s/()-]+/)
          .some((w) => w.startsWith(normQuery))
      ) {
        score = 2;
      } else if (
        nameLower.includes(trimmed) ||
        normalizeSearchText(nameLower).includes(normQuery)
      ) {
        score = 3;
      } else {
        score = 4;
      }

      scored.push({ item, score });
    }

    return scored
      .sort((a, b) => a.score - b.score || a.item.name.localeCompare(b.item.name, 'de'))
      .map((entry) => entry.item);
  }, [searchQuery]);

  // Öffnet nach erfolgreichem Barcode-Scan automatisch den Grammatur-Rechner,
  // sobald das exakt passende Produkt aus Open Food Facts geladen wurde
  useEffect(() => {
    if (!autoSelectBarcodeRef.current || isSearchingOff || !isBarcodeQuery) return;
    if (offResults.length === 1) {
      handleSelectFoodForCalculator(offResults[0]);
      autoSelectBarcodeRef.current = false;
    } else if (offError) {
      autoSelectBarcodeRef.current = false;
    }
  }, [offResults, isSearchingOff, isBarcodeQuery, offError]);

  // Nach Barcode-Scan aus beliebigem Tab direkt zur Lebensmittelsuche scrollen
  useEffect(() => {
    if (barcodeScrollNonce === 0) return;
    if (activeView !== 'daily' || entryTab !== 'search' || mobileSection === 'habits') return;
    const raf = requestAnimationFrame(() => {
      foodEntrySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(raf);
  }, [barcodeScrollNonce, activeView, entryTab, mobileSection]);

  const handleBarcodeDetected = (code) => {
    const sameBarcodeLoaded =
      searchQuery.trim() === code && !isSearchingOff && offResults.length === 1;
    setIsScannerOpen(false);
    setActiveView('daily');
    setMobileSection('all');
    setEntryTab('search');
    setSourceFilter('all');
    if (sameBarcodeLoaded) {
      autoSelectBarcodeRef.current = false;
      handleSelectFoodForCalculator(offResults[0]);
    } else {
      autoSelectBarcodeRef.current = true;
      setSelectedFood(null);
      setSearchQuery(code);
    }
    setBarcodeScrollNonce((n) => n + 1);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(60);
    }
    showToast(`Barcode erkannt: ${code}`, null, 'emerald');
  };

  // Offline-Gerichte-DB (0 ms, ~100 Restaurant- & internationale Gerichte inkl. Pad Thai)
  const localDishResults = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2 || isBarcodeQuery) return [];
    return searchDishes(trimmed, 12);
  }, [searchQuery, isBarcodeQuery]);

  // 0-ms Suche in eigenen Favoriten & gespeicherten Mahlzeiten
  const localPersonalResults = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2 || isBarcodeQuery || sourceFilter === 'off') return [];
    const tokens = normalizeSearchText(trimmed).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];

    const matches = (name) => {
      const hay = normalizeSearchText(name || '');
      return tokens.every((t) => hay.includes(t));
    };

    const mealHits = (appData.savedMeals || [])
      .filter((m) => matches(m.name))
      .slice(0, 3)
      .map((meal) => {
        const totals = (meal.items || []).reduce(
          (acc, entry) => {
            const ratio = Math.max(0, Number(entry.grams) || 0) / 100;
            return {
              calories: acc.calories + (entry.food?.calories || 0) * ratio,
              protein: acc.protein + (entry.food?.protein || 0) * ratio,
              carbs: acc.carbs + (entry.food?.carbs || 0) * ratio,
              fat: acc.fat + (entry.food?.fat || 0) * ratio,
            };
          },
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        return {
          kind: 'meal',
          id: `pers-meal-${meal.id}`,
          meal,
          name: meal.name,
          calories: Math.round(totals.calories),
          protein: Math.round(totals.protein * 10) / 10,
          carbs: Math.round(totals.carbs * 10) / 10,
          fat: Math.round(totals.fat * 10) / 10,
        };
      });

    const favHits = (appData.favorites || [])
      .filter((f) => matches(f.name))
      .slice(0, 4)
      .map((fav) => ({
        kind: 'favorite',
        id: `pers-fav-${fav.id}`,
        fav,
        name: fav.name,
        calories: Math.round(fav.calories),
        protein: Math.round(fav.protein * 10) / 10,
        carbs: Math.round(fav.carbs * 10) / 10,
        fat: Math.round(fav.fat * 10) / 10,
      }));

    return [...favHits, ...mealHits];
  }, [searchQuery, isBarcodeQuery, sourceFilter, appData.favorites, appData.savedMeals]);

  // Gefilterte Suchergebnisse gemäß Quellen-Filter ('all' | 'local' | 'off')
  const filteredSearchResults = useMemo(() => {
    if (sourceFilter === 'local') return [...localDishResults, ...localBasisResults, ...blsResults.slice(0, 20)];
    if (sourceFilter === 'off') return offResults;
    return [...localDishResults, ...localBasisResults, ...blsResults.slice(0, 12), ...offResults];
  }, [sourceFilter, localDishResults, localBasisResults, blsResults, offResults]);

  // Zuletzt geloggte Einträge (1-Tap-Wiederholung bei leerem Suchfeld)
  const recentLoggedMeals = useMemo(() => {
    const byDate = appData.logsByDate || {};
    const dates = Object.keys(byDate).sort().reverse();
    const seen = new Set();
    const out = [];
    for (const d of dates) {
      const list = Array.isArray(byDate[d]) ? [...byDate[d]].reverse() : [];
      for (const item of list) {
        if (!item?.name) continue;
        const key = item.name.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(item);
        if (out.length >= 6) return out;
      }
    }
    return out;
  }, [appData.logsByDate]);

  const quickPickFoods = useMemo(() => {
    return QUICK_PICK_IDS.map((id) => GERMAN_BASIS_FOODS.find((f) => f.id === id)).filter(Boolean);
  }, []);

  const parseDecimalInput = (raw) => {
    const n = parseFloat(String(raw ?? '').replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  // Live-Berechnung im Grammatur-Rechner
  const calculatedFoodMacros = useMemo(() => {
    if (!selectedFood) return null;
    const unit = amountUnit === 'unit' ? getPieceUnit(selectedFood) : null;
    const count = parseDecimalInput(unitCountInput);
    const grams = unit
      ? Math.round(count * unit.grams * 10) / 10
      : parseDecimalInput(gramsInput);
    const factor = grams / 100;
    return {
      grams,
      calories: Math.round(selectedFood.calories * factor),
      protein: Math.round(selectedFood.protein * factor * 10) / 10,
      carbs: Math.round(selectedFood.carbs * factor * 10) / 10,
      fat: Math.round(selectedFood.fat * factor * 10) / 10,
    };
  }, [selectedFood, gramsInput, amountUnit, unitCountInput]);

  const selectedPieceUnit = useMemo(() => getPieceUnit(selectedFood), [selectedFood]);

  // Summierte Makros & Gesamtgewicht im Mahlzeiten-Baukasten
  const mealBuilderTotals = useMemo(() => {
    return mealBuilderItems.reduce(
      (acc, entry) => {
        const g = Math.max(0, Number(entry.grams) || 0);
        const factor = g / 100;
        return {
          totalGrams: acc.totalGrams + g,
          calories: acc.calories + entry.food.calories * factor,
          protein: acc.protein + entry.food.protein * factor,
          carbs: acc.carbs + entry.food.carbs * factor,
          fat: acc.fat + entry.food.fat * factor,
        };
      },
      { totalGrams: 0, calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [mealBuilderItems]);

  // Sonner-Toast Anzeige mit optionalem Undo
  const showToast = (message, snapshotForUndo = null, accent = 'emerald') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    undoSnapshotRef.current = snapshotForUndo;
    setToast({ message, canUndo: Boolean(snapshotForUndo), accent });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      undoSnapshotRef.current = null;
    }, 4500);
  };

  notifyRef.current = (message, accent) => showToast(message, null, accent);

  const handleUndo = () => {
    if (undoSnapshotRef.current) {
      setAppData(undoSnapshotRef.current);
      undoSnapshotRef.current = null;
      setToast(null);
    }
  };

  // ==========================================================================
  // BERECHNUNGEN FÜR DEN GEWÄHLTEN TAG
  // ==========================================================================

  const dayLogs = useMemo(
    () => appData.logsByDate[selectedDate] || [],
    [appData.logsByDate, selectedDate]
  );

  const yesterdayKey = useMemo(() => addDays(selectedDate, -1), [selectedDate]);
  const yesterdayLogs = useMemo(
    () => appData.logsByDate[yesterdayKey] || [],
    [appData.logsByDate, yesterdayKey]
  );

  const totals = useMemo(() => {
    return dayLogs.reduce(
      (acc, item) => ({
        calories: acc.calories + (Number(item.calories) || 0),
        protein: acc.protein + (Number(item.protein) || 0),
        carbs: acc.carbs + (Number(item.carbs) || 0),
        fat: acc.fat + (Number(item.fat) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [dayLogs]);

  const dayHabitChecks = useMemo(
    () => appData.habitChecksByDate[selectedDate] || {},
    [appData.habitChecksByDate, selectedDate]
  );

  const completedHabitsCount = useMemo(() => {
    return appData.habits.filter((h) => isHabitSatisfied(h, appData.habitChecksByDate, selectedDate)).length;
  }, [appData.habits, appData.habitChecksByDate, selectedDate]);

  // Auto-berechnete Kalorien für die manuelle Schnelleingabe
  const autoCalculatedCalories = useMemo(() => {
    const p = parseDecimalInput(proteinInput);
    const c = parseDecimalInput(carbsInput);
    const f = parseDecimalInput(fatInput);
    return Math.round(p * 4 + c * 4 + f * 9);
  }, [proteinInput, carbsInput, fatInput]);

  // 7-Tage-Fenster (endet am ausgewählten Tag)
  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const key = addDays(selectedDate, -i);
      const d = parseDateKey(key);
      const logs = appData.logsByDate[key] || [];
      const checks = appData.habitChecksByDate[key] || {};
      const dayTotals = logs.reduce(
        (acc, item) => ({
          calories: acc.calories + (Number(item.calories) || 0),
          protein: acc.protein + (Number(item.protein) || 0),
        }),
        { calories: 0, protein: 0 }
      );
      const doneHabits = appData.habits.filter((h) => isHabitSatisfied(h, appData.habitChecksByDate, key)).length;
      const totalHabits = appData.habits.length;
      days.push({
        key,
        weekday: WEEKDAYS_SHORT[d.getDay()],
        dayNum: d.getDate(),
        calories: Math.round(dayTotals.calories),
        protein: Math.round(dayTotals.protein),
        hasLogs: logs.length > 0,
        doneHabits,
        totalHabits,
        habitRate: totalHabits > 0 ? Math.round((doneHabits / totalHabits) * 100) : 0,
      });
    }
    return days;
  }, [selectedDate, appData.logsByDate, appData.habitChecksByDate, appData.habits]);

  // Wochenstatistiken
  const weeklyStats = useMemo(() => {
    const daysWithCalories = last7Days.filter((d) => d.calories > 0);
    const avgCalories =
      daysWithCalories.length > 0
        ? Math.round(
            daysWithCalories.reduce((sum, d) => sum + d.calories, 0) / daysWithCalories.length
          )
        : 0;
    const proteinGoalDays = last7Days.filter((d) => d.protein >= appData.targets.protein).length;
    const avgHabitRate =
      last7Days.length > 0
        ? Math.round(last7Days.reduce((sum, d) => sum + d.habitRate, 0) / last7Days.length)
        : 0;
    return { avgCalories, proteinGoalDays, avgHabitRate };
  }, [last7Days, appData.targets.protein]);

  // Streak-Berechnung pro Habit
  const getHabitStreak = (habitId) => {
    let streak = 0;
    const checksToday = appData.habitChecksByDate[selectedDate] || {};
    let cursor = checksToday[habitId] ? selectedDate : addDays(selectedDate, -1);

    for (let i = 0; i < 365; i++) {
      const checks = appData.habitChecksByDate[cursor] || {};
      if (checks[habitId]) {
        streak++;
        cursor = addDays(cursor, -1);
      } else {
        break;
      }
    }
    return streak;
  };

  // ==========================================================================
  // BERECHNUNGEN & AKTIONEN: GEWICHTSDATEN
  // ==========================================================================

  const sortedWeightEntries = useMemo(() => {
    const rawMap = appData.weightsByDate || {};
    const keys = Object.keys(rawMap)
      .filter((k) => {
        const val = Number(rawMap[k]);
        return /^\d{4}-\d{2}-\d{2}$/.test(k) && !isNaN(val) && val > 0;
      })
      .sort((a, b) => a.localeCompare(b));

    return keys.map((key, idx) => {
      const weight = Math.round(Number(rawMap[key]) * 10) / 10;
      const prevWeight =
        idx > 0 ? Math.round(Number(rawMap[keys[idx - 1]]) * 10) / 10 : null;
      const deltaPrev =
        prevWeight !== null ? Math.round((weight - prevWeight) * 10) / 10 : null;

      // Gleitender 7-Tage-Durchschnitt (Kalendertage)
      const windowStart = addDays(key, -6);
      const windowVals = [];
      for (let j = idx; j >= 0; j--) {
        if (keys[j] < windowStart) break;
        windowVals.push(Number(rawMap[keys[j]]));
      }
      const movingAvg7 =
        windowVals.length > 0
          ? Math.round(
              (windowVals.reduce((sum, v) => sum + v, 0) / windowVals.length) * 10
            ) / 10
          : weight;

      const d = parseDateKey(key);
      return {
        key,
        weight,
        deltaPrev,
        movingAvg7,
        shortDate: `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`,
        weekday: WEEKDAYS_SHORT[d.getDay()],
        fullDateLabel: `${WEEKDAYS_SHORT[d.getDay()]}., ${d.getDate()}. ${
          MONTHS_SHORT[d.getMonth()]
        } ${d.getFullYear()}`,
      };
    });
  }, [appData.weightsByDate]);

  const latestWeightEntry = useMemo(
    () =>
      sortedWeightEntries.length > 0
        ? sortedWeightEntries[sortedWeightEntries.length - 1]
        : null,
    [sortedWeightEntries]
  );

  const selectedDateWeight = useMemo(() => {
    const raw = (appData.weightsByDate || {})[selectedDate];
    if (raw === undefined || raw === null || raw === '') return null;
    const num = Number(raw);
    return !isNaN(num) && num > 0 ? Math.round(num * 10) / 10 : null;
  }, [appData.weightsByDate, selectedDate]);

  // Synchronisiere Eingabefeld beim Datumswechsel
  useEffect(() => {
    if (selectedDateWeight !== null) {
      setWeightInput(formatWeightDE(selectedDateWeight));
    } else {
      setWeightInput('');
    }
  }, [selectedDate, selectedDateWeight]);

  const filteredChartWeights = useMemo(() => {
    if (weightRange === 'all' || sortedWeightEntries.length === 0) {
      return sortedWeightEntries;
    }
    const daysBack = weightRange === '14d' ? 13 : weightRange === '30d' ? 29 : 89;
    const anchor = latestWeightEntry ? latestWeightEntry.key : selectedDate;
    const cutoff = addDays(anchor, -daysBack);
    const sliced = sortedWeightEntries.filter((entry) => entry.key >= cutoff);
    return sliced.length > 0 ? sliced : sortedWeightEntries;
  }, [sortedWeightEntries, weightRange, latestWeightEntry, selectedDate]);

  const weightStats = useMemo(() => {
    if (sortedWeightEntries.length === 0) {
      return {
        current: null,
        avg7: null,
        rangeDelta: null,
        totalDelta: null,
        startWeight: null,
        goalDelta: null,
        goalProgressPct: null,
      };
    }
    const first = sortedWeightEntries[0];
    const last = sortedWeightEntries[sortedWeightEntries.length - 1];
    const rangeFirst = filteredChartWeights[0] || first;

    const rangeDelta = Math.round((last.weight - rangeFirst.weight) * 10) / 10;
    const totalDelta = Math.round((last.weight - first.weight) * 10) / 10;

    const goal =
      appData.targets.weight !== null &&
      appData.targets.weight !== undefined &&
      !isNaN(Number(appData.targets.weight)) &&
      Number(appData.targets.weight) > 0
        ? Math.round(Number(appData.targets.weight) * 10) / 10
        : null;

    let goalDelta = null;
    let goalProgressPct = null;

    if (goal !== null) {
      goalDelta = Math.round((goal - last.weight) * 10) / 10;
      const totalSpan = Math.abs(first.weight - goal);
      if (totalSpan > 0.05) {
        const covered =
          first.weight >= goal
            ? first.weight - last.weight
            : last.weight - first.weight;
        goalProgressPct = Math.max(
          0,
          Math.min(100, Math.round((covered / totalSpan) * 100))
        );
      } else if (Math.abs(goalDelta) <= 0.1) {
        goalProgressPct = 100;
      } else {
        goalProgressPct = 0;
      }
    }

    return {
      current: last.weight,
      avg7: last.movingAvg7,
      rangeDelta,
      totalDelta,
      startWeight: first.weight,
      goal,
      goalDelta,
      goalProgressPct,
    };
  }, [sortedWeightEntries, filteredChartWeights, appData.targets.weight]);

  const parseWeightNumber = (rawStr) => {
    const normalized = String(rawStr ?? '')
      .trim()
      .replace(',', '.');
    const parsed = parseFloat(normalized);
    if (isNaN(parsed) || parsed < 25 || parsed > 350) return null;
    return Math.round(parsed * 10) / 10;
  };

  const handleSaveWeight = (e, overrideValue = null) => {
    if (e) e.preventDefault();
    const candidate = overrideValue !== null ? overrideValue : weightInput;
    const parsed = parseWeightNumber(candidate);
    if (parsed === null) {
      showToast('Bitte gültiges Gewicht zwischen 25 und 350 kg eingeben', null, 'amber');
      return;
    }

    const snapshot = appData;
    setAppData((prev) => ({
      ...prev,
      weightsByDate: {
        ...(prev.weightsByDate || {}),
        [selectedDate]: parsed,
      },
    }));
    setWeightInput(formatWeightDE(parsed));
    showToast(
      `Gewicht gespeichert (${dateHeader.badge}): ${formatWeightDE(parsed)} kg`,
      snapshot,
      'emerald'
    );
  };

  const handleStepWeight = (delta) => {
    const currentParsed = parseWeightNumber(weightInput);
    const base =
      currentParsed !== null
        ? currentParsed
        : selectedDateWeight !== null
        ? selectedDateWeight
        : latestWeightEntry
        ? latestWeightEntry.weight
        : 75.0;
    const next = Math.max(25, Math.min(350, Math.round((base + delta) * 10) / 10));
    setWeightInput(formatWeightDE(next));
  };

  const handleDeleteWeight = (dateKeyToDelete) => {
    const snapshot = appData;
    setAppData((prev) => {
      const nextWeights = { ...(prev.weightsByDate || {}) };
      delete nextWeights[dateKeyToDelete];
      return {
        ...prev,
        weightsByDate: nextWeights,
      };
    });
    if (dateKeyToDelete === selectedDate) {
      setWeightInput('');
    }
    showToast('Gewichtseintrag gelöscht', snapshot, 'amber');
  };

  const handleSaveGoalWeight = (e) => {
    e.preventDefault();
    const trimmed = goalWeightInput.trim();
    if (!trimmed) {
      setAppData((prev) => ({
        ...prev,
        targets: { ...prev.targets, weight: null },
      }));
      setIsEditingGoalWeight(false);
      showToast('Zielgewicht entfernt', null, 'amber');
      return;
    }
    const parsed = parseWeightNumber(trimmed);
    if (parsed === null) {
      showToast('Bitte gültiges Zielgewicht (25–350 kg) eingeben', null, 'amber');
      return;
    }
    setAppData((prev) => ({
      ...prev,
      targets: { ...prev.targets, weight: parsed },
    }));
    setIsEditingGoalWeight(false);
    showToast(`Zielgewicht gesetzt: ${formatWeightDE(parsed)} kg`, null, 'emerald');
  };

  // ==========================================================================
  // AKTIONEN: MAHLZEITEN, GRAMMATUR-RECHNER, BAUKASTEN & FAVORITEN
  // ==========================================================================

  const addMealEntry = (entryData, customToastText = null, alsoSaveFavorite = false) => {
    const snapshot = appData;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newEntry = {
      id: generateId('meal'),
      name: entryData.name,
      calories: Math.round(entryData.calories),
      protein: Math.round(entryData.protein * 10) / 10,
      carbs: Math.round(entryData.carbs * 10) / 10,
      fat: Math.round(entryData.fat * 10) / 10,
      multiplier: entryData.multiplier || 1,
      time: timeStr,
    };

    const newFav = alsoSaveFavorite
      ? {
          id: generateId('fav'),
          name: newEntry.name,
          calories: newEntry.calories,
          protein: newEntry.protein,
          carbs: newEntry.carbs,
          fat: newEntry.fat,
        }
      : null;

    setAppData((prev) => ({
      ...prev,
      favorites: newFav ? [newFav, ...prev.favorites] : prev.favorites,
      logsByDate: {
        ...prev.logsByDate,
        [selectedDate]: [...(prev.logsByDate[selectedDate] || []), newEntry],
      },
    }));

    showToast(
      customToastText ||
        (alsoSaveFavorite
          ? `Geloggt & als Favorit gespeichert: ${newEntry.name}`
          : `+ ${newEntry.name} (${newEntry.protein}g P · ${newEntry.calories} kcal)`),
      snapshot,
      'emerald'
    );
  };

  const handleSelectFoodForCalculator = (food) => {
    setSelectedFood(food);
    const defaultGrams =
      (food.source === 'dish' || food.source === 'ai') && food.servingQuantity > 0
        ? String(food.servingQuantity)
        : '100';
    setGramsInput(defaultGrams);
    setUnitCountInput('1');
    setAmountUnit(food.source === 'dish' || food.source === 'ai' ? 'g' : getPieceUnit(food)?.natural ? 'unit' : 'g');
    setSaveFoodAsFav(false);
  };

  const handleUpdateGeminiKey = (value) => {
    setGeminiApiKeyState(value);
    saveGeminiApiKey(value);
    setAiTestStatus(null);
  };

  const handleUpdateGeminiModel = (value) => {
    setGeminiModelState(value);
    saveGeminiModel(value);
    setAiTestStatus(null);
  };

  const openAiSettings = () => {
    setSettingsTab('ai');
    setIsSettingsOpen(true);
  };

  const handleEstimateWithAi = async ({ query = searchQuery, file = null } = {}) => {
    if (!geminiApiKey.trim()) {
      openAiSettings();
      showToast('Bitte kurz deinen kostenlosen Gemini API-Key eintragen', null, 'amber');
      return;
    }
    if (!file && query.trim().length < 2) {
      showToast('Bitte gib ein Gericht ein (z. B. Pad Thai mit Hähnchen)', null, 'amber');
      return;
    }

    aiAbortRef.current?.abort();
    const ctrl = new AbortController();
    aiAbortRef.current = ctrl;
    setIsEstimatingAi(true);
    setAiError(null);

    try {
      let imagePayload = {};
      if (file) {
        const compressed = await compressImageForAi(file);
        imagePayload = { imageBase64: compressed.base64, mimeType: compressed.mimeType };
      }
      const food = await estimateMealWithAi({
        query: query.trim(),
        apiKey: geminiApiKey,
        model: geminiModel,
        signal: ctrl.signal,
        ...imagePayload,
      });
      handleSelectFoodForCalculator(food);
      showToast(`KI-Schätzung bereit: ${food.name}`, null, 'emerald');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'KI-Schätzung fehlgeschlagen.';
      setAiError(msg);
      showToast(msg, null, 'amber');
    } finally {
      if (aiAbortRef.current === ctrl) {
        setIsEstimatingAi(false);
      }
    }
  };

  const handleTestGeminiKey = async () => {
    if (!geminiApiKey.trim()) return;
    setAiTestStatus({ kind: 'loading', text: 'Teste Verbindung zu Gemini…' });
    try {
      const food = await estimateMealWithAi({
        query: '1 Apfel mittelgroß',
        apiKey: geminiApiKey,
        model: geminiModel,
        bypassCache: true,
      });
      setAiTestStatus({
        kind: 'ok',
        text: `Verbindung erfolgreich${food.usedModel ? ` (${food.usedModel})` : ''}! Test: ${food.name} (${food.calories} kcal/100g)`,
      });
    } catch (err) {
      setAiTestStatus({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Verbindungstest fehlgeschlagen.',
      });
    }
  };

  const handleLogCalculatedFood = () => {
    if (!selectedFood || !calculatedFoodMacros || calculatedFoodMacros.grams <= 0) return;

    const gramsRounded = Math.round(calculatedFoodMacros.grams);
    const unit = amountUnit === 'unit' ? selectedPieceUnit : null;
    const label = unit
      ? `${formatAmountDE(parseFloat(String(unitCountInput).replace(',', '.')) || 0)} ${unit.label} ${selectedFood.name} (${gramsRounded}g)`
      : `${gramsRounded}g ${selectedFood.name}`;

    addMealEntry(
      {
        name: label,
        calories: calculatedFoodMacros.calories,
        protein: calculatedFoodMacros.protein,
        carbs: calculatedFoodMacros.carbs,
        fat: calculatedFoodMacros.fat,
      },
      null,
      saveFoodAsFav
    );

    setSelectedFood(null);
    setSaveFoodAsFav(false);
  };

  const handleAddFoodToBuilder = (food = selectedFood, customGrams = null) => {
    if (!food) return;
    const grams =
      customGrams !== null
        ? customGrams
        : food === selectedFood && calculatedFoodMacros && calculatedFoodMacros.grams > 0
        ? Math.max(1, Math.round(calculatedFoodMacros.grams))
        : Math.max(1, Math.round(parseFloat(gramsInput) || 100));

    setMealBuilderItems((prev) => [
      ...prev,
      {
        uid: generateId('bitem'),
        food,
        grams,
      },
    ]);
    setIsBuilderOpen(true);

    showToast(`${grams}g ${food.name} in Mahlzeiten Baukasten gelegt`, null, 'emerald');
    if (food === selectedFood) {
      setSelectedFood(null);
    }
  };

  const handleUpdateBuilderItemGrams = (uid, nextGramsStr) => {
    setMealBuilderItems((prev) =>
      prev.map((item) =>
        item.uid === uid
          ? {
              ...item,
              grams: nextGramsStr === '' ? '' : Math.max(0, parseFloat(nextGramsStr) || 0),
            }
          : item
      )
    );
  };

  const handleRemoveBuilderItem = (uid) => {
    setMealBuilderItems((prev) => prev.filter((item) => item.uid !== uid));
  };

  const buildMealPayloadFromBuilder = () => {
    const validItems = mealBuilderItems
      .map((i) => ({
        food: i.food,
        grams: Math.max(0, Math.round(Number(i.grams) || 0)),
      }))
      .filter((i) => i.grams > 0);

    const autoName = validItems
      .map((i) => `${i.grams}g ${i.food.name.split('(')[0].trim()}`)
      .join(' + ');
    const finalName = builderMealName.trim() || autoName;

    return {
      id: generateId('meal-tpl'),
      name: finalName,
      items: validItems,
    };
  };

  const handleSaveBuilderAsMealOnly = () => {
    if (mealBuilderItems.length === 0) return;
    const mealTemplate = buildMealPayloadFromBuilder();
    if (mealTemplate.items.length === 0) return;

    setAppData((prev) => ({
      ...prev,
      savedMeals: [mealTemplate, ...prev.savedMeals],
    }));

    setMealBuilderItems([]);
    setBuilderMealName('');
    setIsBuilderOpen(false);
    setEntryTab('meals');
    showToast(`Mahlzeit gespeichert: ${mealTemplate.name}`, null, 'emerald');
  };

  const handleLogMealBuilder = (e) => {
    e.preventDefault();
    if (mealBuilderItems.length === 0) return;

    const mealTemplate = buildMealPayloadFromBuilder();
    if (mealTemplate.items.length === 0) return;

    if (saveBuilderAsMeal) {
      setAppData((prev) => ({
        ...prev,
        savedMeals: [mealTemplate, ...prev.savedMeals],
      }));
    }

    addMealEntry(
      {
        name: mealTemplate.name,
        calories: Math.round(mealBuilderTotals.calories),
        protein: Math.round(mealBuilderTotals.protein * 10) / 10,
        carbs: Math.round(mealBuilderTotals.carbs * 10) / 10,
        fat: Math.round(mealBuilderTotals.fat * 10) / 10,
      },
      saveBuilderAsMeal
        ? `Geloggt & unter „Mahlzeiten“ gespeichert: ${mealTemplate.name}`
        : null,
      false
    );

    setMealBuilderItems([]);
    setBuilderMealName('');
    setIsBuilderOpen(false);
  };

  const computeSavedMealMacros = (meal, factor = 1) => {
    return (meal.items || []).reduce(
      (acc, entry) => {
        const g = (Math.max(0, Number(entry.grams) || 0)) * factor;
        const ratio = g / 100;
        return {
          totalGrams: acc.totalGrams + g,
          calories: acc.calories + entry.food.calories * ratio,
          protein: acc.protein + entry.food.protein * ratio,
          carbs: acc.carbs + entry.food.carbs * ratio,
          fat: acc.fat + entry.food.fat * ratio,
        };
      },
      { totalGrams: 0, calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const handleTapSavedMeal = (meal) => {
    const macros = computeSavedMealMacros(meal, multiplier);
    const scaledCalories = Math.round(macros.calories);
    const scaledProtein = Math.round(macros.protein * 10) / 10;
    const scaledCarbs = Math.round(macros.carbs * 10) / 10;
    const scaledFat = Math.round(macros.fat * 10) / 10;

    setLastLoggedMealId(meal.id);
    setTimeout(() => {
      setLastLoggedMealId((prev) => (prev === meal.id ? null : prev));
    }, 900);

    addMealEntry({
      name: multiplier !== 1 ? `${meal.name} (${multiplier}×)` : meal.name,
      calories: scaledCalories,
      protein: scaledProtein,
      carbs: scaledCarbs,
      fat: scaledFat,
      multiplier,
    });
  };

  const handleLoadSavedMealIntoBuilder = (meal) => {
    const loadedItems = (meal.items || []).map((entry) => ({
      uid: generateId('bitem'),
      food: entry.food,
      grams: Math.max(1, Math.round((Number(entry.grams) || 0) * multiplier)),
    }));

    setMealBuilderItems(loadedItems);
    setBuilderMealName(multiplier !== 1 ? `${meal.name} (${multiplier}×)` : meal.name);
    setIsBuilderOpen(true);
    setEntryTab('search');
    showToast(`„${meal.name}“ in Mahlzeiten Baukasten geladen`, null, 'emerald');
  };

  const handleDeleteSavedMeal = (mealId) => {
    const snapshot = appData;
    setAppData((prev) => ({
      ...prev,
      savedMeals: prev.savedMeals.filter((m) => m.id !== mealId),
    }));
    showToast('Mahlzeit entfernt', snapshot, 'amber');
  };

  const handleTapFavorite = (fav) => {
    if (editingFavorites) {
      setEditingFavItem({ ...fav });
      return;
    }
    const scaledCalories = Math.round(fav.calories * multiplier);
    const scaledProtein = Math.round(fav.protein * multiplier * 10) / 10;
    const scaledCarbs = Math.round(fav.carbs * multiplier * 10) / 10;
    const scaledFat = Math.round(fav.fat * multiplier * 10) / 10;

    setLastLoggedFavId(fav.id);
    setTimeout(() => {
      setLastLoggedFavId((prev) => (prev === fav.id ? null : prev));
    }, 900);

    addMealEntry({
      name: multiplier !== 1 ? `${fav.name} (${multiplier}×)` : fav.name,
      calories: scaledCalories,
      protein: scaledProtein,
      carbs: scaledCarbs,
      fat: scaledFat,
      multiplier,
    });
  };

  const handleQuickAddSubmit = (e) => {
    e.preventDefault();
    const p = parseDecimalInput(proteinInput);
    const c = parseDecimalInput(carbsInput);
    const f = parseDecimalInput(fatInput);
    const explicitKcal = caloriesInput.trim() !== '' ? parseDecimalInput(caloriesInput) : null;
    const finalKcal =
      explicitKcal !== null && !isNaN(explicitKcal) ? explicitKcal : autoCalculatedCalories;

    if (p === 0 && c === 0 && f === 0 && finalKcal === 0 && !mealName.trim()) {
      return;
    }

    const resolvedName =
      mealName.trim() ||
      (p > 0
        ? `Schnelleintrag (${Math.round(p)}g Protein)`
        : `Schnelleintrag (${Math.round(finalKcal)} kcal)`);

    addMealEntry(
      {
        name: resolvedName,
        calories: Math.round(finalKcal),
        protein: Math.round(p * 10) / 10,
        carbs: Math.round(c * 10) / 10,
        fat: Math.round(f * 10) / 10,
      },
      null,
      saveAsFav
    );

    setMealName('');
    setProteinInput('');
    setCarbsInput('');
    setFatInput('');
    setCaloriesInput('');
    setSaveAsFav(false);
  };

  const handleCopyYesterday = () => {
    if (yesterdayLogs.length === 0) return;
    const snapshot = appData;
    const copied = yesterdayLogs.map((item) => ({
      ...item,
      id: generateId('meal'),
    }));

    setAppData((prev) => ({
      ...prev,
      logsByDate: {
        ...prev.logsByDate,
        [selectedDate]: [...(prev.logsByDate[selectedDate] || []), ...copied],
      },
    }));

    showToast(
      `${copied.length} ${copied.length === 1 ? 'Mahlzeit' : 'Mahlzeiten'} von gestern übernommen`,
      snapshot,
      'emerald'
    );
  };

  const handleDeleteMeal = (mealId) => {
    const snapshot = appData;
    setAppData((prev) => ({
      ...prev,
      logsByDate: {
        ...prev.logsByDate,
        [selectedDate]: (prev.logsByDate[selectedDate] || []).filter((m) => m.id !== mealId),
      },
    }));
    if (editingLogItem?.id === mealId) setEditingLogItem(null);
    showToast('Eintrag gelöscht', snapshot, 'amber');
  };

  const handleSaveEditedLog = (e) => {
    e.preventDefault();
    if (!editingLogItem) return;
    const cleanName = editingLogItem.name.trim();
    if (!cleanName) return;
    const snapshot = appData;
    const p = Math.round(parseDecimalInput(editingLogItem.protein) * 10) / 10;
    const c = Math.round(parseDecimalInput(editingLogItem.carbs) * 10) / 10;
    const f = Math.round(parseDecimalInput(editingLogItem.fat) * 10) / 10;
    const kcalRaw = String(editingLogItem.calories ?? '').trim();
    const kcal = kcalRaw === '' ? Math.round(p * 4 + c * 4 + f * 9) : Math.round(parseDecimalInput(kcalRaw));

    setAppData((prev) => ({
      ...prev,
      logsByDate: {
        ...prev.logsByDate,
        [selectedDate]: (prev.logsByDate[selectedDate] || []).map((m) =>
          m.id === editingLogItem.id
            ? { ...m, name: cleanName, calories: kcal, protein: p, carbs: c, fat: f }
            : m
        ),
      },
    }));
    setEditingLogItem(null);
    showToast('Eintrag aktualisiert', snapshot, 'emerald');
  };

  const handleDuplicateMeal = (meal) => {
    addMealEntry(
      {
        name: meal.name,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        multiplier: meal.multiplier || 1,
      },
      `Dupliziert: ${meal.name}`
    );
  };

  const handlePromoteMealToFavorite = (meal) => {
    const alreadyExists = appData.favorites.some(
      (f) => f.name.toLowerCase() === meal.name.toLowerCase()
    );
    if (alreadyExists) {
      showToast('Bereits in deinen Favoriten gespeichert', null, 'amber');
      return;
    }
    const snapshot = appData;
    const newFav = {
      id: generateId('fav'),
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
    };
    setAppData((prev) => ({
      ...prev,
      favorites: [newFav, ...prev.favorites],
    }));
    showToast(`Als Favorit gespeichert: ${meal.name}`, snapshot, 'emerald');
  };

  const handleDeleteFavorite = (favId) => {
    const snapshot = appData;
    setAppData((prev) => ({
      ...prev,
      favorites: prev.favorites.filter((f) => f.id !== favId),
    }));
    showToast('Favorit entfernt', snapshot, 'amber');
  };

  const handleSaveEditedFavorite = (e) => {
    e.preventDefault();
    if (!editingFavItem || !editingFavItem.name.trim()) return;
    setAppData((prev) => ({
      ...prev,
      favorites: prev.favorites.map((f) =>
        f.id === editingFavItem.id
          ? {
              ...editingFavItem,
              name: editingFavItem.name.trim(),
              calories: Math.round(Number(editingFavItem.calories) || 0),
              protein: Math.round((Number(editingFavItem.protein) || 0) * 10) / 10,
              carbs: Math.round((Number(editingFavItem.carbs) || 0) * 10) / 10,
              fat: Math.round((Number(editingFavItem.fat) || 0) * 10) / 10,
            }
          : f
      ),
    }));
    setEditingFavItem(null);
    showToast('Favorit aktualisiert', null, 'emerald');
  };

  // ==========================================================================
  // AKTIONEN: HABITS
  // ==========================================================================

  const toggleHabit = (habitId, dateKeyToToggle = selectedDate) => {
    setAppData((prev) => {
      const dateChecks = prev.habitChecksByDate[dateKeyToToggle] || {};
      const nextValue = !dateChecks[habitId];
      return {
        ...prev,
        habitChecksByDate: {
          ...prev.habitChecksByDate,
          [dateKeyToToggle]: {
            ...dateChecks,
            [habitId]: nextValue,
          },
        },
      };
    });
  };

  const handleAddHabit = (e) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    const newHabit = {
      id: generateId('hab'),
      title: newHabitTitle.trim(),
      ...(newHabitPerWeek > 0 ? { perWeek: newHabitPerWeek } : {}),
    };
    setAppData((prev) => ({
      ...prev,
      habits: [...prev.habits, newHabit],
    }));
    setNewHabitTitle('');
    setNewHabitPerWeek(0);
    showToast(`Habit hinzugefügt: ${newHabit.title}`, null, 'emerald');
  };

  const handleSetHabitFrequency = (habitId, perWeek) => {
    setAppData((prev) => ({
      ...prev,
      habits: prev.habits.map((h) => {
        if (h.id !== habitId) return h;
        const { perWeek: _old, ...rest } = h;
        return perWeek > 0 ? { ...rest, perWeek } : rest;
      }),
    }));
  };

  const handleRenameHabit = (habitId, title) => {
    setAppData((prev) => ({
      ...prev,
      habits: prev.habits.map((h) => (h.id === habitId ? { ...h, title } : h)),
    }));
  };

  const handleDeleteHabit = (habitId) => {
    const snapshot = appData;
    setAppData((prev) => ({
      ...prev,
      habits: prev.habits.filter((h) => h.id !== habitId),
    }));
    showToast('Habit gelöscht', snapshot, 'amber');
  };

  // ==========================================================================
  // AKTIONEN: EINSTELLUNGEN, EXPORT & IMPORT
  // ==========================================================================

  const handleSaveTargets = (e) => {
    e.preventDefault();
    const parsedGoalWeight =
      targetForm.weight !== null &&
      targetForm.weight !== undefined &&
      String(targetForm.weight).trim() !== ''
        ? parseWeightNumber(targetForm.weight)
        : null;

    const energy = normalizeProfile(energyForm);
    if (energy.enabled) energy.lastReview = getTodayKey();
    setAppData((prev) => ({
      ...prev,
      targets: {
        ...prev.targets,
        energy,
        calories: Math.max(500, Math.round(Number(targetForm.calories) || 1900)),
        protein: Math.max(10, Math.round(Number(targetForm.protein) || 160)),
        carbs: Math.max(0, Math.round(Number(targetForm.carbs) || 175)),
        fat: Math.max(10, Math.round(Number(targetForm.fat) || 60)),
        weight: parsedGoalWeight,
      },
    }));
    setIsSettingsOpen(false);
    showToast('Tagesziele gespeichert', null, 'emerald');
  };

  // Speichert das Profil sofort; ist das automatische Ziel aktiv, wird das
  // Tagesziel direkt neu berechnet und übernommen.
  const persistEnergyProfile = (form, { force = false, weights = null } = {}) => {
    const profile = normalizeProfile(form);
    const stored = normalizeProfile(appData.targets.energy);
    const unchanged =
      JSON.stringify({ ...profile, lastReview: null }) === JSON.stringify({ ...stored, lastReview: null });
    if (unchanged && !force) return;

    const est = profile.enabled
      ? estimateEnergy({
          profile,
          weightsByDate: weights || appData.weightsByDate || {},
          intakeByDate,
          today: getTodayKey(),
          currentTarget: appData.targets.calories,
        })
      : null;
    const macros = est
      ? { calories: est.calories, protein: est.protein, carbs: est.carbs, fat: est.fat }
      : {};

    setAppData((prev) => ({
      ...prev,
      ...(weights ? { weightsByDate: weights } : {}),
      targets: {
        ...prev.targets,
        ...macros,
        energy: { ...profile, lastReview: profile.enabled ? getTodayKey() : profile.lastReview },
      },
    }));
    if (est) {
      setTargetForm((prev) => ({ ...prev, ...macros }));
      showToast(`Tagesziel gesetzt: ${formatNumberDE(est.calories)} kcal`, null, 'emerald');
    } else if (unchanged === false) {
      showToast(profile.enabled ? 'Profil gespeichert' : 'Automatisches Kalorienziel aus', null, 'emerald');
    }
  };

  // Auswahlfelder/Haken: sofort speichern; Zahlenfelder: beim Verlassen des Feldes
  const updateEnergyForm = (patch, persist = false) => {
    const next = { ...energyForm, ...patch };
    setEnergyForm(next);
    if (persist) persistEnergyProfile(next);
  };

  const handleApplyEnergyPreview = () => persistEnergyProfile(energyForm, { force: true });

  // Noch kein Gewicht erfasst: direkt im Profil eintragen (zählt als heutiges Gewicht)
  const [energyWeightInput, setEnergyWeightInput] = useState('');
  const handleEnergyWeightSave = () => {
    const kg = parseWeightNumber(energyWeightInput);
    if (!kg || kg < 30 || kg > 300) {
      showToast('Bitte ein gültiges Gewicht in kg eingeben', null, 'rose');
      return;
    }
    const weights = { ...(appData.weightsByDate || {}), [getTodayKey()]: kg };
    setEnergyWeightInput('');
    persistEnergyProfile(energyForm, { force: true, weights });
  };

  // Dialog schließen speichert noch offene Profil-Eingaben
  const handleSettingsOpenChange = (open) => {
    if (!open && isSettingsOpen) persistEnergyProfile(energyForm);
    setIsSettingsOpen(open);
  };

  const markEnergyReviewed = (extraTargets = {}) =>
    setAppData((prev) => ({
      ...prev,
      targets: {
        ...prev.targets,
        ...extraTargets,
        energy: { ...normalizeProfile(prev.targets.energy), lastReview: getTodayKey() },
      },
    }));

  const handleApplyEnergySuggestion = () => {
    if (!energySuggestion) return;
    markEnergyReviewed(energySuggestion);
    showToast(`Neues Kalorienziel: ${formatNumberDE(energySuggestion.calories)} kcal`, null, 'emerald');
  };

  const handleExportJSON = () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        version: 1,
        data: appData,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `health-habit-tracker-backup-${todayKey}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('JSON-Backup heruntergeladen', null, 'emerald');
    } catch (err) {
      setImportFeedback({ type: 'error', text: 'Export fehlgeschlagen.' });
    }
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const importedData = parsed.data ? parsed.data : parsed;

        if (!importedData || typeof importedData !== 'object') {
          throw new Error('Ungültiges Format');
        }

        setAppData({
          targets: { ...DEFAULT_TARGETS, ...(importedData.targets || {}) },
          favorites: Array.isArray(importedData.favorites)
            ? importedData.favorites
            : DEFAULT_FAVORITES,
          savedMeals: Array.isArray(importedData.savedMeals)
            ? importedData.savedMeals
            : DEFAULT_SAVED_MEALS,
          habits: Array.isArray(importedData.habits) ? importedData.habits : DEFAULT_HABITS,
          logsByDate:
            importedData.logsByDate && typeof importedData.logsByDate === 'object'
              ? importedData.logsByDate
              : {},
          habitChecksByDate:
            importedData.habitChecksByDate && typeof importedData.habitChecksByDate === 'object'
              ? importedData.habitChecksByDate
              : {},
          weightsByDate:
            importedData.weightsByDate && typeof importedData.weightsByDate === 'object'
              ? importedData.weightsByDate
              : {},
          exercises:
            Array.isArray(importedData.exercises) && importedData.exercises.length > 0
              ? importedData.exercises
              : DEFAULT_EXERCISES,
          workoutTemplates: Array.isArray(importedData.workoutTemplates)
            ? importedData.workoutTemplates
            : [],
          workoutsByDate:
            importedData.workoutsByDate && typeof importedData.workoutsByDate === 'object'
              ? importedData.workoutsByDate
              : {},
        });

        sync.markHold('import');
        setImportFeedback({ type: 'success', text: 'Backup erfolgreich importiert!' });
        showToast('Backup erfolgreich wiederhergestellt', null, 'emerald');
      } catch (err) {
        setImportFeedback({
          type: 'error',
          text: 'Datei konnte nicht gelesen werden. Bitte gültige JSON-Backup-Datei wählen.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetAllData = () => {
    const fresh = {
      targets: { ...DEFAULT_TARGETS },
      favorites: [...DEFAULT_FAVORITES],
      savedMeals: [...DEFAULT_SAVED_MEALS],
      habits: [...DEFAULT_HABITS],
      logsByDate: {},
      habitChecksByDate: {},
      weightsByDate: {},
      exercises: [...DEFAULT_EXERCISES],
      workoutTemplates: [],
      workoutsByDate: {},
    };
    setAppData(fresh);
    sync.markHold('reset');
    setConfirmReset(false);
    setIsSettingsOpen(false);
    showToast('App auf Standardwerte zurückgesetzt', null, 'amber');
  };

  // ==========================================================================
  // UI-WERTE FÜR BENTO-DASHBOARD & GAUGE
  // ==========================================================================

  const dateHeader = formatGermanDateHeader(selectedDate, todayKey);

  const calRemaining = appData.targets.calories - totals.calories;
  const calPctRaw = Math.round((totals.calories / Math.max(1, appData.targets.calories)) * 100);
  const calPct = Math.min(100, calPctRaw);
  const calOver = totals.calories > appData.targets.calories;

  const calStatusBadge = useMemo(() => {
    if (calOver) {
      return {
        label: `+${formatNumberDE(Math.abs(calRemaining))} kcal drüber`,
        variant: 'destructive',
      };
    }
    if (calPctRaw >= 90) {
      return { label: 'Zielbereich erreicht', variant: 'emerald' };
    }
    if (totals.calories === 0) {
      return { label: 'Bereit zum Tracken', variant: 'secondary' };
    }
    return { label: 'Im Budget', variant: 'emerald' };
  }, [calOver, calRemaining, calPctRaw, totals.calories]);

  const proRemaining = appData.targets.protein - totals.protein;
  const proPctRaw = Math.round((totals.protein / Math.max(1, appData.targets.protein)) * 100);
  const proPct = Math.min(100, proPctRaw);
  const proGoalHit = totals.protein >= appData.targets.protein;

  const carbsRemaining = appData.targets.carbs - totals.carbs;
  const carbsPctRaw = Math.round((totals.carbs / Math.max(1, appData.targets.carbs)) * 100);
  const carbsPct = Math.min(100, carbsPctRaw);

  const fatRemaining = appData.targets.fat - totals.fat;
  const fatPctRaw = Math.round((totals.fat / Math.max(1, appData.targets.fat)) * 100);
  const fatPct = Math.min(100, fatPctRaw);

  // SVG Radial-Gauge Geometrie
  const ringRadius = 48;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringStrokeDashoffset = ringCircumference - (calPct / 100) * ringCircumference;

  // Nutri-Score Badge Varianten
  const nutriScoreVariant = {
    A: 'emerald',
    B: 'emerald',
    C: 'amber',
    D: 'amber',
    E: 'destructive',
  };

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200 pb-36 sm:pb-24 lg:pl-60">
      {/* ==================================================================== */}
      {/* SEITENLEISTE (nur PC, ab lg)                                         */}
      {/* ==================================================================== */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-60 flex-col gap-8 px-5 py-8 border-r border-zinc-800/70 bg-zinc-950">
        <div className="flex items-center gap-2.5 px-2">
          <img src={`${import.meta.env.BASE_URL}icon.svg?v=2`} alt="" className="w-7 h-7 rounded-[9px]" />
          <span className="text-[15px] font-semibold tracking-tight">Health Tracker</span>
        </div>

        <nav aria-label="Hauptnavigation" className="flex flex-col gap-1">
          {[
            {
              key: 'daily',
              label: 'Kalorien & Habits',
              icon: House,
              active: activeView === 'daily',
              onClick: () => setActiveView('daily'),
            },
            {
              key: 'training',
              label: 'Training',
              icon: Dumbbell,
              active: activeView === 'training',
              onClick: () => setActiveView('training'),
            },
            {
              key: 'weight',
              label: 'Gewicht',
              icon: TrendingUp,
              active: activeView === 'weight',
              onClick: () => setActiveView('weight'),
            },
            {
              key: 'scan',
              label: 'Barcode scannen',
              icon: ScanBarcode,
              active: false,
              onClick: () => setIsScannerOpen(true),
            },
            {
              key: 'goals',
              label: 'Ziele & Backup',
              icon: Target,
              active: false,
              onClick: () => setIsSettingsOpen(true),
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                aria-current={item.active ? 'page' : undefined}
                className={`h-11 px-3 rounded-xl flex items-center gap-3 text-sm font-medium text-left transition ${
                  item.active
                    ? 'bg-zinc-900 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60'
                }`}
              >
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 ${item.active ? 'text-emerald-400' : ''}`}
                  strokeWidth={1.8}
                />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto px-2 text-[11px] leading-relaxed text-zinc-500">
          Lebensmittel: Bundeslebensmittelschlüssel 4.0 (Max Rubner-Institut, CC BY 4.0) &amp; Open Food Facts (ODbL)
        </div>
      </aside>

      {/* ==================================================================== */}
      {/* KOMPAKTER STICKY HEADER & DATUMS-NAVIGATION                          */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/80">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* App-Branding (Handy: ausgeblendet, PC: steht in der Seitenleiste) */}
          <div className="hidden sm:flex lg:hidden items-center gap-2.5 shrink-0">
            <img src={`${import.meta.env.BASE_URL}icon.svg?v=2`} alt="" className="w-8 h-8 rounded-[10px]" />
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-zinc-100 leading-none">
                  Health <span className="text-emerald-400">&amp;</span> Habit Tracker
                </span>
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                BLS & Open Food Facts
              </div>
            </div>
          </div>

          {/* Datums-Stepper (< Gestern | Heute + nativer Picker | Morgen >) */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="flex items-center bg-zinc-900/90 border border-zinc-800 rounded-xl p-0.5 sm:p-1 shadow-inner min-w-0">
              <button
                type="button"
                onClick={() => setSelectedDate((d) => addDays(d, -1))}
                aria-label="Vorheriger Tag"
                className="w-9 h-9 sm:w-auto sm:h-auto sm:p-2 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 active:scale-95 transition shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="relative flex items-center group rounded-lg hover:bg-zinc-800/80 transition min-w-0">
                <div
                  aria-hidden="true"
                  className="px-1.5 sm:px-3 py-1 flex items-center gap-1.5 sm:gap-2 text-left pointer-events-none"
                >
                  <div className="text-center min-w-[78px] sm:min-w-[126px]">
                    <div className="text-xs sm:text-sm font-semibold text-zinc-100 leading-tight truncate">
                      {dateHeader.badge}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-zinc-400 leading-tight truncate">
                      {dateHeader.sub}
                    </div>
                  </div>
                  <Calendar className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition shrink-0 hidden min-[370px]:block" />
                </div>

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) setSelectedDate(e.target.value);
                  }}
                  aria-label="Datum auswählen"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => setSelectedDate((d) => addDays(d, 1))}
                aria-label="Nächster Tag"
                className="w-9 h-9 sm:w-auto sm:h-auto sm:p-2 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 active:scale-95 transition shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {selectedDate !== todayKey && (
              <Button
                variant="outline"
                size="xs"
                onClick={() => setSelectedDate(todayKey)}
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 h-9 sm:h-7 px-2 sm:px-2.5 shrink-0"
              >
                Heute
              </Button>
            )}
          </div>

          {/* Rechte Header-Aktionen: Google Drive Status, Gestern übernehmen & Ziele & Backup */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <SyncHeaderButton
              sync={sync}
              onOpenSettings={() => {
                setSettingsTab('gdrive');
                setIsSettingsOpen(true);
              }}
            />

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyYesterday}
              disabled={yesterdayLogs.length === 0}
              title={
                yesterdayLogs.length > 0
                  ? `${yesterdayLogs.length} Mahlzeiten von gestern übernehmen`
                  : 'Keine Einträge von gestern vorhanden'
              }
              className="hidden md:inline-flex"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gestern übernehmen</span>
              {yesterdayLogs.length > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] font-bold tabular-nums text-zinc-300">
                  {yesterdayLogs.length}
                </span>
              )}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Ziele & Backup öffnen"
              className="inline-flex lg:hidden"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-300" />
              <span className="hidden sm:inline">Ziele & Backup</span>
            </Button>
          </div>
        </div>
      </header>

      <SyncBanner sync={sync} />

      {/* ==================================================================== */}
      {/* HAUPTBEREICH (BENTO-DASHBOARD, LOGGING & HABIT TRACKER)              */}
      {/* ==================================================================== */}
      <main className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 pt-1 sm:pt-6 space-y-5">
        {/* Obere Navigationsleiste: Hauptansicht & 1-Klick Schnell-Waage */}
        <div className="hidden sm:flex lg:hidden items-center gap-2.5">
          <SegmentedTabs
            value={activeView}
            onValueChange={setActiveView}
            className="hidden sm:inline-flex lg:hidden sm:w-auto"
            items={[
              {
                value: 'daily',
                label: 'Kalorien & Habits',
                icon: Utensils,
                activeIconClass: 'text-emerald-400',
              },
              {
                value: 'training',
                label: 'Training',
                icon: Dumbbell,
                activeIconClass: 'text-emerald-400',
              },
              {
                value: 'weight',
                label: 'Gewichtsdaten',
                icon: Scale,
                activeIconClass: 'text-sky-400',
              },
            ]}
          />

        </div>

        {/* ================================================================== */}
        {/* ANSICHT A: KALORIEN, MAKROS & HABITS                               */}
        {/* ================================================================== */}
        {activeView === 'daily' && (
          <div className="flex flex-col gap-8 sm:gap-10">
            {/* ============================================================== */}
            {/* BENTO-DASHBOARD: KALORIEN-GAUGE & MAKRO-BALKEN                 */}
            {/* ============================================================== */}
            <section
              aria-labelledby="zone-bilanz"
              className={`space-y-3 ${mobileSection === 'habits' ? 'hidden sm:block' : 'block'}`}
            >
              <ZoneHeader
                id="zone-bilanz"
                title="Tagesbilanz"
                right={<span>Ziel {formatNumberDE(appData.targets.calories)} kcal</span>}
              />
              <div className="rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-[0_8px_24px_rgba(0,0,0,0.35)] p-3.5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5 lg:gap-8 items-center">
              {/* Links: Kalorien Radial-Gauge (5 Spalten) */}
              <div className="lg:col-span-5 flex items-center justify-between gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Kalorien-Budget
                    </span>
                    <Badge variant={calStatusBadge.variant}>{calStatusBadge.label}</Badge>
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-50 tabular-nums">
                      {formatNumberDE(totals.calories)}
                    </span>
                    <span className="text-xs sm:text-sm text-zinc-400 tabular-nums">
                      / {formatNumberDE(appData.targets.calories)} kcal
                    </span>
                  </div>

                  <div className="text-xs text-zinc-400 tabular-nums">
                    {calOver ? (
                      <span className="text-rose-400 font-medium">
                        {formatNumberDE(Math.abs(calRemaining))} kcal über Tagesziel
                      </span>
                    ) : (
                      <span>
                        Noch{' '}
                        <strong className="text-zinc-200 font-semibold">
                          {formatNumberDE(calRemaining)} kcal
                        </strong>{' '}
                        offen
                      </span>
                    )}
                  </div>
                </div>

                {/* SVG Radial Gauge */}
                <div className="relative w-20 h-20 sm:w-28 sm:h-28 shrink-0 flex items-center justify-center">
                  <svg className="w-20 h-20 sm:w-28 sm:h-28 -rotate-90" viewBox="0 0 112 112">
                    <circle
                      cx="56"
                      cy="56"
                      r={ringRadius}
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="9"
                      className="text-zinc-800/90"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r={ringRadius}
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringStrokeDashoffset}
                      className={`transition-all duration-500 ease-out ${
                        calOver ? 'text-rose-500' : 'text-emerald-400'
                      }`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span
                      className={`text-sm sm:text-lg font-bold tabular-nums leading-none ${
                        calOver ? 'text-rose-400' : 'text-zinc-100'
                      }`}
                    >
                      {calPctRaw}%
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-zinc-500 mt-0.5 sm:mt-1">erreicht</span>
                  </div>
                </div>
              </div>

              {/* Rechts: Makro-Fortschritt (7 Spalten) */}
              <div className="lg:col-span-7 flex flex-col justify-between gap-3 sm:gap-4 pt-3.5 sm:pt-5 border-t border-zinc-800 lg:pt-0 lg:border-t-0 lg:pl-8 lg:border-l">
                {/* Hervorgehobener Protein-Balken */}
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Protein
                      </span>
                      {proGoalHit ? (
                        <Badge variant="emerald">
                          <Check className="w-3 h-3" /> Ziel erreicht
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-zinc-400 tabular-nums">
                          noch {Math.max(0, Math.round(proRemaining))}g offen
                        </span>
                      )}
                    </div>

                    <div className="text-xs sm:text-sm tabular-nums">
                      <span className="font-bold text-zinc-100">
                        {Math.round(totals.protein * 10) / 10}g
                      </span>
                      <span className="text-zinc-500"> / {appData.targets.protein}g</span>
                    </div>
                  </div>
                  <ProgressBar value={proPct} color="emerald" height="lg" />
                </div>

                {/* Kohlenhydrate & Fette nebeneinander (auch mobil, spart Höhe) */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Kohlenhydrate */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <span className="font-semibold text-zinc-200 truncate">
                        <span className="sm:hidden">KH</span>
                        <span className="hidden sm:inline">Kohlenhydrate</span>
                      </span>
                      <span className="tabular-nums text-zinc-300 shrink-0">
                        <strong>{Math.round(totals.carbs * 10) / 10}g</strong>
                        <span className="text-zinc-500">/{appData.targets.carbs}</span>
                      </span>
                    </div>
                    <ProgressBar value={carbsPct} color="light" height="sm" />
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-zinc-500 tabular-nums">
                      <span>{carbsPctRaw}%</span>
                      <span>
                        {carbsRemaining >= 0
                          ? `noch ${Math.round(carbsRemaining)}g`
                          : `+${Math.round(Math.abs(carbsRemaining))}g`}
                      </span>
                    </div>
                  </div>

                  {/* Fette */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <span className="font-semibold text-sky-400">Fette</span>
                      <span className="tabular-nums text-zinc-300 shrink-0">
                        <strong>{Math.round(totals.fat * 10) / 10}g</strong>
                        <span className="text-zinc-500">/{appData.targets.fat}</span>
                      </span>
                    </div>
                    <ProgressBar value={fatPct} color="sky" height="sm" />
                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-zinc-500 tabular-nums">
                      <span>{fatPctRaw}%</span>
                      <span>
                        {fatRemaining >= 0
                          ? `noch ${Math.round(fatRemaining)}g`
                          : `+${Math.round(Math.abs(fatRemaining))}g`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              </div>

              {/* Adaptives Kalorienziel: Verbrauch, Trend, Wochen-Vorschlag */}
              {energyProfile.enabled && !energyEstimate && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3.5 py-3 text-xs text-zinc-400">
                  Trage dein Gewicht ein, damit das automatische Kalorienziel rechnen kann.
                </div>
              )}
              {energyEstimate && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3.5 py-3 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 tabular-nums">
                    <span>
                      Verbrauch ≈{' '}
                      <strong className="text-zinc-100">{formatNumberDE(energyEstimate.tdee)} kcal</strong>
                    </span>
                    <span>
                      {energyEstimate.observedTdee === null
                        ? 'per Formel geschätzt'
                        : `gelernt aus ${energyEstimate.validDays} Tagen (${Math.round(energyEstimate.confidence * 100)} %)`}
                    </span>
                    {energyEstimate.trendPerWeek !== null && (
                      <span>
                        Trend{' '}
                        <strong className="text-zinc-200">
                          {formatKgDelta(energyEstimate.trendPerWeek)} kg/Woche
                        </strong>
                      </span>
                    )}
                  </div>
                  {energySuggestion && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-zinc-800">
                      <div className="text-xs text-zinc-300 leading-relaxed">
                        Wochen-Check: neues Ziel{' '}
                        <strong className="text-emerald-400">
                          {formatNumberDE(energySuggestion.calories)} kcal
                        </strong>{' '}
                        <span className="text-zinc-500">
                          (bisher {formatNumberDE(appData.targets.calories)}) · {energySuggestion.protein} g P ·{' '}
                          {energySuggestion.carbs} g KH · {energySuggestion.fat} g F
                        </span>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button variant="secondary" size="sm" onClick={() => markEnergyReviewed()}>
                          Später
                        </Button>
                        <Button variant="primary" size="sm" onClick={handleApplyEnergySuggestion}>
                          Übernehmen
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Kompakte 1-Klick Schnell-Waage für den ausgewählten Tag */}
              <form
                onSubmit={handleSaveWeight}
                className="flex items-center justify-between gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl px-3 py-2"
              >
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Scale className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="font-medium text-zinc-300">Gewicht ({dateHeader.badge})</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleStepWeight(-0.1)}
                    aria-label="Gewicht um 0,1 kg verringern"
                    className="w-9 h-9 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 flex items-center justify-center text-xs font-bold transition"
                  >
                    -
                  </button>
                  <div className="relative w-24">
                    <input
                      type="text"
                      inputMode="decimal"
                      enterKeyHint="done"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      placeholder={
                        latestWeightEntry ? formatWeightDE(latestWeightEntry.weight) : '80,0'
                      }
                      className="w-full h-10 pl-2 pr-6 text-sm font-bold tabular-nums text-right bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-sky-500"
                    />
                    <span className="text-[10px] text-zinc-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      kg
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStepWeight(0.1)}
                    aria-label="Gewicht um 0,1 kg erhöhen"
                    className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 flex items-center justify-center text-sm font-bold transition"
                  >
                    +
                  </button>
                  <Button type="submit" variant="secondary" size="sm" className="ml-0.5 h-10 px-3">
                    <Check className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden sm:inline">OK</span>
                  </Button>
                </div>
              </form>
            </section>

            {/* ============================================================== */}
            {/* HAUPT-ARBEITSBEREICH: ERFASSUNG & PROTOKOLL (7) | HABITS (5)   */}
            {/* ============================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-8 items-start">
              {/* LINKE SPALTE: MAHLZEITENERFASSUNG & TAGESPROTOKOLL (7 Spalten) */}
              <div
                className={`lg:col-span-7 space-y-8 sm:space-y-10 ${
                  mobileSection === 'habits' ? 'hidden sm:block' : 'block'
                }`}
              >
                {/* Erfassungs-Karte */}
                <section ref={foodEntrySectionRef} aria-labelledby="zone-essen" className="space-y-3 scroll-mt-20">
                <ZoneHeader id="zone-essen" title="Essen hinzufügen" />
                <div className="rounded-2xl border border-zinc-800 bg-[#101114] overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 sm:p-2.5 bg-zinc-900 border-b border-zinc-800">
                    <SegmentedTabs
                      value={entryTab}
                      onValueChange={setEntryTab}
                      variant="band"
                      className="w-full sm:w-auto"
                      items={[
                        {
                          value: 'search',
                          label: 'Suche',
                          icon: Database,
                          activeIconClass: 'text-emerald-400',
                        },
                        {
                          value: 'meals',
                          label: 'Mahlzeiten',
                          icon: Layers,
                          activeIconClass: 'text-emerald-400',
                          badge: appData.savedMeals.length,
                        },
                        {
                          value: 'favorites',
                          label: 'Favoriten',
                          icon: Star,
                          activeIconClass: 'text-amber-400',
                          badge: appData.favorites.length,
                        },
                        {
                          value: 'manual',
                          label: 'Manuell',
                          icon: Plus,
                          activeIconClass: 'text-emerald-400',
                        },
                      ]}
                    />

                    {/* Portions-Multiplikator für Mahlzeiten & Favoriten */}
                    {(entryTab === 'meals' || entryTab === 'favorites') && (
                      <div className="flex items-center gap-1 bg-zinc-950/90 p-1 rounded-xl border border-zinc-800/90 self-end sm:self-auto">
                        {MULTIPLIERS.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setMultiplier(m)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold tabular-nums transition ${
                              multiplier === m
                                ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-100'
                            }`}
                          >
                            {m}×
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-4 sm:p-5 space-y-4">
                  {/* -------------------------------------------------------- */}
                  {/* TAB 1: LEBENSMITTEL-DB + GRAMMATUR-RECHNER + BAUKASTEN   */}
                  {/* -------------------------------------------------------- */}
                  {entryTab === 'search' && (
                    <div className="space-y-4">
                      {/* Suchleiste + Barcode-Foto-Button */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Lebensmittel oder EAN-Barcode suchen (z. B. Skyr, Haferflocken, Blattsalat)..."
                            className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery('');
                                setSelectedFood(null);
                              }}
                              aria-label="Suche löschen"
                              className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 absolute right-2 top-1/2 -translate-y-1/2"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <Button
                          variant="secondary"
                          size="md"
                          onClick={() => setIsScannerOpen(true)}
                          title="Barcode per Kamera-Foto scannen"
                          className="shrink-0 h-10 px-3"
                        >
                          <Camera className="w-4 h-4 text-emerald-400" />
                          <span className="hidden sm:inline">Barcode-Foto</span>
                        </Button>
                      </div>

                      {/* Versteckter Foto-Picker für KI Teller-Foto (funktioniert mit & ohne Text-Hinweis) */}
                      <input
                        ref={aiPhotoInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleEstimateWithAi({ query: searchQuery, file: f });
                          e.target.value = '';
                        }}
                        className="hidden"
                      />

                      {/* Quellen-Filter, KI-Foto & Baukasten-Trigger */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {searchQuery.trim() && !isBarcodeQuery ? (
                          <div className="inline-flex items-center gap-1 bg-zinc-950/90 p-0.5 rounded-xl border border-zinc-800/90">
                            {[
                              { id: 'all', label: 'Alle' },
                              {
                                id: 'local',
                                label: `Lokal (${localDishResults.length + localBasisResults.length + blsResults.length})`,
                              },
                              { id: 'off', label: `Marken (${offResults.length})`, loading: isSearchingOff },
                            ].map((pill) => (
                              <button
                                key={pill.id}
                                type="button"
                                onClick={() => setSourceFilter(pill.id)}
                                className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold transition ${
                                  sourceFilter === pill.id
                                    ? 'bg-zinc-800 text-zinc-100'
                                    : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                              >
                                <span>{pill.label}</span>
                                {pill.loading && (
                                  <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
                                )}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isEstimatingAi}
                              onClick={() => {
                                if (!geminiApiKey.trim()) openAiSettings();
                                else aiPhotoInputRef.current?.click();
                              }}
                              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold border bg-sky-500/10 text-sky-300 border-sky-500/30 hover:bg-sky-500/20 disabled:opacity-50 transition"
                            >
                              {isEstimatingAi ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5" />
                              )}
                              <span>{geminiApiKey.trim() ? 'KI Teller-Foto' : 'KI einrichten'}</span>
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setIsBuilderOpen((v) => !v)}
                          className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold border transition ${
                            mealBuilderItems.length > 0 || isBuilderOpen
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-zinc-950/60 text-zinc-400 border-zinc-800/80 hover:text-zinc-200'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Baukasten</span>
                          {mealBuilderItems.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-zinc-950 text-[10px] font-bold tabular-nums">
                              {mealBuilderItems.length}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* 1-Tap KI-Schätzung für beliebige Gerichte & Kombinationen */}
                      {searchQuery.trim().length >= 2 && !isBarcodeQuery && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isEstimatingAi}
                            onClick={() => handleEstimateWithAi({ query: searchQuery })}
                            className="flex-1 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/30 text-left transition disabled:opacity-60"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              {isEstimatingAi ? (
                                <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                              ) : (
                                <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                              )}
                              <span className="text-xs font-semibold text-sky-200 truncate">
                                {isEstimatingAi
                                  ? `Schätze „${searchQuery.trim()}“ mit Gemini…`
                                  : `„${searchQuery.trim()}“ mit KI schätzen`}
                              </span>
                            </span>
                            <span className="text-[10px] font-semibold text-sky-300/80 shrink-0">
                              {geminiApiKey.trim() ? 'Gemini' : 'Einrichten'}
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={isEstimatingAi}
                            onClick={() => {
                              if (!geminiApiKey.trim()) openAiSettings();
                              else aiPhotoInputRef.current?.click();
                            }}
                            title="Teller-Foto mit Text-Hinweis schätzen"
                            aria-label="Teller-Foto mit KI schätzen"
                            className="h-10 w-10 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 flex items-center justify-center shrink-0 transition disabled:opacity-60"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {aiError && (
                        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-200">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                          <span className="flex-1">{aiError}</span>
                          <button
                            type="button"
                            onClick={() => setAiError(null)}
                            aria-label="Fehler ausblenden"
                            className="text-rose-300 hover:text-rose-100"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Interaktiver Grammatur-Rechner */}
                      {selectedFood && calculatedFoodMacros && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleLogCalculatedFood();
                          }}
                          className="p-3.5 sm:p-4 rounded-2xl bg-zinc-950/95 border border-emerald-500/35 space-y-3.5 shadow-lg"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-bold text-zinc-100">
                                  {selectedFood.name}
                                </span>
                                <Badge
                                  variant={
                                    selectedFood.source === 'basis' || selectedFood.source === 'dish'
                                      ? 'emerald'
                                      : selectedFood.source === 'bls'
                                      ? 'amber'
                                      : 'sky'
                                  }
                                >
                                  {selectedFood.brand ||
                                    (selectedFood.source === 'basis'
                                      ? 'Basis-DB'
                                      : selectedFood.source === 'dish'
                                      ? 'Gericht'
                                      : selectedFood.source === 'ai'
                                      ? 'KI-Schätzung'
                                      : 'Open Food Facts')}
                                </Badge>
                                {selectedFood.nutriScore && (
                                  <Badge
                                    variant={
                                      nutriScoreVariant[selectedFood.nutriScore] ||
                                      'secondary'
                                    }
                                  >
                                    Nutri-Score {selectedFood.nutriScore}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-400 mt-1 tabular-nums">
                                Pro 100g: {selectedFood.calories} kcal ·{' '}
                                <span className="text-emerald-400">
                                  {selectedFood.protein}g P
                                </span>{' '}
                                ·{' '}
                                <span className="text-amber-400">
                                  {selectedFood.carbs}g KH
                                </span>{' '}
                                ·{' '}
                                <span className="text-sky-400">{selectedFood.fat}g F</span>
                              </div>
                              {selectedFood.aiNote && (
                                <div className="flex items-start gap-1.5 text-[11px] text-sky-300/90 mt-1.5">
                                  <Sparkles className="w-3 h-3 shrink-0 mt-0.5 text-sky-400" />
                                  <span>{selectedFood.aiNote}</span>
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedFood(null)}
                              aria-label="Rechner schließen"
                              className="w-9 h-9 -mr-1 -mt-1 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Mengen-Presets & Eingabe (Gramm oder Stück) */}
                          <div className="space-y-2">
                            {selectedPieceUnit && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="inline-flex p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
                                  {[['g', 'Gramm'], ['unit', selectedPieceUnit.label]].map(([key, text]) => (
                                    <button
                                      key={key}
                                      type="button"
                                      onClick={() => {
                                        if (key === amountUnit) return;
                                        if (key === 'unit') {
                                          const g = parseDecimalInput(gramsInput);
                                          const n = g > 0 ? Math.max(0.5, Math.round((g / selectedPieceUnit.grams) * 2) / 2) : 1;
                                          setUnitCountInput(String(n));
                                        } else if (calculatedFoodMacros && calculatedFoodMacros.grams > 0) {
                                          setGramsInput(String(Math.round(calculatedFoodMacros.grams)));
                                        }
                                        setAmountUnit(key);
                                      }}
                                      className={`h-8 px-2.5 rounded-md text-[11px] font-semibold transition ${
                                        amountUnit === key ? 'bg-zinc-200 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'
                                      }`}
                                    >
                                      {text}
                                    </button>
                                  ))}
                                </div>
                                <span className="text-[11px] text-zinc-500 tabular-nums">
                                  1 {selectedPieceUnit.hint || selectedPieceUnit.label} = {formatAmountDE(selectedPieceUnit.grams)} g
                                  {amountUnit === 'unit' && calculatedFoodMacros && (
                                    <span className="text-zinc-300"> · gesamt {formatAmountDE(Math.round(calculatedFoodMacros.grams))} g</span>
                                  )}
                                </span>
                              </div>
                            )}

                            {amountUnit === 'unit' && selectedPieceUnit ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {[0.5, 1, 2, 3, 4, 5, 6].map((n) => (
                                  <button
                                    key={n}
                                    type="button"
                                    onClick={() => setUnitCountInput(String(n))}
                                    className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium tabular-nums border transition ${
                                      parseDecimalInput(unitCountInput) === n
                                        ? 'bg-zinc-200 text-zinc-950 border-zinc-200 font-bold'
                                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                                    }`}
                                  >
                                    {n === 0.5 ? '½' : n}
                                  </button>
                                ))}
                              </div>
                            ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {selectedFood.servingQuantity && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setGramsInput(String(selectedFood.servingQuantity))
                                  }
                                  className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                                    parseDecimalInput(gramsInput) === selectedFood.servingQuantity
                                      ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                                  }`}
                                >
                                  {selectedFood.servingSize ||
                                    `1 Portion (${selectedFood.servingQuantity}g)`}
                                </button>
                              )}

                              {GRAM_PRESETS.map((g) => (
                                <button
                                  key={g}
                                  type="button"
                                  onClick={() => setGramsInput(String(g))}
                                  className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-medium tabular-nums border transition ${
                                    parseDecimalInput(gramsInput) === g
                                      ? 'bg-zinc-200 text-zinc-950 border-zinc-200 font-bold'
                                      : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                                  }`}
                                >
                                  {g}g
                                </button>
                              ))}
                            </div>
                            )}

                            <div className="flex items-center gap-2.5 sm:gap-3">
                              <div className="relative w-28 sm:w-32 shrink-0">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  enterKeyHint="done"
                                  aria-label={amountUnit === 'unit' && selectedPieceUnit ? selectedPieceUnit.label : 'Menge in Gramm'}
                                  value={amountUnit === 'unit' && selectedPieceUnit ? unitCountInput : gramsInput}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) =>
                                    amountUnit === 'unit' && selectedPieceUnit
                                      ? setUnitCountInput(e.target.value)
                                      : setGramsInput(e.target.value)
                                  }
                                  className="w-full h-11 pl-3 pr-12 text-sm font-bold tabular-nums bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:border-emerald-500"
                                />
                                <span className="text-xs text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                  {amountUnit === 'unit' && selectedPieceUnit ? selectedPieceUnit.label : 'g'}
                                </span>
                              </div>

                              {/* Live-Ergebnis */}
                              <div className="flex-1 grid grid-cols-4 gap-1 text-center bg-zinc-900/90 border border-zinc-800 rounded-xl py-2 px-1.5 tabular-nums">
                                <div>
                                  <div className="text-[10px] text-zinc-500">kcal</div>
                                  <div className="text-xs font-bold text-zinc-100">
                                    {calculatedFoodMacros.calories}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-emerald-400">Protein</div>
                                  <div className="text-xs font-bold text-emerald-300">
                                    {calculatedFoodMacros.protein}g
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-amber-400">KH</div>
                                  <div className="text-xs font-bold text-amber-300">
                                    {calculatedFoodMacros.carbs}g
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-sky-400">Fett</div>
                                  <div className="text-xs font-bold text-sky-300">
                                    {calculatedFoodMacros.fat}g
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                            <SwitchToggle
                              id="save-food-fav"
                              checked={saveFoodAsFav}
                              onCheckedChange={setSaveFoodAsFav}
                              label="Auch als Favorit merken"
                            />

                            <div className="flex items-center gap-2">
                              <Button
                                variant="secondary"
                                size="md"
                                onClick={() => handleAddFoodToBuilder()}
                                className="flex-1 sm:flex-initial"
                              >
                                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Baukasten</span>
                              </Button>

                              <Button
                                type="submit"
                                variant="primary"
                                size="md"
                                disabled={calculatedFoodMacros.grams <= 0}
                                className="flex-1 sm:flex-initial"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Loggen</span>
                              </Button>
                            </div>
                          </div>
                        </form>
                      )}

                      {/* Suchergebnisse oder Zuletzt geloggt + Quick-Picks */}
                      {!searchQuery.trim() ? (
                        <div className="space-y-3.5">
                          {recentLoggedMeals.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                                Zuletzt geloggt (1-Tap)
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {recentLoggedMeals.map((meal) => (
                                  <button
                                    key={meal.id}
                                    type="button"
                                    onClick={() => handleDuplicateMeal(meal)}
                                    className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-zinc-950/75 hover:bg-zinc-800/80 active:scale-[0.99] border border-zinc-800/90 hover:border-zinc-700 text-left transition group"
                                  >
                                    <div className="min-w-0">
                                      <div className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-300 truncate transition">
                                        {meal.name}
                                      </div>
                                      <div className="text-[11px] text-zinc-500 tabular-nums mt-0.5">
                                        {formatNumberDE(meal.calories)} kcal ·{' '}
                                        <span className="text-emerald-400">{meal.protein}g P</span>
                                      </div>
                                    </div>
                                    <Plus className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 shrink-0" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={toggleQuickPicks}
                              aria-expanded={showQuickPicks}
                              className="flex items-center gap-1.5 min-h-[32px] text-[11px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition"
                            >
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showQuickPicks ? '' : '-rotate-90'}`} />
                              <span>Häufige Grundnahrungsmittel (1-Klick Rechner)</span>
                            </button>
                            {showQuickPicks && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {quickPickFoods.map((food) => (
                                <button
                                  key={food.id}
                                  type="button"
                                  onClick={() => handleSelectFoodForCalculator(food)}
                                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-950/75 hover:bg-zinc-800/80 border border-zinc-800/90 hover:border-zinc-700 text-left transition group"
                                >
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-300 truncate transition">
                                      {food.name}
                                    </div>
                                    <div className="text-[11px] text-zinc-500 tabular-nums mt-0.5">
                                      {food.calories} kcal ·{' '}
                                      <span className="text-emerald-400">
                                        {food.protein}g P
                                      </span>{' '}
                                      / 100g
                                    </div>
                                  </div>
                                  <Plus className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 shrink-0" />
                                </button>
                              ))}
                            </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {isSearchingOff &&
                            (isBarcodeQuery ||
                              (filteredSearchResults.length === 0 && localPersonalResults.length === 0)) && (
                              <div className="flex items-center gap-2 text-xs text-zinc-400 py-1">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                                <span>
                                  {isBarcodeQuery
                                    ? 'Lade Produktdaten zum Barcode...'
                                    : 'Suche Markenprodukte bei Open Food Facts...'}
                                </span>
                              </div>
                            )}

                          {offError && (
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="flex-1">{typeof offError === 'string' ? offError : offError.text}</span>
                              {typeof offError === 'object' && offError.retry && (
                                <button
                                  type="button"
                                  onClick={() => setOffRetryNonce((n) => n + 1)}
                                  className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 hover:bg-amber-500/25 font-semibold"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Erneut
                                </button>
                              )}
                            </div>
                          )}

                          {localPersonalResults.length > 0 || filteredSearchResults.length > 0 ? (
                            <div className="max-h-72 overflow-y-auto pr-1 space-y-1.5">
                              {localPersonalResults.map((entry) => (
                                <button
                                  key={entry.id}
                                  type="button"
                                  onClick={() => {
                                    if (entry.kind === 'favorite') handleTapFavorite(entry.fav);
                                    else handleTapSavedMeal(entry.meal);
                                  }}
                                  className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/25 hover:border-emerald-500/40 text-left transition"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-semibold text-zinc-100 truncate">
                                        {entry.name}
                                      </span>
                                      <Badge variant={entry.kind === 'favorite' ? 'amber' : 'emerald'}>
                                        {entry.kind === 'favorite' ? 'Favorit' : 'Mahlzeit'}
                                      </Badge>
                                    </div>
                                    <div className="text-[11px] text-zinc-400 tabular-nums mt-0.5">
                                      {entry.calories} kcal ·{' '}
                                      <span className="text-emerald-400 font-medium">
                                        {entry.protein}g P
                                      </span>{' '}
                                      · <span className="text-amber-400">{entry.carbs}g KH</span> ·{' '}
                                      <span className="text-sky-400">{entry.fat}g F</span>
                                    </div>
                                  </div>
                                  <span className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-[11px] font-semibold shrink-0">
                                    <Plus className="w-3.5 h-3.5" />
                                    1-Tap
                                  </span>
                                </button>
                              ))}

                              {filteredSearchResults.map((food) => (
                                <div
                                  key={food.id}
                                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-950/75 hover:bg-zinc-800/80 border border-zinc-800/90 hover:border-zinc-700 transition"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleSelectFoodForCalculator(food)}
                                    className="flex-1 min-w-0 text-left"
                                  >
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-semibold text-zinc-100 truncate">
                                        {food.name}
                                      </span>
                                      <Badge
                                        variant={
                                          food.source === 'basis' || food.source === 'dish'
                                            ? 'emerald'
                                            : food.source === 'bls'
                                            ? 'amber'
                                            : 'sky'
                                        }
                                      >
                                        {food.brand ||
                                          (food.source === 'basis'
                                            ? 'Basis-DB'
                                            : food.source === 'dish'
                                            ? 'Gericht'
                                            : 'OFF')}
                                      </Badge>
                                    </div>
                                    <div className="text-[11px] text-zinc-400 tabular-nums mt-0.5">
                                      {food.calories} kcal ·{' '}
                                      <span className="text-emerald-400 font-medium">
                                        {food.protein}g P
                                      </span>{' '}
                                      · <span className="text-amber-400">{food.carbs}g KH</span>{' '}
                                      · <span className="text-sky-400">{food.fat}g F</span>{' '}
                                      <span className="text-zinc-500">(je 100g)</span>
                                    </div>
                                  </button>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleAddFoodToBuilder(food, 100)}
                                      title="100g in Mahlzeiten Baukasten legen"
                                      className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-300 hover:bg-zinc-800 transition"
                                    >
                                      <Layers className="w-3.5 h-3.5" />
                                    </button>
                                    <Button
                                      variant="secondary"
                                      size="xs"
                                      onClick={() => handleSelectFoodForCalculator(food)}
                                    >
                                      Menge
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            !isSearchingOff && (
                              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 text-center space-y-2">
                                <p className="text-xs text-zinc-400">
                                  Keine Treffer für „{searchQuery}“ gefunden.
                                </p>
                                <Button
                                  variant="secondary"
                                  size="xs"
                                  onClick={() => {
                                    setMealName(searchQuery.trim());
                                    setEntryTab('manual');
                                  }}
                                >
                                  Als manuellen Eintrag übernehmen
                                </Button>
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {/* Mahlzeiten Baukasten Panel */}
                      {(isBuilderOpen || mealBuilderItems.length > 0) && (
                        <form
                          onSubmit={handleLogMealBuilder}
                          className="p-4 rounded-2xl bg-zinc-950/95 border border-zinc-800 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Layers className="w-4 h-4 text-emerald-400" />
                              <span className="text-xs font-bold text-zinc-100">
                                Mahlzeiten Baukasten
                              </span>
                              <Badge variant="emerald">{mealBuilderItems.length} Zutaten</Badge>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsBuilderOpen(false)}
                              className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {mealBuilderItems.length === 0 ? (
                            <p className="text-xs text-zinc-500 py-2">
                              Suche oben nach Lebensmitteln und füge sie über „In Baukasten“ hinzu, um komplette Mahlzeiten zusammenzustellen.
                            </p>
                          ) : (
                            <>
                              <input
                                type="text"
                                value={builderMealName}
                                onChange={(e) => setBuilderMealName(e.target.value)}
                                placeholder="Name der Mahlzeit (optional, z. B. Post-Workout Bowl)"
                                className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                              />

                              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {mealBuilderItems.map((entry) => (
                                  <div
                                    key={entry.uid}
                                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-900/90 border border-zinc-800/80 text-xs"
                                  >
                                    <span className="truncate text-zinc-200 flex-1">
                                      {entry.food.name}
                                    </span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <input
                                        type="number"
                                        min="1"
                                        value={entry.grams}
                                        onChange={(e) =>
                                          handleUpdateBuilderItemGrams(
                                            entry.uid,
                                            e.target.value
                                          )
                                        }
                                        className="w-16 px-2 py-1 text-right text-xs font-bold tabular-nums bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100"
                                      />
                                      <span className="text-[11px] text-zinc-500">g</span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveBuilderItem(entry.uid)}
                                        className="p-1 text-zinc-500 hover:text-rose-400"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Baukasten Summenzeile */}
                              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs tabular-nums">
                                <span className="font-semibold text-zinc-300">
                                  Gesamt ({Math.round(mealBuilderTotals.totalGrams)}g):
                                </span>
                                <div className="flex items-center gap-2.5 font-bold">
                                  <span>{Math.round(mealBuilderTotals.calories)} kcal</span>
                                  <span className="text-emerald-400">
                                    {Math.round(mealBuilderTotals.protein * 10) / 10}g P
                                  </span>
                                  <span className="text-amber-400">
                                    {Math.round(mealBuilderTotals.carbs * 10) / 10}g KH
                                  </span>
                                  <span className="text-sky-400">
                                    {Math.round(mealBuilderTotals.fat * 10) / 10}g F
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                                <SwitchToggle
                                  id="save-builder-meal"
                                  checked={saveBuilderAsMeal}
                                  onCheckedChange={setSaveBuilderAsMeal}
                                  label="Unter „Mahlzeiten“ speichern"
                                />
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="secondary"
                                    size="xs"
                                    onClick={handleSaveBuilderAsMealOnly}
                                  >
                                    Nur speichern
                                  </Button>
                                  <Button type="submit" variant="primary" size="sm">
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Mahlzeit loggen</span>
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                        </form>
                      )}
                    </div>
                  )}

                  {/* -------------------------------------------------------- */}
                  {/* TAB 2: GESPEICHERTE MAHLZEITEN (VORLAGEN)                */}
                  {/* -------------------------------------------------------- */}
                  {entryTab === 'meals' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">
                          Tippe auf eine Mahlzeit zum direkten Loggen ({multiplier}×):
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingSavedMeals((v) => !v)}
                          className="text-xs text-zinc-400 hover:text-zinc-100 flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{editingSavedMeals ? 'Fertig' : 'Verwalten'}</span>
                        </button>
                      </div>

                      {appData.savedMeals.length === 0 ? (
                        <div className="p-6 text-center rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
                          <p className="text-xs text-zinc-400">
                            Noch keine eigenen Mahlzeiten gespeichert.
                          </p>
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => {
                              setEntryTab('search');
                              setIsBuilderOpen(true);
                            }}
                          >
                            Im Mahlzeiten Baukasten erstellen
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {appData.savedMeals.map((meal) => {
                            const m = computeSavedMealMacros(meal, multiplier);
                            const isExpanded = expandedMealId === meal.id;
                            const justLogged = lastLoggedMealId === meal.id;

                            return (
                              <div
                                key={meal.id}
                                className={`rounded-xl border transition ${
                                  justLogged
                                    ? 'bg-emerald-500/15 border-emerald-500/50'
                                    : 'bg-zinc-950/75 border-zinc-800/90 hover:border-zinc-700'
                                }`}
                              >
                                <div className="p-3 flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleTapSavedMeal(meal)}
                                    className="flex-1 text-left min-w-0"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs sm:text-sm font-semibold text-zinc-100 truncate">
                                        {meal.name}
                                      </span>
                                      {justLogged && (
                                        <Badge variant="emerald">
                                          <Check className="w-3 h-3" /> Geloggt
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-zinc-400 tabular-nums mt-0.5">
                                      {Math.round(m.calories)} kcal ·{' '}
                                      <span className="text-emerald-400 font-semibold">
                                        {Math.round(m.protein * 10) / 10}g P
                                      </span>{' '}
                                      ·{' '}
                                      <span className="text-amber-400">
                                        {Math.round(m.carbs * 10) / 10}g KH
                                      </span>{' '}
                                      ·{' '}
                                      <span className="text-sky-400">
                                        {Math.round(m.fat * 10) / 10}g F
                                      </span>
                                    </div>
                                  </button>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedMealId(isExpanded ? null : meal.id)
                                      }
                                      className="px-2 py-1 rounded-lg text-[11px] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                                    >
                                      {isExpanded ? 'Zutaten ▲' : 'Zutaten ▼'}
                                    </button>
                                    {editingSavedMeals && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSavedMeal(meal.id)}
                                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="px-3 pb-3 pt-2 border-t border-zinc-800/80 space-y-2">
                                    <ul className="space-y-1 text-[11px] text-zinc-400">
                                      {(meal.items || []).map((it, idx) => (
                                        <li
                                          key={idx}
                                          className="flex items-center justify-between tabular-nums"
                                        >
                                          <span>{it.food.name}</span>
                                          <span className="text-zinc-300 font-medium">
                                            {Math.round((Number(it.grams) || 0) * multiplier)}g
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                    <Button
                                      variant="secondary"
                                      size="xs"
                                      onClick={() => handleLoadSavedMealIntoBuilder(meal)}
                                      className="w-full"
                                    >
                                      <Layers className="w-3 h-3 text-emerald-400" />
                                      <span>Im Mahlzeiten Baukasten anpassen</span>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* -------------------------------------------------------- */}
                  {/* TAB 3: FAVORITEN (1-TAP LOGGING)                         */}
                  {/* -------------------------------------------------------- */}
                  {entryTab === 'favorites' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">
                          {editingFavorites
                            ? 'Favorit zum Bearbeiten antippen:'
                            : `1-Tap Logging (${multiplier}× Portion):`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFavorites((v) => !v);
                            setEditingFavItem(null);
                          }}
                          className="text-xs text-zinc-400 hover:text-zinc-100 flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{editingFavorites ? 'Fertig' : 'Bearbeiten'}</span>
                        </button>
                      </div>

                      {editingFavItem && (
                        <form
                          onSubmit={handleSaveEditedFavorite}
                          className="p-3 rounded-xl bg-zinc-950 border border-amber-500/40 space-y-2.5"
                        >
                          <div className="text-xs font-bold text-amber-300">
                            Favorit bearbeiten
                          </div>
                          <input
                            type="text"
                            value={editingFavItem.name}
                            onChange={(e) =>
                              setEditingFavItem({ ...editingFavItem, name: e.target.value })
                            }
                            className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100"
                          />
                          <div className="grid grid-cols-4 gap-2">
                            <div>
                              <label className="text-[10px] text-zinc-400">kcal</label>
                              <input
                                type="number"
                                value={editingFavItem.calories}
                                onChange={(e) =>
                                  setEditingFavItem({
                                    ...editingFavItem,
                                    calories: e.target.value,
                                  })
                                }
                                className="w-full px-2 py-1 text-xs tabular-nums bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-emerald-400">Protein</label>
                              <input
                                type="number"
                                step="0.1"
                                value={editingFavItem.protein}
                                onChange={(e) =>
                                  setEditingFavItem({
                                    ...editingFavItem,
                                    protein: e.target.value,
                                  })
                                }
                                className="w-full px-2 py-1 text-xs tabular-nums bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-amber-400">KH</label>
                              <input
                                type="number"
                                step="0.1"
                                value={editingFavItem.carbs}
                                onChange={(e) =>
                                  setEditingFavItem({
                                    ...editingFavItem,
                                    carbs: e.target.value,
                                  })
                                }
                                className="w-full px-2 py-1 text-xs tabular-nums bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-sky-400">Fett</label>
                              <input
                                type="number"
                                step="0.1"
                                value={editingFavItem.fat}
                                onChange={(e) =>
                                  setEditingFavItem({
                                    ...editingFavItem,
                                    fat: e.target.value,
                                  })
                                }
                                className="w-full px-2 py-1 text-xs tabular-nums bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => setEditingFavItem(null)}
                            >
                              Abbrechen
                            </Button>
                            <Button type="submit" variant="primary" size="xs">
                              Speichern
                            </Button>
                          </div>
                        </form>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {appData.favorites.map((fav) => {
                          const justLogged = lastLoggedFavId === fav.id;
                          return (
                            <div
                              key={fav.id}
                              className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition ${
                                justLogged
                                  ? 'bg-emerald-500/15 border-emerald-500/50'
                                  : 'bg-zinc-950/75 hover:bg-zinc-800/80 border-zinc-800/90 hover:border-zinc-700'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleTapFavorite(fav)}
                                className="flex-1 text-left min-w-0"
                              >
                                <div className="text-xs font-semibold text-zinc-100 truncate">
                                  {fav.name}
                                </div>
                                <div className="text-[11px] text-zinc-400 tabular-nums mt-0.5">
                                  {Math.round(fav.calories * multiplier)} kcal ·{' '}
                                  <span className="text-emerald-400 font-semibold">
                                    {Math.round(fav.protein * multiplier * 10) / 10}g P
                                  </span>{' '}
                                  · {Math.round(fav.carbs * multiplier * 10) / 10}g KH ·{' '}
                                  {Math.round(fav.fat * multiplier * 10) / 10}g F
                                </div>
                              </button>

                              {editingFavorites ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFavorite(fav.id)}
                                  className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : justLogged ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <Plus className="w-4 h-4 text-zinc-500 shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* -------------------------------------------------------- */}
                  {/* TAB 4: MANUELLE SCHNELLEINGABE                           */}
                  {/* -------------------------------------------------------- */}
                  {entryTab === 'manual' && (
                    <form onSubmit={handleQuickAddSubmit} className="space-y-3">
                      <div>
                        <label htmlFor="manual-meal-name" className="block text-[11px] font-medium text-zinc-400 mb-1">
                          Bezeichnung (optional)
                        </label>
                        <input
                          id="manual-meal-name"
                          type="text"
                          value={mealName}
                          onChange={(e) => setMealName(e.target.value)}
                          placeholder="z. B. Kantine Hähnchen-Curry"
                          className="w-full h-10 px-3 text-sm bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div>
                          <label htmlFor="manual-protein" className="block text-[11px] font-medium text-emerald-400 mb-1">
                            Protein (g)
                          </label>
                          <input
                            id="manual-protein"
                            type="text"
                            inputMode="decimal"
                            enterKeyHint="next"
                            value={proteinInput}
                            onChange={(e) => setProteinInput(e.target.value)}
                            placeholder="0"
                            className="w-full h-10 px-3 text-sm font-bold tabular-nums bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label htmlFor="manual-carbs" className="block text-[11px] font-medium text-amber-400 mb-1">
                            Kohlenhydrate (g)
                          </label>
                          <input
                            id="manual-carbs"
                            type="text"
                            inputMode="decimal"
                            enterKeyHint="next"
                            value={carbsInput}
                            onChange={(e) => setCarbsInput(e.target.value)}
                            placeholder="0"
                            className="w-full h-10 px-3 text-sm font-bold tabular-nums bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label htmlFor="manual-fat" className="block text-[11px] font-medium text-sky-400 mb-1">
                            Fett (g)
                          </label>
                          <input
                            id="manual-fat"
                            type="text"
                            inputMode="decimal"
                            enterKeyHint="done"
                            value={fatInput}
                            onChange={(e) => setFatInput(e.target.value)}
                            placeholder="0"
                            className="w-full h-10 px-3 text-sm font-bold tabular-nums bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label htmlFor="manual-kcal" className="block text-[11px] font-medium text-zinc-400 mb-1">
                            Kalorien (Auto)
                          </label>
                          <input
                            id="manual-kcal"
                            type="text"
                            inputMode="numeric"
                            enterKeyHint="done"
                            value={caloriesInput}
                            onChange={(e) => setCaloriesInput(e.target.value)}
                            placeholder={String(autoCalculatedCalories)}
                            className="w-full h-10 px-3 text-sm font-bold tabular-nums bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                        <SwitchToggle
                          id="save-manual-fav"
                          checked={saveAsFav}
                          onCheckedChange={setSaveAsFav}
                          label="Dauerhaft als Favorit speichern"
                        />

                        <Button type="submit" variant="primary" size="md">
                          <Plus className="w-4 h-4" />
                          <span>Eintrag hinzufügen</span>
                        </Button>
                      </div>
                    </form>
                  )}
                  </div>
                </div>
                </section>

                {/* Tagesprotokoll Liste */}
                <section aria-labelledby="zone-protokoll" className="space-y-3">
                <ZoneHeader
                  id="zone-protokoll"
                  title={`Protokoll · ${dateHeader.badge}`}
                  right={
                    <>
                      <span>
                        {dayLogs.length} {dayLogs.length === 1 ? 'Eintrag' : 'Einträge'}
                        <span className="hidden sm:inline"> · {formatNumberDE(totals.calories)} kcal</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyYesterday}
                        disabled={yesterdayLogs.length === 0}
                        className="md:hidden inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 disabled:opacity-40"
                      >
                        <Copy className="w-3.5 h-3.5 text-emerald-400" />
                        Gestern
                      </button>
                    </>
                  }
                />
                <SpotlightCard className="p-4 sm:p-5 space-y-3">
                  {dayLogs.length === 0 ? (
                    <div className="py-8 px-4 text-center rounded-xl bg-zinc-950/60 border border-dashed border-zinc-800 space-y-2">
                      <p className="text-xs text-zinc-400">
                        Für diesen Tag wurden noch keine Mahlzeiten erfasst.
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        Nutze die Lebensmittel-DB, gespeicherte Mahlzeiten oder deine Favoriten oben.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800/80">
                      {dayLogs.map((item) => {
                        const isEditingThis = editingLogItem?.id === item.id;
                        if (isEditingThis) {
                          return (
                            <form
                              key={item.id}
                              onSubmit={handleSaveEditedLog}
                              className="py-3 first:pt-0 last:pb-0 space-y-2.5"
                            >
                              <input
                                type="text"
                                value={editingLogItem.name}
                                onChange={(e) =>
                                  setEditingLogItem({ ...editingLogItem, name: e.target.value })
                                }
                                aria-label="Bezeichnung bearbeiten"
                                autoFocus
                                className="w-full h-10 px-3 text-sm bg-zinc-950 border border-emerald-500/50 rounded-xl text-zinc-100 focus:outline-none focus:border-emerald-500"
                              />
                              <div className="grid grid-cols-4 gap-2">
                                <div>
                                  <label className="block text-[10px] text-zinc-400 mb-0.5">kcal</label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={editingLogItem.calories}
                                    onChange={(e) =>
                                      setEditingLogItem({ ...editingLogItem, calories: e.target.value })
                                    }
                                    className="w-full h-9 px-2 text-xs font-bold tabular-nums bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-emerald-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-emerald-400 mb-0.5">Protein</label>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={editingLogItem.protein}
                                    onChange={(e) =>
                                      setEditingLogItem({ ...editingLogItem, protein: e.target.value })
                                    }
                                    className="w-full h-9 px-2 text-xs font-bold tabular-nums bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-emerald-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-amber-400 mb-0.5">KH</label>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={editingLogItem.carbs}
                                    onChange={(e) =>
                                      setEditingLogItem({ ...editingLogItem, carbs: e.target.value })
                                    }
                                    className="w-full h-9 px-2 text-xs font-bold tabular-nums bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-sky-400 mb-0.5">Fett</label>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={editingLogItem.fat}
                                    onChange={(e) =>
                                      setEditingLogItem({ ...editingLogItem, fat: e.target.value })
                                    }
                                    className="w-full h-9 px-2 text-xs font-bold tabular-nums bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 focus:outline-none focus:border-sky-500"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setEditingLogItem(null)}>
                                  Abbrechen
                                </Button>
                                <Button type="submit" variant="primary" size="sm">
                                  Speichern
                                </Button>
                              </div>
                            </form>
                          );
                        }

                        return (
                          <div
                            key={item.id}
                            className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2 group"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setEditingLogItem({
                                  id: item.id,
                                  name: item.name,
                                  calories: String(item.calories),
                                  protein: String(item.protein).replace('.', ','),
                                  carbs: String(item.carbs).replace('.', ','),
                                  fat: String(item.fat).replace('.', ','),
                                })
                              }
                              title="Tippen zum Bearbeiten"
                              className="flex-1 min-w-0 text-left rounded-lg -mx-1 px-1 py-0.5 hover:bg-zinc-800/40 transition"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm font-medium text-zinc-100 truncate">
                                  {item.name}
                                </span>
                                {item.time && (
                                  <span className="text-[10px] text-zinc-500 tabular-nums shrink-0">
                                    {item.time}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-400 tabular-nums mt-0.5">
                                <span className="font-semibold text-zinc-200">
                                  {formatNumberDE(item.calories)} kcal
                                </span>{' '}
                                ·{' '}
                                <span className="text-emerald-400 font-medium">
                                  {item.protein}g P
                                </span>{' '}
                                · <span className="text-amber-400">{item.carbs}g KH</span> ·{' '}
                                <span className="text-sky-400">{item.fat}g F</span>
                              </div>
                            </button>

                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handlePromoteMealToFavorite(item)}
                                title="Als Favorit speichern"
                                aria-label={`${item.name} als Favorit speichern`}
                                className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 transition"
                              >
                                <Star className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicateMeal(item)}
                                title="Nochmal loggen"
                                aria-label={`${item.name} nochmal loggen`}
                                className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMeal(item.id)}
                                title="Eintrag löschen"
                                aria-label={`${item.name} löschen`}
                                className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SpotlightCard>
                </section>
              </div>

              {/* RECHTE SPALTE: HABIT TRACKER & 7-TAGE-RÜCKBLICK (5 Spalten) */}
              <div
                className={`lg:col-span-5 space-y-8 sm:space-y-10 ${
                  mobileSection === 'food' ? 'hidden sm:block' : 'block'
                }`}
              >
                {/* Tägliche Habits */}
                <section aria-labelledby="zone-habits" className="space-y-3">
                <ZoneHeader
                  id="zone-habits"
                  title="Habits"
                  right={
                    <>
                      <Badge
                        variant={
                          completedHabitsCount === appData.habits.length &&
                          appData.habits.length > 0
                            ? 'emerald'
                            : 'secondary'
                        }
                      >
                        {completedHabitsCount}/{appData.habits.length}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => setEditingHabits((v) => !v)}
                        className="inline-flex items-center gap-1 h-8 px-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{editingHabits ? 'Fertig' : 'Anpassen'}</span>
                      </button>
                    </>
                  }
                />
                <SpotlightCard className="p-4 sm:p-5 space-y-4">
                  {/* Fortschrittsbalken der Tages-Habits */}
                  <ProgressBar
                    value={
                      appData.habits.length > 0
                        ? (completedHabitsCount / appData.habits.length) * 100
                        : 0
                    }
                    color="emerald"
                    height="sm"
                  />

                  <div className="space-y-2">
                    {appData.habits.map((habit) => {
                      const isDone = Boolean(dayHabitChecks[habit.id]);
                      const st = habitStreak(habit, appData.habitChecksByDate, selectedDate);
                      const perWeek = weeklyTarget(habit);
                      const weekDone = perWeek ? weekCount(appData.habitChecksByDate, habit.id, selectedDate) : 0;
                      const heatDays = perWeek
                        ? weekDays(selectedDate).map((key) => {
                            const d = parseDateKey(key);
                            return { key, weekday: WEEKDAYS_SHORT[d.getDay()], dayNum: d.getDate() };
                          })
                        : last7Days;

                      return (
                        <div
                          key={habit.id}
                          className={`p-3 rounded-xl border transition ${
                            isDone
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : 'bg-zinc-950/75 border-zinc-800/90 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            {editingHabits ? (
                              <input
                                type="text"
                                value={habit.title}
                                onChange={(e) => handleRenameHabit(habit.id, e.target.value)}
                                aria-label={`Habit umbenennen: ${habit.title}`}
                                className="flex-1 min-w-0 h-9 px-2.5 text-xs sm:text-sm bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-emerald-500"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleHabit(habit.id)}
                                className="flex items-center gap-2.5 flex-1 text-left min-w-0 py-0.5"
                              >
                                <span
                                  className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition ${
                                    isDone
                                      ? 'bg-emerald-500 border-emerald-400 text-zinc-950'
                                      : 'bg-zinc-900 border-zinc-700 text-transparent'
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[2.75]" />
                                </span>
                                <span className="min-w-0">
                                  <span
                                    className={`block text-xs sm:text-sm font-medium truncate transition ${
                                      isDone ? 'text-zinc-100' : 'text-zinc-300'
                                    }`}
                                  >
                                    {habit.title}
                                  </span>
                                  {perWeek && (
                                    <span
                                      className={`block text-[11px] tabular-nums ${
                                        weekDone >= perWeek ? 'text-emerald-400' : 'text-zinc-500'
                                      }`}
                                    >
                                      {Math.min(weekDone, perWeek)}/{perWeek} diese Woche
                                      {weekDone >= perWeek ? ' · Ziel erreicht' : ''}
                                    </span>
                                  )}
                                </span>
                              </button>
                            )}

                            <div className="flex items-center gap-1.5 shrink-0">
                              {!editingHabits && st.count > 0 && (
                                <span
                                  title={st.unit === 'week' ? `${st.count} Wochen in Folge` : `${st.count} Tage in Folge`}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold text-amber-300 tabular-nums"
                                >
                                  <Flame className="w-3 h-3 text-amber-400" />
                                  {st.count}
                                  {st.unit === 'week' ? ' Wo.' : ''}
                                </span>
                              )}

                              {editingHabits && (
                                <select
                                  value={perWeek ?? 0}
                                  onChange={(e) => handleSetHabitFrequency(habit.id, Number(e.target.value))}
                                  aria-label={`Häufigkeit für ${habit.title}`}
                                  className="h-9 px-2 text-[11px] bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-emerald-500"
                                >
                                  {FREQUENCY_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              )}

                              {editingHabits && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteHabit(habit.id)}
                                  aria-label={`${habit.title} löschen`}
                                  className="w-9 h-9 flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-500/15"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 7-Tage Mini-Heatmap pro Habit */}
                          <div className="mt-2 pt-1.5 border-t border-zinc-800/60 flex items-center justify-between gap-1">
                            {heatDays.map((day) => {
                              const checkedOnDay = Boolean(
                                (appData.habitChecksByDate[day.key] || {})[habit.id]
                              );
                              const isCurrentDay = day.key === selectedDate;
                              return (
                                <button
                                  key={day.key}
                                  type="button"
                                  onClick={() => toggleHabit(habit.id, day.key)}
                                  title={`${day.weekday}, ${day.dayNum}.`}
                                  aria-label={`${habit.title} am ${day.weekday}, ${day.dayNum}. ${checkedOnDay ? 'erledigt' : 'offen'}`}
                                  className={`flex-1 flex flex-col items-center gap-1 py-1.5 px-0.5 rounded-lg transition group ${
                                    isCurrentDay ? 'bg-zinc-800/70' : 'hover:bg-zinc-800/40'
                                  }`}
                                >
                                  <span
                                    className={`text-[10px] leading-none ${
                                      isCurrentDay
                                        ? 'text-emerald-400 font-bold'
                                        : 'text-zinc-500 group-hover:text-zinc-300'
                                    }`}
                                  >
                                    {day.weekday}
                                  </span>
                                  <span
                                    className={`w-full h-2 rounded-full transition ${
                                      checkedOnDay
                                        ? 'bg-emerald-400'
                                        : 'bg-zinc-800 group-hover:bg-zinc-700'
                                    }`}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {editingHabits && (
                    <form onSubmit={handleAddHabit} className="flex flex-wrap items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newHabitTitle}
                        onChange={(e) => setNewHabitTitle(e.target.value)}
                        placeholder="Neues Habit (z. B. 20 Min. Lesen)"
                        aria-label="Neues Habit"
                        className="flex-1 min-w-[180px] px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                      />
                      <select
                        value={newHabitPerWeek}
                        onChange={(e) => setNewHabitPerWeek(Number(e.target.value))}
                        aria-label="Häufigkeit des neuen Habits"
                        className="px-2 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:border-emerald-500"
                      >
                        {FREQUENCY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="primary" size="sm">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Hinzufügen</span>
                      </Button>
                    </form>
                  )}
                </SpotlightCard>
                </section>

                {/* 7-Tage-Rückblick (Kalorien & Protein) */}
                <section aria-labelledby="zone-rueckblick" className="space-y-3">
                <ZoneHeader
                  id="zone-rueckblick"
                  title="7-Tage-Rückblick"
                  right={<span>Ø {formatNumberDE(weeklyStats.avgCalories)} kcal</span>}
                />
                <SpotlightCard className="p-4 sm:p-5 space-y-4">

                  {/* Balkendiagramm */}
                  {(() => {
                    const maxVal = Math.max(
                      appData.targets.calories * 1.15,
                      ...last7Days.map((d) => d.calories),
                      1
                    );
                    const targetLineBottomPct = Math.min(
                      100,
                      Math.round((appData.targets.calories / maxVal) * 100)
                    );

                    return (
                      <div className="relative pt-4 pb-1">
                        {/* Gestrichelte Kalorien-Zielreferenz */}
                        <div
                          style={{ bottom: `${24 + targetLineBottomPct * 1.05}px` }}
                          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-zinc-700/90 flex justify-end"
                        >
                          <span className="text-[9px] text-zinc-500 -mt-3.5 bg-zinc-900/90 px-1 rounded tabular-nums">
                            Ziel {formatNumberDE(appData.targets.calories)}
                          </span>
                        </div>

                        <div className="grid grid-cols-7 gap-2 items-end h-32">
                          {last7Days.map((day) => {
                            const heightPct = Math.max(
                              4,
                              Math.round((day.calories / maxVal) * 100)
                            );
                            const isSelected = day.key === selectedDate;
                            const isOverTarget = day.calories > appData.targets.calories;

                            return (
                              <button
                                key={day.key}
                                type="button"
                                onClick={() => setSelectedDate(day.key)}
                                className="h-full flex flex-col items-center justify-end gap-1.5 group"
                              >
                                <span
                                  className={`text-[9px] tabular-nums transition ${
                                    isSelected
                                      ? 'text-emerald-300 font-bold opacity-100'
                                      : 'text-zinc-500 opacity-0 group-hover:opacity-100'
                                  }`}
                                >
                                  {day.calories > 0 ? formatNumberDE(day.calories) : '–'}
                                </span>
                                <div className="w-full h-24 flex items-end justify-center">
                                  <div
                                    style={{ height: `${heightPct}%` }}
                                    className={`w-full max-w-[24px] rounded-t-lg transition-all duration-300 ${
                                      !day.hasLogs
                                        ? 'bg-zinc-800/60'
                                        : isOverTarget
                                        ? 'bg-rose-500/80'
                                        : isSelected
                                        ? 'bg-emerald-400'
                                        : 'bg-emerald-500/55 group-hover:bg-emerald-400/80'
                                    }`}
                                  />
                                </div>
                                <span
                                  className={`text-[10px] font-medium ${
                                    isSelected ? 'text-emerald-400 font-bold' : 'text-zinc-500'
                                  }`}
                                >
                                  {day.weekday}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Wochen-KPIs */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80 text-center tabular-nums">
                    <div className="p-2 rounded-xl bg-zinc-950/60">
                      <div className="text-[10px] text-zinc-500">Ø Kalorien</div>
                      <div className="text-xs font-bold text-zinc-100 mt-0.5">
                        {formatNumberDE(weeklyStats.avgCalories)}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-zinc-950/60">
                      <div className="text-[10px] text-zinc-500">Proteinziel</div>
                      <div className="text-xs font-bold text-emerald-400 mt-0.5">
                        {weeklyStats.proteinGoalDays}/7 Tage
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-zinc-950/60">
                      <div className="text-[10px] text-zinc-500">Habit-Quote</div>
                      <div className="text-xs font-bold text-sky-400 mt-0.5">
                        {weeklyStats.avgHabitRate}%
                      </div>
                    </div>
                  </div>
                </SpotlightCard>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* ANSICHT B: GEWICHTSDATEN & VERLAUFSANALYSE                         */}
        {/* ================================================================== */}
        {activeView === 'training' && (
          <TrainingView
            appData={appData}
            setAppData={setAppData}
            selectedDate={selectedDate}
            dateLabel={dateHeader.badge}
            onSelectDate={setSelectedDate}
            notify={(message, snapshot = null, accent = 'emerald') => showToast(message, snapshot, accent)}
          />
        )}

        {activeView === 'weight' && (
          <section aria-label="Gewichtsdaten Analyse" className="space-y-4 sm:space-y-5">
            {/* Schnell-Waage direkt in der Gewichtsansicht */}
            <form
              onSubmit={handleSaveWeight}
              className="flex items-center justify-between gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl px-3.5 py-2.5"
            >
              <div className="flex items-center gap-2 min-w-0 text-xs text-zinc-400">
                <Scale className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="font-semibold text-zinc-200 truncate">
                  Gewicht ({dateHeader.badge})
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleStepWeight(-0.1)}
                  aria-label="Gewicht um 0,1 kg verringern"
                  className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 flex items-center justify-center text-sm font-bold transition"
                >
                  -
                </button>
                <div className="relative w-24">
                  <input
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="done"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    placeholder={
                      latestWeightEntry ? formatWeightDE(latestWeightEntry.weight) : '80,0'
                    }
                    aria-label="Gewicht in kg"
                    className="w-full h-10 pl-2 pr-6 text-sm font-bold tabular-nums text-right bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-sky-500"
                  />
                  <span className="text-[10px] text-zinc-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    kg
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleStepWeight(0.1)}
                  aria-label="Gewicht um 0,1 kg erhöhen"
                  className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 flex items-center justify-center text-sm font-bold transition"
                >
                  +
                </button>
                <Button type="submit" variant="primary" size="sm" className="ml-0.5 h-10 px-3">
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">Speichern</span>
                </Button>
              </div>
            </form>

            {/* 4 KPI-Karten */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <SpotlightCard spotlightColor="rgba(56, 189, 248, 0.1)" className="p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Aktuelles Gewicht
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-zinc-50 tabular-nums mt-1.5">
                  {weightStats.current !== null
                    ? `${formatWeightDE(weightStats.current)} kg`
                    : '–'}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  {latestWeightEntry
                    ? `Stand: ${latestWeightEntry.shortDate}`
                    : 'Noch kein Eintrag'}
                </div>
              </SpotlightCard>

              <SpotlightCard spotlightColor="rgba(16, 185, 129, 0.1)" className="p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  7-Tage-Trend (Ø)
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-emerald-400 tabular-nums mt-1.5">
                  {weightStats.avg7 !== null ? `${formatWeightDE(weightStats.avg7)} kg` : '–'}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Geglätteter Durchschnitt
                </div>
              </SpotlightCard>

              <SpotlightCard className="p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Veränderung ({weightRange === 'all' ? 'Gesamt' : weightRange.toUpperCase()})
                </div>
                <div className="flex items-center gap-1.5 text-2xl sm:text-3xl font-bold tabular-nums mt-1.5">
                  {weightStats.rangeDelta !== null ? (
                    <>
                      {weightStats.rangeDelta < 0 ? (
                        <TrendingDown className="w-5 h-5 text-emerald-400" />
                      ) : weightStats.rangeDelta > 0 ? (
                        <TrendingUp className="w-5 h-5 text-amber-400" />
                      ) : (
                        <Minus className="w-5 h-5 text-zinc-400" />
                      )}
                      <span
                        className={
                          weightStats.rangeDelta < 0
                            ? 'text-emerald-400'
                            : weightStats.rangeDelta > 0
                            ? 'text-amber-400'
                            : 'text-zinc-200'
                        }
                      >
                        {weightStats.rangeDelta > 0 ? '+' : ''}
                        {formatWeightDE(weightStats.rangeDelta)} kg
                      </span>
                    </>
                  ) : (
                    <span className="text-zinc-500">–</span>
                  )}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  {filteredChartWeights.length} Messwerte im Zeitraum
                </div>
              </SpotlightCard>

              {/* Zielgewicht & Fortschritt */}
              <SpotlightCard spotlightColor="rgba(56, 189, 248, 0.1)" className="p-4">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Zielgewicht
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setGoalWeightInput(
                        weightStats.goal !== null ? formatWeightDE(weightStats.goal) : ''
                      );
                      setIsEditingGoalWeight((v) => !v);
                    }}
                    className="text-[11px] text-sky-400 hover:text-sky-300 font-medium"
                  >
                    {isEditingGoalWeight ? 'Abbrechen' : weightStats.goal ? 'Ändern' : '+ Setzen'}
                  </button>
                </div>

                {isEditingGoalWeight ? (
                  <form onSubmit={handleSaveGoalWeight} className="mt-2 flex items-center gap-1.5">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={goalWeightInput}
                      onChange={(e) => setGoalWeightInput(e.target.value)}
                      placeholder="75,0"
                      autoFocus
                      className="w-full px-2.5 py-1 text-xs font-bold tabular-nums bg-zinc-950 border border-sky-500/50 rounded-lg text-zinc-100 focus:outline-none"
                    />
                    <Button type="submit" variant="primary" size="xs">
                      OK
                    </Button>
                  </form>
                ) : (
                  <>
                    <div className="text-2xl sm:text-3xl font-bold text-sky-400 tabular-nums mt-1.5">
                      {weightStats.goal !== null
                        ? `${formatWeightDE(weightStats.goal)} kg`
                        : 'Nicht gesetzt'}
                    </div>
                    <div className="text-[11px] text-zinc-400 tabular-nums mt-1">
                      {weightStats.goalDelta !== null ? (
                        <span>
                          {weightStats.goalDelta > 0 ? '+' : ''}
                          {formatWeightDE(weightStats.goalDelta)} kg bis Ziel
                        </span>
                      ) : (
                        <span className="text-zinc-500">Optionales Ziel festlegen</span>
                      )}
                    </div>
                  </>
                )}
              </SpotlightCard>
            </div>

            {/* Gewichtsverlauf-Chart & Historie */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Scharfes SVG Liniendiagramm (8 Spalten) */}
              <SpotlightCard className="lg:col-span-8 p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-zinc-100">Gewichtsverlauf</h2>
                    <p className="text-xs text-zinc-400">
                      Tageswerte &amp; 7-Tage-Durchschnitt
                    </p>
                  </div>

                  <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto">
                    {[
                      { id: '14d', label: '14T' },
                      { id: '30d', label: '30T' },
                      { id: '90d', label: '90T' },
                      { id: 'all', label: 'Alle' },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setWeightRange(r.id)}
                        className={`h-8 px-3 rounded-lg text-xs font-semibold transition ${
                          weightRange === r.id
                            ? 'bg-zinc-800 text-zinc-100'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredChartWeights.length === 0 ? (
                  <div className="py-12 px-4 text-center rounded-2xl bg-zinc-950/60 border border-dashed border-zinc-800 space-y-2">
                    <Scale className="w-8 h-8 text-zinc-600 mx-auto" />
                    <p className="text-xs text-zinc-400">
                      Noch keine Gewichtsdaten vorhanden.
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Trage oben dein aktuelles Gewicht ein, um den Trend zu starten.
                    </p>
                  </div>
                ) : (
                  (() => {
                    const W = 720;
                    const H = 260;
                    const padL = 48;
                    const padR = 20;
                    const padT = 20;
                    const padB = 34;
                    const plotW = W - padL - padR;
                    const plotH = H - padT - padB;

                    const activeChartPoint =
                      filteredChartWeights.find((d) => d.key === hoveredWeightKey) ||
                      filteredChartWeights.find((d) => d.key === selectedDate) ||
                      filteredChartWeights[filteredChartWeights.length - 1];

                    const allVals = filteredChartWeights.flatMap((d) => [
                      d.weight,
                      d.movingAvg7,
                    ]);
                    if (weightStats.goal !== null) {
                      allVals.push(weightStats.goal);
                    }
                    const rawMin = Math.min(...allVals);
                    const rawMax = Math.max(...allVals);
                    const spread = Math.max(1.2, rawMax - rawMin);
                    const minVal = Math.floor((rawMin - spread * 0.15) * 10) / 10;
                    const maxVal = Math.ceil((rawMax + spread * 0.15) * 10) / 10;
                    const valRange = Math.max(0.5, maxVal - minVal);

                    const getX = (idx) =>
                      filteredChartWeights.length === 1
                        ? padL + plotW / 2
                        : padL + (idx / (filteredChartWeights.length - 1)) * plotW;

                    const getY = (val) =>
                      padT + plotH - ((val - minVal) / valRange) * plotH;

                    const weightPoints = filteredChartWeights
                      .map((d, i) => `${getX(i).toFixed(1)},${getY(d.weight).toFixed(1)}`)
                      .join(' ');

                    const avgPoints = filteredChartWeights
                      .map(
                        (d, i) => `${getX(i).toFixed(1)},${getY(d.movingAvg7).toFixed(1)}`
                      )
                      .join(' ');

                    const firstX = getX(0).toFixed(1);
                    const lastX = getX(filteredChartWeights.length - 1).toFixed(1);
                    const baseY = (padT + plotH).toFixed(1);
                    const areaPath = `M ${firstX},${baseY} L ${weightPoints
                      .split(' ')
                      .join(' L ')} L ${lastX},${baseY} Z`;

                    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
                      val: minVal + t * valRange,
                      y: padT + plotH - t * plotH,
                    }));

                    const goalY =
                      weightStats.goal !== null ? getY(weightStats.goal) : null;

                    return (
                      <div className="space-y-3">
                        {/* Touch-freundliche Detail-Leiste für den gewählten/angetippten Tag */}
                        {activeChartPoint && (
                          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-950/90 border border-zinc-800/90 text-xs tabular-nums">
                            <span className="text-zinc-400 truncate">
                              {activeChartPoint.fullDateLabel}
                            </span>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-bold text-sky-300">
                                {formatWeightDE(activeChartPoint.weight)} kg
                              </span>
                              <span className="text-emerald-400">
                                Ø {formatWeightDE(activeChartPoint.movingAvg7)}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="w-full overflow-hidden rounded-2xl bg-zinc-950/80 border border-zinc-800/80 p-2">
                          <svg
                            viewBox={`0 0 ${W} ${H}`}
                            className="w-full h-auto block select-none"
                          >
                            <defs>
                              <linearGradient
                                id="weightAreaGrad"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop offset="0%" stopColor="#6E9EF5" stopOpacity="0.24" />
                                <stop offset="100%" stopColor="#6E9EF5" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>

                            {/* Horizontale Gridlines & Y-Achsen-Labels */}
                            {yTicks.map((tick, idx) => (
                              <g key={idx}>
                                <line
                                  x1={padL}
                                  y1={tick.y}
                                  x2={W - padR}
                                  y2={tick.y}
                                  stroke="#2E3037"
                                  strokeWidth="1"
                                />
                                <text
                                  x={padL - 8}
                                  y={tick.y + 4}
                                  textAnchor="end"
                                  fill="#8E929B"
                                  fontSize="11"
                                  fontFamily="ui-monospace, SFMono-Regular, monospace"
                                >
                                  {tick.val.toFixed(1)}
                                </text>
                              </g>
                            ))}

                            {/* Zielgewicht Referenzlinie */}
                            {goalY !== null && goalY >= padT && goalY <= padT + plotH && (
                              <g>
                                <line
                                  x1={padL}
                                  y1={goalY}
                                  x2={W - padR}
                                  y2={goalY}
                                  stroke="#6E9EF5"
                                  strokeOpacity="0.45"
                                  strokeWidth="1.5"
                                  strokeDasharray="5 5"
                                />
                                <text
                                  x={W - padR - 4}
                                  y={goalY - 5}
                                  textAnchor="end"
                                  fill="#8AB4FF"
                                  fontSize="10"
                                  fontWeight="600"
                                >
                                  Ziel {formatWeightDE(weightStats.goal)} kg
                                </text>
                              </g>
                            )}

                            {/* Flächenverlauf unter Gewichts-Kurve */}
                            {filteredChartWeights.length > 1 && (
                              <path d={areaPath} fill="url(#weightAreaGrad)" />
                            )}

                            {/* 7-Tage-Durchschnitt Kurve */}
                            {filteredChartWeights.length > 1 && (
                              <polyline
                                fill="none"
                                stroke="#B4E655"
                                strokeWidth="2.25"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={avgPoints}
                              />
                            )}

                            {/* Tagesgewicht Kurve */}
                            {filteredChartWeights.length > 1 && (
                              <polyline
                                fill="none"
                                stroke="#6E9EF5"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={weightPoints}
                              />
                            )}

                            {/* Messpunkte & X-Achsen-Labels */}
                            {filteredChartWeights.map((d, idx) => {
                              const cx = getX(idx);
                              const cy = getY(d.weight);
                              const isActive = activeChartPoint?.key === d.key;
                              const showXLabel =
                                filteredChartWeights.length <= 8 ||
                                idx === 0 ||
                                idx === filteredChartWeights.length - 1 ||
                                idx % Math.ceil(filteredChartWeights.length / 6) === 0;

                              return (
                                <g
                                  key={d.key}
                                  onMouseEnter={() => setHoveredWeightKey(d.key)}
                                  onMouseLeave={() => setHoveredWeightKey(null)}
                                  onClick={() => setSelectedDate(d.key)}
                                  className="cursor-pointer"
                                >
                                  {showXLabel && (
                                    <text
                                      x={cx}
                                      y={H - 10}
                                      textAnchor="middle"
                                      fill={isActive ? '#EDEEF0' : '#8E929B'}
                                      fontSize="10.5"
                                      fontWeight={isActive ? '700' : '400'}
                                    >
                                      {d.shortDate}
                                    </text>
                                  )}

                                  <circle cx={cx} cy={cy} r="16" fill="transparent" />
                                  <circle
                                    cx={cx}
                                    cy={cy}
                                    r={isActive ? '6' : '3.8'}
                                    fill={isActive ? '#F7F7F8' : '#6E9EF5'}
                                    stroke={isActive ? '#6E9EF5' : '#0B0C0E'}
                                    strokeWidth={isActive ? '2.5' : '1.75'}
                                  />
                                </g>
                              );
                            })}
                          </svg>
                        </div>

                        {/* Legende */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400 px-1">
                          <div className="flex items-center gap-4">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                              Tagesgewicht
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                              7-Tage-Trend (Ø)
                            </span>
                          </div>
                          <span className="text-zinc-500">
                            Punkt antippen zum Bearbeiten
                          </span>
                        </div>
                      </div>
                    );
                  })()
                )}
              </SpotlightCard>

              {/* Chronologische Messwert-Historie (4 Spalten) */}
              <SpotlightCard className="lg:col-span-4 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-100">Messwert-Historie</h3>
                  <Badge variant="secondary">{sortedWeightEntries.length}</Badge>
                </div>

                {sortedWeightEntries.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-4 text-center">
                    Noch keine Einträge gespeichert.
                  </p>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/80 pr-1">
                    {[...sortedWeightEntries].reverse().map((entry) => (
                      <div
                        key={entry.key}
                        className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedDate(entry.key)}
                          className="text-left min-w-0"
                        >
                          <div className="text-xs font-semibold text-zinc-200">
                            {entry.fullDateLabel}
                          </div>
                          <div className="text-[11px] text-zinc-500 tabular-nums">
                            7T-Ø: {formatWeightDE(entry.movingAvg7)} kg
                          </div>
                        </button>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right tabular-nums">
                            <div className="text-xs font-bold text-zinc-100">
                              {formatWeightDE(entry.weight)} kg
                            </div>
                            {entry.deltaPrev !== null && (
                              <div
                                className={`text-[10px] font-medium ${
                                  entry.deltaPrev < 0
                                    ? 'text-emerald-400'
                                    : entry.deltaPrev > 0
                                    ? 'text-amber-400'
                                    : 'text-zinc-500'
                                }`}
                              >
                                {entry.deltaPrev > 0 ? '+' : ''}
                                {formatWeightDE(entry.deltaPrev)} kg
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteWeight(entry.key)}
                            aria-label="Gewichtseintrag löschen"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SpotlightCard>
            </div>
          </section>
        )}
      </main>

      {/* ==================================================================== */}
      {/* MOBILE NAVIGATION UNTEN (nur Handy)                                  */}
      {/* ==================================================================== */}
      <nav
        aria-label="Hauptnavigation"
        className="sm:hidden fixed inset-x-4 z-40 bottom-[calc(1rem+env(safe-area-inset-bottom))] h-[68px] px-1.5 flex items-center justify-around rounded-[24px] bg-zinc-900/95 backdrop-blur-xl border border-zinc-800"
      >
        {[
          {
            key: 'today',
            label: 'Heute',
            icon: House,
            active: activeView === 'daily' && mobileSection !== 'habits',
            onClick: () => {
              setActiveView('daily');
              setMobileSection('all');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            },
          },
          {
            key: 'habits',
            label: 'Habits',
            icon: SquareCheckBig,
            active: activeView === 'daily' && mobileSection === 'habits',
            onClick: () => {
              setActiveView('daily');
              setMobileSection('habits');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            },
          },
          { key: 'scan' },
          {
            key: 'training',
            label: 'Training',
            icon: Dumbbell,
            active: activeView === 'training',
            onClick: () => {
              setActiveView('training');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            },
          },
          {
            key: 'weight',
            label: 'Gewicht',
            icon: TrendingUp,
            active: activeView === 'weight',
            onClick: () => {
              setActiveView('weight');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            },
          },
        ].map((item) => {
          if (item.key === 'scan') {
            return (
              <button
                key="scan"
                type="button"
                onClick={() => setIsScannerOpen(true)}
                aria-label="Barcode scannen"
                className="w-14 h-14 rounded-[18px] bg-emerald-400 text-zinc-950 flex items-center justify-center active:scale-95 transition"
              >
                <ScanBarcode className="w-[22px] h-[22px]" strokeWidth={2} />
              </button>
            );
          }
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              aria-current={item.active ? 'page' : undefined}
              className={`w-[60px] h-[52px] flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
                item.active ? 'text-zinc-100' : 'text-zinc-400'
              }`}
            >
              <Icon
                className={`w-5 h-5 ${item.active ? 'text-emerald-400' : ''}`}
                strokeWidth={1.8}
              />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* ==================================================================== */}
      {/* MODAL 1: ZIELE, GOOGLE DRIVE SYNC & DATENSICHERUNG                   */}
      {/* ==================================================================== */}
      <ModalDialog
        open={isSettingsOpen}
        onOpenChange={handleSettingsOpenChange}
        title="Ziele, Cloud-Sync &amp; Backup"
        description="Passe deine Tagesziele an, verbinde dein privates Google Drive zum Syncen oder erstelle ein lokales Backup."
      >
        <div className="p-5 space-y-5">
          <SegmentedTabs
            value={settingsTab}
            onValueChange={setSettingsTab}
            variant="band"
            className="w-full p-1 rounded-xl bg-zinc-950/90 border border-zinc-800"
            items={[
              { value: 'targets', label: 'Tagesziele', icon: Target },
              { value: 'gdrive', label: 'Drive', icon: Cloud },
              { value: 'ai', label: 'KI-Suche', icon: Sparkles, activeIconClass: 'text-sky-400' },
              { value: 'backup', label: 'Backup', icon: Download },
            ]}
          />

          {settingsTab === 'targets' && (
            <form onSubmit={handleSaveTargets} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={energyForm.enabled}
                    onChange={(e) => updateEnergyForm({ enabled: e.target.checked }, true)}
                    className="mt-0.5 w-4 h-4 accent-emerald-500"
                  />
                  <span>
                    <span className="block text-xs font-bold text-zinc-100">Automatisches Kalorienziel</span>
                    <span className="block text-[11px] text-zinc-500 leading-relaxed">
                      Startwert aus deinen Körperdaten. Danach lernt die App aus Essen und Gewichtsverlauf
                      und schlägt wöchentlich ein angepasstes Ziel vor.
                    </span>
                  </span>
                </label>

                {energyForm.enabled && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="en-sex" className="block text-xs font-medium text-zinc-300 mb-1">Geschlecht</label>
                        <select
                          id="en-sex"
                          value={energyForm.sex}
                          onChange={(e) => updateEnergyForm({ sex: e.target.value }, true)}
                          className={ENERGY_FIELD_CLS}
                        >
                          <option value="m">Mann</option>
                          <option value="f">Frau</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="en-height" className="block text-xs font-medium text-zinc-300 mb-1">Größe (cm)</label>
                        <input
                          id="en-height"
                          type="number"
                          inputMode="numeric"
                          value={energyForm.heightCm}
                          onChange={(e) => updateEnergyForm({ heightCm: e.target.value })}
                          onBlur={() => persistEnergyProfile(energyForm)}
                          className={ENERGY_FIELD_CLS}
                        />
                      </div>
                      <div>
                        <label htmlFor="en-birth" className="block text-xs font-medium text-zinc-300 mb-1">Geburtsjahr</label>
                        <input
                          id="en-birth"
                          type="number"
                          inputMode="numeric"
                          value={energyForm.birthYear}
                          onChange={(e) => updateEnergyForm({ birthYear: e.target.value })}
                          onBlur={() => persistEnergyProfile(energyForm)}
                          className={ENERGY_FIELD_CLS}
                        />
                      </div>
                      <div>
                        <label htmlFor="en-protein" className="block text-xs font-medium text-zinc-300 mb-1">Protein (g pro kg)</label>
                        <input
                          id="en-protein"
                          type="number"
                          step="0.1"
                          inputMode="decimal"
                          value={energyForm.proteinPerKg}
                          onChange={(e) => updateEnergyForm({ proteinPerKg: e.target.value })}
                          onBlur={() => persistEnergyProfile(energyForm)}
                          className={ENERGY_FIELD_CLS}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="en-activity" className="block text-xs font-medium text-zinc-300 mb-1">
                        Aktivität (nur Startwert, danach lernt die App selbst)
                      </label>
                      <select
                        id="en-activity"
                        value={energyForm.activity}
                        onChange={(e) => updateEnergyForm({ activity: Number(e.target.value) }, true)}
                        className={ENERGY_FIELD_CLS}
                      >
                        {ACTIVITY_LEVELS.map((a) => (
                          <option key={a.value} value={a.value}>{a.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="en-goal" className="block text-xs font-medium text-zinc-300 mb-1">Ziel</label>
                        <select
                          id="en-goal"
                          value={energyForm.goal}
                          onChange={(e) => updateEnergyForm({ goal: e.target.value }, true)}
                          className={ENERGY_FIELD_CLS}
                        >
                          <option value="lose">Abnehmen</option>
                          <option value="maintain">Gewicht halten</option>
                          <option value="gain">Zunehmen</option>
                        </select>
                      </div>
                      {energyForm.goal !== 'maintain' && (
                        <div>
                          <label htmlFor="en-rate" className="block text-xs font-medium text-zinc-300 mb-1">Tempo pro Woche</label>
                          <select
                            id="en-rate"
                            value={energyForm.ratePct}
                            onChange={(e) => updateEnergyForm({ ratePct: Number(e.target.value) }, true)}
                            className={ENERGY_FIELD_CLS}
                          >
                            {RATE_OPTIONS.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label} ({r.value.toLocaleString('de-DE')} %)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {energyPreview ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                        <div className="text-[11px] text-zinc-400 leading-relaxed tabular-nums">
                          Grundumsatz {formatNumberDE(energyPreview.bmr)} kcal · Verbrauch ≈{' '}
                          {formatNumberDE(energyPreview.tdee)} kcal
                          {energyPreview.observedTdee !== null ? ' (gelernt)' : ' (Formel)'}
                          <br />
                          Vorschlag:{' '}
                          <strong className="text-emerald-400">{formatNumberDE(energyPreview.calories)} kcal</strong>{' '}
                          · {energyPreview.protein} g P · {energyPreview.carbs} g KH · {energyPreview.fat} g F
                        </div>
                        <Button variant="secondary" size="sm" onClick={handleApplyEnergyPreview} className="shrink-0">
                          Neu berechnen
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label htmlFor="en-weight" className="block text-xs font-medium text-amber-300">
                          Aktuelles Gewicht (kg) – wird zum Berechnen gebraucht
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="en-weight"
                            type="text"
                            inputMode="decimal"
                            value={energyWeightInput}
                            onChange={(e) => setEnergyWeightInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleEnergyWeightSave();
                              }
                            }}
                            placeholder="z. B. 82,5"
                            className={ENERGY_FIELD_CLS}
                          />
                          <Button variant="primary" size="sm" onClick={handleEnergyWeightSave} className="shrink-0 h-[34px]">
                            Berechnen
                          </Button>
                        </div>
                      </div>
                    )}
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Änderungen werden sofort gespeichert und das Tagesziel automatisch angepasst.
                      Schätzung für den Alltag, keine ärztliche Beratung. Das Ziel sinkt nie unter deinen Grundumsatz,
                      das Defizit ist auf 25 % begrenzt.
                    </p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Kalorien-Ziel (kcal)
                  </label>
                  <input
                    type="number"
                    value={targetForm.calories}
                    onChange={(e) =>
                      setTargetForm({ ...targetForm, calories: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs font-bold tabular-nums bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-emerald-400 mb-1">
                    Protein-Ziel (g)
                  </label>
                  <input
                    type="number"
                    value={targetForm.protein}
                    onChange={(e) =>
                      setTargetForm({ ...targetForm, protein: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs font-bold tabular-nums bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-amber-400 mb-1">
                    Kohlenhydrate-Ziel (g)
                  </label>
                  <input
                    type="number"
                    value={targetForm.carbs}
                    onChange={(e) =>
                      setTargetForm({ ...targetForm, carbs: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs font-bold tabular-nums bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-sky-400 mb-1">
                    Fett-Ziel (g)
                  </label>
                  <input
                    type="number"
                    value={targetForm.fat}
                    onChange={(e) =>
                      setTargetForm({ ...targetForm, fat: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs font-bold tabular-nums bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-sky-300 mb-1">
                  Zielgewicht (kg) – optional
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={targetForm.weight !== null && targetForm.weight !== undefined ? targetForm.weight : ''}
                  onChange={(e) =>
                    setTargetForm({ ...targetForm, weight: e.target.value })
                  }
                  placeholder="75.0"
                  className="w-full px-3 py-2 text-xs font-bold tabular-nums bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" size="md" className="w-full">
                  Ziele speichern
                </Button>
              </div>
            </form>
          )}

          {settingsTab === 'gdrive' && <SyncSettingsPanel sync={sync} />}

          {settingsTab === 'ai' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <span>KI-Nährwertschätzung (Google Gemini)</span>
                  </div>
                  <Badge variant={geminiApiKey.trim() ? 'emerald' : 'secondary'}>
                    {geminiApiKey.trim() ? 'Aktiv' : 'Nicht eingerichtet'}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Schätzt Kalorien, Makros und Portionsgröße für beliebige Gerichte (z. B. <em>„Pad Thai mit Hähnchen, 1 Teller“</em>) oder direkt per <strong>Teller-Foto</strong> – ohne eigenen Server direkt über deinen persönlichen Gemini Free-Tier-Key.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="gemini-api-key" className="block text-xs font-medium text-zinc-300">
                  Gemini API-Key (lokal auf diesem Gerät gespeichert)
                </label>
                <div className="flex gap-2">
                  <input
                    id="gemini-api-key"
                    type={showGeminiKey ? 'text' : 'password'}
                    autoComplete="off"
                    value={geminiApiKey}
                    onChange={(e) => handleUpdateGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="flex-1 px-3 py-2 text-xs font-mono bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-sky-500"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowGeminiKey((v) => !v)}
                    className="shrink-0"
                  >
                    {showGeminiKey ? 'Verbergen' : 'Zeigen'}
                  </Button>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Kostenlosen Key erstellen unter{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline font-semibold"
                  >
                    aistudio.google.com/apikey
                  </a>{' '}
                  → „Create API key“ → hier einfügen.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="gemini-model" className="block text-xs font-medium text-zinc-300">
                  Modell (optional)
                </label>
                <select
                  id="gemini-model"
                  value={geminiModel}
                  onChange={(e) => handleUpdateGeminiModel(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="">Automatisch (empfohlen: {GEMINI_FALLBACK_MODELS[0]})</option>
                  {GEMINI_FALLBACK_MODELS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {aiTestStatus && (
                <div
                  className={`p-3 rounded-xl text-xs border ${
                    aiTestStatus.kind === 'ok'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : aiTestStatus.kind === 'error'
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      : 'bg-zinc-950 text-zinc-300 border-zinc-800'
                  }`}
                >
                  {aiTestStatus.text}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="md"
                  disabled={!geminiApiKey.trim() || aiTestStatus?.kind === 'loading'}
                  onClick={handleTestGeminiKey}
                  className="flex-1"
                >
                  {aiTestStatus?.kind === 'loading' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>Verbindung testen</span>
                </Button>
                {geminiApiKey.trim() && (
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => handleUpdateGeminiKey('')}
                    className="hover:text-rose-300"
                  >
                    Entfernen
                  </Button>
                )}
              </div>
            </div>
          )}

          {settingsTab === 'backup' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-bold text-zinc-200">
                  JSON-Export &amp; Import
                </div>
                <p className="text-xs text-zinc-400">
                  Sichere deine gesamten Protokolle, Favoriten und Gewichtsdaten als JSON-Datei oder stelle sie wieder her.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="secondary" size="md" onClick={handleExportJSON}>
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Backup exportieren</span>
                  </Button>

                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 text-sky-400" />
                    <span>Backup importieren</span>
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="hidden"
                  />
                </div>

                {importFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs ${
                      importFeedback.type === 'success'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {importFeedback.text}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-800 space-y-2">
                <div className="text-xs font-bold text-rose-400">
                  Gefahrenzone
                </div>
                {!confirmReset ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmReset(true)}
                  >
                    <span>App auf Werkseinstellungen zurücksetzen</span>
                  </Button>
                ) : (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                    <p className="text-xs text-rose-200">
                      Wirklich alles löschen? Ist Google Drive verbunden, wird der Sync danach pausiert und du entscheidest, ob Drive den alten Stand behält oder überschrieben wird. Drive hält außerdem Tages-Backups der letzten 14 Tage.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={handleResetAllData}
                      >
                        Ja, unwiderruflich löschen
                      </Button>
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => setConfirmReset(false)}
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ModalDialog>

      {/* ==================================================================== */}
      {/* BARCODE-FOTO-SCANNER MODAL                                           */}
      {/* ==================================================================== */}
      <BarcodeScannerModal
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onBarcodeDetected={handleBarcodeDetected}
      />

      {/* ==================================================================== */}
      {/* SONNER TOAST (UNDO)                                                  */}
      {/* ==================================================================== */}
      <SonnerToast
        toast={toast}
        onUndo={handleUndo}
        onDismiss={() => {
          setToast(null);
          undoSnapshotRef.current = null;
        }}
      />
    </div>
  );
}