import { JOB_SITE_SOURCES, type JobSiteSource } from '../../../contracts/jobSources.ts';
import type { CollectedOffer } from './jobRecord.ts';
import { upsertCollectedOffers } from './jobRecord.ts';

const USER_AGENT = "MbeukCVProBot/1.0 (+https://mbeukcv.pro/bot; collecte d'offres publiques)";
const NAV = /accueil|contact|connexion|inscri|facebook|twitter|instagram|linkedin|mentions|confidential|cookie|a propos|à propos|newsletter|publier/i;
const JOB_PATH = /\/(offre|job|emploi|vacance|recrut|annonce|stage)/i;

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractLinks(html: string, listingUrl: string, source: JobSiteSource): CollectedOffer[] {
  const base = new URL(listingUrl);
  const seen = new Set<string>();
  const offers: CollectedOffer[] = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) && offers.length < 30) {
    const titre = stripTags(match[2]);
    if (titre.length < 12 || titre.length > 160 || NAV.test(titre)) continue;
    let href: URL;
    try {
      href = new URL(match[1], base);
    } catch {
      continue;
    }
    if (href.protocol !== 'http:' && href.protocol !== 'https:') continue;
    if (href.hostname !== base.hostname) continue;
    if (href.pathname === base.pathname) continue;
    if (!JOB_PATH.test(href.pathname) && !/\d{3,}/.test(href.pathname)) continue;
    const url = href.toString();
    if (seen.has(url)) continue;
    seen.add(url);
    offers.push({
      id: `${source.id}:${href.pathname}`.slice(0, 200),
      titre,
      entreprise: source.nom,
      lieu: source.pays,
      url,
      description: null,
      source: source.id,
      pays: source.pays,
      collecte: 'scrape',
    });
  }
  return offers;
}

async function scrapeOne(source: JobSiteSource): Promise<number> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(source.listingUrl, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn('listing-scrape: http', source.id, response.status);
      return 0;
    }
    const html = await response.text();
    const offers = extractLinks(html, source.listingUrl, source);
    return await upsertCollectedOffers(offers);
  } catch (err) {
    console.warn('listing-scrape: ignoré', source.id, err instanceof Error ? err.message : err);
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

export async function scrapePublicListings(): Promise<{ sites: number; offres: number }> {
  const sources = JOB_SITE_SOURCES.filter((source) => source.parser === 'links');
  let cursor = 0;
  let offres = 0;
  async function worker() {
    while (cursor < sources.length) {
      const source = sources[cursor];
      cursor += 1;
      offres += await scrapeOne(source);
    }
  }
  await Promise.all(Array.from({ length: 6 }, () => worker()));
  return { sites: sources.length, offres };
}
