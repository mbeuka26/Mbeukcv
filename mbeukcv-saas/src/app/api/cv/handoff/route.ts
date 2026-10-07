import { NextResponse } from 'next/server';
import { readCv } from '@/lib/cv';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';
import { centralCatalog } from '@/lib/supabase/factory';

export const runtime = 'nodejs';

function cvText(cv: ReturnType<typeof readCv>): string {
  return [
    cv.fullName, cv.title, cv.email, cv.phone, cv.location, cv.summary, cv.skills.join(', '),
    ...cv.experiences.map((item) => `${item.role} | ${item.company} | ${item.period} | ${item.details}`),
    ...cv.education.map((item) => `${item.diploma} | ${item.school} | ${item.year}`),
    cv.sourceText,
  ].filter(Boolean).join('\n');
}

export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const recruiterName = body && typeof body.recruiterName === 'string' ? body.recruiterName.trim() : '';
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
  if (cv.length < 40) return NextResponse.json({ error: 'Le CV enregistré est trop court pour préparer le prompt.' }, { status: 400 });

  const prompt = [
    'Rédige un dossier de candidature cadré sur cette offre.',
    'N’invente aucune compétence, expérience, diplôme ou chiffre absent du CV.',
    'Produis : CV français, CV anglais, lettre de motivation française, lettre de motivation anglaise.',
    '',
    `RECRUTEUR: ${recruiterName || 'Non indiqué'}`,
    '',
    'OFFRE:',
    offer || 'Non précisée',
    '',
    'CV DU CANDIDAT:',
    cv,
  ].join('\n');
  return NextResponse.json({ prompt });
}
