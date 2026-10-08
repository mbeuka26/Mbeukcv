import 'server-only';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export async function readDiscoveryEnabled(userId: string): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from('user_profiles')
    .select('professional_discovery_enabled')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data?.professional_discovery_enabled);
}

export async function writeDiscoveryEnabled(userId: string, enabled: boolean): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from('user_profiles')
    .update({ professional_discovery_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw new Error(error.message);
  return enabled;
}
