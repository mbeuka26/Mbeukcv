import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

/**
 * Config Vite "normale" (npm run dev / npm run build) — inclut le PWA
 * (manifest + service worker). Le PWA n'a pas de sens pour le build
 * "fichier unique" (vite.config.standalone.ts) : un service worker
 * doit être servi depuis une vraie origine HTTP(S), ce qui est
 * incompatible avec l'ouverture en double-clic via file://.
 */
const base = process.env.VITE_BASE || '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'icon-512-maskable.png'],
      manifest: {
        name: 'MbeukCV Pro',
        short_name: 'MbeukCV',
        description:
          "Générateur de CV et lettres de motivation — modes Classique, IA et Analyseur ATS, utilisable hors-ligne.",
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        start_url: base,
        scope: base,
        lang: 'fr',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache-first pour les assets buildés (JS/CSS/police) : l'app
        // reste utilisable hors-ligne après une première visite.
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        runtimeCaching: [
          {
            // Les polices Google sont mises en cache séparément (réseau
            // d'abord, repli cache) — pas critique si absent hors-ligne,
            // le CSS a déjà un repli sans-serif.
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-cache' },
          },
          {
            // Jamais mettre en cache les appels à l'API Anthropic —
            // toujours réseau, jamais de réponse IA périmée resservie.
            urlPattern: /^https:\/\/api\.anthropic\.com\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@contracts': path.resolve(__dirname, './contracts'),
    },
  },
  server: {
    port: 5173,
  },
});
