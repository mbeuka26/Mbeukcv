import { NextResponse } from 'next/server';
import { takeClaudeCredit } from '@/lib/credits';
import { callClaudeTool } from '@/lib/claude';
import { readCv } from '@/lib/cv';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';
import { centralCatalog } from '@/lib/supabase/factory';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM = `Tu es un recruteur senior. À partir du CV du candidat et de l'offre sélectionnée, produis un dossier cadré sur CE poste.
N'invente aucune compétence, expérience, diplôme ou chiffre absent du CV.
La lettre de motivation, en français et en anglais, parle de cette offre et du recruteur nommé s'il est indiqué.
Réponds uniquement via l'outil return_documents.
Chaque champ est un document HTML5 complet, styles en attributs style="", sans balise script.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    cv_fr_html: { type: 'string' },
    cv_en_html: { type: 'string' },
    lettre_fr_html: { type: 'string' },
    lettre_en_html: { type: 'string' },
  },
  required: ['cv_fr_html', 'cv_en_html', 'lettre_fr_html', 'lettre_en_html'],
};

function cvText(cv: ReturnType<typeof readCv>): string {
  return [
    cv.fullName,
    cv.title,
    cv.email,
    cv.phone,
    cv.location,
    cv.summary,
    cv.skills.join(', '),
    ...cv.experiences.map((item) => `${item.role} | ${item.company} | ${item.period} | ${item.details}`),
    ...cv.education.map((item) => `${item.diploma} | ${item.school} | ${item.year}`),
    cv.sourceText,
  ].filter(Boolean).join('\n');
}

function handoffPrompt(cv: string, offer: string, recruiter: string): string {
  return `${SYSTEM}\n\nOFFRE SÉLECTIONNÉE:\n${offer}\n\nRECRUTEUR:\n${recruiter || 'Non indiqué'}\n\nCV DU CANDIDAT:\n${cv}\n\nProduis le CV français, le CV anglais, la lettre de motivation française et la lettre de motivation anglaise, cadrés sur cette offre.`;
}

export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const style = body && typeof body.style === 'string' ? body.style.trim() : '';
  const recruiterName = body && typeof body.recruiterName === 'string' ? body.recruiterName.trim() : '';
  const language = body?.language === 'fr' || body?.language === 'en' || body?.language === 'les-deux' ? body.language : 'les-deux';
  let cv = body && typeof body.cv === 'string' ? body.cv.trim() : '';
  let offer = body && typeof body.offer === 'string' ? body.offer.trim() : '';

  if (body && typeof body.jobId === 'string' && body.jobId) {
    const admin = createSupabaseAdmin();
    const { data: profile } = await admin.from('user_profiles').select('cv_data').eq('id', data.user.id).maybeSingle();
    cv = cvText(readCv(profile?.cv_data));
    const client = centralCatalog();
    const { data: job } = await client.from('job_offers').select('title, company, location, description, url').eq('id', body.jobId).maybeSingle();
    if (!job) return NextResponse.json({ error: 'Offre introuvable.' }, { status: 404 });
    offer = [job.title, job.company, job.location, job.description, job.url].filter(Boolean).join('\n');
  }

  if (cv.length < 40 || offer.length < 20) {
    return NextResponse.json({ error: 'Le CV enregistré ou le texte de l’offre est trop court.' }, { status: 400 });
  }

  const userPrompt = `OFFRE:\n${offer}\n\nRECRUTEUR:\n${recruiterName || 'Non indiqué'}\n\nCV:\n${cv}\n\nLANGUE: ${language}\n${style ? `STYLE:\n${style}` : ''}`;
  const handoff = handoffPrompt(cv, offer, recruiterName);

  const charged = await takeClaudeCredit(data.user.id);
  if ('error' in charged) return NextResponse.json({ error: charged.error, handoff }, { status: charged.status });

  try {
    const input = await callClaudeTool({
      system: SYSTEM,
      user: userPrompt,
      toolName: 'return_documents',
      toolDescription: 'CV et lettres cadrés sur l’offre sélectionnée.',
      maxTokens: 8000,
      apiKey: charged.key,
      inputSchema: SCHEMA,
    });
    const docs = input as Record<string, unknown>;
    for (const key of ['cv_fr_html', 'cv_en_html', 'lettre_fr_html', 'lettre_en_html']) {
      if (typeof docs[key] !== 'string' || String(docs[key]).trim().length < 50) {
        return NextResponse.json({ error: 'Le dossier renvoyé est incomplet.', handoff }, { status: 422 });
      }
    }
    return NextResponse.json({
      documents: {
        cv_fr_html: docs.cv_fr_html,
        cv_en_html: docs.cv_en_html,
        lettre_fr_html: docs.lettre_fr_html,
        lettre_en_html: docs.lettre_en_html,
      },
    });
  } catch (err) {
    await charged.refund().catch(() => undefined);
    const message = err instanceof Error ? err.message : 'Génération impossible.';
    const status = message.includes('Aucune clé Claude') ? 503 : 502;
    return NextResponse.json({ error: message, handoff }, { status });
  }
}
