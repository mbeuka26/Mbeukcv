import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { ApiError, errorBody } from '../_shared/errors.ts';
import { requireActiveLicence } from '../_shared/auth.ts';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { callClaudeTool } from '../_shared/claudeClient.ts';
import { buildMatchingSystemPrompt, buildMatchingUserPrompt, matchesJsonSchema, matchesZodSchema } from '../../../contracts/matching.ts';
import { refundAiCredit, reserveAiCredit } from '../_shared/credits.ts';

/**
 * ════════════════════════════════════════════════════════════
 * POST /functions/v1/refresh-matches
 * ════════════════════════════════════════════════════════════
 * Portage Supabase de l'ancienne Cloud Function Firebase du même nom.
 * Même logique : un seul appel Claude batché sur toutes les offres
 * récentes, filtrage score > 75, cooldown 6h pour éviter de refacturer
 * Claude à chaque connexion rapprochée.
 */
const MAX_OFFERS_ANALYZED = 50;
const COOLDOWN_HOURS = 6;
const DEFAULT_SCORE_MINIMUM = 75;

function readScoreMinimum(body: Record<string, unknown>): number {
  const raw = Number(body.scoreMinimum);
  if (!Number.isFinite(raw)) return DEFAULT_SCORE_MINIMUM;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== 'POST') throw ApiError.methodNotAllowed('Seule la méthode POST est autorisée.');

    const { uid, licenceCode } = await requireActiveLicence(req);
    const admin = getSupabaseAdmin();

    let requestBody: Record<string, unknown> = {};
    try {
      requestBody = await req.clone().json();
    } catch {
      requestBody = {};
    }
    const scoreMinimum = readScoreMinimum(requestBody);

    const dropBelowThreshold = async () => {
      await admin.from('user_matchs').delete().eq('licence_code', licenceCode).lt('score', scoreMinimum);
    };

    const { data: profil, error: profilError } = await admin
      .from('profils_candidats')
      .select('mots_cles, cv_brut_texte, derniere_analyse_matching')
      .eq('licence_code', licenceCode)
      .maybeSingle();

    if (profilError) throw ApiError.internal(`Erreur base de données : ${profilError.message}`);

    if (!profil) {
      return jsonResponse({ status: 'success', data: { nbOffresAnalysees: 0, nbMatchs: 0, info: 'Aucun profil enregistré.' } });
    }

    const motsCles: string[] = (profil.mots_cles ?? []).filter((m: string) => m?.trim());
    if (motsCles.length === 0) {
      return jsonResponse({ status: 'success', data: { nbOffresAnalysees: 0, nbMatchs: 0, info: 'Aucun mot-clé renseigné.' } });
    }

    if (profil.derniere_analyse_matching) {
      const elapsedMs = Date.now() - new Date(profil.derniere_analyse_matching).getTime();
      if (elapsedMs < COOLDOWN_HOURS * 3_600_000) {
        await dropBelowThreshold();
        const { count } = await admin
          .from('user_matchs')
          .select('id', { count: 'exact', head: true })
          .eq('licence_code', licenceCode);
        return jsonResponse({
          status: 'success',
          data: { nbOffresAnalysees: 0, nbMatchs: count ?? 0, cached: true, info: 'Analyse déjà réalisée récemment.' },
        });
      }
    }

    const { data: offresRows, error: offresError } = await admin
      .from('offres_globales')
      .select('id, titre, entreprise, lieu, url, email_recruteur, description')
      .order('scraped_at', { ascending: false })
      .limit(MAX_OFFERS_ANALYZED);

    if (offresError) throw ApiError.internal(`Erreur base de données : ${offresError.message}`);

    if (!offresRows || offresRows.length === 0) {
      return jsonResponse({ status: 'success', data: { nbOffresAnalysees: 0, nbMatchs: 0, info: 'Aucune offre disponible.' } });
    }

    const masterKey = Deno.env.get('MASTER_CLAUDE_KEY');
    if (!masterKey) throw ApiError.internal('Clé Claude maître non configurée côté serveur.');

    const systemPrompt = buildMatchingSystemPrompt();
    const userPrompt = buildMatchingUserPrompt(
      { motsCles, cvBrutTexte: profil.cv_brut_texte },
      offresRows.map((o) => ({ id: o.id, titre: o.titre, entreprise: o.entreprise, lieu: o.lieu, description: o.description }))
    );

    let creditReserved = false;
    let rawResult: unknown;
    try {
      await reserveAiCredit(licenceCode);
      creditReserved = true;
      rawResult = await callClaudeTool({
        apiKey: masterKey,
        systemPrompt,
        userPrompt,
        toolName: 'return_matches',
        toolDescription: 'Renvoie un score de pertinence (0-100) pour chaque offre évaluée.',
        inputSchema: matchesJsonSchema,
        maxTokens: 4000,
      });
      const parsed = matchesZodSchema.safeParse(rawResult);
      if (!parsed.success) {
        throw ApiError.upstream('Le modèle IA a renvoyé une réponse imprévue lors du matching.');
      }
      creditReserved = false;
      rawResult = parsed.data;
    } catch (err) {
      if (creditReserved) {
        creditReserved = false;
        await refundAiCredit(licenceCode);
      }
      throw err;
    }

    const validated = { data: rawResult as { matches: { offreId: string; score: number; resume: string }[] } };

    const bonsMatchs = validated.data.matches.filter((m) => m.score >= scoreMinimum);
    const offresById = new Map(offresRows.map((o) => [o.id, o]));

    const rows = bonsMatchs
      .map((m) => {
        const offre = offresById.get(m.offreId);
        if (!offre) return null;
        return {
          licence_code: licenceCode,
          offre_id: m.offreId,
          titre: offre.titre,
          entreprise: offre.entreprise,
          lieu: offre.lieu,
          url: offre.url,
          email_recruteur: offre.email_recruteur,
          description: offre.description,
          score: m.score,
          resume: m.resume,
          matched_at: new Date().toISOString(),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length > 0) {
      const { error: upsertError } = await admin.from('user_matchs').upsert(rows, { onConflict: 'licence_code,offre_id' });
      if (upsertError) throw ApiError.internal(`Échec écriture matchs : ${upsertError.message}`);
    }

    await admin
      .from('profils_candidats')
      .update({ derniere_analyse_matching: new Date().toISOString() })
      .eq('licence_code', licenceCode);

    await dropBelowThreshold();

    console.log(JSON.stringify({ event: 'refresh-matches:success', uid, licenceCode, scoreMinimum, nbOffresAnalysees: offresRows.length, nbMatchs: rows.length }));

    return jsonResponse({ status: 'success', data: { nbOffresAnalysees: offresRows.length, nbMatchs: rows.length } });
  } catch (err) {
    if (err instanceof ApiError) {
      return new Response(JSON.stringify(errorBody(err)), {
        status: err.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.error('refresh-matches: erreur interne', err);
    const internal = ApiError.internal('Erreur interne. Réessayez plus tard.');
    return new Response(JSON.stringify(errorBody(internal)), {
      status: internal.statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
