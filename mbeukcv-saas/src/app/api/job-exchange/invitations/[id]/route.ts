import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['VIEWED', 'INTERESTED', 'DECLINED']);

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const supabase = createSupabaseServer();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const status = body && typeof body === 'object' && typeof body.status === 'string' ? body.status : '';
  if (!ALLOWED.has(status)) {
    return NextResponse.json({ error: 'Statut non autorisé.' }, { status: 400 });
  }

  const id = context.params.id;
  const { data: row, error: readError } = await supabase
    .from('job_exchange_invitations')
    .select('id, status, user_id')
    .eq('id', id)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  if (!row || row.user_id !== auth.user.id) return NextResponse.json({ error: 'Invitation introuvable.' }, { status: 404 });
  if (row.status === 'APPLIED' || row.status === 'DECLINED' || row.status === 'EXPIRED') {
    return NextResponse.json({ error: 'Cette invitation n’est plus modifiable.' }, { status: 409 });
  }

  const nextStatus = status === 'VIEWED' && row.status === 'DISCOVERED' ? 'VIEWED' : status;
  const { error: updateError } = await supabase
    .from('job_exchange_invitations')
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true, status: nextStatus });
}
