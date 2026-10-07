import type { SupabaseClient } from '@supabase/supabase-js';
import { graceCutoff } from '@/lib/offers/rules';

export async function cleanupExpired(client: SupabaseClient, now = new Date()) {
  const nowIso = now.toISOString();
  const grace = graceCutoff(now);
  const deactivated = await client
    .from('job_offers')
    .update({ is_active: false })
    .lt('expires_at', nowIso)
    .eq('is_active', true)
    .select('id');
  if (deactivated.error) throw new Error(deactivated.error.message);

  const deleted = await client.from('job_offers').delete().lt('expires_at', grace).select('id');
  if (deleted.error) throw new Error(deleted.error.message);

  return {
    deactivated: deactivated.data?.length ?? 0,
    deleted: deleted.data?.length ?? 0,
  };
}
