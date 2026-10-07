import { NextResponse } from 'next/server';
import { readCv } from '@/lib/cv';
import { offerMatchesProfile, profileTerms } from '@/lib/profileMatch';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data: row } = await admin.from('user_profiles').select('cv_data').eq('id', data.user.id).maybeSingle();
  const cv = readCv(row?.cv_data);
  const terms = profileTerms({
    title: cv.title || cv.classic?.titrePoste || '',
    skills: cv.skills,
    roles: cv.experiences.map((item) => item.role),
    diplomas: cv.education.map((item) => item.diploma),
  });
  if (terms.length === 0) {
    return NextResponse.json({ error: 'Le CV ne contient pas encore un métier assez précis.' }, { status: 400 });
  }

  const { data: offers, error: offersError } = await admin
    .from('job_offers')
    .select('title, description, skills, expires_at, is_active')
    .eq('is_active', true)
    .neq('source', 'system')
    .limit(200);
  if (offersError) return NextResponse.json({ error: offersError.message }, { status: 500 });

  const matched = (offers ?? []).filter((offer) => {
    if (offer.expires_at && new Date(offer.expires_at).getTime() < Date.now()) return false;
    return offerMatchesProfile(terms, {
      title: offer.title,
      description: offer.description,
      skills: offer.skills ?? [],
    });
  }).length;

  return NextResponse.json({ matched });
}
