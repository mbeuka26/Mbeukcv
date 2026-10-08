import { NextResponse } from 'next/server';
import { createOpportunityNotification } from '@/lib/jobExchange/notifications';
import { verifyServiceApiKey } from '@/lib/jobExchange/webhookAuth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!verifyServiceApiKey(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const externalRef = body && typeof body.externalRef === 'string' ? body.externalRef.trim() : '';
  const userId = body && typeof body.userId === 'string' ? body.userId.trim() : '';
  const message =
    body && typeof body.message === 'string'
      ? body.message.trim()
      : 'Nous pensons que votre profil correspond à cette opportunité.';
  if (!externalRef || !userId) {
    return NextResponse.json({ error: 'externalRef et userId requis.' }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: job, error: jobError } = await admin
    .from('job_offers')
    .select('id, title, company, is_active, expires_at')
    .eq('external_ref', externalRef)
    .maybeSingle();
  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });
  if (!job || !job.is_active) return NextResponse.json({ error: 'Offre introuvable ou fermée.' }, { status: 404 });

  const { data: profile } = await admin
    .from('user_profiles')
    .select('professional_discovery_enabled')
    .eq('id', userId)
    .maybeSingle();
  if (!profile?.professional_discovery_enabled) {
    return NextResponse.json({ error: 'Le candidat n’accepte pas la découverte professionnelle.' }, { status: 403 });
  }

  const now = new Date().toISOString();
  const { data: invitation, error: invError } = await admin
    .from('job_exchange_invitations')
    .upsert(
      {
        user_id: userId,
        job_id: job.id,
        company_name: job.company,
        status: 'INVITED',
        invited_at: now,
        offer_summary: message.slice(0, 500),
        updated_at: now,
      },
      { onConflict: 'user_id,job_id' },
    )
    .select('id, match_score')
    .single();
  if (invError) return NextResponse.json({ error: invError.message }, { status: 500 });

  await createOpportunityNotification(admin, {
    userId,
    invitationId: invitation.id,
    companyName: job.company,
    jobTitle: job.title,
    score: invitation.match_score ?? 0,
    force: true,
  });

  return NextResponse.json({ ok: true, invitationId: invitation.id });
}
