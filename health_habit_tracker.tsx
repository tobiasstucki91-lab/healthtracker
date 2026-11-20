import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
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
  FileSpreadsheet,
  Link2,
  Cloud,
  Wifi,
  Radio,
  Smartphone,
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  collection,
  query,
} from 'firebase/firestore';

// ============================================================================
// FIREBASE CLOUD-SYNC KONFIGURATION (OPTION 2: HINTERGRUND-BRIDGE)
// ============================================================================

const hasFirebaseConfig = typeof __firebase_config !== 'undefined' && Boolean(__firebase_config);
const firebaseConfig = hasFirebaseConfig ? JSON.parse(__firebase_config) : null;
const firebaseApp = firebaseConfig ? initializeApp(firebaseConfig) : null;
const auth = firebaseApp ? getAuth(firebaseApp) : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// ============================================================================
// KONSTANTEN & STANDARDWERTE
// ============================================================================

const STORAGE_KEY = 'dark_industrial_macro_habit_v1';
const GDRIVE_CONFIG_KEY = 'health_habit_gdrive_config_v1';
const GDRIVE_BACKUP_FILENAME = 'health-habit-tracker-sync.json';
const GDRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

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
 * Beautiful UI SpotlightCard:
 * Renders a dark glassmorphic Zinc-900/75 surface with 1px border-zinc-800/80
 * and a dynamic pointer-tracking radial spotlight glow on hover.
 */
function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(16, 185, 129, 0.085)',
  ...props
}) {
  const cardRef = useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden rounded-2xl bg-zinc-900/75 border border-zinc-800/80 backdrop-blur-md shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_12px_32px_-12px_rgba(0,0,0,0.65)] transition-colors duration-200 hover:border-zinc-700/80 ${className}`}
      {...props}
    >
      {/* Beautiful UI Pointer Spotlight Overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(460px circle at ${coords.x}px ${coords.y}px, ${spotlightColor}, transparent 75%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

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
      'bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400 shadow-[0_0_20px_-5px_rgba(16,185,129,0.45)]',
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
function SegmentedTabs({ items, value, onValueChange, className = '' }) {
  return (
    <div
      role="tablist"
      className={`inline-flex flex-wrap sm:flex-nowrap items-center gap-1 rounded-xl bg-zinc-950/90 p-1 border border-zinc-800/90 ${className}`}
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
            className={`relative flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
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
                className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
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
    emerald: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]',
    amber: 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]',
    sky: 'bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.3)]',
    rose: 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]',
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-md animate-fadeIn"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="radix-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.85)]"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-zinc-800/90">
          <div>
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
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div>{children}</div>
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
      className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] sm:w-auto sm:min-w-[320px] sm:max-w-md"
    >
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-900/95 border border-zinc-800 backdrop-blur-xl px-4 py-3 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.85)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${
              toast.accent === 'amber'
                ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
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
    zxingReaderPromise = import('https://esm.sh/@zxing/browser@0.1.5')
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
 * BarcodeScannerModal:
 * Unterstützt direkte Foto-Aufnahme (mobil & desktop), Bild-Upload/Paste
 * sowie einen Live-Kamera-Scanner mit automatischer EAN-Erkennung.
 */
function BarcodeScannerModal({ open, onOpenChange, onBarcodeDetected }) {
  const [scanMode, setScanMode] = useState('photo'); // 'photo' | 'live'
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [manualEan, setManualEan] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);

  const cameraCaptureInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(null);

  const stopLiveCamera = () => {
    if (scanLoopRef.current) {
      clearInterval(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Cleanup beim Schließen oder Moduswechsel
  useEffect(() => {
    if (!open) {
      stopLiveCamera();
      setScanError(null);
      setIsDecoding(false);
      setManualEan('');
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      return;
    }

    if (scanMode !== 'live') {
      stopLiveCamera();
    }
  }, [open, scanMode]);

  useEffect(() => {
    return () => {
      stopLiveCamera();
    };
  }, []);

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

  // Live-Kamera starten & kontinuierlich Frames prüfen
  const startLiveCamera = async () => {
    setScanError(null);
    stopLiveCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScanError(
        'Live-Kamera wird in diesem Browser-Frame nicht unterstützt. Nutze stattdessen den Tab „Foto aufnehmen“.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsCameraActive(true);

      // Kurze Verzögerung bis <video> gemountet ist
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(() => {});
        }
      }, 60);

      let busy = false;
      scanLoopRef.current = setInterval(async () => {
        if (busy || !videoRef.current || videoRef.current.readyState < 2) return;
        busy = true;
        try {
          const code = await decodeBarcodeFromImage(videoRef.current);
          if (code) {
            stopLiveCamera();
            onBarcodeDetected(code);
          }
        } finally {
          busy = false;
        }
      }, 550);
    } catch {
      setScanError(
        'Kamerazugriff blockiert oder nicht verfügbar. Wechsle auf „Foto aufnehmen“, um direkt ein Foto vom Barcode zu machen.'
      );
      setIsCameraActive(false);
    }
  };

  // Aktuellen Frame aus Live-Kamera als Schnappschuss auswerten
  const handleCaptureLiveFrame = async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) return;
    setIsDecoding(true);
    setScanError(null);
    try {
      const code = await decodeBarcodeFromImage(videoRef.current);
      if (code) {
        stopLiveCamera();
        onBarcodeDetected(code);
      } else {
        setScanError('Auf diesem Frame wurde noch kein Barcode erkannt – halte ihn kurz ruhiger.');
      }
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
      description="Mache ein Foto vom Produkt-Barcode oder nutze den Live-Scanner."
    >
      <div onPaste={handlePaste} className="p-5 space-y-4">
        {/* Modus-Umschalter: Foto aufnehmen vs. Live-Kamera */}
        <SegmentedTabs
          value={scanMode}
          onValueChange={(nextMode) => {
            setScanMode(nextMode);
            setScanError(null);
            if (nextMode === 'live') {
              startLiveCamera();
            }
          }}
          className="w-full"
          items={[
            {
              value: 'photo',
              label: 'Foto aufnehmen',
              icon: Camera,
              activeIconClass: 'text-emerald-400',
            },
            {
              value: 'live',
              label: 'Live-Scanner',
              icon: ScanLine,
              activeIconClass: 'text-emerald-400',
            },
          ]}
        />

        {/* MODUS 1: FOTO AUFNEHMEN / BILD AUSWÄHLEN */}
        {scanMode === 'photo' && (
          <div className="space-y-3">
            {/* Versteckte File-Inputs: einmal direkt Kamera (capture), einmal Galerie */}
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

            {/* Foto-Vorschau oder großer Kamera-Trigger */}
            {previewUrl ? (
              <div className="relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 aspect-[16/10] flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Aufgenommener Barcode"
                  className="max-h-full max-w-full object-contain"
                />
                {isDecoding && (
                  <div className="absolute inset-0 bg-zinc-950/75 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-emerald-400">
                    <Loader2 className="w-7 h-7 animate-spin" />
                    <span className="text-xs font-semibold tracking-wide">
                      Analysiere Barcode...
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => cameraCaptureInputRef.current?.click()}
                className="w-full py-8 px-4 rounded-2xl bg-zinc-950/90 hover:bg-zinc-950 border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 transition flex flex-col items-center justify-center gap-2.5 text-center group active:scale-[0.99]"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-zinc-100">
                    Foto vom Barcode machen
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 max-w-xs">
                    Öffnet die Kamera für einen scharfen Schnappschuss des EAN-Strichcodes
                  </p>
                </div>
              </button>
            )}

            {/* Aktions-Buttons: Neues Foto & Galerie */}
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant="primary"
                size="md"
                onClick={() => cameraCaptureInputRef.current?.click()}
                disabled={isDecoding}
              >
                <Camera className="w-4 h-4" />
                <span>{previewUrl ? 'Neues Foto' : 'Kamera starten'}</span>
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

        {/* MODUS 2: LIVE-KAMERA VIEWFINDER */}
        {scanMode === 'live' && (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 aspect-[16/10] flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Zielrahmen Overlay */}
              {isCameraActive && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                  <div className="w-full max-w-[260px] h-28 rounded-xl border-2 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(9,9,11,0.48)] relative flex items-center justify-center">
                    <div className="w-full h-0.5 bg-emerald-400/80 shadow-[0_0_10px_#34d399]" />
                  </div>
                </div>
              )}

              {!isCameraActive && !scanError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-400">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <span className="text-xs">Starte Kamera...</span>
                </div>
              )}
            </div>

            {isCameraActive && (
              <Button
                variant="primary"
                size="md"
                onClick={handleCaptureLiveFrame}
                disabled={isDecoding}
                className="w-full"
              >
                <Camera className="w-4 h-4" />
                <span>Jetzt Schnappschuss auswerten</span>
              </Button>
            )}
          </div>
        )}

        {/* Fehler- oder Hinweis-Banner */}
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

/**
 * Parst CSV-Exporte aus openScale (unterstützt Semikolon, Komma & Tab
 * sowie deutsche/ISO-Datumsformate und Komma-Dezimalzahlen).
 */
function parseOpenScaleCsv(csvText) {
  const lines = String(csvText || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const firstLine = lines[0];
  const delimiter = firstLine.includes(';')
    ? ';'
    : firstLine.includes('\t')
    ? '\t'
    : ',';

  const splitRow = (row) =>
    row
      .split(delimiter)
      .map((cell) => cell.replace(/^["']|["']$/g, '').trim());

  const headers = splitRow(firstLine).map((h) => h.toLowerCase());
  const dateIdx = headers.findIndex(
    (h) => h.includes('date') || h.includes('datum') || h.includes('time') || h.includes('zeit')
  );
  const weightIdx = headers.findIndex(
    (h) => h.includes('weight') || h.includes('gewicht') || h.includes('masse')
  );

  if (dateIdx === -1 || weightIdx === -1) {
    return [];
  }

  const parsedEntries = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitRow(lines[i]);
    if (cols.length <= Math.max(dateIdx, weightIdx)) continue;

    const rawDate = cols[dateIdx];
    const rawWeight = cols[weightIdx].replace(',', '.').replace(/[^\d.]/g, '');
    const weightVal = parseFloat(rawWeight);

    if (isNaN(weightVal) || weightVal < 25 || weightVal > 350) continue;

    let dateKey = null;
    // ISO Format: YYYY-MM-DD (optional mit Uhrzeit)
    const isoMatch = rawDate.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    // Deutsches Format: DD.MM.YYYY (optional mit Uhrzeit)
    const deMatch = rawDate.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);

    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      dateKey = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else if (deMatch) {
      const [, d, m, y] = deMatch;
      dateKey = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    if (dateKey && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      parsedEntries.push({
        dateKey,
        weight: Math.round(weightVal * 10) / 10,
      });
    }
  }

  return parsedEntries;
}

function escapeLuceneSearchQuery(query) {
  return query
    .replace(/[+\-=&|><!(){}[\]^"~*?:\\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function loadInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        targets: { ...DEFAULT_TARGETS },
        favorites: [...DEFAULT_FAVORITES],
        savedMeals: [...DEFAULT_SAVED_MEALS],
        habits: [...DEFAULT_HABITS],
        logsByDate: {},
        habitChecksByDate: {},
        weightsByDate: {},
      };
    }
    const parsed = JSON.parse(raw);
    return {
      targets: { ...DEFAULT_TARGETS, ...(parsed.targets || {}) },
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [...DEFAULT_FAVORITES],
      savedMeals: Array.isArray(parsed.savedMeals) ? parsed.savedMeals : [...DEFAULT_SAVED_MEALS],
      habits: Array.isArray(parsed.habits) ? parsed.habits : [...DEFAULT_HABITS],
      logsByDate: parsed.logsByDate && typeof parsed.logsByDate === 'object' ? parsed.logsByDate : {},
      habitChecksByDate:
        parsed.habitChecksByDate && typeof parsed.habitChecksByDate === 'object'
          ? parsed.habitChecksByDate
          : {},
      weightsByDate:
        parsed.weightsByDate && typeof parsed.weightsByDate === 'object' ? parsed.weightsByDate : {},
    };
  } catch (err) {
    console.error('Fehler beim Laden aus localStorage:', err);
    return {
      targets: { ...DEFAULT_TARGETS },
      favorites: [...DEFAULT_FAVORITES],
      savedMeals: [...DEFAULT_SAVED_MEALS],
      habits: [...DEFAULT_HABITS],
      logsByDate: {},
      habitChecksByDate: {},
      weightsByDate: {},
    };
  }
}

// ============================================================================
// HAUPTKOMPONENTE
// ============================================================================

export default function App() {
  const [appData, setAppData] = useState(loadInitialState);
  const [selectedDate, setSelectedDate] = useState(getTodayKey);
  const [multiplier, setMultiplier] = useState(1);

  // Hauptansicht: 'daily' (Kalorien, Makros & Habits) | 'weight' (Gewichtsdaten)
  const [activeView, setActiveView] = useState('daily');

  // Gewichtsdaten State
  const [weightInput, setWeightInput] = useState('');
  const [weightRange, setWeightRange] = useState('30d');
  const [hoveredWeightKey, setHoveredWeightKey] = useState(null);
  const [isEditingGoalWeight, setIsEditingGoalWeight] = useState(false);
  const [goalWeightInput, setGoalWeightInput] = useState('');

  // Mobile Filter-Ansicht ('all' | 'food' | 'habits')
  const [mobileSection, setMobileSection] = useState('all');

  // Haupt-Tabs in der Mahlzeitenerfassung: 'search' | 'meals' | 'favorites' | 'manual'
  const [entryTab, setEntryTab] = useState('search');

  // Nahrungsmittel-Suche & Filter-Pills ('all' | 'basis' | 'off')
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [offResults, setOffResults] = useState([]);
  const [isSearchingOff, setIsSearchingOff] = useState(false);
  const [offError, setOffError] = useState(null);

  // Grammatur-Rechner State
  const [selectedFood, setSelectedFood] = useState(null);
  const [gramsInput, setGramsInput] = useState('100');
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

  // Einstellungs-Modal & Backup
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('targets');
  const [targetForm, setTargetForm] = useState(appData.targets);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importFeedback, setImportFeedback] = useState(null);

  // Google Drive Sync State (appDataFolder)
  const [gdriveClientId, setGdriveClientId] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(GDRIVE_CONFIG_KEY) || '{}');
      return saved.clientId || '';
    } catch {
      return '';
    }
  });
  const [gdriveAutoSync, setGdriveAutoSync] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(GDRIVE_CONFIG_KEY) || '{}');
      return saved.autoSync !== false;
    } catch {
      return true;
    }
  });
  const [gdriveAccessToken, setGdriveAccessToken] = useState(null);
  const [gdriveStatus, setGdriveStatus] = useState('disconnected'); // 'disconnected' | 'syncing' | 'synced' | 'error'
  const [gdriveLastSync, setGdriveLastSync] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(GDRIVE_CONFIG_KEY) || '{}');
      return saved.lastSync || null;
    } catch {
      return null;
    }
  });
  const [gdriveError, setGdriveError] = useState(null);
  const gdriveFileIdRef = useRef(null);
  const gdriveTokenClientRef = useRef(null);
  const gdriveSkipNextUploadRef = useRef(false);
  const gdriveDataRef = useRef(appData);

  // openScale Sync & CSV-Import Modal
  const [isOpenScaleModalOpen, setIsOpenScaleModalOpen] = useState(false);
  const [openScaleCopied, setOpenScaleCopied] = useState(false);
  const [syncTab, setSyncTab] = useState('auto'); // 'auto' | 'csv' | 'esp'
  const openScaleCsvInputRef = useRef(null);

  // Cloud-Sync State (Firebase Bridge für vollautomatische Waagen-Daten)
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState(hasFirebaseConfig ? 'connecting' : 'local');
  const [lastCloudSyncAt, setLastCloudSyncAt] = useState(null);

  // Barcode-Foto-Scanner Modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const autoSelectBarcodeRef = useRef(false);

  // Sonner-Toast & Undo Historie
  const [toast, setToast] = useState(null);
  const undoSnapshotRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const searchInputRef = useRef(null);

  const todayKey = getTodayKey();

  // Seitentitel aktualisieren
  useEffect(() => {
    document.title = 'Health & Habit Tracker';
  }, []);

  // 1. Firebase Authentifizierung initialisieren (für Cloud-Bridge & Multi-Device Sync)
  useEffect(() => {
    if (!auth) return;
    let isMounted = true;

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.warn('Cloud-Auth Fallback auf lokal:', err);
        if (isMounted) setSyncStatus('local');
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (isMounted) {
        setUser(currentUser);
        if (currentUser) setSyncStatus('connected');
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // 2. Echtzeit-Listener für eingehende Cloud-Gewichtsdaten (openScale / ESP32 / Home Assistant)
  useEffect(() => {
    if (!db || !user) return;

    const weightsColRef = collection(
      db,
      'artifacts',
      appId,
      'users',
      user.uid,
      'openscale_weights'
    );
    const q = query(weightsColRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) return;

        const incomingWeights = {};
        let latestSyncedKey = null;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const dateKey = data?.dateKey || docSnap.id;
          const weightVal = Number(data?.weight);
          if (
            /^\d{4}-\d{2}-\d{2}$/.test(dateKey) &&
            !isNaN(weightVal) &&
            weightVal >= 25 &&
            weightVal <= 350
          ) {
            incomingWeights[dateKey] = Math.round(weightVal * 10) / 10;
            if (!latestSyncedKey || dateKey > latestSyncedKey) {
              latestSyncedKey = dateKey;
            }
          }
        });

        if (Object.keys(incomingWeights).length > 0) {
          setAppData((prev) => ({
            ...prev,
            weightsByDate: {
              ...(prev.weightsByDate || {}),
              ...incomingWeights,
            },
          }));
          setLastCloudSyncAt(new Date());
        }
      },
      (error) => {
        console.warn('Cloud-Sync Listener Fehler:', error);
        setSyncStatus('local');
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Hilfsfunktion: Gewichtswert zusätzlich in die Cloud-Bridge schreiben
  const syncWeightToCloud = async (dateKey, weightVal) => {
    if (!db || !user) return;
    try {
      const weightDocRef = doc(
        db,
        'artifacts',
        appId,
        'users',
        user.uid,
        'openscale_weights',
        dateKey
      );
      await setDoc(
        weightDocRef,
        {
          dateKey,
          weight: Math.round(weightVal * 10) / 10,
          source: 'openscale-bridge',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      setLastCloudSyncAt(new Date());
    } catch (err) {
      console.warn('Cloud-Sync Speichern fehlgeschlagen:', err);
    }
  };

  // Automatischer openScale Webhook/URL-Import beim Öffnen (?openscale_weight=81.4&openscale_date=2026-11-17)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const rawW = params.get('openscale_weight') || params.get('weight');
    if (!rawW) return;

    const normalizedW = parseFloat(String(rawW).replace(',', '.'));
    if (isNaN(normalizedW) || normalizedW < 25 || normalizedW > 350) return;

    const roundedW = Math.round(normalizedW * 10) / 10;
    const rawD = params.get('openscale_date') || params.get('date');
    const targetDateKey =
      rawD && /^\d{4}-\d{2}-\d{2}$/.test(rawD) ? rawD : getTodayKey();

    setAppData((prev) => ({
      ...prev,
      weightsByDate: {
        ...(prev.weightsByDate || {}),
        [targetDateKey]: roundedW,
      },
    }));
    setSelectedDate(targetDateKey);
    setActiveView('weight');

    // URL-Parameter bereinigen, damit beim Reload nicht doppelt getriggert wird
    params.delete('openscale_weight');
    params.delete('openscale_date');
    params.delete('weight');
    params.delete('date');
    const nextSearch = params.toString();
    const cleanUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', cleanUrl);

    setTimeout(() => {
      showToast(
        `openScale Auto-Sync: ${formatWeightDE(roundedW)} kg (${targetDateKey}) eingetragen`,
        null,
        'emerald'
      );
    }, 150);
  }, []);

  // Sobald Auth bereit ist, eventuell per URL übergebenes Gewicht ebenfalls in Cloud sichern
  useEffect(() => {
    if (!user || !selectedDateWeight) return;
    syncWeightToCloud(selectedDate, selectedDateWeight);
  }, [user]);

  // Persistenz in localStorage
  useEffect(() => {
    gdriveDataRef.current = appData;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    } catch (err) {
      console.error('Fehler beim Speichern in localStorage:', err);
    }
  }, [appData]);

  // Google Drive Konfiguration lokal merken
  useEffect(() => {
    try {
      localStorage.setItem(
        GDRIVE_CONFIG_KEY,
        JSON.stringify({
          clientId: gdriveClientId.trim(),
          autoSync: gdriveAutoSync,
          lastSync: gdriveLastSync,
        })
      );
    } catch {
      // Ignorieren falls Speicher voll
    }
  }, [gdriveClientId, gdriveAutoSync, gdriveLastSync]);

  // Google Identity Services Script dynamisch laden
  const ensureGoogleIdentityScript = () => {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
        resolve(window.google);
        return;
      }
      const existing = document.getElementById('google-gis-script');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.google));
        existing.addEventListener('error', () =>
          reject(new Error('Google Login-Skript konnte nicht geladen werden.'))
        );
        return;
      }
      const script = document.createElement('script');
      script.id = 'google-gis-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () =>
        reject(new Error('Google Login-Skript konnte nicht geladen werden (Offline?).'));
      document.head.appendChild(script);
    });
  };

  // Hilfsfunktion: Backup-Datei im versteckten Google Drive appDataFolder suchen
  const findGoogleDriveBackupFile = async (token) => {
    const queryStr = encodeURIComponent(
      `name='${GDRIVE_BACKUP_FILENAME}' and 'appDataFolder' in parents and trashed=false`
    );
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${queryStr}&fields=files(id,name,modifiedTime)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) {
      throw new Error(`Google Drive Anfrage fehlgeschlagen (${res.status})`);
    }
    const json = await res.json();
    return Array.isArray(json.files) && json.files.length > 0 ? json.files[0] : null;
  };

  // Daten nach Google Drive hochladen (Create oder Update in appDataFolder)
  const pushDataToGoogleDrive = async (token, dataToUpload = gdriveDataRef.current, silent = false) => {
    if (!token) return;
    setGdriveStatus('syncing');
    setGdriveError(null);

    try {
      let fileId = gdriveFileIdRef.current;
      if (!fileId) {
        const existing = await findGoogleDriveBackupFile(token);
        if (existing) {
          fileId = existing.id;
          gdriveFileIdRef.current = existing.id;
        }
      }

      const payloadObj = {
        updatedAt: new Date().toISOString(),
        version: 1,
        data: dataToUpload,
      };
      const jsonBody = JSON.stringify(payloadObj);

      if (fileId) {
        // Bestehende Datei per Media-Upload aktualisieren
        const patchRes = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(
            fileId
          )}?uploadType=media`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: jsonBody,
          }
        );
        if (!patchRes.ok) {
          throw new Error(`Upload fehlgeschlagen (${patchRes.status})`);
        }
      } else {
        // Neue Datei im versteckten appDataFolder anlegen (Multipart)
        const boundary = '-------health_habit_boundary_314159';
        const metadata = {
          name: GDRIVE_BACKUP_FILENAME,
          parents: ['appDataFolder'],
          mimeType: 'application/json',
        };
        const multipartBody =
          `--${boundary}\r\n` +
          `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
          `${JSON.stringify(metadata)}\r\n` +
          `--${boundary}\r\n` +
          `Content-Type: application/json\r\n\r\n` +
          `${jsonBody}\r\n` +
          `--${boundary}--`;

        const createRes = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body: multipartBody,
          }
        );
        if (!createRes.ok) {
          throw new Error(`Erstellen fehlgeschlagen (${createRes.status})`);
        }
        const created = await createRes.json();
        gdriveFileIdRef.current = created.id || null;
      }

      const nowIso = new Date().toISOString();
      setGdriveLastSync(nowIso);
      setGdriveStatus('synced');
      if (!silent) {
        showToast('Daten in Google Drive gespeichert', null, 'emerald');
      }
    } catch (err) {
      console.error('Google Drive Upload Fehler:', err);
      setGdriveStatus('error');
      setGdriveError(err.message || 'Google Drive Sync fehlgeschlagen.');
    }
  };

  // Daten aus Google Drive abrufen & zusammenführen
  const pullDataFromGoogleDrive = async (token, uploadIfMissing = true) => {
    if (!token) return;
    setGdriveStatus('syncing');
    setGdriveError(null);

    try {
      const fileMeta = await findGoogleDriveBackupFile(token);
      if (!fileMeta) {
        if (uploadIfMissing) {
          await pushDataToGoogleDrive(token, gdriveDataRef.current, true);
          showToast('Google Drive verbunden – Initiales Backup hochgeladen', null, 'emerald');
        } else {
          setGdriveStatus('synced');
        }
        return;
      }

      gdriveFileIdRef.current = fileMeta.id;
      const dlRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileMeta.id)}?alt=media`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!dlRes.ok) {
        throw new Error(`Download fehlgeschlagen (${dlRes.status})`);
      }
      const remotePayload = await dlRes.json();
      const remoteData = remotePayload?.data ? remotePayload.data : remotePayload;

      if (remoteData && typeof remoteData === 'object') {
        gdriveSkipNextUploadRef.current = true;
        setAppData((prev) => ({
          targets: { ...DEFAULT_TARGETS, ...(remoteData.targets || prev.targets) },
          favorites: Array.isArray(remoteData.favorites)
            ? remoteData.favorites
            : prev.favorites,
          savedMeals: Array.isArray(remoteData.savedMeals)
            ? remoteData.savedMeals
            : prev.savedMeals,
          habits: Array.isArray(remoteData.habits) ? remoteData.habits : prev.habits,
          logsByDate: {
            ...(prev.logsByDate || {}),
            ...(remoteData.logsByDate && typeof remoteData.logsByDate === 'object'
              ? remoteData.logsByDate
              : {}),
          },
          habitChecksByDate: {
            ...(prev.habitChecksByDate || {}),
            ...(remoteData.habitChecksByDate &&
            typeof remoteData.habitChecksByDate === 'object'
              ? remoteData.habitChecksByDate
              : {}),
          },
          weightsByDate: {
            ...(prev.weightsByDate || {}),
            ...(remoteData.weightsByDate && typeof remoteData.weightsByDate === 'object'
              ? remoteData.weightsByDate
              : {}),
          },
        }));
      }

      const nowIso = new Date().toISOString();
      setGdriveLastSync(nowIso);
      setGdriveStatus('synced');
      showToast('Google Drive synchronisiert!', null, 'emerald');
    } catch (err) {
      console.error('Google Drive Download Fehler:', err);
      setGdriveStatus('error');
      setGdriveError(err.message || 'Fehler beim Laden aus Google Drive.');
    }
  };

  // Mit Google Drive verbinden (OAuth2 Popup)
  const handleConnectGoogleDrive = async () => {
    const trimmedClientId = gdriveClientId.trim();
    if (!trimmedClientId) {
      setGdriveError('Bitte trage zuerst deine Google OAuth Client-ID ein.');
      return;
    }

    setGdriveError(null);
    setGdriveStatus('syncing');

    try {
      const google = await ensureGoogleIdentityScript();
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: trimmedClientId,
        scope: GDRIVE_SCOPE,
        callback: async (tokenResponse) => {
          if (tokenResponse.error || !tokenResponse.access_token) {
            setGdriveStatus('error');
            setGdriveError(
              tokenResponse.error_description || 'Anmeldung bei Google abgebrochen.'
            );
            return;
          }
          setGdriveAccessToken(tokenResponse.access_token);
          await pullDataFromGoogleDrive(tokenResponse.access_token, true);
        },
      });
      gdriveTokenClientRef.current = tokenClient;
      tokenClient.requestAccessToken({ prompt: '' });
    } catch (err) {
      setGdriveStatus('error');
      setGdriveError(err.message || 'Google Login konnte nicht gestartet werden.');
    }
  };

  const handleDisconnectGoogleDrive = () => {
    if (gdriveAccessToken && window.google?.accounts?.oauth2) {
      try {
        window.google.accounts.oauth2.revoke(gdriveAccessToken, () => {});
      } catch {
        // Ignorieren
      }
    }
    setGdriveAccessToken(null);
    gdriveFileIdRef.current = null;
    setGdriveStatus('disconnected');
    setGdriveError(null);
    showToast('Google Drive Verbindung getrennt', null, 'amber');
  };

  // Automatischer Hintergrund-Upload nach jeder Änderung (2,5 Sek. Debounce)
  useEffect(() => {
    if (!gdriveAccessToken || !gdriveAutoSync) return;
    if (gdriveSkipNextUploadRef.current) {
      gdriveSkipNextUploadRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      pushDataToGoogleDrive(gdriveAccessToken, appData, true);
    }, 2500);

    return () => clearTimeout(timer);
  }, [appData, gdriveAccessToken, gdriveAutoSync]);

  // Synchronisiere Einstellungs-Formular beim Öffnen
  useEffect(() => {
    if (isSettingsOpen) {
      setTargetForm(appData.targets);
      setConfirmReset(false);
      setImportFeedback(null);
    }
  }, [isSettingsOpen, appData.targets]);

  // ==========================================================================
  // LIVE-SUCHE: OPEN FOOD FACTS (SEARCH-A-LICIOUS + EAN-BARCODE + FALLBACK)
  // ==========================================================================

  const isBarcodeQuery = useMemo(() => /^\d{8,14}$/.test(searchQuery.trim()), [searchQuery]);

  useEffect(() => {
    const trimmed = searchQuery.trim();

    if (trimmed.length < 2) {
      setOffResults([]);
      setIsSearchingOff(false);
      setOffError(null);
      return;
    }

    const controller = new AbortController();
    const delayMs = /^\d{8,14}$/.test(trimmed) ? 200 : 450;
    const fieldsParam =
      'code,product_name,product_name_de,brands,nutriments,serving_size,serving_quantity,nutrition_grades,nutriscore_grade';

    const timer = setTimeout(async () => {
      setIsSearchingOff(true);
      setOffError(null);

      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        if (/^\d{8,14}$/.test(trimmed)) {
          const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
            trimmed
          )}.json?fields=${fieldsParam}`;

          const res = await fetch(url, { signal: controller.signal });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();

          if (data.status === 1 && data.product) {
            const parsed = parseOpenFoodFactsProduct(data.product);
            setOffResults(parsed ? [parsed] : []);
            if (!parsed) {
              setOffError('Barcode gefunden, aber keine Nährwerte hinterlegt.');
            }
          } else {
            setOffResults([]);
            setOffError(`Kein Produkt für Barcode ${trimmed} gefunden.`);
          }
        } else {
          const safeQuery = escapeLuceneSearchQuery(trimmed) || trimmed;
          let parsedList = [];

          try {
            // Primär: Schnelle Elasticsearch-API (Search-a-licious)
            const salUrl = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(
              safeQuery
            )}&page_size=20&fields=${fieldsParam}`;

            const res = await fetch(salUrl, { signal: controller.signal });
            if (!res.ok) throw new Error(`Search-a-licious HTTP ${res.status}`);
            const data = await res.json();

            const rawHits = Array.isArray(data.hits)
              ? data.hits
              : Array.isArray(data.products)
              ? data.products
              : [];

            parsedList = rawHits.map(parseOpenFoodFactsProduct).filter(Boolean);

            // Falls Hits ohne eingebettete Nutriments geliefert wurden, per Batch-Code nachladen
            if (rawHits.length > 0 && parsedList.length === 0) {
              const codes = rawHits
                .map((h) => h.code)
                .filter(Boolean)
                .slice(0, 15);
              if (codes.length > 0) {
                const hydrateUrl = `https://world.openfoodfacts.org/api/v2/search?code=${encodeURIComponent(
                  codes.join(',')
                )}&fields=${fieldsParam}`;
                const hydrateRes = await fetch(hydrateUrl, { signal: controller.signal });
                if (hydrateRes.ok) {
                  const hydrateData = await hydrateRes.json();
                  const hydratedProducts = Array.isArray(hydrateData.products)
                    ? hydrateData.products
                    : [];
                  parsedList = hydratedProducts
                    .map(parseOpenFoodFactsProduct)
                    .filter(Boolean);
                }
              }
            }
          } catch (primaryErr) {
            if (primaryErr.name === 'AbortError') throw primaryErr;
          }

          // Fallback: Deutschsprachige Volltextsuche (cgi/search.pl), falls Search-a-licious 0 Treffer liefert
          if (parsedList.length === 0) {
            const cgiUrl = `https://de.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
              trimmed
            )}&search_simple=1&action=process&json=1&page_size=15&fields=${fieldsParam}`;
            const fallbackRes = await fetch(cgiUrl, { signal: controller.signal });
            if (!fallbackRes.ok) throw new Error(`OFF Search HTTP ${fallbackRes.status}`);
            const fallbackData = await fallbackRes.json();

            const products = Array.isArray(fallbackData.products) ? fallbackData.products : [];
            parsedList = products.map(parseOpenFoodFactsProduct).filter(Boolean);
          }

          // Relevanz-Sortierung: Deutsche Produktnamen & direkte Worttreffer zuerst
          const queryLower = trimmed.toLowerCase();
          parsedList.sort((a, b) => {
            const aMatch = a.name.toLowerCase().includes(queryLower) ? 0 : 1;
            const bMatch = b.name.toLowerCase().includes(queryLower) ? 0 : 1;
            if (aMatch !== bMatch) return aMatch - bMatch;
            const aDe = a.hasGermanName ? 0 : 1;
            const bDe = b.hasGermanName ? 0 : 1;
            return aDe - bDe;
          });

          setOffResults(parsedList.slice(0, 15));
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        setOffError('Open Food Facts momentan nicht erreichbar – Basis-DB bleibt aktiv.');
      } finally {
        clearTimeout(timeoutId);
        if (!controller.signal.aborted) {
          setIsSearchingOff(false);
        }
      }
    }, delayMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
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

  const handleBarcodeDetected = (code) => {
    autoSelectBarcodeRef.current = true;
    setIsScannerOpen(false);
    setSourceFilter('all');
    setSearchQuery(code);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(60);
    }
    showToast(`Barcode erkannt: ${code}`, null, 'emerald');
  };

  // Gefilterte Suchergebnisse gemäß Filter-Pill ('all' | 'basis' | 'off')
  const filteredSearchResults = useMemo(() => {
    if (sourceFilter === 'basis') return localBasisResults;
    if (sourceFilter === 'off') return offResults;
    return [...localBasisResults, ...offResults];
  }, [sourceFilter, localBasisResults, offResults]);

  const quickPickFoods = useMemo(() => {
    return QUICK_PICK_IDS.map((id) => GERMAN_BASIS_FOODS.find((f) => f.id === id)).filter(Boolean);
  }, []);

  // Live-Berechnung im Grammatur-Rechner
  const calculatedFoodMacros = useMemo(() => {
    if (!selectedFood) return null;
    const grams = Math.max(0, parseFloat(gramsInput) || 0);
    const factor = grams / 100;
    return {
      grams,
      calories: Math.round(selectedFood.calories * factor),
      protein: Math.round(selectedFood.protein * factor * 10) / 10,
      carbs: Math.round(selectedFood.carbs * factor * 10) / 10,
      fat: Math.round(selectedFood.fat * factor * 10) / 10,
    };
  }, [selectedFood, gramsInput]);

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
    return appData.habits.filter((h) => Boolean(dayHabitChecks[h.id])).length;
  }, [appData.habits, dayHabitChecks]);

  // Auto-berechnete Kalorien für die manuelle Schnelleingabe
  const autoCalculatedCalories = useMemo(() => {
    const p = parseFloat(proteinInput) || 0;
    const c = parseFloat(carbsInput) || 0;
    const f = parseFloat(fatInput) || 0;
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
      const doneHabits = appData.habits.filter((h) => Boolean(checks[h.id])).length;
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
    syncWeightToCloud(selectedDate, parsed);
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

  // openScale CSV-Datei importieren
  const handleImportOpenScaleCsv = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      const entries = parseOpenScaleCsv(text);

      if (entries.length === 0) {
        showToast(
          'Keine gültigen openScale-Gewichtsdaten in der CSV gefunden',
          null,
          'amber'
        );
        return;
      }

      const snapshot = appData;
      setAppData((prev) => {
        const merged = { ...(prev.weightsByDate || {}) };
        for (const item of entries) {
          merged[item.dateKey] = item.weight;
        }
        return {
          ...prev,
          weightsByDate: merged,
        };
      });

      // Importierte Einträge auch in Cloud-Bridge sichern
      entries.forEach((item) => {
        syncWeightToCloud(item.dateKey, item.weight);
      });

      const newest = entries.sort((a, b) => a.dateKey.localeCompare(b.dateKey))[
        entries.length - 1
      ];
      if (newest) {
        setSelectedDate(newest.dateKey);
      }

      setIsOpenScaleModalOpen(false);
      showToast(
        `openScale Import: ${entries.length} ${
          entries.length === 1 ? 'Messwert' : 'Messwerte'
        } übernommen`,
        snapshot,
        'emerald'
      );
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // openScale Sync-URL generieren & kopieren
  const openScaleWebhookUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return 'https://deine-app.url/?openscale_weight={weight}&openscale_date={date}';
    }
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}?openscale_weight={weight}&openscale_date={date}`;
  }, []);

  const handleCopyOpenScaleUrl = async () => {
    try {
      await navigator.clipboard.writeText(openScaleWebhookUrl);
      setOpenScaleCopied(true);
      setTimeout(() => setOpenScaleCopied(false), 2500);
      showToast('openScale Sync-Link in Zwischenablage kopiert', null, 'emerald');
    } catch {
      showToast('Link konnte nicht automatisch kopiert werden', null, 'amber');
    }
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
    setGramsInput('100');
    setSaveFoodAsFav(false);
  };

  const handleLogCalculatedFood = () => {
    if (!selectedFood || !calculatedFoodMacros || calculatedFoodMacros.grams <= 0) return;

    const gramsRounded = Math.round(calculatedFoodMacros.grams);
    const label = `${gramsRounded}g ${selectedFood.name}`;

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
    const p = parseFloat(proteinInput) || 0;
    const c = parseFloat(carbsInput) || 0;
    const f = parseFloat(fatInput) || 0;
    const explicitKcal = caloriesInput.trim() !== '' ? parseFloat(caloriesInput) : null;
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
    showToast('Eintrag gelöscht', snapshot, 'amber');
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
    };
    setAppData((prev) => ({
      ...prev,
      habits: [...prev.habits, newHabit],
    }));
    setNewHabitTitle('');
    showToast(`Habit hinzugefügt: ${newHabit.title}`, null, 'emerald');
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

    setAppData((prev) => ({
      ...prev,
      targets: {
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
        });

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
    };
    setAppData(fresh);
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
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200 pb-24">
      {/* Subtiler Emerald-Ambient-Glow oben (Beautiful UI Layer) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] z-0 overflow-hidden"
      >
        <div className="mx-auto max-w-5xl h-full bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(16,185,129,0.12),transparent_75%)]" />
      </div>

      {/* ==================================================================== */}
      {/* KOMPAKTER STICKY HEADER & DATUMS-NAVIGATION                          */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/80">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* App-Branding */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-[0_0_20px_-4px_rgba(16,185,129,0.35)]">
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
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
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-zinc-900/90 border border-zinc-800 rounded-xl p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setSelectedDate((d) => addDays(d, -1))}
                aria-label="Vorheriger Tag"
                className="p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 active:scale-95 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="relative flex items-center group rounded-lg hover:bg-zinc-800/80 transition">
                <div
                  aria-hidden="true"
                  className="px-2.5 sm:px-3 py-1 flex items-center gap-2 text-left pointer-events-none"
                >
                  <div className="text-center min-w-[98px] sm:min-w-[126px]">
                    <div className="text-xs sm:text-sm font-semibold text-zinc-100 leading-tight">
                      {dateHeader.badge}
                    </div>
                    <div className="text-[11px] text-zinc-400 leading-tight">
                      {dateHeader.sub}
                    </div>
                  </div>
                  <Calendar className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition shrink-0" />
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
                className="p-1.5 sm:p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 active:scale-95 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {selectedDate !== todayKey && (
              <Button
                variant="outline"
                size="xs"
                onClick={() => setSelectedDate(todayKey)}
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
              >
                Heute
              </Button>
            )}
          </div>

          {/* Rechte Header-Aktionen: Google Drive Status, Gestern übernehmen & Ziele & Backup */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Kompaktes Google Drive Sync Badge / Schnell-Trigger */}
            <button
              type="button"
              onClick={() => {
                if (gdriveAccessToken) {
                  pullDataFromGoogleDrive(gdriveAccessToken, true);
                } else {
                  setSettingsTab('gdrive');
                  setIsSettingsOpen(true);
                }
              }}
              title={
                gdriveAccessToken
                  ? 'Mit Google Drive verbunden – Klicken zum sofortigen Abgleich'
                  : 'Google Drive Sync einrichten'
              }
              className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-xl border text-xs font-medium transition ${
                gdriveAccessToken
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                  : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700'
              }`}
            >
              {gdriveStatus === 'syncing' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <Cloud
                  className={`w-3.5 h-3.5 ${
                    gdriveAccessToken ? 'text-emerald-400' : 'text-zinc-500'
                  }`}
                />
              )}
              <span className="hidden lg:inline">
                {gdriveStatus === 'syncing'
                  ? 'Sync...'
                  : gdriveAccessToken
                  ? 'Drive aktiv'
                  : 'Drive Sync'}
              </span>
            </button>

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
            >
              <Settings className="w-3.5 h-3.5 text-zinc-300" />
              <span className="hidden sm:inline">Ziele & Backup</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* HAUPTBEREICH (BENTO-DASHBOARD, LOGGING & HABIT TRACKER)              */}
      {/* ==================================================================== */}
      <main className="relative z-10 max-w-6xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 space-y-5">
        {/* Obere Navigationsleiste: Hauptansicht & 1-Klick Schnell-Waage */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <SegmentedTabs
            value={activeView}
            onValueChange={setActiveView}
            className="w-full sm:w-auto"
            items={[
              {
                value: 'daily',
                label: 'Kalorien & Habits',
                icon: Utensils,
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

          {/* Kompakte 1-Klick Schnell-Waage für den ausgewählten Tag */}
          <form
            onSubmit={handleSaveWeight}
            className="flex items-center justify-between sm:justify-end gap-1.5 bg-zinc-900/80 border border-zinc-800/90 rounded-xl px-2.5 py-1.5"
          >
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Scale className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="font-medium text-zinc-300">Gewicht ({dateHeader.badge}):</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleStepWeight(-0.1)}
                aria-label="Gewicht um 0,1 kg verringern"
                className="w-6 h-6 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 flex items-center justify-center text-xs font-bold transition"
              >
                -
              </button>
              <div className="relative w-20">
                <input
                  type="text"
                  inputMode="decimal"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder={
                    latestWeightEntry ? formatWeightDE(latestWeightEntry.weight) : '80,0'
                  }
                  className="w-full pl-2 pr-6 py-1 text-xs font-bold tabular-nums text-right bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-sky-500"
                />
                <span className="text-[10px] text-zinc-500 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  kg
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleStepWeight(0.1)}
                aria-label="Gewicht um 0,1 kg erhöhen"
                className="w-6 h-6 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 flex items-center justify-center text-xs font-bold transition"
              >
                +
              </button>
              <Button type="submit" variant="secondary" size="xs" className="ml-0.5">
                <Check className="w-3 h-3 text-sky-400" />
                <span className="hidden sm:inline">OK</span>
              </Button>
            </div>
          </form>
        </div>

        {/* ================================================================== */}
        {/* ANSICHT A: KALORIEN, MAKROS & HABITS                               */}
        {/* ================================================================== */}
        {activeView === 'daily' && (
          <>
            {/* Mobile Schnellaktionen & Sektionsfilter */}
            <div className="flex md:hidden items-center justify-between gap-2">
              <SegmentedTabs
                value={mobileSection}
                onValueChange={setMobileSection}
                className="flex-1"
                items={[
                  { value: 'all', label: 'Alles' },
                  { value: 'food', label: 'Mahlzeiten', badge: dayLogs.length },
                  {
                    value: 'habits',
                    label: 'Habits',
                    badge: `${completedHabitsCount}/${appData.habits.length}`,
                  },
                ]}
              />

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyYesterday}
                disabled={yesterdayLogs.length === 0}
                title="Gestern übernehmen"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gestern</span>
              </Button>
            </div>

            {/* ============================================================== */}
            {/* BENTO-DASHBOARD: KALORIEN-GAUGE & MAKRO-BALKEN                 */}
            {/* ============================================================== */}
            <section
              aria-label="Tagesübersicht Kalorien und Makros"
              className="grid grid-cols-1 lg:grid-cols-12 gap-4"
            >
              {/* Links: Kalorien Radial-Gauge (5 Spalten) */}
              <SpotlightCard
                spotlightColor={
                  calOver ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.1)'
                }
                className="lg:col-span-5 p-4 sm:p-5 flex items-center justify-between gap-4"
              >
                <div className="space-y-2.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Kalorien-Budget
                    </span>
                    <Badge variant={calStatusBadge.variant}>{calStatusBadge.label}</Badge>
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-50 tabular-nums">
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
                <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
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
                      className={`text-lg font-bold tabular-nums leading-none ${
                        calOver ? 'text-rose-400' : 'text-zinc-100'
                      }`}
                    >
                      {calPctRaw}%
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-1">erreicht</span>
                  </div>
                </div>
              </SpotlightCard>

              {/* Rechts: Makro-Fortschritt (7 Spalten) */}
              <SpotlightCard className="lg:col-span-7 p-4 sm:p-5 flex flex-col justify-between gap-4">
                {/* Hervorgehobener Protein-Balken */}
                <div className="p-3 rounded-xl bg-zinc-950/75 border border-emerald-500/20 space-y-2">
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

                {/* Kohlenhydrate & Fette nebeneinander */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Kohlenhydrate */}
                  <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <span className="font-semibold text-amber-400">Kohlenhydrate</span>
                      <span className="tabular-nums text-zinc-300">
                        <strong>{Math.round(totals.carbs * 10) / 10}g</strong>
                        <span className="text-zinc-500"> / {appData.targets.carbs}g</span>
                      </span>
                    </div>
                    <ProgressBar value={carbsPct} color="amber" height="sm" />
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 tabular-nums">
                      <span>{carbsPctRaw}%</span>
                      <span>
                        {carbsRemaining >= 0
                          ? `noch ${Math.round(carbsRemaining)}g`
                          : `+${Math.round(Math.abs(carbsRemaining))}g drüber`}
                      </span>
                    </div>
                  </div>

                  {/* Fette */}
                  <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2">
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <span className="font-semibold text-sky-400">Fette</span>
                      <span className="tabular-nums text-zinc-300">
                        <strong>{Math.round(totals.fat * 10) / 10}g</strong>
                        <span className="text-zinc-500"> / {appData.targets.fat}g</span>
                      </span>
                    </div>
                    <ProgressBar value={fatPct} color="sky" height="sm" />
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 tabular-nums">
                      <span>{fatPctRaw}%</span>
                      <span>
                        {fatRemaining >= 0
                          ? `noch ${Math.round(fatRemaining)}g`
                          : `+${Math.round(Math.abs(fatRemaining))}g drüber`}
                      </span>
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </section>

            {/* ============================================================== */}
            {/* HAUPT-ARBEITSBEREICH: ERFASSUNG & PROTOKOLL (7) | HABITS (5)   */}
            {/* ============================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* LINKE SPALTE: MAHLZEITENERFASSUNG & TAGESPROTOKOLL (7 Spalten) */}
              <div
                className={`lg:col-span-7 space-y-5 ${
                  mobileSection === 'habits' ? 'hidden md:block' : 'block'
                }`}
              >
                {/* Erfassungs-Karte */}
                <SpotlightCard className="p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <SegmentedTabs
                      value={entryTab}
                      onValueChange={setEntryTab}
                      className="w-full sm:w-auto"
                      items={[
                        {
                          value: 'search',
                          label: 'Lebensmittel-DB',
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

                      {/* Quellen-Filter & Baukasten-Trigger */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          {[
                            { id: 'all', label: 'Alle Quellen' },
                            {
                              id: 'basis',
                              label: `Basis-DB${
                                searchQuery.trim() ? ` (${localBasisResults.length})` : ''
                              }`,
                            },
                            {
                              id: 'off',
                              label: `Open Food Facts${
                                searchQuery.trim() ? ` (${offResults.length})` : ''
                              }`,
                            },
                          ].map((pill) => (
                            <button
                              key={pill.id}
                              type="button"
                              onClick={() => setSourceFilter(pill.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                                sourceFilter === pill.id
                                  ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                                  : 'bg-zinc-950/60 text-zinc-400 border-zinc-800/80 hover:text-zinc-200'
                              }`}
                            >
                              {pill.label}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsBuilderOpen((v) => !v)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                            mealBuilderItems.length > 0 || isBuilderOpen
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-zinc-950/60 text-zinc-400 border-zinc-800/80 hover:text-zinc-200'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Mahlzeiten Baukasten</span>
                          {mealBuilderItems.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-zinc-950 text-[10px] font-bold tabular-nums">
                              {mealBuilderItems.length}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Interaktiver Grammatur-Rechner */}
                      {selectedFood && calculatedFoodMacros && (
                        <div className="p-4 rounded-2xl bg-zinc-950/95 border border-emerald-500/35 space-y-3.5 shadow-lg">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-bold text-zinc-100">
                                  {selectedFood.name}
                                </span>
                                <Badge
                                  variant={
                                    selectedFood.source === 'basis' ? 'emerald' : 'sky'
                                  }
                                >
                                  {selectedFood.brand ||
                                    (selectedFood.source === 'basis'
                                      ? 'Basis-DB'
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
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedFood(null)}
                              aria-label="Rechner schließen"
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Mengen-Presets & Grammatur-Eingabe */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {selectedFood.servingQuantity && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setGramsInput(String(selectedFood.servingQuantity))
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                                    Number(gramsInput) === selectedFood.servingQuantity
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
                                  className={`px-2 py-1 rounded-lg text-[11px] font-medium tabular-nums border transition ${
                                    Number(gramsInput) === g
                                      ? 'bg-zinc-200 text-zinc-950 border-zinc-200 font-bold'
                                      : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                                  }`}
                                >
                                  {g}g
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="relative w-32">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={gramsInput}
                                  onChange={(e) => setGramsInput(e.target.value)}
                                  className="w-full pl-3 pr-8 py-2 text-sm font-bold tabular-nums bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:border-emerald-500"
                                />
                                <span className="text-xs text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2">
                                  g
                                </span>
                              </div>

                              {/* Live-Ergebnis */}
                              <div className="flex-1 grid grid-cols-4 gap-1.5 text-center bg-zinc-900/90 border border-zinc-800 rounded-xl py-1.5 px-2 tabular-nums">
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
                                size="sm"
                                onClick={() => handleAddFoodToBuilder()}
                              >
                                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                                <span>In Baukasten</span>
                              </Button>

                              <Button
                                variant="primary"
                                size="sm"
                                onClick={handleLogCalculatedFood}
                                disabled={calculatedFoodMacros.grams <= 0}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Loggen</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Suchergebnisse oder Quick-Picks */}
                      {!searchQuery.trim() ? (
                        <div className="space-y-2">
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                            Häufige Grundnahrungsmittel (1-Klick Rechner)
                          </div>
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
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {isSearchingOff && (
                            <div className="flex items-center gap-2 text-xs text-zinc-400 py-1">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                              <span>Durchsuche Open Food Facts Datenbank...</span>
                            </div>
                          )}

                          {offError && (
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>{offError}</span>
                            </div>
                          )}

                          {filteredSearchResults.length > 0 ? (
                            <div className="max-h-72 overflow-y-auto pr-1 space-y-1.5">
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
                                          food.source === 'basis' ? 'emerald' : 'sky'
                                        }
                                      >
                                        {food.brand ||
                                          (food.source === 'basis' ? 'Basis-DB' : 'OFF')}
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
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                          Bezeichnung (optional)
                        </label>
                        <input
                          type="text"
                          value={mealName}
                          onChange={(e) => setMealName(e.target.value)}
                          placeholder="z. B. Kantine Hähnchen-Curry"
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-medium text-emerald-400 mb-1">
                            Protein (g)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={proteinInput}
                            onChange={(e) => setProteinInput(e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2 text-xs font-bold tabular-nums bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-amber-400 mb-1">
                            Kohlenhydrate (g)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={carbsInput}
                            onChange={(e) => setCarbsInput(e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2 text-xs font-bold tabular-nums bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-sky-400 mb-1">
                            Fett (g)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={fatInput}
                            onChange={(e) => setFatInput(e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2 text-xs font-bold tabular-nums bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                            Kalorien (Auto)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={caloriesInput}
                            onChange={(e) => setCaloriesInput(e.target.value)}
                            placeholder={String(autoCalculatedCalories)}
                            className="w-full px-3 py-2 text-xs font-bold tabular-nums bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
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
                </SpotlightCard>

                {/* Tagesprotokoll Liste */}
                <SpotlightCard className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Utensils className="w-4 h-4 text-emerald-400" />
                      <h2 className="text-sm font-bold text-zinc-100">
                        Tagesprotokoll ({dateHeader.badge})
                      </h2>
                      <Badge variant="secondary">{dayLogs.length}</Badge>
                    </div>
                  </div>

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
                      {dayLogs.map((item) => (
                        <div
                          key={item.id}
                          className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2 group"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-medium text-zinc-100 truncate">
                                {item.name}
                              </span>
                              {item.time && (
                                <span className="text-[10px] text-zinc-500 tabular-nums">
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
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handlePromoteMealToFavorite(item)}
                              title="Als Favorit speichern"
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 transition"
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateMeal(item)}
                              title="Nochmal loggen"
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMeal(item.id)}
                              title="Eintrag löschen"
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

              {/* RECHTE SPALTE: HABIT TRACKER & 7-TAGE-RÜCKBLICK (5 Spalten) */}
              <div
                className={`lg:col-span-5 space-y-5 ${
                  mobileSection === 'food' ? 'hidden md:block' : 'block'
                }`}
              >
                {/* Tägliche Habits */}
                <SpotlightCard className="p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                      <h2 className="text-sm font-bold text-zinc-100">Tägliche Habits</h2>
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
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditingHabits((v) => !v)}
                      className="text-xs text-zinc-400 hover:text-zinc-100 flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{editingHabits ? 'Fertig' : 'Anpassen'}</span>
                    </button>
                  </div>

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
                      const streak = getHabitStreak(habit.id);

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
                            <button
                              type="button"
                              onClick={() => toggleHabit(habit.id)}
                              className="flex items-center gap-2.5 flex-1 text-left min-w-0"
                            >
                              <span
                                className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition ${
                                  isDone
                                    ? 'bg-emerald-500 border-emerald-400 text-zinc-950'
                                    : 'bg-zinc-900 border-zinc-700 text-transparent'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[2.75]" />
                              </span>
                              <span
                                className={`text-xs sm:text-sm font-medium truncate transition ${
                                  isDone ? 'text-zinc-100' : 'text-zinc-300'
                                }`}
                              >
                                {habit.title}
                              </span>
                            </button>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {streak > 0 && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold text-amber-300 tabular-nums">
                                  <Flame className="w-3 h-3 text-amber-400" />
                                  {streak}
                                </span>
                              )}

                              {editingHabits && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteHabit(habit.id)}
                                  className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/15"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 7-Tage Mini-Heatmap pro Habit */}
                          <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-1">
                            {last7Days.map((day) => {
                              const checkedOnDay = Boolean(
                                (appData.habitChecksByDate[day.key] || {})[habit.id]
                              );
                              return (
                                <button
                                  key={day.key}
                                  type="button"
                                  onClick={() => toggleHabit(habit.id, day.key)}
                                  title={`${day.weekday}, ${day.dayNum}.`}
                                  className="flex-1 flex flex-col items-center gap-1 group"
                                >
                                  <span className="text-[9px] text-zinc-500 group-hover:text-zinc-300">
                                    {day.weekday}
                                  </span>
                                  <span
                                    className={`w-full h-1.5 rounded-full transition ${
                                      checkedOnDay
                                        ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
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
                    <form onSubmit={handleAddHabit} className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newHabitTitle}
                        onChange={(e) => setNewHabitTitle(e.target.value)}
                        placeholder="Neues Habit (z. B. 20 Min. Lesen)"
                        className="flex-1 px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                      />
                      <Button type="submit" variant="primary" size="sm">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Hinzufügen</span>
                      </Button>
                    </form>
                  )}
                </SpotlightCard>

                {/* 7-Tage-Rückblick (Kalorien & Protein) */}
                <SpotlightCard className="p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <h2 className="text-sm font-bold text-zinc-100">7-Tage-Rückblick</h2>
                    </div>
                    <span className="text-[11px] text-zinc-400 tabular-nums">
                      Ø {formatNumberDE(weeklyStats.avgCalories)} kcal
                    </span>
                  </div>

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
                                <span className="text-[9px] text-zinc-500 tabular-nums opacity-0 group-hover:opacity-100 transition">
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
                                        ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.45)]'
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
              </div>
            </div>
          </>
        )}

        {/* ================================================================== */}
        {/* ANSICHT B: GEWICHTSDATEN & VERLAUFSANALYSE                         */}
        {/* ================================================================== */}
        {activeView === 'weight' && (
          <section aria-label="Gewichtsdaten Analyse" className="space-y-5">
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
                      Tageswerte (Sky) &amp; 7-Tage-Durchschnitt (Emerald)
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
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
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
                  <div className="py-16 px-4 text-center rounded-2xl bg-zinc-950/60 border border-dashed border-zinc-800 space-y-2">
                    <Scale className="w-8 h-8 text-zinc-600 mx-auto" />
                    <p className="text-xs text-zinc-400">
                      Noch keine Gewichtsdaten vorhanden.
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Trage oben rechts dein aktuelles Gewicht ein, um den Trend zu starten.
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
                                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.24" />
                                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
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
                                  stroke="#27272a"
                                  strokeWidth="1"
                                />
                                <text
                                  x={padL - 8}
                                  y={tick.y + 4}
                                  textAnchor="end"
                                  fill="#71717a"
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
                                  stroke="#38bdf8"
                                  strokeOpacity="0.45"
                                  strokeWidth="1.5"
                                  strokeDasharray="5 5"
                                />
                                <text
                                  x={W - padR - 4}
                                  y={goalY - 5}
                                  textAnchor="end"
                                  fill="#38bdf8"
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
                                stroke="#10b981"
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
                                stroke="#38bdf8"
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
                              const isHovered = hoveredWeightKey === d.key;
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
                                      fill="#71717a"
                                      fontSize="10.5"
                                    >
                                      {d.shortDate}
                                    </text>
                                  )}

                                  <circle cx={cx} cy={cy} r="12" fill="transparent" />
                                  <circle
                                    cx={cx}
                                    cy={cy}
                                    r={isHovered ? '5.5' : '3.8'}
                                    fill={isHovered ? '#f8fafc' : '#38bdf8'}
                                    stroke="#09090b"
                                    strokeWidth="1.75"
                                  />

                                  {isHovered && (
                                    <g>
                                      <rect
                                        x={Math.min(W - 138, Math.max(padL, cx - 64))}
                                        y={Math.max(4, cy - 42)}
                                        width="128"
                                        height="32"
                                        rx="8"
                                        fill="#18181b"
                                        stroke="#3f3f46"
                                      />
                                      <text
                                        x={Math.min(W - 74, Math.max(padL + 64, cx))}
                                        y={Math.max(17, cy - 28)}
                                        textAnchor="middle"
                                        fill="#f4f4f5"
                                        fontSize="11"
                                        fontWeight="700"
                                      >
                                        {formatWeightDE(d.weight)} kg (Ø{' '}
                                        {formatWeightDE(d.movingAvg7)})
                                      </text>
                                      <text
                                        x={Math.min(W - 74, Math.max(padL + 64, cx))}
                                        y={Math.max(30, cy - 15)}
                                        textAnchor="middle"
                                        fill="#a1a1aa"
                                        fontSize="9.5"
                                      >
                                        {d.shortDate}
                                      </text>
                                    </g>
                                  )}
                                </g>
                              );
                            })}
                          </svg>
                        </div>

                        {/* Legende */}
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
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
                            Punkt anklicken zum Bearbeiten
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
      {/* MODAL 1: ZIELE, GOOGLE DRIVE SYNC & DATENSICHERUNG                   */}
      {/* ==================================================================== */}
      <ModalDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        title="Ziele, Cloud-Sync &amp; Backup"
        description="Passe deine Tagesziele an, verbinde dein privates Google Drive zum Syncen oder erstelle ein lokales Backup."
      >
        <div className="p-5 space-y-5">
          <SegmentedTabs
            value={settingsTab}
            onValueChange={setSettingsTab}
            className="w-full"
            items={[
              { value: 'targets', label: 'Tagesziele', icon: Target },
              { value: 'gdrive', label: 'Google Drive', icon: Cloud },
              { value: 'backup', label: 'JSON-Backup', icon: Download },
            ]}
          />

          {settingsTab === 'targets' && (
            <form onSubmit={handleSaveTargets} className="space-y-4">
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

          {settingsTab === 'gdrive' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
                    <Cloud className="w-4 h-4 text-emerald-400" />
                    <span>Privater Google Drive Sync (appDataFolder)</span>
                  </div>
                  <Badge variant={gdriveAccessToken ? 'emerald' : 'secondary'}>
                    {gdriveStatus === 'syncing'
                      ? 'Synchronisiert...'
                      : gdriveAccessToken
                      ? 'Verbunden'
                      : 'Nicht verbunden'}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Deine Daten werden als versteckte Datei (
                  <code className="text-zinc-300">{GDRIVE_BACKUP_FILENAME}</code>) in deinem eigenen Google Drive gespeichert. Nur diese App hat Zugriff darauf.
                </p>
                {gdriveLastSync && (
                  <div className="text-[11px] text-zinc-500 pt-0.5 tabular-nums">
                    Letzter Sync:{' '}
                    {new Date(gdriveLastSync).toLocaleString('de-DE', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Deine Google OAuth Client-ID
                </label>
                <input
                  type="text"
                  value={gdriveClientId}
                  onChange={(e) => setGdriveClientId(e.target.value)}
                  placeholder="1234567890-abc...apps.googleusercontent.com"
                  className="w-full px-3 py-2 text-xs font-mono bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Erstellbar unter console.cloud.google.com (Drive API aktivieren → OAuth-Client-ID für Webanwendung).
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <SwitchToggle
                  id="gdrive-auto-sync"
                  checked={gdriveAutoSync}
                  onCheckedChange={setGdriveAutoSync}
                  label="Änderungen automatisch in Drive speichern"
                />
              </div>

              {gdriveError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{gdriveError}</span>
                </div>
              )}

              {!gdriveAccessToken ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleConnectGoogleDrive}
                  disabled={gdriveStatus === 'syncing' || !gdriveClientId.trim()}
                  className="w-full"
                >
                  {gdriveStatus === 'syncing' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Cloud className="w-4 h-4" />
                  )}
                  <span>Mit Google Drive verbinden</span>
                </Button>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => pullDataFromGoogleDrive(gdriveAccessToken, false)}
                      disabled={gdriveStatus === 'syncing'}
                    >
                      <Download className="w-3.5 h-3.5 text-sky-400" />
                      <span>Aus Drive laden</span>
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => pushDataToGoogleDrive(gdriveAccessToken, appData, false)}
                      disabled={gdriveStatus === 'syncing'}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Jetzt hochladen</span>
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleDisconnectGoogleDrive}
                    className="w-full text-zinc-400 hover:text-rose-300"
                  >
                    Verbindung trennen
                  </Button>
                </div>
              )}
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
                      Wirklich alles löschen? Dieser Schritt kann nicht rückgängig gemacht werden.
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
      {/* MODAL 2: OPENSCALE SYNC & CSV-IMPORT                                 */}
      {/* ==================================================================== */}
      <ModalDialog
        open={isOpenScaleModalOpen}
        onOpenChange={setIsOpenScaleModalOpen}
        title="openScale Sync & Xiaomi Mi Scale"
        description="Verbinde deine Xiaomi Mi Scale Waage über openScale vollautomatisch oder importiere CSV-Exporte."
      >
        <div className="p-5 space-y-4">
          <SegmentedTabs
            value={syncTab}
            onValueChange={setSyncTab}
            className="w-full"
            items={[
              { value: 'auto', label: 'Android Auto-Sync', icon: Smartphone },
              { value: 'csv', label: 'CSV-Import', icon: FileSpreadsheet },
              { value: 'esp', label: 'Home Assistant / ESP32', icon: Wifi },
            ]}
          />

          {syncTab === 'auto' && (
            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
              <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Automatischer Sync via openScale &amp; MacroDroid / Tasker</span>
              </div>
              <p className="text-zinc-400">
                Die Android-App <strong className="text-zinc-200">openScale</strong> empfängt das Gewicht deiner Xiaomi Mi Scale per Bluetooth. Mit einer Automatisierungs-App wie <strong className="text-zinc-200">MacroDroid</strong> kannst du einrichten, dass bei jeder neuen openScale-Benachrichtigung dein Webhook aufgerufen wird:
              </p>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 font-mono text-[11px] text-emerald-400 break-all select-all">
                {openScaleWebhookUrl}
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleCopyOpenScaleUrl}
                className="w-full"
              >
                <Link2 className="w-4 h-4" />
                <span>{openScaleCopied ? 'Link kopiert!' : 'Sync-Link in Zwischenablage kopieren'}</span>
              </Button>
            </div>
          )}

          {syncTab === 'csv' && (
            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
              <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-sky-400" />
                <span>openScale CSV-Export importieren</span>
              </div>
              <p className="text-zinc-400">
                Exportiere in openScale unter <em className="text-zinc-200">Einstellungen → Export/Import → Export als CSV</em> deine Messwerte und lade die Datei hier hoch:
              </p>

              <input
                ref={openScaleCsvInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleImportOpenScaleCsv}
                className="hidden"
              />

              <Button
                variant="primary"
                size="md"
                onClick={() => openScaleCsvInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="w-4 h-4" />
                <span>openScale CSV-Datei auswählen</span>
              </Button>
            </div>
          )}

          {syncTab === 'esp' && (
            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
              <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-purple-400" />
                <span>Cloud-Bridge &amp; Home Assistant</span>
              </div>
              <p className="text-zinc-400">
                Deine Gewichtsdaten werden über die integrierte Cloud-Bridge synchronisiert. Sobald ein neuer Wert (z.B. über ESP32 mit ESPHome oder Home Assistant) eingeht, ist er sofort in der App verfügbar.
              </p>
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-400">
                Status: {user ? 'Cloud-Bridge aktiv (UID: ' + user.uid.slice(0, 6) + '...)' : 'Anonym verbunden'}
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