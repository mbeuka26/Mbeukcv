import Anthropic from '@anthropic-ai/sdk';
import { CLAUDE_MAX_OUTPUT_TOKENS, CLAUDE_MODEL_ID } from '@contracts/claudeModel';

/**
 * ════════════════════════════════════════════════════════════
 * Client Claude générique — appel direct navigateur (BYOK)
 * ════════════════════════════════════════════════════════════
 * Factorise la logique commune à tous les modules IA de l'app
 * (génération de CV, analyseur ATS, matching…) : instanciation du SDK
 * avec `dangerouslyAllowBrowser`, sortie structurée forcée via "tool
 * use", gestion d'erreur homogène. Voir services/generateDocs.ts pour
 * le détail du compromis de sécurité BYOK (clé jamais envoyée qu'à
 * api.anthropic.com).
 */


export async function callClaudeTool(params: {
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  toolName: string;
  toolDescription: string;
  inputSchema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<unknown> {
  if (!params.apiKey || params.apiKey.trim().length === 0) {
    throw new Error('Aucune clé API Claude renseignée. Ajoutez votre clé Anthropic personnelle avant de continuer.');
  }

  const client = new Anthropic({ apiKey: params.apiKey.trim(), dangerouslyAllowBrowser: true });

  let response;
  try {
    response = await client.messages.create({
      model: CLAUDE_MODEL_ID,
      max_tokens: Math.min(params.maxTokens ?? CLAUDE_MAX_OUTPUT_TOKENS, CLAUDE_MAX_OUTPUT_TOKENS),
      system: params.systemPrompt,
      messages: [{ role: 'user', content: params.userPrompt }],
      tools: [
        {
          name: params.toolName,
          description: params.toolDescription,
          input_schema: params.inputSchema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: 'tool', name: params.toolName },
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new Error('Clé API Claude invalide ou expirée. Vérifiez-la dans les paramètres.');
    }
    if (err instanceof Anthropic.PermissionDeniedError) {
      throw new Error("Cette clé API n'a pas la permission d'utiliser ce modèle Claude.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new Error('Limite de requêtes Anthropic atteinte. Réessayez dans quelques instants.');
    }
    throw new Error(
      `Échec de l'appel à l'API Anthropic : ${err instanceof Error ? err.message : 'erreur inconnue'}`
    );
  }

  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use' && block.name === params.toolName
  );

  if (!toolUseBlock) {
    throw new Error('Réponse Claude inattendue : aucun résultat structuré trouvé. Réessayez.');
  }

  return toolUseBlock.input;
}
