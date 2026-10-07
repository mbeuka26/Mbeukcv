import { NextResponse } from 'next/server';
import { cleanupExpired } from '@/lib/cleanup';
import { cronAuthorized } from '@/lib/cron';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: 'Secret de cron invalide.' }, { status: 401 });
  }

  try {
    const central = await cleanupExpired(createSupabaseAdmin());
    return NextResponse.json({ central });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nettoyage impossible.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
