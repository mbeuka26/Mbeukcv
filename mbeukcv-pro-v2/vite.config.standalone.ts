import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { makeOffline } from 'vite-plugin-make-offline';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

/**
 * ════════════════════════════════════════════════════════════
 * Build "fichier unique" — MbeukCV Pro (V2)
 * ════════════════════════════════════════════════════════════
 * Config SÉPARÉE de vite.config.ts (utilisée par `npm run dev` /
 * `npm run build`). Celle-ci produit UN SEUL fichier `dist-standalone/index.html`
 * avec tout le CSS et le JS inlinés, en s'appuyant sur trois plugins :
 *   - `vite-plugin-singlefile` : inline tout le JS/CSS/assets dans le HTML.
 *   - `vite-plugin-make-offline` : retire `type="module"`/`crossorigin`
 *     du script résultant (un `<script>` classique, pas un module ES),
 *     pour une compatibilité maximale avec le protocole `file://`.
 *   - `VitePWA({ disable: true })` : **aucun service worker n'est généré
 *     ici** (un vrai SW ne peut fonctionner que servi depuis une vraie
 *     origine HTTP(S), pas via `file://`) — mais le plugin reste listé
 *     avec `disable: true` uniquement pour que le module virtuel
 *     `virtual:pwa-register/react`, importé par
 *     `components/PwaUpdateNotice.tsx` (partagé avec le build normal),
 *     résolve vers un hook no-op au lieu de faire échouer le build.
 * Combiné à `HashRouter` (voir src/main.tsx) au lieu de `BrowserRouter`
 * — indispensable car l'API History (`pushState`/`replaceState`) que
 * `BrowserRouter` utilise pour les URLs de chemin est bloquée par les
 * navigateurs sous `file://`, ce qui provoquait un écran vide/plantage
 * silencieux à la moindre redirection.
 *
 * Usage : npm run build:standalone
 */
export default defineConfig({
  plugins: [react(), viteSingleFile(), makeOffline(), VitePWA({ disable: true })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@contracts': path.resolve(__dirname, './contracts'),
    },
  },
  build: {
    // Note : vite-plugin-make-offline force la sortie dans `dist/`
    // quel que soit `outDir` ici (limitation du plugin).
    // scripts/stage-standalone.mjs copie ensuite vers dist-standalone/.
    assetsInlineLimit: 100_000_000, // force l'inlining de toutes les images/polices locales
    cssCodeSplit: false,
  },
});
