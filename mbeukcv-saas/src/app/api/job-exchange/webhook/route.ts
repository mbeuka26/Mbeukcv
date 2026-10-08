import { NextResponse } from 'next/server';
import { closeMbeukOffer, ingestMbeukOffer, type MbeukOfferPayload } from '@/lib/jobExchange/ingest';
import { verifyWebhookSignature } from '@/lib/jobExchange/webhookAuth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const maxDuration = 60;

function parsePayload(body: unknown): { action: 'upsert' | 'close'; offer?: MbeukOfferPayload; externalRef?: string } | null {
  if (!body || typeof body !== 'object') return null;
  const raw = body as Record<string, unknown>;
  const action = raw.action === 'close' ? 'close' : raw.action === 'upsert' ? 'upsert' : null;
  if (!action) return null;
  if (action === 'close') {
    const externalRef = typeof raw.externalRef === 'string' ? raw.externalRef : '';
    if (!externalRef.trim()) return null;
    return { action, externalRef: externalRef.trim() };
  }
  const externalRef = typeof raw.externalRef === 'string' ? raw.externalRef.trim() : '';
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const company = typeof raw.company === 'string' ? raw.company.trim() : '';
  if (!externalRef || !title || !company) return null;
  return {
    action,
    offer: {
      externalRef,
      title,
      company,
      location: typeof raw.location === 'string' ? raw.location : null,
      description: typeof raw.description === 'string' ? raw.description : null,
      skills: Array.isArray(raw.skills) ? raw.skills.map(String) : [],
      url: typeof raw.url === 'string' ? raw.url : null,
      contactEmail: typeof raw.contactEmail === 'string' ? raw.contactEmail : null,
      datePosted: typeof raw.datePosted === 'string' ? raw.datePosted : null,
      deadlineDate: typeof raw.deadlineDate === 'string' ? raw.deadlineDate : null,
      expiresAt: typeof raw.expiresAt === 'string' ? raw.expiresAt : null,
      type:
        raw.type === 'scholarship' || raw.type === 'concours' || raw.type === 'other' || raw.type === 'job'
          ? raw.type
          : 'job',
      offerSummary: typeof raw.offerSummary === 'string' ? raw.offerSummary : null,
    },
  };
}

export async function POST(request: Request) {
  const secret = process.env.MBEUK_JOB_EXCHANGE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: 'Webhook non configuré.' }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('x-mbeuk-signature') ?? request.headers.get('x-hub-signature-256');
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Signature invalide.' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  const parsed = parsePayload(json);
  if (!parsed) return NextResponse.json({ error: 'Payload invalide.' }, { status: 400 });

  const admin = createSupabaseAdmin();
  try {
    if (parsed.action === 'close') {
      await closeMbeukOffer(admin, parsed.externalRef!);
      return NextResponse.json({ ok: true, closed: parsed.externalRef });
    }
    const result = await ingestMbeukOffer(admin, parsed.offer!);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Traitement impossible.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
