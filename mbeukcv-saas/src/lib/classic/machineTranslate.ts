import 'server-only';
import { translate } from 'google-translate-api-x';
import type { ClassicDisplayLocale } from '@/lib/classic/locales';

const SOURCE = 'fr';

/** Cible pour LibreTranslate / Google (sans distinction fine en-US / en-GB côté Google). */
export function machineTargetCode(locale: ClassicDisplayLocale): string {
  switch (locale) {
    case 'en-US':
    case 'en-GB':
      return 'en';
    case 'zh':
      return 'zh-CN';
    default:
      return locale;
  }
}

function libreTranslateUrl(): string | null {
  const raw = process.env.LIBRETRANSLATE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

async function translateViaLibre(text: string, target: string): Promise<string> {
  const base = libreTranslateUrl();
  if (!base) throw new Error('LibreTranslate non configuré.');
  const key = process.env.LIBRETRANSLATE_API_KEY?.trim();
  const response = await fetch(`${base}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source: SOURCE,
      target,
      format: 'text',
      ...(key ? { api_key: key } : {}),
    }),
  });
  if (!response.ok) {
    throw new Error(`LibreTranslate (${response.status})`);
  }
  const body = (await response.json()) as { translatedText?: string };
  if (typeof body.translatedText !== 'string' || !body.translatedText.trim()) {
    throw new Error('LibreTranslate: réponse vide.');
  }
  return body.translatedText;
}

async function translateViaGoogle(text: string, target: string): Promise<string> {
  const result = await translate(text, { from: SOURCE, to: target, autoCorrect: false });
  const out = result.text?.trim();
  if (!out) throw new Error('Traduction Google: réponse vide.');
  return out;
}

/** Légère passe UK si la cible est en-GB (Google renvoie souvent de l’anglais US). */
function applyBritishSpelling(text: string, locale: ClassicDisplayLocale): string {
  if (locale !== 'en-GB') return text;
  return text
    .replace(/\borganization\b/gi, 'organisation')
    .replace(/\borganizations\b/gi, 'organisations')
    .replace(/\borganize\b/gi, 'organise')
    .replace(/\borganized\b/gi, 'organised')
    .replace(/\borganizing\b/gi, 'organising')
    .replace(/\bcolor\b/gi, 'colour')
    .replace(/\bcolors\b/gi, 'colours')
    .replace(/\bcenter\b/gi, 'centre')
    .replace(/\bcenters\b/gi, 'centres')
    .replace(/\blabor\b/gi, 'labour')
    .replace(/\bprogram\b/gi, 'programme')
    .replace(/\bprograms\b/gi, 'programmes')
    .replace(/\bbehavior\b/gi, 'behaviour')
    .replace(/\banalyze\b/gi, 'analyse')
    .replace(/\banalyzed\b/gi, 'analysed')
    .replace(/\bfavor\b/gi, 'favour')
    .replace(/\bhonor\b/gi, 'honour');
}

export function shouldSkipMachineTranslate(segment: string): boolean {
  const s = segment.trim();
  if (!s) return true;
  if (/^[\w.+-]+@[\w.-]+\.\w+$/.test(s)) return true;
  if (/^https?:\/\//i.test(s)) return true;
  if (/^www\./i.test(s)) return true;
  if (/^\+?[\d\s().-]{8,}$/.test(s)) return true;
  return false;
}

let lastCallAt = 0;
const MIN_GAP_MS = 120;

async function throttle(): Promise<void> {
  const now = Date.now();
  const wait = MIN_GAP_MS - (now - lastCallAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastCallAt = Date.now();
}

export async function machineTranslateSegment(text: string, locale: ClassicDisplayLocale): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed || shouldSkipMachineTranslate(trimmed)) return text;
  if (locale === 'fr') return text;

  const target = machineTargetCode(locale);
  await throttle();

  let translated: string;
  if (libreTranslateUrl()) {
    try {
      translated = await translateViaLibre(trimmed, target);
    } catch {
      translated = await translateViaGoogle(trimmed, target);
    }
  } else {
    translated = await translateViaGoogle(trimmed, target);
  }

  return applyBritishSpelling(translated, locale);
}

export async function machineTranslateMultiline(text: string, locale: ClassicDisplayLocale): Promise<string> {
  if (!text.trim() || locale === 'fr') return text;
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push('');
      continue;
    }
    const bullet = /^([-–—•*]\s+)(.+)$/.exec(trimmed);
    const numbered = /^(\d+[.)]\s+)(.+)$/.exec(trimmed);
    const indent = line.slice(0, line.indexOf(trimmed));
    if (bullet) {
      const body = await machineTranslateSegment(bullet[2], locale);
      out.push(`${indent}${bullet[1]}${body}`);
    } else if (numbered) {
      const body = await machineTranslateSegment(numbered[2], locale);
      out.push(`${indent}${numbered[1]}${body}`);
    } else {
      out.push(`${indent}${await machineTranslateSegment(trimmed, locale)}`);
    }
  }
  return out.join('\n');
}
