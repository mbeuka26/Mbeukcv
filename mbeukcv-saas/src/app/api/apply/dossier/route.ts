import { NextResponse } from 'next/server';
import { sendBrevoEmail } from '@/lib/brevo';
import { htmlToPlain, renderTextPdf } from '@/lib/pdf';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';
import { centralCatalog } from '@/lib/supabase/factory';

export const runtime = 'nodejs';
export const maxDuration = 30;

const FILES = [
  ['cv_fr_html', 'cv-fr.pdf', 'CV français'],
  ['cv_en_html', 'cv-en.pdf', 'CV anglais'],
  ['lettre_fr_html', 'lettre-fr.pdf', 'Lettre française'],
  ['lettre_en_html', 'lettre-en.pdf', 'Lettre anglaise'],
] as const;

export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  const jobId = typeof body.jobId === 'string' ? body.jobId : '';
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const recruiterEmail = typeof body.recruiterEmail === 'string' ? body.recruiterEmail.trim() : '';
  const documents = body.documents && typeof body.documents === 'object' ? body.documents as Record<string, unknown> : {};
  if (!jobId || !fullName || !email) return NextResponse.json({ error: 'Nom, e-mail et offre sont requis.' }, { status: 400 });

  const chosen = FILES.filter(([key]) => typeof documents[key] === 'string' && String(documents[key]).trim().length >= 50);
  if (chosen.length === 0) return NextResponse.json({ error: 'Cochez au moins un document à envoyer.' }, { status: 400 });

  const client = centralCatalog();
  const { data: job, error: jobError } = await client
    .from('job_offers')
    .select('id, title, url, contact_email, is_active, expires_at')
    .eq('id', jobId)
    .maybeSingle();
  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });
  if (!job || !job.is_active || (job.expires_at && new Date(job.expires_at).getTime() < Date.now())) {
    return NextResponse.json({ error: 'Cette offre n’est plus active.' }, { status: 404 });
  }

  const recipient = recruiterEmail || job.contact_email?.trim() || email;
  const copyOnly = !recruiterEmail && !job.contact_email;
  const attachments = [];
  for (const [key, filename, title] of chosen) {
    const text = htmlToPlain(String(documents[key]));
    const pdf = await renderTextPdf(title, text);
    attachments.push({ filename, content: Buffer.from(pdf) });
  }
  const letter = chosen.find(([key]) => key === 'lettre_fr_html');
  const letterText = letter ? htmlToPlain(String(documents[letter[0]])).slice(0, 4000) : 'Dossier généré pour cette offre.';

  try {
    await sendBrevoEmail({
      to: recipient,
      replyTo: email,
      subject: `Candidature - ${job.title} - ${fullName}`,
      text: [letterText, '', `Téléphone : ${phone || 'Non indiqué'}`, `Offre : ${job.url}`, copyOnly ? 'Cette offre ne contient pas d’adresse de recruteur. Ce message est une copie envoyée à votre adresse.' : ''].filter(Boolean).join('\n'),
      attachments,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'L’e-mail n’a pas pu être envoyé.';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { error: insertError } = await client.from('applications').insert({
    user_id: auth.user.id,
    job_id: job.id,
    status: 'envoyee',
    cover_letter: letterText,
    job_title: job.title,
    job_url: job.url,
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const admin = createSupabaseAdmin();
  await admin.from('user_profiles').update({ full_name: fullName, email, phone }).eq('id', auth.user.id);
  return NextResponse.json({ sent: true, copyOnly, openUrl: copyOnly ? job.url : null });
}
