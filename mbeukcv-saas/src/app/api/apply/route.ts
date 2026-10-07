import { NextResponse } from 'next/server';
import { sendBrevoEmail } from '@/lib/brevo';
import { readCv } from '@/lib/cv';
import { renderCvPdf } from '@/lib/pdf';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';
import { centralCatalog } from '@/lib/supabase/factory';

export const runtime = 'nodejs';
export const maxDuration = 30;

const ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Formulaire invalide.' }, { status: 400 });

  const jobId = String(form.get('jobId') ?? '');
  const fullName = String(form.get('fullName') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const phone = String(form.get('phone') ?? '').trim();
  const coverLetter = String(form.get('coverLetter') ?? '').trim();
  if (!jobId || !fullName || !email || coverLetter.length < 20) {
    return NextResponse.json({ error: 'Nom, e-mail et lettre de motivation sont requis.' }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('cv_data')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  const cv = readCv(profile?.cv_data);
  if (cv.summary.trim().length < 20 && cv.experiences.length === 0 && cv.skills.length === 0) {
    return NextResponse.json({ error: 'Enregistrez un CV avant de postuler.' }, { status: 400 });
  }

  const dataClient = centralCatalog();
  const { data: job, error: jobError } = await dataClient
    .from('job_offers')
    .select('id, title, url, contact_email, is_active, expires_at')
    .eq('id', jobId)
    .maybeSingle();
  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });
  if (!job || !job.is_active || (job.expires_at && new Date(job.expires_at).getTime() < Date.now())) {
    return NextResponse.json({ error: 'Cette offre n’est plus active.' }, { status: 404 });
  }

  const files = form.getAll('attachments').filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length > 4) return NextResponse.json({ error: 'Quatre pièces jointes au maximum.' }, { status: 400 });
  const attachments: { filename: string; content: Buffer }[] = [];
  for (const file of files) {
    if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: `${file.name} dépasse 4 Mo.` }, { status: 400 });
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: `${file.name} : format non accepté.` }, { status: 400 });
    attachments.push({ filename: file.name.replace(/[^\w.\- ]+/g, '_').slice(0, 80), content: Buffer.from(await file.arrayBuffer()) });
  }

  const pdf = await renderCvPdf({ ...cv, fullName, email, phone: phone || cv.phone });
  const recipient = job.contact_email?.trim() || email;
  const copyOnly = !job.contact_email;
  const subject = `Candidature - ${job.title} - ${fullName}`;
  const text = [
    coverLetter,
    '',
    `Téléphone : ${phone || 'Non indiqué'}`,
    `Offre : ${job.url}`,
    copyOnly ? 'Cette offre ne contient pas d’adresse de recruteur. Ce message est une copie envoyée à votre adresse.' : '',
  ].filter(Boolean).join('\n');

  try {
    await sendBrevoEmail({
      to: recipient,
      replyTo: email,
      subject,
      text,
      attachments: [{ filename: 'cv.pdf', content: Buffer.from(pdf) }, ...attachments],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'L’e-mail n’a pas pu être envoyé.';
    const status = message.includes('n’est pas configuré') ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }

  const { error: insertError } = await dataClient.from('applications').insert({
    user_id: auth.user.id,
    job_id: job.id,
    status: 'envoyee',
    cover_letter: coverLetter,
    job_title: job.title,
    job_url: job.url,
  });
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const admin = createSupabaseAdmin();
  await admin.from('user_profiles').update({ full_name: fullName, email, phone }).eq('id', auth.user.id);

  return NextResponse.json({
    sent: true,
    copyOnly,
    openUrl: copyOnly ? job.url : null,
  });
}
