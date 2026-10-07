import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { ApiError, errorBody } from '../_shared/errors.ts';
import { requireActiveLicence } from '../_shared/auth.ts';
import { refundAiCredit, reserveAiCredit } from '../_shared/credits.ts';
import { callClaudeTool } from '../_shared/claudeClient.ts';
import { buildSystemPrompt, buildUserPrompt, documentsJsonSchema, documentsZodSchema } from '../../../contracts/documents.ts';
import { z } from 'npm:zod@3.23.8';

/**
 * ════════════════════════════════════════════════════════════
 * POST /functions/v1/generate-docs
 * ════════════════════════════════════════════════════════════
 * Portage Supabase de l'ancienne Cloud Function Firebase du même nom.
 * Même contrat, même logique BYOK/quota :
 *   - `customClaudeKey` fourni → utilisé directement, AUCUN crédit décompté.
 *   - absent → réserve un crédit, appelle MASTER_CLAUDE_KEY, restitue
 *     le crédit si Anthropic ou la validation échoue.
 *
 * Corps : { licenceCode, candidat: {cvBrutTexte, langueCible}, offreEmploi,
 *           instructionsStyle?, customClaudeKey? }
 */
const payloadSchema = z.object({
  licenceCode: z.string(),
  candidat: z.object({
    cvBrutTexte: z.string().min(50).max(20000),
    langueCible: z.enum(['fr', 'en', 'les-deux']).default('les-deux'),
  }),
  offreEmploi: z.string().min(50).max(15000),
  instructionsStyle: z.string().max(2000).optional(),
  customClaudeKey: z.string().regex(/^sk-ant-[A-Za-z0-9\-_]{20,}$/).optional(),
});

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  let creditReserved = false;
  let licenceCodeForRefund = '';

  try {
    if (req.method !== 'POST') throw ApiError.methodNotAllowed('Seule la méthode POST est autorisée.');

    const { uid, licenceCode } = await requireActiveLicence(req);
    licenceCodeForRefund = licenceCode;

    const body = await req.json();
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      throw ApiError.invalidArgument(`Payload invalide : ${parsed.error.issues[0]?.message}`);
    }
    const payload = parsed.data;

    const usesByok = Boolean(payload.customClaudeKey);
    let apiKeyToUse: string;

    if (usesByok) {
      apiKeyToUse = payload.customClaudeKey!;
    } else {
      const masterKey = Deno.env.get('MASTER_CLAUDE_KEY');
      if (!masterKey) throw ApiError.internal('Clé Claude maître non configurée côté serveur.');
      await reserveAiCredit(licenceCode);
      creditReserved = true;
      apiKeyToUse = masterKey;
    }

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(payload);

    const rawResult = await callClaudeTool({
      apiKey: apiKeyToUse,
      systemPrompt,
      userPrompt,
      toolName: 'return_documents',
      toolDescription: 'Renvoie le dossier de candidature généré (CV et lettres, FR et EN).',
      inputSchema: documentsJsonSchema,
    });

    const validated = documentsZodSchema.safeParse(rawResult);
    if (!validated.success) {
      throw ApiError.upstream('Le modèle IA a renvoyé une réponse non conforme. Réessayez.');
    }

    creditReserved = false;

    console.log(JSON.stringify({ event: 'generate-docs:success', uid, licenceCode, byok: usesByok }));

    return new Response(JSON.stringify({ status: 'success', data: validated.data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    if (creditReserved && licenceCodeForRefund) {
      creditReserved = false;
      await refundAiCredit(licenceCodeForRefund);
    }
    if (err instanceof ApiError) {
      return new Response(JSON.stringify(errorBody(err)), {
        status: err.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.error('generate-docs: erreur interne', err);
    const internal = ApiError.internal('Erreur interne. Réessayez plus tard.');
    return new Response(JSON.stringify(errorBody(internal)), {
      status: internal.statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
