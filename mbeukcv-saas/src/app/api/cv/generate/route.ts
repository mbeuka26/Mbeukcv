import { NextResponse } from 'next/server';
import { takeClaudeCredit } from '@/lib/credits';
import { extractCvFromText } from '@/lib/cvExtract';
import { createSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const text = body && typeof body === 'object' && typeof (body as { text?: unknown }).text === 'string'
    ? (body as { text: string }).text.trim()
    : '';
  if (text.length < 80) {
    return NextResponse.json({ error: 'Collez un CV d’au moins quelques lignes.' }, { status: 400 });
  }
  if (text.length > 20000) {
    return NextResponse.json({ error: 'Le texte dépasse 20 000 caractères.' }, { status: 400 });
  }

  const charged = await takeClaudeCredit(data.user.id);
  if ('error' in charged) return NextResponse.json({ error: charged.error }, { status: charged.status });

  try {
    const cv = await extractCvFromText(text, charged.key);
    const usable = cv.skills.length > 0 || cv.experiences.length > 0 || cv.summary.trim().length >= 20;
    if (!usable) {
      return NextResponse.json({ error: 'Ce texte ne contient pas assez d’éléments pour remplir la fiche.' }, { status: 422 });
    }
    return NextResponse.json({ cv });
  } catch (err) {
    await charged.refund().catch(() => undefined);
    const message = err instanceof Error ? err.message : 'Extraction impossible.';
    const status = message.includes('clé Claude') ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
