/**
 * Config Vite "normale" (npm run dev / npm run build) — inclut le PWA
 * (manifest + service worker). Le PWA n'a pas de sens pour le build
 * "fichier unique" (vite.config.standalone.ts) : un service worker
 * doit être servi depuis une vraie origine HTTP(S), ce qui est
 * incompatible avec l'ouverture en double-clic via file://.
 */
declare const _default: import("vite").UserConfig;
export default _default;
