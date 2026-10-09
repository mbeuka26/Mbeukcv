import { NextResponse } from 'next/server';
import { readCv } from '@/lib/cv';
import { exchangeCall } from '@/lib/exchange/client';
import { publicTalent, talentIdForUser } from '@/lib/exchange/talent';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const discover = body && typeof body === 'object' && (body as { discover?: unknown }).discover === true;
  const talentId = talentIdForUser(data.user.id);
  if (!talentId) return NextResponse.json({ error: 'Compte inutilisable pour le réseau.' }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: row, error: readError } = await admin.from('user_profiles').select('cv_data').eq('id', data.user.id).maybeSingle();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  const cv = readCv(row?.cv_data);
  if (discover && cv.skills.length === 0 && cv.summary.trim().length < 20) {
    return NextResponse.json({ error: 'Enregistrez un CV avant d\'être visible des entreprises.' }, { status: 400 });
  }

  const result = discover
    ? await exchangeCall({ action: 'register_talent', talent: { ...publicTalent(cv), id: talentId } })
    : await exchangeCall({ action: 'opt_out', talentId });
  if (result.confirmed !== true) {
    return NextResponse.json({ confirmed: false, message: String(result.message || 'Le réseau n\'a pas confirmé.') }, { status: 200 });
  }
  cv.exchangeDiscover = discover;
  const { error: writeError } = await admin.from('user_profiles').update({ cv_data: cv }).eq('id', data.user.id);
  if (writeError) {
    return NextResponse.json({
      confirmed: true,
      discover,
      message: 'Le réseau a enregistré ce choix. Le réglage local n\'a pas pu être mis à jour.',
    });
  }
  return NextResponse.json({
    confirmed: true,
    discover,
    message: discover
      ? 'Votre profil public est visible des entreprises. Le téléphone et l\'e-mail ne sont pas transmis.'
      : 'Votre profil n\'est plus proposé aux entreprises.',
  });
}
