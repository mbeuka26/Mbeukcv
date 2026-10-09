import 'server-only';

export function exchangeConfigured() {
  return Boolean(process.env.JOB_EXCHANGE_URL?.trim() && process.env.JOB_EXCHANGE_SERVICE_KEY?.trim());
}

export async function exchangeCall(body: Record<string, unknown>) {
  const url = process.env.JOB_EXCHANGE_URL?.trim() || '';
  const secret = process.env.JOB_EXCHANGE_SERVICE_KEY?.trim() || '';
  if (!url || !secret) {
    return { ok: false, confirmed: false, message: 'Le réseau Mbeuk n\'est pas configuré. Rien n\'a été transmis.' };
  }
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
        'X-Exchange-Actor': 'mbeukcv',
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    if (!payload || typeof payload !== 'object') {
      return { ok: false, confirmed: false, message: 'Le Job Exchange n\'a pas répondu.' };
    }
    return payload as Record<string, unknown>;
  } catch {
    return { ok: false, confirmed: false, message: 'Le Job Exchange n\'a pas répondu.' };
  }
}
