import { getSupabaseAdmin } from './supabaseAdmin.ts';
import { ApiError } from './errors.ts';

export async function reserveEmailSend(licenceCode: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.rpc('reserver_envoi_email', { p_code: licenceCode });
  if (error) {
    throw ApiError.permissionDenied(error.message);
  }
}

export async function releaseEmailSend(licenceCode: string): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.rpc('liberer_envoi_email', { p_code: licenceCode });
    if (error) console.error('liberer_envoi_email', error.message);
  } catch (err) {
    console.error('liberer_envoi_email', err);
  }
}
