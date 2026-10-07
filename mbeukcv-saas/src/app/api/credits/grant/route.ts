import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { grantPackToUser } from '@/lib/credits';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

function authorized(request: Request): boolean {
  const expected = process.env.CREDIT_GRANT_SECRET?.trim() ?? '';
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!expected || !token || expected.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

export async function POST(request: Request) {
  if (!process.env.CREDIT_GRANT_SECRET?.trim()) {
    return NextResponse.json({ error: 'Activation automatique non configurée.' }, { status: 503 });
  }
  if (!authorized(request)) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const email = body && typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const packId = body && typeof body.packId === 'string' ? body.packId : '';
  const saleId = body && typeof body.saleId === 'string' ? body.saleId.trim() : '';
  if (!email.includes('@') || !packId || !saleId) {
    return NextResponse.json({ error: 'E-mail, forfait et référence de paiement sont requis.' }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from('user_profiles').select('id, email').ilike('email', email).maybeSingle();
  if (error) return NextResponse.json({ error: 'Compte introuvable.' }, { status: 500 });
  if (!data?.id) return NextResponse.json({ error: 'Aucun compte avec cet e-mail.' }, { status: 404 });

  try {
    const granted = await grantPackToUser(data.id, packId, saleId);
    return NextResponse.json({ applied: granted.applied, packId: granted.pack.id, credits: granted.pack.credits });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Activation impossible.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
