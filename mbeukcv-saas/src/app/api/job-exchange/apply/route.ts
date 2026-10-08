import { NextResponse } from 'next/server';
import { readCv } from '@/lib/cv';
import { CONSENT_APPLY_TEXT } from '@/lib/jobExchange/constants';
import { OFFER_SOURCE_INTERNAL } from '@/lib/jobExchange/sources';
import { renderCvPdf } from '@/lib/pdf';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';
import { centralCatalog } from '@/lib/supabase/factory';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const invitationId = body && typeof body.invitationId === 'string' ? body.invitationId.trim() : '';
  const consent = Boolean(body && typeof body === 'object' && body.consent === true);
  const coverLetter = body && typeof body.coverLetter === 'string' ? body.coverLetter.trim() : '';
  if (!invitationId || !consent) {
    return NextResponse.json({ error: 'Confirmation de consentement requise.' }, { status: 400 });
  }
  if (coverLetter.length > 0 && coverLetter.length < 20) {
    return NextResponse.json({ error: 'Lettre trop courte ou laissez le champ vide.' }, { status: 400 });
  }

  const { data: invitation, error: invError } = await supabase
    .from('job_exchange_invitations')
    .select('id, status, job_id, company_name, user_id')
    .eq('id', invitationId)
    .maybeSingle();
  if (invError) return NextResponse.json({ error: invError.message }, { status: 500 });
  if (!invitation || invitation.user_id !== auth.user.id) {
    return NextResponse.json({ error: 'Invitation introuvable.' }, { status: 404 });
  }
  if (invitation.status === 'DECLINED' || invitation.status === 'EXPIRED') {
    return NextResponse.json({ error: 'Cette opportunité n’est plus disponible.' }, { status: 409 });
  }

  const dataClient = centralCatalog();
  const { data: job, error: jobError } = await dataClient
    .from('job_offers')
    .select('id, title, url, source, is_active, expires_at, external_ref')
    .eq('id', invitation.job_id)
    .maybeSingle();
  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });
  if (!job || !job.is_active || (job.expires_at && new Date(job.expires_at).getTime() < Date.now())) {
    return NextResponse.json({ error: 'Cette offre n’est plus active.' }, { status: 404 });
  }
  if (!job.external_ref?.trim()) {
    return NextResponse.json({ error: 'Cette candidature est réservée aux offres Mbeuk Job Exchange.' }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('cv_data, full_name, email, phone')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  const cv = readCv(profile?.cv_data);
  if (cv.summary.trim().length < 20 && cv.experiences.length === 0 && cv.skills.length === 0) {
    return NextResponse.json({ error: 'Enregistrez un CV avant de postuler.' }, { status: 400 });
  }

  const fullName = profile?.full_name?.trim() || cv.fullName || auth.user.email?.split('@')[0] || 'Candidat';
  const email = profile?.email?.trim() || cv.email || auth.user.email || '';
  const phone = profile?.phone?.trim() || cv.phone || '';

  const { data: existingApp } = await dataClient
    .from('applications')
    .select('id')
    .eq('user_id', auth.user.id)
    .eq('job_id', job.id)
    .maybeSingle();
  if (existingApp) {
    return NextResponse.json({ error: 'Vous avez déjà postulé à cette offre.' }, { status: 409 });
  }

  const pdf = await renderCvPdf({ ...cv, fullName, email, phone: phone || cv.phone });
  const snapshotCv = {
    ...cv,
    fullName,
    email,
    phone,
    exportedAt: new Date().toISOString(),
  };

  const { data: application, error: insertError } = await dataClient
    .from('applications')
    .insert({
      user_id: auth.user.id,
      job_id: job.id,
      status: 'envoyee',
      cover_letter: coverLetter || null,
      job_title: job.title,
      job_url: job.url,
      offer_source: OFFER_SOURCE_INTERNAL,
      company_name: invitation.company_name,
      invitation_id: invitation.id,
      channel: 'mbeuk_exchange',
    })
    .select('id')
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const admin = createSupabaseAdmin();
  const { error: snapError } = await admin.from('application_snapshots').insert({
    application_id: application.id,
    cv_data: snapshotCv,
    documents: [{ filename: 'cv.pdf', mime: 'application/pdf', size: pdf.byteLength }],
    consent_at: new Date().toISOString(),
    consent_text: CONSENT_APPLY_TEXT,
  });
  if (snapError) return NextResponse.json({ error: snapError.message }, { status: 500 });

  await supabase
    .from('job_exchange_invitations')
    .update({ status: 'APPLIED', updated_at: new Date().toISOString() })
    .eq('id', invitation.id);

  return NextResponse.json({
    ok: true,
    applicationId: application.id,
    transmitted: {
      profile: true,
      cvPdf: true,
      coverLetter: coverLetter.length > 0,
      consent: CONSENT_APPLY_TEXT,
    },
  });
}
