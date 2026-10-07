/**
 * Noms des secrets uniquement. Aucune valeur ici.
 * required : le déploiement s’arrête si la variable est absente ou invalide.
 * optional : déployée seulement si elle est renseignée.
 * targets : vercel (variables du projet) et/ou supabase (secrets Edge).
 * supabaseName : nom écrit dans Supabase quand il diffère du nom GitHub.
 */

export const requiredSecrets = [
  { name: 'VERCEL_TOKEN', min: 20, targets: [] },
  { name: 'VERCEL_ORG_ID', min: 8, targets: [] },
  { name: 'VERCEL_PROJECT_ID', min: 8, targets: [] },
  { name: 'SUPABASE_ACCESS_TOKEN', min: 20, targets: [] },
  { name: 'SUPABASE_PROJECT_REF', min: 15, targets: [] },
  { name: 'NEXT_PUBLIC_SUPABASE_URL', min: 20, targets: ['vercel'], format: 'supabase-url' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', min: 30, targets: ['vercel'], format: 'jwt' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', min: 30, targets: ['vercel', 'supabase'], supabaseName: 'MBEUK_SERVICE_ROLE_KEY', format: 'jwt' },
  { name: 'ENCRYPTION_KEY', min: 32, targets: ['vercel'] },
  { name: 'CRON_SECRET', min: 16, targets: ['vercel'] },
  { name: 'RAPIDAPI_KEY', min: 16, targets: ['vercel'] },
  { name: 'MBEUK_HUB_URL', min: 12, targets: ['vercel', 'supabase'], format: 'https-url' },
  { name: 'MBEUK_HUB_API_KEY', min: 12, targets: ['vercel', 'supabase'] },
  { name: 'MBEUK_PRODUCT_ID', min: 36, targets: ['vercel', 'supabase'], format: 'uuid' },
  { name: 'MBEUK_APPLICATION_ID', min: 36, targets: ['vercel', 'supabase'], format: 'uuid' },
  { name: 'MBEUK_AUTH_BRIDGE_SECRET', min: 32, targets: ['vercel', 'supabase'] },
];

export const optionalSecrets = [
  { name: 'ANTHROPIC_API_KEY', min: 20, targets: ['vercel'] },
  { name: 'BREVO_API_KEY', min: 12, targets: ['vercel'] },
  { name: 'BREVO_FROM_EMAIL', min: 5, targets: ['vercel'] },
  { name: 'BREVO_FROM_NAME', min: 2, targets: ['vercel'] },
  { name: 'CONTACT_EMAIL', min: 5, targets: ['vercel'] },
  { name: 'CREDIT_GRANT_SECRET', min: 16, targets: ['vercel'] },
  { name: 'MBEUK_HUB_BASE_URL', min: 12, targets: ['vercel'], format: 'https-url' },
  { name: 'MBEUK_ENVIRONMENT', min: 3, targets: ['vercel', 'supabase'] },
  { name: 'PRODUCTION_APP_URL', min: 12, targets: ['supabase'], supabaseName: 'APP_URL', format: 'https-url' },
  { name: 'MBEUK_HUB_PRODUCT_CLAUDE_10', min: 8, targets: ['vercel'] },
  { name: 'MBEUK_HUB_PRODUCT_CLAUDE_30', min: 8, targets: ['vercel'] },
  { name: 'MBEUK_HUB_PRODUCT_CLAUDE_80', min: 8, targets: ['vercel'] },
];

const PLACEHOLDERS = /^(changeme|todo|xxxx|your[-_ ]?key|secret|password|undefined|null)$/i;

export function readSecret(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

export function checkSecret(entry, { required }) {
  const value = readSecret(entry.name);
  if (!value) {
    return required
      ? { ok: false, level: 'block', message: `secret absent : ${entry.name}` }
      : { ok: true, level: 'skip', message: `non bloquant, absent : ${entry.name}` };
  }
  if (PLACEHOLDERS.test(value) || value.includes('xxxx.supabase.co')) {
    return { ok: false, level: 'block', message: `secret placeholder : ${entry.name}` };
  }
  if (value.length < entry.min) {
    return { ok: false, level: 'block', message: `secret trop court : ${entry.name} (minimum ${entry.min})` };
  }
  if (entry.format === 'uuid' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return { ok: false, level: 'block', message: `format UUID attendu : ${entry.name}` };
  }
  if (entry.format === 'jwt' && !value.startsWith('eyJ')) {
    return { ok: false, level: 'block', message: `format de jeton attendu : ${entry.name}` };
  }
  if (entry.format === 'supabase-url' && !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(value)) {
    return { ok: false, level: 'block', message: `URL Supabase https attendue : ${entry.name}` };
  }
  if (entry.format === 'https-url' && !/^https:\/\/[^\s]+$/i.test(value)) {
    return { ok: false, level: 'block', message: `URL https attendue : ${entry.name}` };
  }
  if (/^NEXT_PUBLIC_/.test(entry.name) && /SERVICE_ROLE|HUB_API_KEY|BRIDGE|RAPIDAPI|ANTHROPIC|BREVO|CREDIT_GRANT|ENCRYPTION|CRON_SECRET|whsec_/i.test(entry.name)) {
    return { ok: false, level: 'block', message: `secret interdit en NEXT_PUBLIC_ : ${entry.name}` };
  }
  return { ok: true, level: 'ok', message: `présent : ${entry.name}` };
}
