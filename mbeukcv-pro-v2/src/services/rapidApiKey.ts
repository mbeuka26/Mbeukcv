/**
 * ════════════════════════════════════════════════════════════
 * Ancienne clé RapidAPI. L'interface ne la demande plus.
 * Elle n'est plus écrite. Une valeur encore présente est effacée à la lecture.
 * ════════════════════════════════════════════════════════════
 * Même logique que services/byok.ts (clé Claude), appliquée à une
 * future clé RapidAPI utilisée par le module de recherche d'offres
 * (voir services/jobSearch.ts). Séparé dans son propre fichier plutôt
 * que généralisé en un store multi-clés : chaque BYOK a son propre
 * format de validation et sa propre UI de paramètres, autant garder
 * les modules découplés dès maintenant.
 *
 * ⚠️ Même compromis assumé que pour la clé Claude : localStorage n'est
 * pas un coffre-fort, mais reste raisonnable pour une clé que
 * l'utilisateur choisit lui-même de coller dans son navigateur.
 */

import { safeStorage } from './safeStorage';

const RAPIDAPI_STORAGE_KEY = 'mbeukCV_rapidApiKey';

/** Les clés RapidAPI n'ont pas de format public documenté strict — on
 * se contente d'une longueur minimale raisonnable pour filtrer les
 * saisies manifestement invalides (champ vide, collage partiel, etc.). */
const MIN_KEY_LENGTH = 20;

export function getRapidApiKey(): string | null {
  if (safeStorage.getItem(RAPIDAPI_STORAGE_KEY) !== null) {
    safeStorage.removeItem(RAPIDAPI_STORAGE_KEY);
  }
  return null;
}

export function hasRapidApiKey(): boolean {
  return getRapidApiKey() !== null;
}

export function isValidRapidApiKeyFormat(key: string): boolean {
  return key.trim().length >= MIN_KEY_LENGTH;
}

/** L’interface ne collecte plus cette clé. Toute valeur restante est retirée. */
export function setRapidApiKey(key: string): boolean {
  if (!isValidRapidApiKeyFormat(key)) {
    safeStorage.removeItem(RAPIDAPI_STORAGE_KEY);
    return false;
  }
  safeStorage.removeItem(RAPIDAPI_STORAGE_KEY);
  return false;
}

export function clearRapidApiKey(): void {
  safeStorage.removeItem(RAPIDAPI_STORAGE_KEY);
}

export function maskRapidApiKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}${'•'.repeat(8)}${key.slice(-4)}`;
}
