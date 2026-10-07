import { NextResponse } from 'next/server';
import { packById } from '@/lib/creditBag';
import { productIdFor } from '@/lib/credits';
import { createSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return NextResponse.json({ error: 'Session requise.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const packId = body && typeof body.packId === 'string' ? body.packId : '';
  const pack = packById(packId);
  if (!pack) return NextResponse.json({ error: 'Forfait inconnu.' }, { status: 400 });

  const productId = productIdFor(pack);
  const apiKey = process.env.MBEUK_HUB_API_KEY?.trim() ?? '';
  const base = (process.env.MBEUK_HUB_BASE_URL?.trim() || 'https://mbeukhub.vercel.app').replace(/\/$/, '');
  if (!productId || !apiKey) {
    return NextResponse.json({
      error: 'Ce forfait n’est pas encore relié au Hub. Payez par Orange Money ou Mobile Money, puis envoyez le reçu sur WhatsApp.',
    }, { status: 503 });
  }

  try {
    const response = await fetch(`${base}/api/v1/checkout`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-Mbeuk-SDK-Version': '2.0.0',
      },
      body: JSON.stringify({ product_id: productId, customer_email: data.user.email }),
    });
    const payload = await response.json().catch(() => null);
    const checkoutUrl = payload && typeof payload.checkout_url === 'string' ? payload.checkout_url : '';
    if (!response.ok || !checkoutUrl.startsWith('https://')) {
      return NextResponse.json({ error: 'Le Hub n’a pas ouvert le paiement. Utilisez Orange Money ou Mobile Money, puis WhatsApp.' }, { status: 502 });
    }
    return NextResponse.json({ checkoutUrl });
  } catch {
    return NextResponse.json({ error: 'Paiement en ligne indisponible. Utilisez Orange Money ou Mobile Money, puis WhatsApp.' }, { status: 502 });
  }
}
