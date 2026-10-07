import { getSupabaseAdmin } from './supabaseAdmin.ts';
import { ApiError } from './errors.ts';

/** Réserve un crédit IA. Réservé aux Edge Functions (service_role). */
export async function reserveAiCredit(licenceCode: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.rpc('consommer_credit_ia', { p_code: licenceCode });
  if (error) {
    throw ApiError.permissionDenied(error.message);
  }
}

/** Rend le crédit si Claude ou la validation échoue. N'échoue pas l'appelant. */
export async function refundAiCredit(licenceCode: string): Promise<void> {
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.rpc('restituer_credit_ia', { p_code: licenceCode });
    if (error) console.error('restituer_credit_ia', error.message);
  } catch (err) {
    console.error('restituer_credit_ia', err);
  }
}
