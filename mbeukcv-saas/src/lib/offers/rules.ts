export type OfferType = 'job' | 'scholarship' | 'concours' | 'other';

export interface RetentionInput {
  description: string | null;
  datePosted: string | null;
  now: Date;
}

export interface RetentionDecision {
  deadlineDate: string | null;
  datePosted: string | null;
  expiresAt: string | null;
  store: boolean;
}

const MONTHS: Record<string, number> = {
  janvier: 0,
  janv: 0,
  jan: 0,
  février: 1,
  fevrier: 1,
  févr: 1,
  fevr: 1,
  fév: 1,
  fev: 1,
  mars: 2,
  mar: 2,
  avril: 3,
  avr: 3,
  mai: 4,
  juin: 5,
  jun: 5,
  juillet: 6,
  juil: 6,
  jul: 6,
  août: 7,
  aout: 7,
  septembre: 8,
  sept: 8,
  sep: 8,
  octobre: 9,
  oct: 9,
  novembre: 10,
  nov: 10,
  décembre: 11,
  decembre: 11,
  déc: 11,
  dec: 11,
};

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function todayWat(now: Date): string {
  const shifted = new Date(now.getTime() + 60 * 60 * 1000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

export function endOfDayWat(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day, 22, 59, 59));
}

function addDays(isoDate: string, days: number): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days, 22, 59, 59));
}

function formatParts(year: number, monthIndex: number, day: number): string | null {
  if (year < 2000 || year > 2100 || monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null;
  const check = new Date(Date.UTC(year, monthIndex, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== monthIndex || check.getUTCDate() !== day) return null;
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

function monthIndex(token: string): number | null {
  const key = token.toLowerCase().replace(/\.$/, '');
  return key in MONTHS ? MONTHS[key] : null;
}

export function parseDeadline(description: string): { year: number; monthIndex: number; day: number } | null {
  const match = description.match(
    /(?:date\s+limite|limite\s+de\s+(?:d[ée]p[ôo]t|candidature)|avant\s+le|deadline|cl[ôo]ture|[ée]ch[ée]ance)[^\d]{0,40}(\d{1,2})(?:er)?(?:[\/\-.](\d{1,2})[\/\-.](\d{4})|\s+([a-zàâéèêëîïôùûüç.]+)\.?\s+(\d{4}))/i,
  );
  if (!match) return null;
  const day = Number(match[1]);
  if (match[3]) {
    const month = Number(match[2]) - 1;
    const year = Number(match[3]);
    const formatted = formatParts(year, month, day);
    if (!formatted) return null;
    return { year, monthIndex: month, day };
  }
  const month = monthIndex(match[4] ?? '');
  const year = Number(match[5]);
  if (month == null || !formatParts(year, month, day)) return null;
  return { year, monthIndex: month, day };
}

export function decideRetention(input: RetentionInput): RetentionDecision {
  const found = input.description ? parseDeadline(input.description) : null;
  if (found) {
    const expires = endOfDayWat(found.year, found.monthIndex, found.day);
    const deadlineDate = formatParts(found.year, found.monthIndex, found.day);
    return {
      deadlineDate,
      datePosted: input.datePosted,
      expiresAt: expires.toISOString(),
      store: expires.getTime() >= input.now.getTime(),
    };
  }

  const datePosted = input.datePosted ?? todayWat(input.now);
  const expires = addDays(datePosted, 30);
  return {
    deadlineDate: null,
    datePosted,
    expiresAt: expires.toISOString(),
      store: expires.getTime() >= input.now.getTime(),
  };
}

export function graceCutoff(now: Date): string {
  return new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
}

export function classifyOffer(title: string, description: string | null): OfferType {
  const text = `${title} ${description ?? ''}`.toLowerCase();
  if (/bourse|scholarship/.test(text)) return 'scholarship';
  if (/concours/.test(text)) return 'concours';
  if (/appel\s+à\s+candidature|appel\s+a\s+candidature|volontariat|stage/.test(text)) return 'other';
  return 'job';
}

export function extractContactEmail(description: string | null): string | null {
  if (!description) return null;
  const match = description.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (!match) return null;
  const email = match[0].toLowerCase();
  if (email.endsWith('@example.com') || email.startsWith('noreply@') || email.startsWith('no-reply@')) return null;
  return email;
}

export function extractRecruiterName(description: string | null): string | null {
  if (!description) return null;
  const match = description.match(/(?:recruteur|contact|responsable(?:\s+du\s+recrutement)?|hiring manager|à l['’]attention de)\s*[:\-–]\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’\-]+(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’\-]+){0,3})/i);
  if (!match) return null;
  const name = match[1].replace(/\s+/g, ' ').trim();
  if (name.length < 3 || name.includes('@') || /^(email|mail|tél|tel)$/i.test(name)) return null;
  return name.slice(0, 80);
}

export function extractListedSkills(description: string | null): string[] {
  if (!description) return [];
  const match = description.match(/comp[eé]tences?(?:\s+(?:requises|cl[eé]s|techniques))?\s*[:\-]\s*([^\n]{3,300})/i);
  if (!match) return [];
  const seen = new Set<string>();
  const skills: string[] = [];
  for (const part of match[1].split(/[,;•|/]/)) {
    const skill = part.replace(/\s+/g, ' ').trim();
    const key = skill.toLowerCase();
    if (skill.length < 2 || skill.length > 40 || seen.has(key)) continue;
    seen.add(key);
    skills.push(skill);
    if (skills.length === 20) break;
  }
  return skills;
}
