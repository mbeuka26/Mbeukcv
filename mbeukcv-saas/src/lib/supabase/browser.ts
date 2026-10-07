import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('Base centrale non configurée.');
  }
  return createBrowserClient(url, anon);
}
