import { NextResponse } from 'next/server';
import { exchangeCall } from '@/lib/exchange/client';
import { talentIdForUser } from '@/lib/exchange/talent';
import { createSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const STATUSES = new Set(['viewed', 'accepted', 'declined']);

export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const invitationId = body && typeof body === 'object' ? String((body as { invitationId?: unknown }).invitationId || '') : '';
  const status = body && typeof body === 'object' ? String((body as { status?: unknown }).status || '') : '';
  if (!invitationId || !STATUSES.has(status)) {
    return NextResponse.json({ confirmed: false, message: 'Invitation incomplète. Rien n\'a été changé.' });
  }
  const result = await exchangeCall({
    action: 'invitation_signal',
    invitationId,
    talentId: talentIdForUser(data.user.id),
    status,
  });
  return NextResponse.json({
    confirmed: result.confirmed === true,
    applicationCreated: false,
    message: result.confirmed === true
      ? 'Invitation mise à jour. Elle ne crée pas de candidature.'
      : String(result.message || 'Le réseau n\'a pas confirmé.'),
  });
}
