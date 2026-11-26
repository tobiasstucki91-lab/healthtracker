export type UiVariant = 'obsidian' | 'kinetic' | 'nocturne';

export const UI_STORAGE_KEY = 'hht_ui_variant_v1';

export interface UiChartColors {
  grid: string;
  axisText: string;
  activeText: string;
  weightLine: string;
  weightArea: string;
  avgLine: string;
  goalLine: string;
  goalText: string;
  dotFill: string;
  dotActiveFill: string;
  dotStroke: string;
}

export interface UiThemeMeta {
  id: UiVariant;
  number: '1' | '2' | '3';
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  themeColor: string;
  swatch: {
    bg: string;
    surface: string;
    accent: string;
    secondary: string;
  };
  chart: UiChartColors;
}

export const UI_THEME_META: Record<UiVariant, UiThemeMeta> = {
  obsidian: {
    id: 'obsidian',
    number: '1',
    name: 'Obsidian Glass',
    shortName: 'Obsidian',
    tagline: 'Spatial Dark Glassmorphism',
    description:
      'Tiefes Mitternachts-Navy mit schwebender Glas-Navigation, Leuchtring-Gauge und Mint-Cyan/Indigo-Akzenten.',
    themeColor: '#070A12',
    swatch: {
      bg: '#070A12',
      surface: '#121A2E',
      accent: '#2DD4BF',
      secondary: '#A78BFA',
    },
    chart: {
      grid: '#1E2942',
      axisText: '#8A9BB8',
      activeText: '#F1F5FF',
      weightLine: '#A78BFA',
      weightArea: '#A78BFA',
      avgLine: '#2DD4BF',
      goalLine: '#A78BFA',
      goalText: '#C4B5FD',
      dotFill: '#A78BFA',
      dotActiveFill: '#F8FAFC',
      dotStroke: '#070A12',
    },
  },
  kinetic: {
    id: 'kinetic',
    number: '2',
    name: 'Kinetic Carbon',
    shortName: 'Kinetic',
    tagline: 'Stealth OLED Performance Telemetry',
    description:
      'Kompromissloses OLED-Schwarz mit Kommando-Sidebar, Live-Telemetrie-Balken und Signal-Orange/Eis-Cyan.',
    themeColor: '#050506',
    swatch: {
      bg: '#050506',
      surface: '#111216',
      accent: '#FB923C',
      secondary: '#22D3EE',
    },
    chart: {
      grid: '#23252C',
      axisText: '#8B909A',
      activeText: '#FAFAFA',
      weightLine: '#22D3EE',
      weightArea: '#22D3EE',
      avgLine: '#FB923C',
      goalLine: '#22D3EE',
      goalText: '#67E8F9',
      dotFill: '#22D3EE',
      dotActiveFill: '#FFFFFF',
      dotStroke: '#050506',
    },
  },
  nocturne: {
    id: 'nocturne',
    number: '3',
    name: 'Nocturne Editorial',
    shortName: 'Nocturne',
    tagline: 'Warm Dark Luxury Journal',
    description:
      'Ruhiges Espresso-Charcoal mit Serif-Typografie, 180°-Horizontbogen, Salbeigrün und warmem Champagner-Gold.',
    themeColor: '#11100E',
    swatch: {
      bg: '#11100E',
      surface: '#1E1B17',
      accent: '#7CC49E',
      secondary: '#E2B46D',
    },
    chart: {
      grid: '#2D2923',
      axisText: '#A39A8D',
      activeText: '#FAF6F0',
      weightLine: '#E2B46D',
      weightArea: '#E2B46D',
      avgLine: '#7CC49E',
      goalLine: '#E2B46D',
      goalText: '#ECC98D',
      dotFill: '#E2B46D',
      dotActiveFill: '#FAF6F0',
      dotStroke: '#11100E',
    },
  },
};

export const UI_VARIANTS: UiThemeMeta[] = [
  UI_THEME_META.obsidian,
  UI_THEME_META.kinetic,
  UI_THEME_META.nocturne,
];

export function parseUiVariant(raw: string | null | undefined): UiVariant | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === 'obsidian' || v === '1') return 'obsidian';
  if (v === 'kinetic' || v === '2') return 'kinetic';
  if (v === 'nocturne' || v === '3') return 'nocturne';
  return null;
}

export function resolveInitialUiVariant(): UiVariant {
  if (typeof window !== 'undefined') {
    try {
      const fromQuery = parseUiVariant(new URLSearchParams(window.location.search).get('ui'));
      if (fromQuery) return fromQuery;
    } catch {
      // ignore
    }
    try {
      const fromStorage = parseUiVariant(window.localStorage.getItem(UI_STORAGE_KEY));
      if (fromStorage) return fromStorage;
    } catch {
      // ignore
    }
  }
  return 'obsidian';
}
