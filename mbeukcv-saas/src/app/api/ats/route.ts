import { NextResponse } from 'next/server';
import { takeClaudeCredit } from '@/lib/credits';
import { callClaudeTool } from '@/lib/claude';
import { createSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `Tu évalues la compatibilité d'un CV avec une offre, sans inventer de compétence absente du CV.
Sections minimum : Mots-clés et compétences, Expérience pertinente, Formation, Structure et lisibilité.
Réponds uniquement via return_ats_analysis.`;

export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const cv = body && typeof body.cv === 'string' ? body.cv.trim() : '';
  const offer = body && typeof body.offer === 'string' ? body.offer.trim() : '';
  if (cv.length < 50 || offer.length < 50) {
    return NextResponse.json({ error: 'Collez le CV et l’offre, chacun sur plusieurs lignes.' }, { status: 400 });
  }
  const charged = await takeClaudeCredit(data.user.id);
  if ('error' in charged) return NextResponse.json({ error: charged.error }, { status: charged.status });

  try {
    const input = await callClaudeTool({
      system: SYSTEM,
      user: `OFFRE:\n${offer}\n\nCV:\n${cv}`,
      toolName: 'return_ats_analysis',
      toolDescription: 'Analyse ATS du CV face à l’offre.',
      maxTokens: 2000,
      apiKey: charged.key,
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          scoreGlobal: { type: 'integer' },
          resume: { type: 'string' },
          sections: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: { nom: { type: 'string' }, score: { type: 'integer' }, commentaire: { type: 'string' } },
              required: ['nom', 'score', 'commentaire'],
            },
          },
          motsClesTrouves: { type: 'array', items: { type: 'string' } },
          motsClesManquants: { type: 'array', items: { type: 'string' } },
          recommandations: { type: 'array', items: { type: 'string' } },
        },
        required: ['scoreGlobal', 'resume', 'sections', 'motsClesTrouves', 'motsClesManquants', 'recommandations'],
      },
    });
    return NextResponse.json({ analysis: input });
  } catch (err) {
    await charged.refund().catch(() => undefined);
    const message = err instanceof Error ? err.message : 'Analyse impossible.';
    const status = message.includes('ANTHROPIC_API_KEY') ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
