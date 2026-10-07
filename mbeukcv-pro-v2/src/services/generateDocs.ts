import { buildSystemPrompt, buildUserPrompt, documentsJsonSchema, documentsZodSchema } from '@contracts/documents';
import type { GeneratedDocuments, GenerateDocsPayload } from '@/types';
import { callClaudeTool } from './claudeClient';

/**
 * ════════════════════════════════════════════════════════════
 * Génération de documents — appel direct navigateur → Anthropic
 * ════════════════════════════════════════════════════════════
 * Depuis le retrait de Firebase, il n'y a plus de Cloud Function pour
 * relayer cet appel : le SDK Anthropic est utilisé directement dans le
 * navigateur (voir services/claudeClient.ts), avec
 * `dangerouslyAllowBrowser: true`. C'est un usage officiellement
 * supporté par Anthropic pour le pattern "Bring Your Own Key" (voir
 * leur en-tête `anthropic-dangerous-direct-browser-access`), pas un
 * contournement bricolé.
 *
 * ⚠️ Compromis de sécurité assumé, à bien comprendre :
 * - La clé API de l'utilisateur transite en clair dans les requêtes
 *   réseau de SON PROPRE navigateur vers api.anthropic.com — ce n'est
 *   PAS différent de coller cette même clé dans n'importe quel outil de
 *   bureau qui l'utiliserait localement.
 * - Cette clé n'est JAMAIS envoyée à un serveur tiers (ni le nôtre,
 *   puisqu'il n'existe plus par défaut, ni aucun autre) : uniquement à
 *   api.anthropic.com, directement.
 */
export async function generateDocuments(payload: GenerateDocsPayload): Promise<GeneratedDocuments> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(payload);

  const rawResult = await callClaudeTool({
    apiKey: payload.customClaudeKey ?? '',
    systemPrompt,
    userPrompt,
    toolName: 'return_documents',
    toolDescription:
      'Renvoie le dossier de candidature généré (CV et lettres, FR et EN) au format défini par le schéma.',
    inputSchema: documentsJsonSchema,
  });

  const validated = documentsZodSchema.safeParse(rawResult);
  if (!validated.success) {
    throw new Error('Le modèle a renvoyé une réponse qui ne respecte pas le format attendu. Réessayez.');
  }

  return validated.data;
}
