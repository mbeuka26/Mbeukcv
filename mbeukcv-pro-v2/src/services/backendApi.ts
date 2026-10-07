import { getSupabaseClient, getSupabaseConfig } from './supabase';
import { ensureBackendSession } from './hubIdentity';
import type { GeneratedDocuments, GenerateDocsPayload, SendApplicationPayload, SendApplicationResult, UserMatch } from '@/types';

async function postToFunction<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Backend non configuré. Renseignez votre URL et clé Supabase dans Paramètres.');
  }

  const session = await ensureBackendSession();

  const res = await fetch(`${config.url.replace(/\/$/, '')}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
      apikey: config.anonKey,
    },
    body: JSON.stringify({ ...body, licenceCode: session.licenceCode }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || json.status !== 'success') {
    const message = json?.error?.message ?? `Erreur inattendue (${res.status}).`;
    throw new Error(message);
  }

  return json.data as T;
}

export async function generateDocumentsViaBackend(
  payload: Omit<GenerateDocsPayload, 'customClaudeKey'> & { customClaudeKey?: string }
): Promise<GeneratedDocuments> {
  return postToFunction<GeneratedDocuments>('generate-docs', payload);
}

export async function sendApplicationViaBackend(
  payload: Omit<SendApplicationPayload, 'licenceCode'>
): Promise<SendApplicationResult> {
  return postToFunction<SendApplicationResult>('send-application', payload);
}

export interface RefreshMatchesResult {
  nbOffresAnalysees: number;
  nbMatchs: number;
  cached?: boolean;
  info?: string;
}

export interface CollectOffersResult {
  enregistrees: number;
  info: string;
}

export async function collectOffersViaBackend(motsCles: string[]): Promise<CollectOffersResult> {
  return postToFunction<CollectOffersResult>('collect-offers', { motsCles });
}

export interface SourceKeyStatus {
  jsearch: boolean;
  africawork: boolean;
}

export async function sourceKeyStatus(): Promise<SourceKeyStatus> {
  return postToFunction<SourceKeyStatus>('source-keys', { action: 'status' });
}

export async function saveSourceKey(fournisseur: 'jsearch' | 'africawork', secret: string): Promise<{ enregistre: boolean }> {
  return postToFunction<{ enregistre: boolean }>('source-keys', { action: 'save', fournisseur, secret });
}

export async function refreshMatchesViaBackend(scoreMinimum?: number): Promise<RefreshMatchesResult> {
  return postToFunction<RefreshMatchesResult>('refresh-matches', {
    scoreMinimum: scoreMinimum ?? 75,
  });
}

/** Lecture directe (protégée par RLS) des matchs déjà calculés — pas besoin d'Edge Function pour ça. */
export async function listMyMatches(): Promise<UserMatch[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Backend non configuré.');

  const session = await ensureBackendSession();

  const { data, error } = await supabase
    .from('user_matchs')
    .select('offre_id, titre, entreprise, lieu, url, email_recruteur, description, score, resume, matched_at')
    .eq('licence_code', session.licenceCode)
    .order('score', { ascending: false });

  if (error) throw new Error(`Échec de lecture des matchs : ${error.message}`);

  return (data ?? []).map((row) => ({
    offreId: row.offre_id,
    titre: row.titre,
    entreprise: row.entreprise,
    lieu: row.lieu,
    url: row.url,
    emailRecruteur: row.email_recruteur,
    description: row.description,
    score: row.score,
    resume: row.resume,
    matchedAt: row.matched_at,
  }));
}
