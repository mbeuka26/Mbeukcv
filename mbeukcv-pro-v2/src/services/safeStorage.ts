/**
 * ════════════════════════════════════════════════════════════
 * safeStorage — accès localStorage qui ne plante JAMAIS
 * ════════════════════════════════════════════════════════════
 * `localStorage` peut lever une `SecurityError` dans plusieurs cas
 * réels (pas juste théoriques) :
 *   - origine "opaque" (ex. fichier ouvert en double-clic, `file://` :
 *     le dossier de récupération n'est pas disponible, seul l'export de
 *     fichier peut sortir les données de cette session)
 *   - navigation privée stricte dans certains navigateurs
 *   - quota de stockage dépassé, cookies tiers désactivés, etc.
 *
 * C'est exactement ce qui provoquait un écran vide/un plantage
 * silencieux de l'app quand le fichier HTML autonome était ouvert en
 * double-clic : plusieurs modules (historique de CV, clés BYOK...)
 * appelaient `localStorage.getItem/setItem` directement, sans repli.
 *
 * Ce module centralise l'accès : toute l'app doit passer par
 * `safeStorage`, jamais par `localStorage` directement. En cas
 * d'indisponibilité, on bascule silencieusement sur un stockage en
 * mémoire (perdu au rechargement, mais l'app reste UTILISABLE au lieu
 * de planter).
 */

export const LOCAL_TOUCHED_KEY = 'mbeukCV_localTouchedAt';

const memoryFallback = new Map<string, string>();
const listeners = new Set<(key: string) => void>();
let warnedOnce = false;

function notify(key: string): void {
  if (key === LOCAL_TOUCHED_KEY) return;
  for (const listener of listeners) listener(key);
}

export function onSafeStorageChange(listener: (key: string) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function warnOnceIfNeeded(err: unknown) {
  if (warnedOnce) return;
  warnedOnce = true;
  console.warn(
    "[safeStorage] localStorage indisponible dans ce contexte (origine opaque / navigation privée / file://) — repli sur un stockage en mémoire, non persistant entre rechargements.",
    err
  );
}

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (err) {
      warnOnceIfNeeded(err);
      return memoryFallback.has(key) ? memoryFallback.get(key)! : null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      warnOnceIfNeeded(err);
      memoryFallback.set(key, value);
    }
    notify(key);
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      warnOnceIfNeeded(err);
    }
    memoryFallback.delete(key);
    notify(key);
  },
};
