import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.png', 'sacred-apple.png', 'sacred-apple-192.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2}'],
      },
      manifest: {
        name: 'Sacred Fruit - Clasificación de Calidad',
        short_name: 'SacredFruit',
        description: 'Control de calidad e inspección de frutas en tiempo real',
        theme_color: '#153020',
        background_color: '#F5EFE0',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'sacred-apple-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'sacred-apple.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    allowedHosts: true
  }
});
