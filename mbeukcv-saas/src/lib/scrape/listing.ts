import * as cheerio from 'cheerio';
import { classifyOffer, type OfferType } from '@/lib/offers/rules';
import type { ListingSource } from '@/lib/scrape/sources';

export interface ScrapedDraft {
  title: string;
  company: string;
  location: string | null;
  type: OfferType;
  source: string;
  url: string;
  description: string | null;
  skills: string[];
  contactEmail: string | null;
  datePosted: string | null;
}

const NAV = /accueil|contact|connexion|inscri|facebook|twitter|instagram|linkedin|mentions|confidential|cookie|à propos|a propos|newsletter|publier/i;
const JOB_PATH = /\/(offre|job|emploi|vacance|recrut|annonce|stage|bourse|concours)/i;

export function draftsFromHtml(html: string, source: ListingSource): ScrapedDraft[] {
  const $ = cheerio.load(html);
  const base = new URL(source.listingUrl);
  const seen = new Set<string>();
  const drafts: ScrapedDraft[] = [];

  $('a[href]').each((_, element) => {
    if (drafts.length >= 40) return;
    const title = $(element).text().replace(/\s+/g, ' ').trim();
    if (title.length < 12 || title.length > 160 || NAV.test(title)) return;
    const href = $(element).attr('href');
    if (!href) return;
    let url: URL;
    try {
      url = new URL(href, base);
    } catch {
      return;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    if (url.hostname !== base.hostname) return;
    if (url.pathname === base.pathname) return;
    if (!JOB_PATH.test(url.pathname) && !/\d{3,}/.test(url.pathname)) return;
    const absolute = url.toString();
    if (seen.has(absolute)) return;
    seen.add(absolute);
    drafts.push({
      title,
      company: 'Non indiqué',
      location: source.location,
      type: classifyOffer(title, null),
      source: source.id,
      url: absolute,
      description: null,
      skills: [],
      contactEmail: null,
      datePosted: null,
    });
  });

  return drafts;
}

export function textFromOfferHtml(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript, svg, nav, footer, header, form').remove();
  return $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000);
}

export async function fetchOfferText(pageUrl: string): Promise<string | null> {
  let target: URL;
  try {
    target = new URL(pageUrl);
  } catch {
    return null;
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(target, {
      headers: {
        'User-Agent': 'MbeukCVBot/1.0 (+https://mbeukcv.pro/bot; offres publiques)',
        Accept: 'text/html',
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const text = textFromOfferHtml(await response.text());
    return text.length >= 80 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function scrapeSource(source: ListingSource): Promise<ScrapedDraft[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(source.listingUrl, {
      headers: {
        'User-Agent': 'MbeukCVBot/1.0 (+https://mbeukcv.pro/bot; offres publiques)',
        Accept: 'text/html',
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn('scrape: http', source.id, response.status);
      return [];
    }
    return draftsFromHtml(await response.text(), source);
  } catch (error) {
    console.warn('scrape: ignoré', source.id, error instanceof Error ? error.message : error);
    return [];
  } finally {
    clearTimeout(timer);
  }
}
