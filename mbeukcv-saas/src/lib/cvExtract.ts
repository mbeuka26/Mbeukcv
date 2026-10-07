import 'server-only';
import { readCv, type CvData } from '@/lib/cv';

const MODEL = 'claude-sonnet-5';

const SYSTEM = `Tu extrais une fiche candidat à partir d'un CV collé.
Règles :
- Ne retiens que ce qui est écrit. N'invente aucun employeur, diplôme, date, lieu, compétence ou nombre d'années.
- Si une information est absente, laisse la chaîne vide, la liste vide, ou yearsExperience à null.
- yearsExperience n'est rempli que si le texte donne un nombre d'années, ou des dates de début et de fin assez précises pour le calculer. Sinon null.
- Le résumé reprend des faits déjà présents. Il ne rédige pas une nouvelle candidature.
- Les compétences sont des libellés présents dans le texte, pas des synonymes ajoutés.
- Réponds uniquement via l'outil return_cv.`;

const TOOL = {
  name: 'return_cv',
  description: 'Fiche candidat extraite du texte, sans information ajoutée.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      fullName: { type: 'string' },
      email: { type: 'string' },
      phone: { type: 'string' },
      location: { type: 'string' },
      title: { type: 'string' },
      summary: { type: 'string' },
      yearsExperience: { type: ['integer', 'null'] },
      skills: { type: 'array', items: { type: 'string' } },
      experiences: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            role: { type: 'string' },
            company: { type: 'string' },
            period: { type: 'string' },
            details: { type: 'string' },
          },
          required: ['role', 'company', 'period', 'details'],
        },
      },
      education: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            diploma: { type: 'string' },
            school: { type: 'string' },
            year: { type: 'string' },
          },
          required: ['diploma', 'school', 'year'],
        },
      },
    },
    required: ['fullName', 'email', 'phone', 'location', 'title', 'summary', 'yearsExperience', 'skills', 'experiences', 'education'],
  },
};

function coerceYears(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const raw = { ...(value as Record<string, unknown>) };
  const years = raw.yearsExperience;
  if (years === null || years === undefined || years === '') {
    raw.yearsExperience = null;
  } else if (typeof years === 'string' && Number.isFinite(Number(years))) {
    raw.yearsExperience = Math.round(Number(years));
  } else if (typeof years === 'number' && Number.isFinite(years)) {
    raw.yearsExperience = Math.round(years);
  }
  return raw;
}

export function cvFromModel(value: unknown, sourceText: string): CvData {
  const cv = readCv(coerceYears(value));
  return { ...cv, sourceText: sourceText.slice(0, 20000) };
}

export async function extractCvFromText(sourceText: string, apiKeyInput?: string): Promise<CvData> {
  const apiKey = apiKeyInput?.trim() || process.env.ANTHROPIC_API_KEY?.trim() || '';
  if (!apiKey) {
    throw new Error('Aucune clé Claude n’est disponible. Enregistrez la vôtre dans Paramètres.');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: 'user', content: sourceText }],
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'return_cv' },
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body && typeof body === 'object' && body.error && typeof body.error.message === 'string'
      ? body.error.message
      : `HTTP ${response.status}`;
    throw new Error(`Claude n’a pas pu lire le CV. ${detail}`);
  }

  const blocks = body && typeof body === 'object' && Array.isArray(body.content) ? body.content : [];
  const tool = blocks.find((block: { type?: string; name?: string }) => block?.type === 'tool_use' && block?.name === 'return_cv');
  if (!tool || typeof tool !== 'object' || !('input' in tool)) {
    throw new Error('Claude n’a pas renvoyé de fiche exploitable. Réessayez.');
  }
  return cvFromModel(tool.input, sourceText);
}
