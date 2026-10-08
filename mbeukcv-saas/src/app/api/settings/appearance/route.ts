import { NextResponse } from 'next/server';
import { presetById, APPEARANCE_PRESETS } from '@/lib/appearance/presets';
import { readServerThemeId, writeServerThemeId } from '@/lib/appearance/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });
  const themeId = await readServerThemeId(data.user.id);
  return NextResponse.json({
    themeId,
    presets: APPEARANCE_PRESETS.map((p) => ({ id: p.id, label: p.label })),
  });
}

export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const themeId = body && typeof body.themeId === 'string' ? body.themeId.trim() : '';
  if (!themeId || !APPEARANCE_PRESETS.some((p) => p.id === themeId)) {
    return NextResponse.json({ error: 'Thème inconnu.' }, { status: 400 });
  }

  try {
    await writeServerThemeId(data.user.id, themeId);
    return NextResponse.json({ ok: true, themeId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Enregistrement impossible.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
