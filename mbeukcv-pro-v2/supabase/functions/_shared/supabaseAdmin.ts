import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * Client Admin (clé service_role) — contourne intentionnellement RLS,
 * exactement comme le SDK Admin Firebase contournait les Security
 * Rules dans la version précédente. C'est LA couche de confiance
 * serveur : toute vérification d'autorisation doit être faite
 * explicitement dans le code de la fonction, jamais supposée being
 * appliquée automatiquement par la base.
 *
 * `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont automatiquement
 * disponibles dans l'environnement de toute Edge Function Supabase
 * déployée — pas besoin de les configurer manuellement en secrets.
 */
export function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceKey) {
    throw new Error('Variables d\'environnement Supabase manquantes (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
