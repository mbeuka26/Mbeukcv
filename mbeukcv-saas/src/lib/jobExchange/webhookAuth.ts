import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!secret || !signatureHeader?.trim()) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = signatureHeader.replace(/^sha256=/i, '').trim();
  if (expected.length !== provided.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

export function verifyServiceApiKey(header: string | null): boolean {
  const expected = process.env.MBEUK_JOB_EXCHANGE_API_KEY?.trim();
  if (!expected || !header?.trim()) return false;
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}
