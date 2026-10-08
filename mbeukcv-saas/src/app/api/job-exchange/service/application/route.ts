import { NextResponse } from 'next/server';
import { verifyServiceApiKey } from '@/lib/jobExchange/webhookAuth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

/** Lecture RH d’une candidature + snapshot (sans secrets). */
export async function GET(request: Request) {
  if (!verifyServiceApiKey(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const url = new URL(request.url);
  const applicationId = url.searchParams.get('applicationId')?.trim() ?? '';
  if (!applicationId) return NextResponse.json({ error: 'applicationId requis.' }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: app, error: appError } = await admin
    .from('applications')
    .select('id, user_id, job_id, applied_at, status, cover_letter, job_title, company_name, offer_source, channel, invitation_id')
    .eq('id', applicationId)
    .maybeSingle();
  if (appError) return NextResponse.json({ error: appError.message }, { status: 500 });
  if (!app || app.channel !== 'mbeuk_exchange') {
    return NextResponse.json({ error: 'Candidature introuvable.' }, { status: 404 });
  }

  const { data: snapshot } = await admin
    .from('application_snapshots')
    .select('cv_data, documents, consent_at, consent_text, created_at')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ application: app, snapshot: snapshot ?? null });
}
