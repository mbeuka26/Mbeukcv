import type { SupabaseClient } from '@supabase/supabase-js';
import { contentFingerprint, findDuplicateOffer } from '@/lib/jobExchange/dedupe';
import { matchCandidatesForOffer } from '@/lib/jobExchange/matchCandidates';
import { createOpportunityNotification } from '@/lib/jobExchange/notifications';
import { NOTIFY_SCORE_MIN } from '@/lib/jobExchange/constants';
import { OFFER_SOURCE_INTERNAL, mbeukOfferUrl } from '@/lib/jobExchange/sources';
import { readAlert } from '@/lib/jobAlert';

export interface MbeukOfferPayload {
  externalRef: string;
  title: string;
  company: string;
  location?: string | null;
  description?: string | null;
  skills?: string[];
  url?: string | null;
  contactEmail?: string | null;
  datePosted?: string | null;
  deadlineDate?: string | null;
  expiresAt?: string | null;
  type?: 'job' | 'scholarship' | 'concours' | 'other';
  offerSummary?: string | null;
}

export interface IngestResult {
  jobId: string;
  created: boolean;
  matched: number;
  notified: number;
}

function summaryFromOffer(payload: MbeukOfferPayload): string {
  if (payload.offerSummary?.trim()) return payload.offerSummary.trim().slice(0, 500);
  return (payload.description ?? '').trim().slice(0, 280) || payload.title;
}

export async function ingestMbeukOffer(client: SupabaseClient, payload: MbeukOfferPayload): Promise<IngestResult> {
  const externalRef = payload.externalRef.trim();
  if (!externalRef) throw new Error('externalRef requis.');
  const url = (payload.url?.trim() || mbeukOfferUrl(externalRef)).slice(0, 2000);
  const skills = (payload.skills ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 40);
  const fingerprint = contentFingerprint({
    title: payload.title,
    company: payload.company,
    location: payload.location ?? null,
    description: payload.description ?? null,
  });

  const duplicate = await findDuplicateOffer(client, {
    source: OFFER_SOURCE_INTERNAL,
    externalRef,
    url,
    fingerprint,
  });

  const row = {
    title: payload.title.trim(),
    company: payload.company.trim(),
    location: payload.location?.trim() || null,
    type: payload.type ?? 'job',
    source: OFFER_SOURCE_INTERNAL,
    url,
    description: payload.description?.trim() || null,
    skills,
    contact_email: payload.contactEmail?.trim() || null,
    date_posted: payload.datePosted || null,
    deadline_date: payload.deadlineDate || null,
    expires_at: payload.expiresAt || null,
    is_active: true,
    external_ref: externalRef,
    content_fingerprint: fingerprint,
  };

  let jobId: string;
  let created = false;

  if (duplicate) {
    const patch =
      duplicate.source === OFFER_SOURCE_INTERNAL
        ? row
        : {
            external_ref: externalRef,
            is_active: true,
            expires_at: row.expires_at,
            content_fingerprint: fingerprint,
          };
    const { data, error } = await client
      .from('job_offers')
      .update(patch)
      .eq('id', duplicate.id)
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    jobId = data.id;
  } else {
    const { data, error } = await client.from('job_offers').insert(row).select('id').single();
    if (error) throw new Error(error.message);
    jobId = data.id;
    created = true;
  }

  const offer = {
    title: row.title,
    description: row.description,
    skills: row.skills,
    location: row.location,
  };

  const candidates = await matchCandidatesForOffer(client, offer);
  let notified = 0;
  const summary = summaryFromOffer(payload);

  for (const candidate of candidates) {
    const { data: existing } = await client
      .from('job_exchange_invitations')
      .select('id, status')
      .eq('user_id', candidate.userId)
      .eq('job_id', jobId)
      .maybeSingle();

    if (existing && !['DISCOVERED', 'INVITED'].includes(existing.status)) continue;

    const upsertRow = {
      user_id: candidate.userId,
      job_id: jobId,
      company_name: row.company,
      status: existing?.status === 'INVITED' ? 'INVITED' : 'DISCOVERED',
      match_score: candidate.score,
      match_note: candidate.note,
      offer_summary: summary,
      updated_at: new Date().toISOString(),
      expires_at: row.expires_at,
    };

    const { data: invitation, error: invError } = await client
      .from('job_exchange_invitations')
      .upsert(upsertRow, { onConflict: 'user_id,job_id' })
      .select('id, status')
      .single();
    if (invError) throw new Error(invError.message);

    if (candidate.score >= NOTIFY_SCORE_MIN) {
      const alert = await readAlert(candidate.userId);
      if (alert.on) {
        const sent = await createOpportunityNotification(client, {
          userId: candidate.userId,
          invitationId: invitation.id,
          companyName: row.company,
          jobTitle: row.title,
          score: candidate.score,
        });
        if (sent) notified += 1;
      }
    }
  }

  return { jobId, created, matched: candidates.length, notified };
}

export async function closeMbeukOffer(client: SupabaseClient, externalRef: string): Promise<void> {
  const ref = externalRef.trim();
  const { data: job } = await client
    .from('job_offers')
    .select('id')
    .eq('source', OFFER_SOURCE_INTERNAL)
    .eq('external_ref', ref)
    .maybeSingle();
  if (!job) return;

  await client.from('job_offers').update({ is_active: false }).eq('id', job.id);
  await client
    .from('job_exchange_invitations')
    .update({ status: 'EXPIRED', updated_at: new Date().toISOString() })
    .eq('job_id', job.id)
    .in('status', ['DISCOVERED', 'INVITED', 'VIEWED', 'INTERESTED']);
}
