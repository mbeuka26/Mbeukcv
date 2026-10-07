import * as cheerio from 'npm:cheerio@1.0.0';
import { getSupabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { cronSecretsMatch } from '../_shared/cronSecret.ts';
import { scrapePublicListings } from '../_shared/listingScrape.ts';

/**
 * ════════════════════════════════════════════════════════════
 * scrape-offers — Edge Function planifiée (portage Deno)
 * ════════════════════════════════════════════════════════════
 * Logique d'extraction identique à la version Firebase d'origine
 * (déjà validée empiriquement contre le vrai site MinaJobs) : chaque
 * offre correspond à un lien `<a href="/emplois-stage-recrutement/{id}/...">`
 * dont le texte agrégé contient les marqueurs "Company name" /
 * "Company location" / "Date created" juste avant les valeurs. Voir
 * l'historique du projet pour la méthodologie de vérification.
 *
 * Différences vs la version Firebase :
 *   - `fetch` natif Deno au lieu d'axios (Deno l'a nativement).
 *   - `.upsert()` Supabase au lieu de `batch.set()` Firestore.
 *   - Déclenchement planifié via Supabase Cron (pg_cron). L'appel doit
 *     porter l'en-tête x-cron-secret égal à SCRAPE_CRON_SECRET. Sans
 *     secret, ou avec un secret faux, la fonction répond 401. Pas de CORS.
 */

const TARGET_URL = 'https://www.minajobs.net/offres-emplois-stages';
const REQUEST_TIMEOUT_MS = 15_000;
const USER_AGENT =
  "MbeukCVProBot/1.0 (+https://mbeukcv.pro/bot; agrégateur d'offres pour usage candidat, respecte robots.txt)";
const DETAIL_FETCH_DELAY_MS = 400;
const MAX_DETAIL_FETCHES_PER_RUN = 25;

interface ScrapedOffer {
  offreId: string;
  titre: string;
  entreprise: string;
  lieu: string | null;
  url: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

function extractBetween(text: string, startMarker: string, endMarker: string | null): string | null {
  const startIdx = text.indexOf(startMarker);
  if (startIdx === -1) return null;
  const from = startIdx + startMarker.length;
  const endIdx = endMarker ? text.indexOf(endMarker, from) : -1;
  const raw = endIdx === -1 ? text.slice(from) : text.slice(from, endIdx);
  return cleanText(raw);
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export function extractOffersFromHtml(html: string, baseUrl: string): ScrapedOffer[] {
  const $ = cheerio.load(html);
  const seen = new Map<string, ScrapedOffer>();

  $('a[href*="/emplois-stage-recrutement/"]').each((_i, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    const match = href.match(/\/emplois-stage-recrutement\/(\d+)\//);
    if (!match) return;

    const offreId = match[1];
    if (seen.has(offreId)) return;

    const fullText = cleanText($(el).text());
    if (!fullText) return;

    const titre = extractBetween(fullText, '', 'Company name') ?? fullText.slice(0, 200);
    const entreprise = extractBetween(fullText, 'Company name', 'Company location') ?? 'Entreprise non précisée';
    const lieu = extractBetween(fullText, 'Company location', 'Date created');

    const absoluteUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();

    seen.set(offreId, {
      offreId,
      titre: titre.replace(/\s*Nouveau\s*$/i, '').trim() || 'Titre non précisé',
      entreprise,
      lieu,
      url: absoluteUrl,
    });
  });

  return Array.from(seen.values());
}

async function fetchOfferDetailExtras(url: string): Promise<{ email: string | null; description: string | null }> {
  try {
    const res = await fetchWithTimeout(url);
    const html = await res.text();

    const emailMatch = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

    const $ = cheerio.load(html);
    const metaDescription =
      $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || null;

    return {
      email: emailMatch ? emailMatch[0] : null,
      description: metaDescription ? cleanText(metaDescription).slice(0, 3000) : null,
    };
  } catch (err) {
    console.warn('scrape-offers: échec récupération page détail (ignoré)', { url, message: String(err) });
    return { email: null, description: null };
  }
}

export async function runScrape(): Promise<{ nbTrouvees: number; nbNouvelles: number }> {
  let html: string;
  try {
    const res = await fetchWithTimeout(TARGET_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (err) {
    console.error('scrape-offers: site cible inaccessible, run ignoré', { message: String(err) });
    return { nbTrouvees: 0, nbNouvelles: 0 };
  }

  let offers: ScrapedOffer[];
  try {
    offers = extractOffersFromHtml(html, TARGET_URL);
  } catch (err) {
    console.error('scrape-offers: échec de parsing HTML, run ignoré', { message: String(err) });
    return { nbTrouvees: 0, nbNouvelles: 0 };
  }

  if (offers.length === 0) {
    console.warn('scrape-offers: aucune offre détectée — la structure du site a peut-être changé.');
    return { nbTrouvees: 0, nbNouvelles: 0 };
  }

  const admin = getSupabaseAdmin();

  const { data: existingRows, error: existingError } = await admin
    .from('offres_globales')
    .select('id')
    .in('id', offers.map((o) => o.offreId));

  if (existingError) {
    console.error('scrape-offers: échec lecture offres existantes', existingError);
    return { nbTrouvees: offers.length, nbNouvelles: 0 };
  }

  const existingIds = new Set((existingRows ?? []).map((r) => r.id as string));
  const newOffers = offers.filter((o) => !existingIds.has(o.offreId));

  let detailFetchesUsed = 0;
  const rows = [];

  for (const offer of newOffers) {
    let emailRecruteur: string | null = null;
    let description: string | null = null;

    if (detailFetchesUsed < MAX_DETAIL_FETCHES_PER_RUN) {
      const extras = await fetchOfferDetailExtras(offer.url);
      emailRecruteur = extras.email;
      description = extras.description;
      detailFetchesUsed += 1;
      await delay(DETAIL_FETCH_DELAY_MS);
    }

    rows.push({
      id: offer.offreId,
      titre: offer.titre,
      entreprise: offer.entreprise,
      lieu: offer.lieu,
      url: offer.url,
      email_recruteur: emailRecruteur,
      description,
      source: 'minajobs.net',
      pays: 'Cameroun',
      collecte: 'scrape',
      scraped_at: new Date().toISOString(),
    });
  }

  if (rows.length > 0) {
    const { error: upsertError } = await admin.from('offres_globales').upsert(rows, { onConflict: 'id' });
    if (upsertError) {
      console.error('scrape-offers: échec écriture', upsertError);
    }
  }

  console.log(JSON.stringify({ event: 'scrape-offers:done', nbTrouvees: offers.length, nbNouvelles: newOffers.length }));
  return { nbTrouvees: offers.length, nbNouvelles: newOffers.length };
}

Deno.serve(async (req: Request) => {
  const headers = { 'Content-Type': 'application/json' };

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ status: 'error', error: { message: 'Seule la méthode POST est autorisée.' } }), {
      status: 405,
      headers,
    });
  }

  const expected = Deno.env.get('SCRAPE_CRON_SECRET') ?? '';
  const provided = req.headers.get('x-cron-secret') ?? '';
  if (!expected) {
    console.error('scrape-offers: SCRAPE_CRON_SECRET absent');
  }
  if (!(await cronSecretsMatch(provided, expected))) {
    return new Response(JSON.stringify({ status: 'error', error: { code: 'unauthenticated', message: 'Secret de cron invalide.' } }), {
      status: 401,
      headers,
    });
  }

  const result = await runScrape();
  let pages = { sites: 0, offres: 0 };
  try {
    pages = await scrapePublicListings();
  } catch (err) {
    console.error('scrape-offers: pages publiques', err instanceof Error ? err.message : err);
  }

  return new Response(JSON.stringify({ status: 'success', data: { ...result, sites: pages.sites, offresPages: pages.offres } }), {
    status: 200,
    headers,
  });
});
