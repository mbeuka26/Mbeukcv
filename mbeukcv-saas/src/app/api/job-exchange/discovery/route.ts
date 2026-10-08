import { NextResponse } from 'next/server';
import { readPublicProfile } from '@/lib/auth';
import { readDiscoveryEnabled, writeDiscoveryEnabled } from '@/lib/jobExchange/discovery';
import { discoveryTerms } from '@/lib/jobExchange/discoveryProfile';
import { createSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });
  try {
    const enabled = await readDiscoveryEnabled(data.user.id);
    return NextResponse.json({ enabled });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lecture impossible.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const enabled = Boolean(body && typeof body === 'object' && body.enabled === true);
  if (enabled) {
    const profile = await readPublicProfile(data.user.id);
    if (!profile?.cv || discoveryTerms(profile.cv).length === 0) {
      return NextResponse.json(
        { error: 'Complétez votre CV (métier ou compétences) avant d’activer la visibilité professionnelle.' },
        { status: 400 },
      );
    }
  }

  try {
    const next = await writeDiscoveryEnabled(data.user.id, enabled);
    return NextResponse.json({
      enabled: next,
      note: enabled
        ? 'Votre profil professionnel peut être proposé aux entreprises MbeukRH (sans e-mail ni téléphone automatiques).'
        : 'Visibilité professionnelle désactivée. Les synchronisations côté RH peuvent prendre quelques minutes.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Enregistrement impossible.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
