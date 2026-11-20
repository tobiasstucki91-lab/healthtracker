/** @type {import('tailwindcss').Config} */

// Design „Graphite & Lime“: Die bestehenden Farbnamen im Code bleiben,
// werden hier aber auf die neue Palette umgelegt.
//   zinc    → Graphite-Grautöne (Hintergrund, Flächen, Ränder, Text)
//   emerald → Lime, der einzige Akzent (Fortschritt, Primär-Buttons)
//   sky     → weiches Blau als zweiter Datenton (Gewicht, Fett)
const graphite = {
  50: '#F7F7F8',
  100: '#EDEEF0',
  200: '#D6D8DC',
  300: '#B4B8C0',
  400: '#8E929B',
  500: '#6E727B',
  600: '#4A4D55',
  700: '#2E3037',
  800: '#22242A',
  900: '#141518',
  950: '#0B0C0E',
};

const lime = {
  50: '#F7FDE8',
  100: '#EEFBCF',
  200: '#DDF7A3',
  300: '#D2F589',
  400: '#C6F36B',
  500: '#B4E655',
  600: '#8DBB2F',
  700: '#6A8F22',
  800: '#4E6A1C',
  900: '#3B5017',
  950: '#1F2B0A',
};

const softBlue = {
  50: '#F1F6FF',
  100: '#E0EBFF',
  200: '#C4D9FF',
  300: '#A6C5FF',
  400: '#8AB4FF',
  500: '#6E9EF5',
  600: '#527FD6',
  700: '#3F63AB',
  800: '#334F86',
  900: '#2B416B',
  950: '#1A2742',
};

// Gedämpfte Signalfarben, passend zu Graphite: amber = Hinweis, rose = Fehler/Überschreitung
const sand = {
  50: '#FCF7EE',
  100: '#F8EBD3',
  200: '#F1D9AE',
  300: '#EAC88C',
  400: '#E3B66E',
  500: '#D49F4E',
  600: '#B07F37',
  700: '#86602A',
  800: '#5E4420',
  900: '#3F2E17',
  950: '#24190C',
};

const coral = {
  50: '#FDF2F1',
  100: '#FADFDC',
  200: '#F5C2BC',
  300: '#F0A49C',
  400: '#EB8A80',
  500: '#DF6E63',
  600: '#C2544A',
  700: '#99413A',
  800: '#6E302B',
  900: '#4A211E',
  950: '#2A1311',
};

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        zinc: graphite,
        emerald: lime,
        sky: softBlue,
        amber: sand,
        rose: coral,
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
