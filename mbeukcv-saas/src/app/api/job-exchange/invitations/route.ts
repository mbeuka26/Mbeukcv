import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { normalizeOfferSource, normalizedSourceLabel } from '@/lib/jobExchange/sources';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createSupabaseServer();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });

  const { data, error } = await supabase
    .from('job_exchange_invitations')
    .select(
      `
      id,
      status,
      match_score,
      match_note,
      offer_summary,
      company_name,
      invited_at,
      expires_at,
      updated_at,
      job_id,
      job_offers ( id, title, url, source, is_active, expires_at )
    `,
    )
    .eq('user_id', auth.user.id)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = Date.now();
  const items = (data ?? []).map((row) => {
    const joined = row.job_offers as
      | {
          id: string;
          title: string;
          url: string;
          source: string;
          is_active: boolean;
          expires_at: string | null;
        }
      | {
          id: string;
          title: string;
          url: string;
          source: string;
          is_active: boolean;
          expires_at: string | null;
        }[]
      | null;
    const job = Array.isArray(joined) ? joined[0] ?? null : joined;
    const expiredByDate = row.expires_at ? new Date(row.expires_at).getTime() < now : false;
    const jobInactive = job ? !job.is_active || (job.expires_at && new Date(job.expires_at).getTime() < now) : true;
    const effectiveStatus =
      row.status !== 'APPLIED' && row.status !== 'DECLINED' && (expiredByDate || jobInactive)
        ? 'EXPIRED'
        : row.status;
    const source = job ? normalizeOfferSource(job.source) : 'OTHER';
    return {
      id: row.id,
      status: effectiveStatus,
      matchScore: row.match_score,
      matchNote: row.match_note,
      offerSummary: row.offer_summary,
      companyName: row.company_name,
      invitedAt: row.invited_at,
      jobId: row.job_id,
      jobTitle: job?.title ?? 'Offre',
      jobUrl: job?.url ?? null,
      source,
      sourceLabel: normalizedSourceLabel(source),
    };
  });

  return NextResponse.json({ items });
}
