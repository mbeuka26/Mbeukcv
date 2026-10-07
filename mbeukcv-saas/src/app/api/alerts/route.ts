import { NextResponse } from 'next/server';
import { readPublicProfile } from '@/lib/auth';
import { writeAlert } from '@/lib/jobAlert';
import { profileTerms } from '@/lib/profileMatch';
import { createSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function termsOf(profile: Awaited<ReturnType<typeof readPublicProfile>>): string[] {
  if (!profile?.cv) return [];
  return profileTerms({
    title: profile.cv.title || profile.cv.classic?.titrePoste || '',
    skills: profile.cv.skills,
    roles: profile.cv.experiences.map((item) => item.role),
    diplomas: profile.cv.education.map((item) => item.diploma),
  });
}

export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const on = Boolean(body && typeof body === 'object' && body.on === true);
  if (on) {
    const profile = await readPublicProfile(data.user.id);
    if (termsOf(profile).length === 0) {
      return NextResponse.json({ error: 'Ajoutez un intitulé ou des compétences au CV avant d’activer l’alerte.' }, { status: 400 });
    }
  }

  try {
    const alert = await writeAlert(data.user.id, on);
    return NextResponse.json({ on: alert.on });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Enregistrement impossible.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
