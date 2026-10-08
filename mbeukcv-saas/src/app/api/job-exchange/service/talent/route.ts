import { NextResponse } from 'next/server';
import { readCv } from '@/lib/cv';
import { buildDiscoveryProfile } from '@/lib/jobExchange/discoveryProfile';
import { matchCandidatesForOffer } from '@/lib/jobExchange/matchCandidates';
import { verifyServiceApiKey } from '@/lib/jobExchange/webhookAuth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!verifyServiceApiKey(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const url = new URL(request.url);
  const externalRef = url.searchParams.get('externalRef')?.trim() ?? '';
  if (!externalRef) return NextResponse.json({ error: 'externalRef requis.' }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: job, error: jobError } = await admin
    .from('job_offers')
    .select('id, title, description, skills, location, is_active')
    .eq('external_ref', externalRef)
    .maybeSingle();
  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });
  if (!job || !job.is_active) return NextResponse.json({ error: 'Offre introuvable.' }, { status: 404 });

  const matched = await matchCandidatesForOffer(admin, {
    title: job.title,
    description: job.description,
    skills: job.skills ?? [],
    location: job.location,
  });

  const profiles = matched.map((m) =>
    buildDiscoveryProfile({
      userId: m.userId,
      cv: m.cv,
      matchScore: m.score,
      matchNote: m.note,
    }),
  );

  return NextResponse.json({ externalRef, count: profiles.length, profiles });
}
