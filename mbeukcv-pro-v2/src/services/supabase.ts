import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { safeStorage } from './safeStorage';

/**
 * ════════════════════════════════════════════════════════════
 * Client Supabase — backend OPTIONNEL (Option C)
 * ════════════════════════════════════════════════════════════
 * Client Supabase optionnel. Il n'est créé que si Paramètres contient
 * une URL de projet et la clé publique anon. Les actions payantes
 * (génération au quota, e-mail, matching) passent par les Edge Functions.
 * Ce client sert à la session anonyme, à l'écriture du profil et de
 * l'historique sous RLS, et à la lecture des matchs.
 */

const SUPABASE_URL_KEY = 'mbeukCV_supabaseUrl';
const SUPABASE_ANON_KEY_KEY = 'mbeukCV_supabaseAnonKey';

let cachedClient: SupabaseClient | null = null;
let cachedConfigSignature = '';

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = safeStorage.getItem(SUPABASE_URL_KEY);
  const anonKey = safeStorage.getItem(SUPABASE_ANON_KEY_KEY);
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function setSupabaseConfig(url: string, anonKey: string): void {
  safeStorage.setItem(SUPABASE_URL_KEY, url.trim());
  safeStorage.setItem(SUPABASE_ANON_KEY_KEY, anonKey.trim());
  cachedClient = null; // force la recréation du client au prochain appel
}

export function clearSupabaseConfig(): void {
  safeStorage.removeItem(SUPABASE_URL_KEY);
  safeStorage.removeItem(SUPABASE_ANON_KEY_KEY);
  cachedClient = null;
}

export function hasSupabaseBackend(): boolean {
  return getSupabaseConfig() !== null;
}

/** Renvoie `null` si aucun backend n'est configuré — jamais d'exception. */
export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) return null;

  const signature = `${config.url}::${config.anonKey}`;
  if (cachedClient && cachedConfigSignature === signature) return cachedClient;

  cachedClient = createClient(config.url, config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  cachedConfigSignature = signature;
  return cachedClient;
}
