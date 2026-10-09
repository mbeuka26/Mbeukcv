import { NextResponse } from 'next/server';
import { isClassicDisplayLocale, type ClassicDisplayLocale } from '@/lib/classic/locales';
import { hasTranslatableContent, translateClassicCv } from '@/lib/classic/translateClassic';
import type { ClassicCvData } from '@/lib/classic/types';
import { takeClaudeCredit } from '@/lib/credits';
import { createSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

function readClassic(body: unknown): { cv: ClassicCvData; competences: string[]; locale: ClassicDisplayLocale } | null {
  if (!body || typeof body !== 'object') return null;
  const raw = body as { cv?: unknown; competences?: unknown; locale?: unknown };
  if (!raw.cv || typeof raw.cv !== 'object') return null;
  const locale = typeof raw.locale === 'string' ? raw.locale.trim() : '';
  if (!isClassicDisplayLocale(locale) || locale === 'fr') return null;
  const competences = Array.isArray(raw.competences)
    ? raw.competences.map((item) => String(item).trim()).filter(Boolean)
    : [];
  return { cv: raw.cv as ClassicCvData, competences, locale: locale as ClassicDisplayLocale };
}

export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });

  const parsed = readClassic(await request.json().catch(() => null));
  if (!parsed) return NextResponse.json({ error: 'Langue ou CV invalide.' }, { status: 400 });
  if (!hasTranslatableContent(parsed.cv, parsed.competences)) {
    return NextResponse.json({ error: 'Ajoutez du contenu au CV avant de traduire.' }, { status: 400 });
  }

  const charged = await takeClaudeCredit(data.user.id);
  if ('error' in charged) return NextResponse.json({ error: charged.error }, { status: charged.status });

  try {
    const translated = await translateClassicCv(parsed.cv, parsed.competences, parsed.locale, charged.key);
    return NextResponse.json({ locale: parsed.locale, translated });
  } catch (err) {
    await charged.refund().catch(() => undefined);
    const message = err instanceof Error ? err.message : 'Traduction impossible.';
    const status = message.includes('Claude') ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
