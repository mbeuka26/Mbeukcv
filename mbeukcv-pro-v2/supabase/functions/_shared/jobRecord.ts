import { getSupabaseAdmin } from './supabaseAdmin.ts';

export interface CollectedOffer {
  id: string;
  titre: string;
  entreprise: string;
  lieu: string | null;
  url: string;
  description: string | null;
  source: string;
  pays: string | null;
  collecte: 'scrape' | 'jsearch' | 'africawork';
}

export async function upsertCollectedOffers(offers: CollectedOffer[]): Promise<number> {
  if (offers.length === 0) return 0;
  const admin = getSupabaseAdmin();
  const rows = offers.map((offer) => ({
    id: offer.id,
    titre: offer.titre,
    entreprise: offer.entreprise,
    lieu: offer.lieu,
    url: offer.url,
    description: offer.description,
    source: offer.source,
    pays: offer.pays,
    collecte: offer.collecte,
    scraped_at: new Date().toISOString(),
  }));
  const { error } = await admin.from('offres_globales').upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(error.message);
  return rows.length;
}
