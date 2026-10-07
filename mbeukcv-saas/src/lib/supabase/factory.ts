import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export function centralCatalog(): SupabaseClient {
  return createSupabaseAdmin();
}

export async function getDataClient(_userId: string): Promise<SupabaseClient> {
  return centralCatalog();
}

export function rapidApiKeyFromProfile(): string {
  return process.env.RAPIDAPI_KEY?.trim() ?? '';
}
