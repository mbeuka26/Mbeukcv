import type { SupabaseClient } from '@supabase/supabase-js';
import { decideRetention, extractContactEmail, extractListedSkills } from '@/lib/offers/rules';
import { searchJSearch } from '@/lib/scrape/jsearch';
import type { ScrapedDraft } from '@/lib/scrape/listing';
import { scrapeSource } from '@/lib/scrape/listing';
import type { MetierQuery } from '@/lib/scrape/rotation';
import { LISTING_SOURCES } from '@/lib/scrape/sources';

export interface IngestSummary {
  found: number;
  stored: number;
  skippedExpired: number;
  jsearch: string;
  jsearchAttempts: number;
}

interface RetainedOffer extends ScrapedDraft {
  datePosted: string | null;
  deadlineDate: string | null;
  expiresAt: string;
}

function dedupe(drafts: ScrapedDraft[]): ScrapedDraft[] {
  const seen = new Set<string>();
  const result: ScrapedDraft[] = [];
  for (const draft of drafts) {
    if (seen.has(draft.url)) continue;
    seen.add(draft.url);
    result.push(draft);
  }
  return result;
}

export function retainDrafts(drafts: ScrapedDraft[], now = new Date()): { kept: RetainedOffer[]; skippedExpired: number } {
  const kept: RetainedOffer[] = [];
  let skippedExpired = 0;
  for (const draft of dedupe(drafts)) {
    const decision = decideRetention({
      description: draft.description,
      datePosted: draft.datePosted,
      now,
    });
    if (!decision.store || !decision.expiresAt) {
      skippedExpired += 1;
      continue;
    }
    const skills = draft.skills.length > 0 ? draft.skills : extractListedSkills(draft.description);
    kept.push({
      ...draft,
      skills,
      contactEmail: draft.contactEmail ?? extractContactEmail(draft.description),
      datePosted: decision.datePosted,
      deadlineDate: decision.deadlineDate,
      expiresAt: decision.expiresAt,
    });
  }
  return { kept, skippedExpired };
}

export async function scrapePublicBoards(): Promise<ScrapedDraft[]> {
  const pages = await Promise.all(LISTING_SOURCES.map((source) => scrapeSource(source)));
  return pages.flat();
}

export async function scrapeJSearch(
  apiKey: string,
  queries: MetierQuery[],
): Promise<{ drafts: ScrapedDraft[]; note: string; attempted: number }> {
  if (!apiKey) return { drafts: [], note: 'JSearch non configuré.', attempted: 0 };
  if (queries.length === 0) return { drafts: [], note: 'Aucune requête JSearch pour cette collecte.', attempted: 0 };
  const drafts: ScrapedDraft[] = [];
  const notes: string[] = [];
  for (const item of queries) {
    try {
      const found = await searchJSearch(apiKey, item.query);
      drafts.push(...found);
      notes.push(found.length === 0 ? `${item.label} : aucune offre.` : `${item.label} : ${found.length} offre(s).`);
    } catch (error) {
      notes.push(error instanceof Error ? `${item.label} : ${error.message}` : `${item.label} : JSearch indisponible.`);
    }
  }
  return { drafts, note: notes.join(' '), attempted: queries.length };
}

export async function upsertOffers(client: SupabaseClient, offers: RetainedOffer[]): Promise<number> {
  if (offers.length === 0) return 0;
  const rows = offers.map((offer) => ({
    title: offer.title,
    company: offer.company,
    location: offer.location,
    type: offer.type,
    source: offer.source,
    url: offer.url,
    description: offer.description,
    skills: offer.skills,
    contact_email: offer.contactEmail,
    date_posted: offer.datePosted,
    deadline_date: offer.deadlineDate,
    expires_at: offer.expiresAt,
    is_active: true,
  }));
  const { error } = await client.from('job_offers').upsert(rows, { onConflict: 'url' });
  if (error) throw new Error(error.message);
  return rows.length;
}

export async function ingestOffers(
  client: SupabaseClient,
  apiKey: string,
  boards: ScrapedDraft[] | null = null,
  queries: MetierQuery[] = [],
): Promise<IngestSummary> {
  const publicBoards = boards ?? (await scrapePublicBoards());
  const remote = await scrapeJSearch(apiKey, queries);
  const { kept, skippedExpired } = retainDrafts([...publicBoards, ...remote.drafts]);
  const stored = await upsertOffers(client, kept);
  return {
    found: publicBoards.length + remote.drafts.length,
    stored,
    skippedExpired,
    jsearch: remote.note,
    jsearchAttempts: remote.attempted,
  };
}
