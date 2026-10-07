import type { CollectedOffer } from './jobRecord.ts';

const HOST = 'jsearch.p.rapidapi.com';

interface JSearchJob {
  job_id?: string;
  job_title?: string;
  employer_name?: string;
  job_city?: string;
  job_country?: string;
  job_apply_link?: string;
  job_google_link?: string;
  job_description?: string;
}

export async function searchJSearch(apiKey: string, query: string): Promise<CollectedOffer[]> {
  const url = new URL(`https://${HOST}/search`);
  url.searchParams.set('query', query);
  url.searchParams.set('page', '1');
  url.searchParams.set('num_pages', '1');
  url.searchParams.set('date_posted', 'month');
  url.searchParams.set('language', 'fr');

  const response = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': HOST,
    },
  });
  if (!response.ok) {
    throw new Error(`JSearch a répondu HTTP ${response.status}.`);
  }
  const body = await response.json().catch(() => null);
  const jobs: JSearchJob[] = Array.isArray(body?.data) ? body.data : [];
  const offers: CollectedOffer[] = [];
  for (const job of jobs) {
    const titre = job.job_title?.trim();
    const lien = job.job_apply_link?.trim() || job.job_google_link?.trim();
    if (!titre || !lien || !/^https?:\/\//i.test(lien)) continue;
    const id = `jsearch:${(job.job_id || lien).slice(0, 180)}`;
    offers.push({
      id,
      titre: titre.slice(0, 180),
      entreprise: (job.employer_name?.trim() || 'Employeur non indiqué').slice(0, 160),
      lieu: [job.job_city, job.job_country].filter(Boolean).join(', ') || null,
      url: lien,
      description: job.job_description?.trim().slice(0, 4000) || null,
      source: 'jsearch',
      pays: job.job_country?.trim() || null,
      collecte: 'jsearch',
    });
  }
  return offers;
}
