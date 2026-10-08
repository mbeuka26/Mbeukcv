import { NextResponse } from 'next/server';
import { takeRapidCredit } from '@/lib/credits';
import { commitRotation, reserveJSearchCalls } from '@/lib/scrape/budget';
import { retainDrafts, scrapeJSearch, upsertOffers } from '@/lib/scrape/ingest';
import { internationalQueries } from '@/lib/scrape/rotation';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  const supabase = createSupabaseServer();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });

  const apiKey = process.env.RAPIDAPI_KEY?.trim() ?? '';
  if (!apiKey) {
    return NextResponse.json({
      error: 'RapidAPI (JSearch) n’est pas configuré sur le serveur. Ajoutez RAPIDAPI_KEY dans les secrets GitHub / Vercel.',
    }, { status: 503 });
  }

  const charged = await takeRapidCredit(auth.user.id, false);
  if ('error' in charged) return NextResponse.json({ error: charged.error }, { status: charged.status });

  const admin = createSupabaseAdmin();
  const queries = internationalQueries(2);
  if (queries.length === 0) {
    return NextResponse.json({ error: 'Aucune requête internationale disponible.' }, { status: 503 });
  }
  const budget = await reserveJSearchCalls(admin, queries.length);
  if (!budget.ok) return NextResponse.json({ error: budget.error }, { status: 429 });

  try {
    const remote = await scrapeJSearch(apiKey, queries);
    if (remote.attempted > 0) await commitRotation(admin, budget.day, remote.attempted);
    const { kept, skippedExpired } = retainDrafts(remote.drafts);
    const stored = await upsertOffers(admin, kept);
    return NextResponse.json({
      ok: true,
      jsearch: remote.note,
      stored,
      found: remote.drafts.length,
      skippedExpired,
      queries: queries.map((item) => item.label),
    });
  } catch (error) {
    await charged.refund();
    const message = error instanceof Error ? error.message : 'Collecte impossible.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
