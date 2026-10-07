import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_POST = new Set([
  'hub-auth-login',
  'hub-auth-register',
  'hub-auth-logout',
  'hub-auth-forgot-password',
  'hub-auth-refresh',
  'hub-me',
  'hub-checkout',
  'hub-license-status',
  'hub-sync-license',
  'hub-validate-promo',
  'validate-trial',
]);

const ALLOWED_GET = new Set(['hub-diagnostics']);

function upstreamUrl(functionName: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  if (!base) return null;
  return `${base}/functions/v1/${functionName}`;
}

function forwardHeaders(request: NextRequest): Record<string, string> | null {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anon) return null;
  const headers: Record<string, string> = {
    apikey: anon,
    Authorization: request.headers.get('Authorization') || `Bearer ${anon}`,
  };
  for (const name of ['X-Hub-User-Id', 'X-Hub-Session-Token', 'X-Hub-Refresh-Token', 'Content-Type']) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  return headers;
}

async function proxy(request: NextRequest, functionName: string, method: 'GET' | 'POST') {
  const allowed = method === 'GET' ? ALLOWED_GET : ALLOWED_POST;
  if (!allowed.has(functionName)) {
    return NextResponse.json({ error: 'Route Hub non autorisée.', code: 'HUB_PROXY_FORBIDDEN' }, { status: 404 });
  }
  const url = upstreamUrl(functionName);
  const headers = forwardHeaders(request);
  if (!url || !headers) {
    return NextResponse.json({ error: 'Configuration Supabase incomplète.', code: 'HUB_PROXY_CONFIG' }, { status: 503 });
  }
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method,
      headers,
      ...(method === 'POST' ? { body: await request.text() } : {}),
      cache: 'no-store',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upstream unreachable';
    return NextResponse.json(
      { error: 'Le serveur d’authentification est injoignable.', code: 'HUB_UPSTREAM_UNREACHABLE', detail: message },
      { status: 502 },
    );
  }
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json' },
  });
}

export async function POST(request: NextRequest, context: { params: { function: string } }) {
  return proxy(request, context.params.function, 'POST');
}

export async function GET(request: NextRequest, context: { params: { function: string } }) {
  return proxy(request, context.params.function, 'GET');
}
