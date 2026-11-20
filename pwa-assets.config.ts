import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Erzeugt die App-Icons aus public/icon.svg:
//   npx pwa-assets-generator
// Hintergrund Graphite statt Weiß, damit Android (maskable) und iOS keinen hellen Rand zeigen.
const background = '#0B0C0E';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: { background } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background } },
  },
  images: ['public/icon.svg'],
});
