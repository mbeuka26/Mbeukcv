import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { ApiError, errorBody } from '../_shared/errors.ts';
import { requireActiveLicence } from '../_shared/auth.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { sealCollectSecret } from '../_shared/collectCrypto.ts';

const FOURNISSEURS = ['jsearch', 'africawork'] as const;
type Fournisseur = (typeof FOURNISSEURS)[number];

function isFournisseur(value: unknown): value is Fournisseur {
  return typeof value === 'string' && (FOURNISSEURS as readonly string[]).includes(value);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== 'POST') throw ApiError.methodNotAllowed('Seule la méthode POST est autorisée.');
    const { licenceCode } = await requireActiveLicence(req);
    const body = await req.clone().json().catch(() => null);
    if (!body || typeof body !== 'object') throw ApiError.invalidArgument('Corps de requête JSON invalide.');
    const action = String((body as { action?: unknown }).action ?? '');
    const admin = getSupabaseAdmin();

    if (action === 'status') {
      const { data, error } = await admin.from('cles_collecte').select('fournisseur').eq('licence_code', licenceCode);
      if (error) throw ApiError.internal('Lecture des clés impossible.');
      const presents = new Set((data ?? []).map((row) => row.fournisseur));
      return jsonResponse({
        status: 'success',
        data: { jsearch: presents.has('jsearch'), africawork: presents.has('africawork') },
      });
    }

    if (action === 'save') {
      const fournisseur = (body as { fournisseur?: unknown }).fournisseur;
      if (!isFournisseur(fournisseur)) throw ApiError.invalidArgument('Fournisseur inconnu.');
      const secret = String((body as { secret?: unknown }).secret ?? '').trim();
      if (!secret) {
        const { error } = await admin.from('cles_collecte').delete().eq('licence_code', licenceCode).eq('fournisseur', fournisseur);
        if (error) throw ApiError.internal('Suppression de la clé impossible.');
        return jsonResponse({ status: 'success', data: { enregistre: false } });
      }
      if (secret.length < 20 || secret.length > 200 || /\s/.test(secret)) {
        throw ApiError.invalidArgument('La clé doit contenir entre 20 et 200 caractères, sans espace.');
      }
      const sealed = await sealCollectSecret(secret);
      const { error } = await admin.from('cles_collecte').upsert(
        { licence_code: licenceCode, fournisseur, secret: sealed, mis_a_jour_le: new Date().toISOString() },
        { onConflict: 'licence_code,fournisseur' },
      );
      if (error) throw ApiError.internal('Enregistrement de la clé impossible.');
      return jsonResponse({ status: 'success', data: { enregistre: true } });
    }

    throw ApiError.invalidArgument('Action inconnue.');
  } catch (err) {
    if (err instanceof ApiError) return jsonResponse(errorBody(err), err.statusCode);
    console.error('source-keys: erreur interne');
    return jsonResponse(errorBody(ApiError.internal('Erreur interne. Réessayez plus tard.')), 500);
  }
});
