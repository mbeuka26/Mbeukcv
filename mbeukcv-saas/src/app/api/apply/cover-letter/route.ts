import { NextResponse } from 'next/server';
import { callClaudeTool } from '@/lib/claude';
import { takeClaudeCredit } from '@/lib/credits';
import { readCv } from '@/lib/cv';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';
import { centralCatalog } from '@/lib/supabase/factory';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `Tu rédiges une lettre de motivation professionnelle en français pour UNE offre précise.
Utilise uniquement les faits présents dans le CV. N'invente ni diplôme, ni expérience, ni compétence.
Ton sobre, 3 à 5 paragraphes, prêt à être envoyé par e-mail.
Réponds uniquement via l'outil return_letter.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    letter: { type: 'string', description: 'Lettre de motivation en texte brut, paragraphes séparés par des lignes vides.' },
  },
  required: ['letter'],
};

function cvText(cv: ReturnType<typeof readCv>): string {
  return [
    cv.fullName,
    cv.title,
    cv.summary,
    cv.skills.join(', '),
    ...cv.experiences.map((item) => `${item.role} @ ${item.company} (${item.period}): ${item.details}`),
    ...cv.education.map((item) => `${item.diploma} — ${item.school} (${item.year})`),
  ].filter(Boolean).join('\n');
}

export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const jobId = body && typeof body.jobId === 'string' ? body.jobId : '';
  if (!jobId) return NextResponse.json({ error: 'Offre requise.' }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin.from('user_profiles').select('cv_data').eq('id', data.user.id).maybeSingle();
  const cv = readCv(profile?.cv_data);
  const cvBlob = cvText(cv);
  if (cvBlob.length < 40) {
    return NextResponse.json({ error: 'Enregistrez un CV avant de générer la lettre.' }, { status: 400 });
  }

  const client = centralCatalog();
  const { data: job } = await client
    .from('job_offers')
    .select('title, company, location, description, url')
    .eq('id', jobId)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: 'Offre introuvable.' }, { status: 404 });

  const offer = [job.title, job.company, job.location, job.description, job.url].filter(Boolean).join('\n');
  const charged = await takeClaudeCredit(data.user.id);
  if ('error' in charged) return NextResponse.json({ error: charged.error }, { status: charged.status });

  try {
    const input = await callClaudeTool({
      system: SYSTEM,
      user: `OFFRE:\n${offer}\n\nCV:\n${cvBlob}`,
      toolName: 'return_letter',
      toolDescription: 'Lettre de motivation ciblée.',
      maxTokens: 2500,
      apiKey: charged.key,
      inputSchema: SCHEMA,
    });
    const letter = typeof (input as { letter?: unknown }).letter === 'string'
      ? String((input as { letter: string }).letter).trim()
      : '';
    if (letter.length < 80) {
      return NextResponse.json({ error: 'La lettre générée est trop courte.' }, { status: 422 });
    }
    return NextResponse.json({ letter });
  } catch (err) {
    await charged.refund();
    const message = err instanceof Error ? err.message : 'Génération impossible.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
