/** @type {import('tailwindcss').Config} */

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

function cssScale(name) {
  return Object.fromEntries(
    SHADES.map((shade) => [shade, `rgb(var(--c-${name}-${shade}) / <alpha-value>)`])
  );
}

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        zinc: cssScale('zinc'),
        emerald: cssScale('emerald'),
        sky: cssScale('sky'),
        amber: cssScale('amber'),
        rose: cssScale('rose'),
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
    },
  },
  plugins: [],
};
