import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function safePath(value: string | null, fallback: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safePath(url.searchParams.get('next'), '/accueil');
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const supabase = createSupabaseServer();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash });
    if (!error) {
      const dest = type === 'recovery' ? '/reinitialiser' : next;
      return NextResponse.redirect(new URL(dest, url.origin));
    }
  }

  return NextResponse.redirect(new URL('/login?erreur=lien', url.origin));
}
