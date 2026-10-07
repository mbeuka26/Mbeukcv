const BASE_HEADERS = {
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-hub-session-token, x-hub-refresh-token, x-hub-user-id, x-admin-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function parseAllowedOrigins(): string[] {
  const raw = Deno.env.get('APP_URL')?.trim();
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function isAllowedProductionOrigin(origin: string): boolean {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'https:') return false;
    if (hostname.endsWith('.vercel.app')) return true;
    if (hostname === 'mbeuk.us' || hostname === 'www.mbeuk.us') return true;
  } catch {
    return false;
  }
  return false;
}

const DEFAULT_PRODUCTION_ORIGIN = 'https://cvpro-swart.vercel.app';

/** En-têtes CORS par défaut — APP_URL en production, sinon alias Vercel connu. */
export const corsHeaders: Record<string, string> = (() => {
  const allowed = parseAllowedOrigins();
  const isProd = Deno.env.get('MBEUK_ENVIRONMENT') === 'production';
  const origin = allowed.length ? allowed[0] : (isProd ? DEFAULT_PRODUCTION_ORIGIN : '*');
  return {
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin',
    ...BASE_HEADERS,
  };
})();

/** CORS dynamique selon l'en-tête Origin (préféré pour les handlers). */
export function corsHeadersFor(req: Request): Record<string, string> {
  const allowed = parseAllowedOrigins();
  const origin = req.headers.get('Origin');
  const isProd = Deno.env.get('MBEUK_ENVIRONMENT') === 'production';

  if (!allowed.length) {
    if (isProd && origin && isAllowedProductionOrigin(origin)) {
      return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', ...BASE_HEADERS };
    }
    return isProd
      ? { 'Access-Control-Allow-Origin': DEFAULT_PRODUCTION_ORIGIN, Vary: 'Origin', ...BASE_HEADERS }
      : { 'Access-Control-Allow-Origin': '*', ...BASE_HEADERS };
  }

  if (origin && allowed.includes(origin)) {
    return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', ...BASE_HEADERS };
  }

  return { 'Access-Control-Allow-Origin': allowed[0], Vary: 'Origin', ...BASE_HEADERS };
}
