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
        background_color: '#0B0C0E',
        theme_color: '#0B0C0E',
        // ?v=2: neue Adresse, damit Browser und installierte App (Android/PC) das
        // geänderte Icon neu laden statt des zwischengespeicherten alten
        icons: [
          { src: 'pwa-192x192.png?v=2', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png?v=2', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Icons mit ?v=2 trotzdem aus dem (aktuellen) Offline-Cache bedienen
        ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^v$/],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Google-Anmeldung & Drive-API nie aus dem Cache bedienen
        navigateFallbackDenylist: [/^\/oauth/],
        // Schrift (Anonymous Pro) offline verfügbar halten
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
