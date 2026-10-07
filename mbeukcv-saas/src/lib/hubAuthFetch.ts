const HUB_SESSION_KEY = 'mbeuk_hub_gate_session';

export type HubSessionSnapshot = {
  hubUserId?: string;
  hubSessionToken?: string;
  hubRefreshToken?: string;
  hubExpiresAt?: string;
  email?: string;
  fullName?: string;
};

/** Lit la session Hub persistée après inscription / connexion. */
export function readHubSession(): HubSessionSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(window.localStorage.getItem(HUB_SESSION_KEY) || 'null') as HubSessionSnapshot | null;
  } catch {
    return null;
  }
}

export function readHubSessionHeaders(): Record<string, string> {
  const session = readHubSession();
  if (!session) return {};
  const headers: Record<string, string> = {};
  if (session.hubUserId) headers['X-Hub-User-Id'] = session.hubUserId;
  if (session.hubSessionToken) headers['X-Hub-Session-Token'] = session.hubSessionToken;
  if (session.hubRefreshToken) headers['X-Hub-Refresh-Token'] = session.hubRefreshToken;
  if (session.email) headers['X-Hub-Email'] = session.email;
  return headers;
}

async function hubProxyPost<T>(
  functionName: string,
  body: Record<string, unknown>,
  extraHeaders: Record<string, string>,
): Promise<T> {
  const response = await fetch(`/api/hub/${functionName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  let payload: Record<string, unknown> = {};
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }
  if (!response.ok) {
    const err = new Error(String(payload.error || payload.message || `Erreur ${response.status}`));
    Object.assign(err, { code: payload.code || `HTTP_${response.status}`, status: response.status });
    throw err;
  }
  return payload as T;
}

/** Inscription / connexion Hub via le proxy same-origin (sans en-têtes Supabase côté mobile). */
export async function hubAuthPost<T = Record<string, unknown>>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  return hubProxyPost<T>(functionName, body, {});
}

/** Appels Hub authentifiés (checkout, promo) via le même proxy + session locale. */
export async function hubSessionPost<T = Record<string, unknown>>(
  functionName: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const sessionHeaders = readHubSessionHeaders();
  if (!sessionHeaders['X-Hub-Session-Token'] || !sessionHeaders['X-Hub-Refresh-Token']) {
    throw Object.assign(
      new Error('Session expirée. Reconnectez-vous pour continuer vers le paiement.'),
      { code: 'HUB_SESSION_MISSING', status: 401 },
    );
  }
  return hubProxyPost<T>(functionName, body, sessionHeaders);
}
