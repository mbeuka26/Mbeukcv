import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { OFFER_SOURCE_INTERNAL } from '@/lib/jobExchange/sources';

export function contentFingerprint(input: {
  title: string;
  company: string;
  location: string | null;
  description: string | null;
}): string {
  const blob = [
    input.title.trim().toLowerCase(),
    input.company.trim().toLowerCase(),
    (input.location ?? '').trim().toLowerCase(),
    (input.description ?? '').trim().toLowerCase().slice(0, 2000),
  ].join('|');
  return createHash('sha256').update(blob).digest('hex').slice(0, 40);
}

export interface ExistingOfferRow {
  id: string;
  source: string;
  url: string;
  external_ref: string | null;
}

/** Trouve une offre existante (Exchange, URL ou empreinte contenu). */
export async function findDuplicateOffer(
  client: SupabaseClient,
  input: {
    source: string;
    externalRef: string;
    url: string;
    fingerprint: string;
  },
): Promise<ExistingOfferRow | null> {
  const { data: byRef } = await client
    .from('job_offers')
    .select('id, source, url, external_ref')
    .eq('source', input.source)
    .eq('external_ref', input.externalRef)
    .maybeSingle();
  if (byRef) return byRef;

  const { data: byUrl } = await client
    .from('job_offers')
    .select('id, source, url, external_ref')
    .eq('url', input.url)
    .maybeSingle();
  if (byUrl) return byUrl;

  const { data: byFp } = await client
    .from('job_offers')
    .select('id, source, url, external_ref')
    .eq('content_fingerprint', input.fingerprint)
    .neq('source', OFFER_SOURCE_INTERNAL)
    .limit(1)
    .maybeSingle();
  if (byFp) return byFp;

  return null;
}
