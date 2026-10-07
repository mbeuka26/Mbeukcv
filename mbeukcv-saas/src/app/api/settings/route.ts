import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { claudeKeyStatus, saveClaudeKey } from '@/lib/userClaude';

export const runtime = 'nodejs';

async function currentUser() {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });
  return NextResponse.json({ claudeKey: await claudeKeyStatus(user.id) });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }
  const payload = body as Record<string, unknown>;

  try {
    if (typeof payload.claudeKey === 'string' && payload.claudeKey.trim()) {
      const key = payload.claudeKey.trim();
      if (!key.startsWith('sk-ant-') || key.length < 20 || key.length > 400 || /\s/.test(key)) {
        return NextResponse.json({ error: 'La clé Claude doit commencer par sk-ant-.' }, { status: 400 });
      }
      await saveClaudeKey(user.id, key);
    }
    return NextResponse.json({ claudeKey: await claudeKeyStatus(user.id) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Enregistrement impossible.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
