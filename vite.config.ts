import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base './' => funktioniert unter jeder Unteradresse (z. B. GitHub Pages /health-tracker/)
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Health & Habit Tracker',
        short_name: 'Health Tracker',
        description: 'Kalorien, Makros, Habits & Gewicht – synchronisiert über Google Drive.',
        lang: 'de',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#09090b',
        theme_color: '#09090b',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Google-Anmeldung & Drive-API nie aus dem Cache bedienen
        navigateFallbackDenylist: [/^\/oauth/],
      },
    }),
  ],
});
