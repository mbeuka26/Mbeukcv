import type { CollectedOffer } from './jobRecord.ts';

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readJob(item: Record<string, unknown>, index: number): CollectedOffer | null {
  const titre = asText(item.title || item.titre || item.job_title || item.name);
  const lien = asText(item.url || item.link || item.apply_url || item.job_apply_link);
  if (titre.length < 4 || !/^https?:\/\//i.test(lien)) return null;
  const entreprise = asText(item.company || item.entreprise || item.employer_name) || 'Africawork';
  const lieu = asText(item.location || item.lieu || item.city) || null;
  const pays = asText(item.country || item.pays) || null;
  return {
    id: `africawork:${asText(item.id) || String(index)}:${lien}`.slice(0, 200),
    titre: titre.slice(0, 180),
    entreprise: entreprise.slice(0, 160),
    lieu,
    url: lien,
    description: asText(item.description).slice(0, 4000) || null,
    source: 'africawork-api',
    pays,
    collecte: 'africawork',
  };
}

/**
 * Africawork ne publie pas d'URL d'API stable. L'appel n'a lieu que si
 * AFRICAWORK_API_URL est posé dans les secrets du projet métier.
 */
export async function searchAfricawork(apiKey: string, apiUrl: string, query: string): Promise<CollectedOffer[]> {
  const url = new URL(apiUrl);
  url.searchParams.set('q', query);
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Africawork a répondu HTTP ${response.status}.`);
  }
  const body = await response.json().catch(() => null);
  const list: unknown[] = Array.isArray(body)
    ? body
    : Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body?.jobs)
        ? body.jobs
        : [];
  return list
    .map((item, index) => (item && typeof item === 'object' ? readJob(item as Record<string, unknown>, index) : null))
    .filter((item): item is CollectedOffer => item !== null);
}
