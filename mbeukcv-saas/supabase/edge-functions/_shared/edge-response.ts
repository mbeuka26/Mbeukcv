import { corsHeaders, corsHeadersFor } from './cors.ts';
import { assertServiceRoleConfigured } from './supabase-env.ts';

export { assertServiceRoleConfigured };

function corsFor(req?: Request): Record<string, string> {
  return req ? corsHeadersFor(req) : corsHeaders;
}

export function preflightResponse(req: Request): Response {
  return new Response('ok', { headers: corsHeadersFor(req) });
}

export function jsonResponse(body: unknown, status = 200, req?: Request): Response {
  const cors = corsFor(req);
  try {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: 'Reponse serveur invalide.',
      code: 'JSON_SERIALIZE_ERROR',
      detail: e instanceof Error ? e.message : String(e),
    }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
}

export function fatalErrorResponse(err: unknown, step: string, req?: Request): Response {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[${step}]`, err);
  return jsonResponse({ error: message, code: 'EDGE_FUNCTION_ERROR', step }, 500, req);
}

