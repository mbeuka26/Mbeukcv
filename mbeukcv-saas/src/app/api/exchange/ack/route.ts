import { NextResponse } from 'next/server';
import { exchangeCall } from '@/lib/exchange/client';
import { talentIdForUser } from '@/lib/exchange/talent';
import { createSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const ids = body && typeof body === 'object' && Array.isArray((body as { ids?: unknown }).ids)
    ? (body as { ids: unknown[] }).ids.map((item) => String(item)).filter(Boolean).slice(0, 20)
    : [];
  const talentId = talentIdForUser(data.user.id);
  const delivered: string[] = [];
  for (const notificationId of ids) {
    const result = await exchangeCall({ action: 'ack_notification', notificationId, talentId });
    if (result.confirmed === true) delivered.push(notificationId);
  }
  return NextResponse.json({ delivered });
}
