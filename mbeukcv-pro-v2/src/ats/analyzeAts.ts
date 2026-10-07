import {
  atsAnalysisJsonSchema,
  atsAnalysisZodSchema,
  buildAtsSystemPrompt,
  buildAtsUserPrompt,
  type AtsAnalysisResult,
} from '@contracts/ats';
import { callClaudeTool } from '@/services/claudeClient';

export async function analyzeAts(
  cvTexte: string,
  offreTexte: string,
  apiKey: string
): Promise<AtsAnalysisResult> {
  const rawResult = await callClaudeTool({
    apiKey,
    systemPrompt: buildAtsSystemPrompt(),
    userPrompt: buildAtsUserPrompt(cvTexte, offreTexte),
    toolName: 'return_ats_analysis',
    toolDescription: 'Renvoie le score de compatibilité ATS détaillé par section, au format défini par le schéma.',
    inputSchema: atsAnalysisJsonSchema,
    maxTokens: 3000,
  });

  const validated = atsAnalysisZodSchema.safeParse(rawResult);
  if (!validated.success) {
    throw new Error("Le modèle a renvoyé une réponse qui ne respecte pas le format attendu. Réessayez.");
  }

  return validated.data;
}
