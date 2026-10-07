import 'server-only';
import { redirect } from 'next/navigation';
import { readCv, type CvData } from '@/lib/cv';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServer } from '@/lib/supabase/server';

export async function requireUser() {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect('/login');
  return data.user;
}

export interface PublicProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  useByok: boolean;
  cv: CvData;
}

export async function readPublicProfile(userId: string): Promise<PublicProfile | null> {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, phone, cv_data, use_byok')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    fullName: data.full_name ?? '',
    email: data.email ?? '',
    phone: data.phone ?? '',
    useByok: Boolean(data.use_byok),
    cv: readCv(data.cv_data),
  };
}

export async function ensureProfile(userId: string, email: string | null) {
  const existing = await readPublicProfile(userId);
  if (existing) return;
  const admin = createSupabaseAdmin();
  await admin.from('user_profiles').upsert(
    { id: userId, email: email ?? '', full_name: '' },
    { onConflict: 'id', ignoreDuplicates: true },
  );
}
