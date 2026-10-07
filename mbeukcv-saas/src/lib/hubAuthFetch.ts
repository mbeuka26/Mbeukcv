/** Inscription / connexion Hub via le proxy same-origin (sans en-têtes Supabase côté mobile). */
export async function hubAuthPost<T = Record<string, unknown>>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`/api/hub/${functionName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
