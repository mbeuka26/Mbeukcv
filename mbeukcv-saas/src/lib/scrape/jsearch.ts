import { classifyOffer, extractContactEmail, extractListedSkills, type OfferType } from '@/lib/offers/rules';
import type { ScrapedDraft } from '@/lib/scrape/listing';

interface JSearchJob {
  job_title?: string;
  employer_name?: string;
  job_city?: string;
  job_country?: string;
  job_apply_link?: string;
  job_google_link?: string;
  job_description?: string;
  job_required_skills?: string[] | null;
  job_posted_at_datetime_utc?: string;
}

export async function searchJSearch(
  apiKey: string,
  query: string,
  options: { remoteOnly?: boolean; country?: string } = {},
): Promise<ScrapedDraft[]> {
  const url = new URL('https://jsearch.p.rapidapi.com/search-v2');
  url.searchParams.set('query', query);
  url.searchParams.set('num_pages', '1');
  url.searchParams.set('date_posted', 'month');
  if (options.remoteOnly) url.searchParams.set('remote_jobs_only', 'true');
  if (options.country?.trim()) url.searchParams.set('country', options.country.trim().toLowerCase());

  const response = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
    },
  });
  if (!response.ok) {
    throw new Error(`JSearch a répondu HTTP ${response.status}.`);
  }
  const body = await response.json().catch(() => null);
  const data = body?.data;
  const jobs: JSearchJob[] = Array.isArray(data) ? data : Array.isArray(data?.jobs) ? data.jobs : [];
  const drafts: ScrapedDraft[] = [];
  for (const job of jobs) {
    const title = job.job_title?.trim();
    const link = job.job_apply_link?.trim() || job.job_google_link?.trim();
    if (!title || !link || !/^https?:\/\//i.test(link)) continue;
    const description = job.job_description?.trim().slice(0, 4000) || null;
    const skills = Array.isArray(job.job_required_skills)
      ? job.job_required_skills.map((item) => String(item).trim()).filter(Boolean).slice(0, 20)
      : extractListedSkills(description);
    const posted = job.job_posted_at_datetime_utc?.slice(0, 10) || null;
    drafts.push({
      title: title.slice(0, 180),
      company: (job.employer_name?.trim() || 'Non indiqué').slice(0, 160),
      location: [job.job_city, job.job_country].filter(Boolean).join(', ') || null,
      type: classifyOffer(title, description) satisfies OfferType,
      source: 'jsearch',
      url: link,
      description,
      skills,
      contactEmail: extractContactEmail(description),
      datePosted: posted && /^\d{4}-\d{2}-\d{2}$/.test(posted) ? posted : null,
    });
  }
  return drafts;
}
