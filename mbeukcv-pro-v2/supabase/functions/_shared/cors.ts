// Répond aux requêtes cross-origin depuis le frontend (peut tourner sur
// n'importe quelle origine : localhost, Firebase/Supabase Hosting, ou
// même le fichier HTML autonome via file:// pour certains navigateurs).
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}
