/**
 * ════════════════════════════════════════════════════════════
 * Service BYOK — MbeukCV Pro (V2)
 * ════════════════════════════════════════════════════════════
 * Stocke la clé Anthropic sur cet appareil uniquement (localStorage).
 *
 * localStorage n'est pas un coffre-fort : une extension de cette origine
 * pourrait la lire. La copie hors navigateur (dossier, Drive ou fichier
 * exporté) contient cette clé chiffrée. La lecture quotidienne reste ici
 * pour que la génération ne redemande rien.
 * Le HTML des documents est nettoyé avant l'aperçu
 * et avant l'export PDF, pour qu'un document généré ne lise pas ce
 * stockage. La clé ne part qu'en HTTPS vers api.anthropic.com, depuis
 * ce navigateur. Le mode hub ne l'envoie pas au serveur.
 */

import { safeStorage } from './safeStorage';

const BYOK_STORAGE_KEY = 'mbeukCV_customClaudeKey';

/** Même règle de format que côté backend (functions/src/lib/validation.ts). */
const CLAUDE_KEY_FORMAT = /^sk-ant-[A-Za-z0-9\-_]{20,}$/;

export function getCustomClaudeKey(): string | null {
  const raw = safeStorage.getItem(BYOK_STORAGE_KEY);
  return raw && raw.trim().length > 0 ? raw.trim() : null;
}

export function hasCustomClaudeKey(): boolean {
  return getCustomClaudeKey() !== null;
}

export function isValidClaudeKeyFormat(key: string): boolean {
  return CLAUDE_KEY_FORMAT.test(key.trim());
}

/** Renvoie `true` si la clé a été enregistrée, `false` si le format est invalide. */
export function setCustomClaudeKey(key: string): boolean {
  const trimmed = key.trim();
  if (!isValidClaudeKeyFormat(trimmed)) return false;
  safeStorage.setItem(BYOK_STORAGE_KEY, trimmed);
  return true;
}

export function clearCustomClaudeKey(): void {
  safeStorage.removeItem(BYOK_STORAGE_KEY);
}

/** Masque la clé pour affichage (ex. "sk-ant-••••••••7f3a"). */
export function maskClaudeKey(key: string): string {
  if (key.length <= 10) return '••••••••';
  return `${key.slice(0, 7)}${'•'.repeat(8)}${key.slice(-4)}`;
}
