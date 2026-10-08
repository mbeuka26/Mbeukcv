export const OFFER_SOURCE_INTERNAL = 'INTERNAL_MBEUKRH' as const;
export const OFFER_SOURCE_SCRAPING_PREFIX = 'SCRAPING' as const;
export const OFFER_SOURCE_RAPIDAPI_LEGACY = 'jsearch' as const;
export const OFFER_SOURCE_RAPIDAPI = 'RAPIDAPI' as const;
export const OFFER_SOURCE_OTHER = 'OTHER' as const;

export type NormalizedOfferSource =
  | typeof OFFER_SOURCE_INTERNAL
  | typeof OFFER_SOURCE_SCRAPING_PREFIX
  | typeof OFFER_SOURCE_RAPIDAPI
  | typeof OFFER_SOURCE_OTHER;

/** Affichage et rapports — les valeurs legacy en base restent inchangées. */
export function normalizeOfferSource(raw: string): NormalizedOfferSource {
  if (raw === OFFER_SOURCE_INTERNAL) return OFFER_SOURCE_INTERNAL;
  if (raw === OFFER_SOURCE_RAPIDAPI_LEGACY || raw === OFFER_SOURCE_RAPIDAPI) return OFFER_SOURCE_RAPIDAPI;
  if (raw === 'system') return OFFER_SOURCE_OTHER;
  if (raw.startsWith('INTERNAL_')) return OFFER_SOURCE_INTERNAL;
  return OFFER_SOURCE_SCRAPING_PREFIX;
}

export function normalizedSourceLabel(source: NormalizedOfferSource): string {
  switch (source) {
    case OFFER_SOURCE_INTERNAL:
      return 'Mbeuk Job Exchange';
    case OFFER_SOURCE_RAPIDAPI:
      return 'RapidAPI / JSearch';
    case OFFER_SOURCE_SCRAPING_PREFIX:
      return 'Scraping';
    default:
      return 'Autre';
  }
}

export function mbeukOfferUrl(externalRef: string): string {
  return `https://job-exchange.mbeuk.internal/offers/${encodeURIComponent(externalRef)}`;
}
