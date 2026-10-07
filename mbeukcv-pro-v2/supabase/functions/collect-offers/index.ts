import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { ApiError, errorBody } from '../_shared/errors.ts';
import { requireActiveLicence } from '../_shared/auth.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { searchJSearch } from '../_shared/jsearch.ts';
import { searchAfricawork } from '../_shared/africaworkApi.ts';
import { upsertCollectedOffers, type CollectedOffer } from '../_shared/jobRecord.ts';
import { openCollectSecret } from '../_shared/collectCrypto.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function readUserSecret(
  licenceCode: string,
  fournisseur: 'jsearch' | 'africawork',
): Promise<{ key: string | null; unreadable: boolean }> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('cles_collecte')
    .select('secret')
    .eq('licence_code', licenceCode)
    .eq('fournisseur', fournisseur)
    .maybeSingle<{ secret: string }>();
  if (error) throw ApiError.internal('Lecture des clés impossible.');
  const stored = data?.secret?.trim();
  if (!stored) return { key: null, unreadable: false };
  try {
    const opened = await openCollectSecret(stored);
    if (opened.reseal) {
      await admin
        .from('cles_collecte')
        .update({ secret: opened.reseal, mis_a_jour_le: new Date().toISOString() })
        .eq('licence_code', licenceCode)
        .eq('fournisseur', fournisseur);
    }
    return { key: opened.plain.trim() || null, unreadable: false };
  } catch {
    return { key: null, unreadable: true };
  }
}

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== 'POST') throw ApiError.methodNotAllowed('Seule la méthode POST est autorisée.');
    const { licenceCode } = await requireActiveLicence(req);
    const body = await req.clone().json().catch(() => null);
    const raw = body && typeof body === 'object' ? (body as { motsCles?: unknown }).motsCles : null;
    const motsCles = Array.isArray(raw) ? raw.map((item) => String(item).trim()).filter(Boolean) : [];
    if (motsCles.length === 0) throw ApiError.invalidArgument('Ajoutez au moins un mot-clé.');
    const query = motsCles.join(' ').slice(0, 200);

    const notes: string[] = [];
    const offers: CollectedOffer[] = [];

    const jsearch = await readUserSecret(licenceCode, 'jsearch');
    if (jsearch.unreadable) notes.push('Clé JSearch illisible.');
    const jsearchKey = jsearch.key || Deno.env.get('JSEARCH_API_KEY')?.trim() || '';
    if (!jsearchKey) {
      notes.push('JSearch non configuré.');
    } else {
      try {
        const found = await searchJSearch(jsearchKey, query);
        offers.push(...found);
        notes.push(found.length === 0 ? 'JSearch : aucune offre.' : `JSearch : ${found.length} offre(s).`);
      } catch (err) {
        notes.push(err instanceof Error ? err.message : 'JSearch indisponible.');
      }
    }

    const africaworkUrl = Deno.env.get('AFRICAWORK_API_URL')?.trim() || '';
    const africawork = await readUserSecret(licenceCode, 'africawork');
    if (africawork.unreadable) notes.push('Clé Africawork illisible.');
    const africaworkKey = africawork.key || Deno.env.get('AFRICAWORK_API_KEY')?.trim() || '';
    if (!africaworkUrl) {
      notes.push('Africawork API non configurée : les pages publiques sont collectées par le cron.');
    } else if (!africaworkKey) {
      notes.push('Clé Africawork absente.');
    } else {
      try {
        const found = await searchAfricawork(africaworkKey, africaworkUrl, query);
        offers.push(...found);
        notes.push(found.length === 0 ? 'Africawork : aucune offre.' : `Africawork : ${found.length} offre(s).`);
      } catch (err) {
        notes.push(err instanceof Error ? err.message : 'Africawork indisponible.');
      }
    }

    const enregistrees = await upsertCollectedOffers(offers);
    return jsonResponse({
      status: 'success',
      data: { enregistrees, info: notes.join(' ') },
    });
  } catch (err) {
    if (err instanceof ApiError) return jsonResponse(errorBody(err), err.statusCode);
    console.error('collect-offers: erreur interne', err instanceof Error ? err.message : err);
    return jsonResponse(errorBody(ApiError.internal('Erreur interne. Réessayez plus tard.')), 500);
  }
});
