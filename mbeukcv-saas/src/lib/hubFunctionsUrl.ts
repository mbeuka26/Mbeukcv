/** URL des Edge Functions Hub : same-origin en navigateur (évite CORS / blocages mobile vers supabase.co). */
export function hubFunctionsUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/hub`;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? '';
  return url ? `${url}/functions/v1` : '';
}
