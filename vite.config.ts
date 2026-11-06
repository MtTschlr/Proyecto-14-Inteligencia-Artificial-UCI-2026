import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const apiProxy = {
  target: process.env.BACKEND_URL || 'http://localhost:8000',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/api/, ''),
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.png', 'sacred-apple.png', 'sacred-apple-192.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}', 'muestras/*.{jpg,json}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api/],
      },
      manifest: {
        name: 'Sacred Fruit - Inspección de frutas',
        short_name: 'SacredFruit',
        description: 'Madurez, daños y vida útil de banana, mango, naranja y tomate a partir de una foto',
        lang: 'es',
        theme_color: '#0c1022',
        background_color: '#eceee4',
        display: 'standalone',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'sacred-apple-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'sacred-apple.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  server: {
    host: true,
    allowedHosts: true,
    proxy: { '/api': apiProxy },
    watch: { ignored: ['**/backend/**', '**/dist/**', '**/.venv/**', '**/*.pt', '**/docs/**'] },
  },
  preview: {
    host: true,
    allowedHosts: true,
    proxy: { '/api': apiProxy },
  },
});
