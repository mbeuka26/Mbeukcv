/**
 * Dépose les variables sur Vercel production.
 * Le jeton et les valeurs restent hors des journaux.
 */
import { optionalSecrets, readSecret, requiredSecrets } from './secrets-policy.mjs';

const token = readSecret('VERCEL_TOKEN');
const projectId = readSecret('VERCEL_PROJECT_ID');
const teamId = readSecret('VERCEL_ORG_ID');
if (!token || !projectId || !teamId) {
  console.error('BLOQUÉ — VERCEL_TOKEN, VERCEL_ORG_ID ou VERCEL_PROJECT_ID absent.');
  process.exit(1);
}

const entries = [...requiredSecrets, ...optionalSecrets].filter((entry) => entry.targets.includes('vercel'));

async function vercel(path, options = {}) {
  const url = new URL(`https://api.vercel.com${path}`);
  url.searchParams.set('teamId', teamId);
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

function safeError(payload) {
  const message = payload?.error?.message || payload?.message || 'erreur Vercel';
  return String(message).slice(0, 180);
}

const listed = await vercel('/v9/projects/' + encodeURIComponent(projectId) + '/env');
if (!listed.response.ok) {
  console.error(`BLOQUÉ — lecture des variables Vercel impossible : ${safeError(listed.payload)}`);
  process.exit(1);
}
const existing = new Map((listed.payload.envs || []).map((item) => [item.key, item.id]));

for (const entry of entries) {
  const value = readSecret(entry.name);
  if (!value) continue;
  const body = {
    key: entry.name,
    value,
    type: 'encrypted',
    target: ['production'],
  };
  const current = existing.get(entry.name);
  const result = current
    ? await vercel(`/v9/projects/${encodeURIComponent(projectId)}/env/${current}`, {
        method: 'PATCH',
        body: JSON.stringify({ value, type: 'encrypted', target: ['production'] }),
      })
    : await vercel(`/v10/projects/${encodeURIComponent(projectId)}/env`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
  if (!result.response.ok) {
    console.error(`BLOQUÉ — variable Vercel ${entry.name} : ${safeError(result.payload)}`);
    process.exit(1);
  }
  console.log(`OK — variable Vercel déposée : ${entry.name}`);
}
console.log('OK — variables Vercel production à jour');
