export type EducationLevel =
  | 'any'
  | 'bac'
  | 'licence'
  | 'master'
  | 'doctorat'
  | 'ingenieur';

export interface JobMeta {
  country: string | null;
  isInternational: boolean;
  minExperienceYears: number | null;
  educationLevel: EducationLevel;
}

const COUNTRY_ALIASES: Record<string, string> = {
  france: 'France',
  fr: 'France',
  canada: 'Canada',
  ca: 'Canada',
  cameroun: 'Cameroun',
  cm: 'Cameroun',
  'united states': 'États-Unis',
  usa: 'États-Unis',
  us: 'États-Unis',
  'united kingdom': 'Royaume-Uni',
  uk: 'Royaume-Uni',
  gb: 'Royaume-Uni',
  belgique: 'Belgique',
  be: 'Belgique',
  suisse: 'Suisse',
  ch: 'Suisse',
  senegal: 'Sénégal',
  sn: 'Sénégal',
  'côte d\'ivoire': "Côte d'Ivoire",
  'cote d\'ivoire': "Côte d'Ivoire",
  ci: "Côte d'Ivoire",
  gabon: 'Gabon',
  ga: 'Gabon',
  allemagne: 'Allemagne',
  de: 'Allemagne',
  espagne: 'Espagne',
  es: 'Espagne',
};

function normalizeCountryToken(value: string): string | null {
  const key = value.trim().toLowerCase();
  return COUNTRY_ALIASES[key] ?? (value.length >= 3 ? value.trim() : null);
}

export function parseCountryFromLocation(location: string | null): string | null {
  if (!location?.trim()) return null;
  const parts = location.split(',').map((part) => part.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const mapped = normalizeCountryToken(parts[i]);
    if (mapped) return mapped;
  }
  return normalizeCountryToken(location);
}

export function parseMinExperienceYears(text: string): number | null {
  const lower = text.toLowerCase();
  const explicit = lower.match(/(\d+)\s*(?:\+?\s*)?(?:ans|années|years|yr)\s*(?:d['’]?expérience|experience|exp)/i);
  if (explicit) return Math.min(30, Number(explicit[1]));
  if (/débutant|junior|entry level|0\s*-\s*2\s*ans/i.test(lower)) return 0;
  if (/senior|expérimenté|experimente|5\s*\+/i.test(lower)) return 5;
  if (/mid[- ]level|intermédiaire|2\s*-\s*5/i.test(lower)) return 2;
  return null;
}

export function parseEducationLevel(text: string): EducationLevel {
  const lower = text.toLowerCase();
  if (/doctorat|ph\.?d|doctorate/i.test(lower)) return 'doctorat';
  if (/master|mba|ingénieur|ingenieur|engineering degree/i.test(lower)) return /ingénieur|ingenieur/i.test(lower) ? 'ingenieur' : 'master';
  if (/licence|bachelor|bac\s*\+\s*3|bts\s*\+\s*3/i.test(lower)) return 'licence';
  if (/bac\s*\+\s*2|bts|dut|deug/i.test(lower)) return 'bac';
  return 'any';
}

export function deriveJobMeta(input: {
  location: string | null;
  description: string | null;
  title: string;
  source: string;
}): JobMeta {
  const blob = [input.title, input.description, input.location].filter(Boolean).join('\n');
  const lower = blob.toLowerCase();
  const country = parseCountryFromLocation(input.location);
  const remoteLike = /remote|télétravail|teletravail|work from home|worldwide|international|visa sponsor|relocation|anywhere|global hiring/i.test(lower);
  const isInternational = input.source === 'jsearch' || remoteLike || Boolean(country && country !== 'Cameroun');
  return {
    country,
    isInternational,
    minExperienceYears: parseMinExperienceYears(blob),
    educationLevel: parseEducationLevel(blob),
  };
}

export function educationLabel(level: EducationLevel): string {
  switch (level) {
    case 'bac': return 'Bac / Bac+2';
    case 'licence': return 'Licence / Bac+3';
    case 'master': return 'Master / Bac+5';
    case 'doctorat': return 'Doctorat';
    case 'ingenieur': return 'Ingénieur';
    default: return 'Non précisé';
  }
}
