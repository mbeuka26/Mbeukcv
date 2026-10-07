import { safeStorage } from './safeStorage';
import { getSupabaseClient } from './supabase';

/**
 * ════════════════════════════════════════════════════════════
 * Identité "hub central" — PONT TEMPORAIRE, à remplacer
 * ════════════════════════════════════════════════════════════
 * ⚠️ Ce module n'est PAS l'intégration finale avec votre hub central.
 * C'est un pont fonctionnel qui permet de câbler et tester le reste du
 * frontend dès maintenant, sans attendre les détails exacts de votre
 * SDK/API hub. Il utilise l'Auth anonyme Supabase + un code de licence
 * saisi une fois dans les paramètres, en s'appuyant sur les Edge
 * Functions déjà déployées et vérifiées (voir supabase/schema.sql,
 * fonction RPC `verifier_licence`).
 *
 * CE QUI DEVRA CHANGER quand l'intégration réelle sera confirmée :
 *   - Option A (le hub émet un JWT reconnu nativement par Supabase via
 *     "Third-Party Auth") : remplacer `ensureBackendSession()` par la
 *     récupération du JWT hub + `supabase.auth.setSession(...)` ou
 *     équivalent — le reste (Edge Functions, RLS) ne change quasiment
 *     pas.
 *   - Option B (vérification par rappel de l'API du hub) : les Edge
 *     Functions (`supabase/functions/_shared/auth.ts`) doivent être
 *     réécrites pour appeler le hub au lieu de `verifier_licence` —
 *     ce fichier frontend devra alors transmettre le jeton du hub tel
 *     quel plutôt que de passer par une session Supabase anonyme.
 *
 * Aucun écran de connexion bloquant : ces informations se configurent
 * dans "Paramètres", et les fonctionnalités backend restent
 * simplement indisponibles (avec un message clair) tant qu'elles ne
 * sont pas renseignées — l'app reste utilisable en local/BYOK sinon.
 */

const LICENCE_CODE_KEY = 'mbeukCV_hubLicenceCode';

export function getHubLicenceCode(): string | null {
  return safeStorage.getItem(LICENCE_CODE_KEY);
}

export function setHubLicenceCode(code: string): void {
  safeStorage.setItem(LICENCE_CODE_KEY, code.trim().toUpperCase());
}

export function clearHubLicenceCode(): void {
  safeStorage.removeItem(LICENCE_CODE_KEY);
}

export interface BackendSession {
  accessToken: string;
  licenceCode: string;
  creditsIa: number;
}

/**
 * Établit (ou réutilise) une session backend valide : session Supabase
 * anonyme + licence vérifiée via la RPC `verifier_licence`. Lève une
 * erreur explicite et compréhensible si le backend n'est pas
 * configuré ou si la licence est invalide — jamais d'échec silencieux.
 */
export async function ensureBackendSession(): Promise<BackendSession> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Backend non configuré. Renseignez votre URL et clé Supabase dans Paramètres.');
  }

  const licenceCode = getHubLicenceCode();
  if (!licenceCode) {
    throw new Error('Aucun identifiant de licence renseigné dans Paramètres.');
  }

  let { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    const { error: signInError } = await supabase.auth.signInAnonymously();
    if (signInError) {
      throw new Error(`Échec de connexion au backend : ${signInError.message}`);
    }
    ({ data: sessionData } = await supabase.auth.getSession());
  }

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error('Impossible d’obtenir une session backend valide.');
  }

  const { data: licenceRows, error: rpcError } = await supabase.rpc('verifier_licence', {
    p_code: licenceCode,
  });

  if (rpcError) {
    throw new Error(`Licence refusée : ${rpcError.message}`);
  }
  const licenceInfo = Array.isArray(licenceRows) ? licenceRows[0] : licenceRows;
  if (!licenceInfo) {
    throw new Error('Licence introuvable ou invalide.');
  }

  return { accessToken, licenceCode, creditsIa: licenceInfo.credits_ia ?? 0 };
}
