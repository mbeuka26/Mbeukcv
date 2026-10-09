import { NextResponse } from 'next/server';
import { readCv } from '@/lib/cv';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const cv = readCv(body && typeof body === 'object' ? (body as { cv?: unknown }).cv : null);
  if (cv.skills.length === 0 && cv.experiences.length === 0 && cv.summary.trim().length < 20) {
    return NextResponse.json({ error: 'Renseignez un résumé, une expérience ou des compétences.' }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: existing } = await admin.from('user_profiles').select('cv_data').eq('id', data.user.id).maybeSingle();
  const previous = readCv(existing?.cv_data);
  cv.exchangeDiscover = previous.exchangeDiscover;
  const { error: writeError } = await admin.from('user_profiles').upsert(
    {
      id: data.user.id,
      full_name: cv.fullName,
      email: cv.email || data.user.email || '',
      phone: cv.phone,
      cv_data: cv,
    },
    { onConflict: 'id' },
  );
  if (writeError) return NextResponse.json({ error: writeError.message }, { status: 500 });
  return NextResponse.json({ saved: true });
}
