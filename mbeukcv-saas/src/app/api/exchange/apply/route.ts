import { NextResponse } from 'next/server';
import { readCv } from '@/lib/cv';
import { exchangeCall } from '@/lib/exchange/client';
import { publicTalent, splitName, talentIdForUser } from '@/lib/exchange/talent';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const exchangeJobId = body && typeof body === 'object' ? String((body as { exchangeJobId?: unknown }).exchangeJobId || '') : '';
  const consent = body && typeof body === 'object' && (body as { consent?: unknown }).consent === true;
  if (!consent) return NextResponse.json({ confirmed: false, message: 'Le consentement est requis. Rien n\'a été envoyé.' });
  if (!exchangeJobId) return NextResponse.json({ confirmed: false, message: 'Offre absente. Rien n\'a été envoyé.' });

  const talentId = talentIdForUser(data.user.id);
  const admin = createSupabaseAdmin();
  const { data: row, error: readError } = await admin.from('user_profiles').select('full_name, email, phone, cv_data').eq('id', data.user.id).maybeSingle();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  const cv = readCv(row?.cv_data);
  const name = splitName(row?.full_name || cv.fullName);
  if (!name.givenName || !name.familyName) {
    return NextResponse.json({ confirmed: false, message: 'Indiquez votre prénom et votre nom sur le CV. Rien n\'a été envoyé.' });
  }
  const email = String(row?.email || cv.email || data.user.email || '').trim();
  const result = await exchangeCall({
    action: 'apply',
    talentId,
    exchangeJobId,
    consent: true,
    profileConfirmed: cv.summary.trim().length >= 20 || cv.skills.length > 0,
    candidate: {
      givenName: name.givenName,
      familyName: name.familyName,
      email,
      phone: String(row?.phone || cv.phone || '').trim(),
    },
    profile: publicTalent(cv),
    documents: [],
  });
  if (result.confirmed !== true) {
    return NextResponse.json({ confirmed: false, message: String(result.message || 'Le réseau n\'a pas confirmé la candidature.') });
  }
  const title = String((body as { title?: unknown }).title || 'Offre MbeukRH');
  const reference = String((body as { reference?: unknown }).reference || '');
  const label = reference ? `${reference} — ${title}` : title;
  const { data: existing } = await admin.from('applications').select('id').eq('user_id', data.user.id).eq('job_title', label).maybeSingle();
  if (!existing) {
    const { error: insertError } = await admin.from('applications').insert({
      user_id: data.user.id,
      job_id: null,
      status: 'Transmise à l\'entreprise',
      job_title: label,
      job_url: null,
      cover_letter: '',
    });
    if (insertError) {
      return NextResponse.json({
        confirmed: true,
        message: 'Le réseau a accepté la candidature. La liste locale n\'a pas pu être mise à jour.',
      });
    }
  }
  return NextResponse.json({
    confirmed: true,
    duplicate: result.duplicate === true,
    message: result.duplicate === true
      ? 'Cette candidature était déjà transmise. Le dossier n\'a pas été réécrit.'
      : 'Candidature transmise à l\'entreprise. Le téléphone figure dans le dossier seulement s\'il est sur votre CV.',
  });
}
