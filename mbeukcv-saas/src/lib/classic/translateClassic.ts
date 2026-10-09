import 'server-only';
import { callClaudeTool } from '@/lib/claude';
import type { ClassicDisplayLocale } from '@/lib/classic/locales';
import { claudeLocaleName } from '@/lib/classic/locales';
import { mergeTranslation, payloadFromClassic } from '@/lib/classic/translateClassicMerge';
import type { ClassicCvData } from '@/lib/classic/types';

export { hasTranslatableContent } from '@/lib/classic/translateClassicShared';

export async function translateClassicCv(
  cv: ClassicCvData,
  competences: string[],
  target: ClassicDisplayLocale,
  apiKey: string,
): Promise<Partial<ClassicCvData>> {
  if (target === 'fr') return {};
  const payload = payloadFromClassic(cv, competences);
  const targetName = claudeLocaleName(target);

  const raw = await callClaudeTool({
    apiKey,
    maxTokens: 4096,
    system: `You are a professional CV translator for job applications. Translate user content to ${targetName}.
Rules:
- Do NOT translate email addresses, phone numbers, URLs, LinkedIn handles, or proper nouns that are company brand names unless a well-known localized form exists.
- Preserve list structure in description/resume: lines starting with "-", "•", "*", or "1." must keep the same marker and line breaks.
- Use professional CV tone appropriate for ${targetName}.
- For en-US vs en-GB use consistent spelling (color/colour, organization/organisation).
- Translate language skill names and level labels where appropriate.
- Return only structured tool output.`,
    user: JSON.stringify({ targetLocale: target, cv: payload }),
    toolName: 'classic_cv_translate',
    toolDescription: 'Translate structured classic CV fields to the target language.',
    inputSchema: {
      type: 'object',
      properties: {
        nom: { type: 'string' },
        titrePoste: { type: 'string' },
        ville: { type: 'string' },
        resume: { type: 'string' },
        competences: { type: 'array', items: { type: 'string' } },
        experiences: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              poste: { type: 'string' },
              entreprise: { type: 'string' },
              lieu: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['id', 'poste', 'entreprise', 'description'],
          },
        },
        formations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              diplome: { type: 'string' },
              etablissement: { type: 'string' },
              lieu: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['id', 'diplome', 'etablissement'],
          },
        },
        langues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              langue: { type: 'string' },
              niveau: { type: 'string' },
            },
            required: ['id', 'langue', 'niveau'],
          },
        },
        centresInteret: { type: 'array', items: { type: 'string' } },
      },
      required: ['nom', 'titrePoste', 'resume', 'competences', 'experiences', 'formations', 'langues'],
    },
  });

  return mergeTranslation(cv, raw, competences);
}
