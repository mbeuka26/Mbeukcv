/**
 * Authentification Hub Central — résolution session pour Edge Functions.
 * Identité / auth / entitlement : Hub. Données métier : profil SaaS local.
 */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getHubClient, toSafeHubError } from './hub-service.ts';
import type { SaasProfile } from './saas-profile.ts';

export type HubAuthContext = {
  hub_user_id: string;
  email: string;
  profile: SaasProfile;
  hub_session_token: string;
  hub_refresh_token: string;
};

export class HubAuthError extends Error {
  constructor(message: string, readonly status = 401) {
    super(message);
    this.name = 'HubAuthError';
  }
}

/** Exige une session Hub valide + profil métier SaaS associé. */
export async function requireHubAuth(
  req: Request,
  supabaseAdmin: SupabaseClient,
): Promise<HubAuthContext> {
  const authHeader = req.headers.get('Authorization');
  const refreshToken = req.headers.get('X-Hub-Refresh-Token');
  const hubUserId = req.headers.get('X-Hub-User-Id');
  const hubSessionToken = req.headers.get('X-Hub-Session-Token')?.trim() || '';

  if (!hubSessionToken || !refreshToken || !hubUserId) {
    throw new HubAuthError('Session Hub requise (token, refresh, user id).', 401);
  }

  // Authorization = JWT Supabase (anon) pour la passerelle Edge ; session Hub via X-Hub-Session-Token
  void authHeader;

  // SÉCURITÉ (P0 — corrigé en v1.8.0) : un refresh_token invalide/expiré DOIT
  // bloquer la requête. La version précédente avalait l'erreur ("non bloquant")
  // et laissait passer l'appel dès lors que les 3 en-têtes étaient simplement
  // présents (non vides) — sans jamais vérifier qu'ils étaient valides. Cela
  // permettait d'interroger/altérer l'entitlement de N'IMPORTE QUEL compte en
  // fournissant uniquement son X-Hub-User-Id, avec des jetons totalement
  // inventés. C'est une bascule d'authentification (IDOR), pas une simple
  // dégradation de service : elle DOIT échouer fermé (fail-closed).
  try {
    await getHubClient().auth.refreshSession({ refresh_token: refreshToken });
  } catch (e) {
    const safe = toSafeHubError(e);
    console.warn('[requireHubAuth] refreshSession rejeté — accès refusé (fail-closed):', safe.code, safe.message);
    throw new HubAuthError('Session Hub invalide ou expirée. Reconnectez-vous.', 401);
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('hub_user_id', hubUserId)
    .maybeSingle();

  if (error || !profile) {
    throw new HubAuthError('Profil métier SaaS introuvable pour ce compte Hub.', 404);
  }

  // RISQUE RÉSIDUEL DOCUMENTÉ (voir SECURITY-AUDIT-v1.8.md §1) :
  // `refreshSession` ne renvoie ni user_id ni email dans le SDK 2.0.0 actuel
  // (AuthRefreshResult = { session_token, refresh_token, expires_at }). On ne
  // peut donc PAS vérifier ici, côté SaaS, que le refresh_token présenté
  // appartient réellement à `hubUserId`. Tant que le Hub Central n'expose pas
  // un endpoint du type auth.getUser(session_token) -> { user_id, email },
  // ce contrôle reste partiel : il garantit qu'un jeton *valide* a été
  // présenté, mais pas qu'il correspond au X-Hub-User-Id revendiqué. Ne pas
  // supprimer cet appel de vérification, et prioriser l'ajout de cet endpoint
  // côté Hub avant toute mise en production à fort enjeu.

  return {
    hub_user_id: hubUserId,
    email: profile.email,
    profile: profile as SaasProfile,
    hub_session_token: hubSessionToken,
    hub_refresh_token: refreshToken,
  };
}

/** Résout le user_id métier SaaS (profiles.id) depuis la session Hub. */
export function saasUserId(ctx: HubAuthContext): string {
  return ctx.profile.id;
}
