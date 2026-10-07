import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/cron';
import { commitRotation, planRotation } from '@/lib/scrape/budget';
import { ingestOffers, scrapeJSearch, scrapePublicBoards } from '@/lib/scrape/ingest';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: 'Secret de cron invalide.' }, { status: 401 });
  }

  try {
    const admin = createSupabaseAdmin();
    const plan = await planRotation(admin);
    const boards = await scrapePublicBoards();
    const remote = await scrapeJSearch(process.env.RAPIDAPI_KEY?.trim() ?? '', plan.queries);
    if (remote.attempted > 0) await commitRotation(admin, plan.day, remote.attempted);
    const central = await ingestOffers(admin, '', [...boards, ...remote.drafts], []);
    return NextResponse.json({
      central: {
        ...central,
        jsearch: remote.attempted > 0 ? remote.note : plan.note,
        jsearchAttempts: remote.attempted,
      },
      rotation: plan.note,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Collecte impossible.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
