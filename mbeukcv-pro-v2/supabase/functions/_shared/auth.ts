import { getSupabaseAdmin } from './supabaseAdmin.ts';
import { ApiError } from './errors.ts';

interface LicenceRow {
  code: string;
  acheteur: string;
  actif: boolean;
  expire: string;
  uids: string[];
  credits_ia: number;
}

export interface AuthenticatedRequest {
  uid: string;
  licenceCode: string;
  licence: LicenceRow;
}

/**
 * Équivalent Supabase de `requireActiveLicence` (voir l'ancienne
 * version Firebase du projet) :
 *   1. Vérifie le Bearer token (JWT Supabase Auth, anonyme ou non).
 *   2. Relit la licence via le client Admin (contourne RLS par
 *      conception — c'est cette fonction qui fait office de garde).
 *   3. Vérifie active + non expirée + uid rattaché à cette licence.
 */
export async function requireActiveLicence(req: Request): Promise<AuthenticatedRequest> {
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthenticated('En-tête Authorization: Bearer <token> manquant.');
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    throw ApiError.unauthenticated('Token vide.');
  }

  const admin = getSupabaseAdmin();

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user) {
    throw ApiError.unauthenticated('Token invalide ou expiré.');
  }
  const uid = userData.user.id;

  let body: Record<string, unknown>;
  try {
    body = await req.clone().json();
  } catch {
    throw ApiError.invalidArgument('Corps de requête JSON invalide.');
  }

  const licenceCode = String(body.licenceCode ?? '').trim().toUpperCase();
  if (!/^MB-\d{4}-[A-Z0-9]{6}$/.test(licenceCode)) {
    throw ApiError.invalidArgument('licenceCode manquant ou au format invalide.');
  }

  const { data: licence, error: licenceError } = await admin
    .from('licences')
    .select('code, acheteur, actif, expire, uids, credits_ia')
    .eq('code', licenceCode)
    .maybeSingle<LicenceRow>();

  if (licenceError) {
    throw ApiError.internal(`Erreur base de données : ${licenceError.message}`);
  }
  if (!licence) {
    throw ApiError.permissionDenied('Licence introuvable.');
  }
  if (!licence.actif) {
    throw ApiError.permissionDenied('Licence désactivée.');
  }
  if (new Date(licence.expire) < new Date()) {
    throw ApiError.permissionDenied('Licence expirée.');
  }
  if (!licence.uids.includes(uid)) {
    throw ApiError.permissionDenied("Cet appareil/session n'est pas rattaché à cette licence.");
  }

  return { uid, licenceCode, licence };
}
