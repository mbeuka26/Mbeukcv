'use client';

import { useState } from 'react';
import {
  CREDIT_PACKS,
  formatFcfa,
  MOBILE_MONEY,
  ORANGE_MONEY,
  whatsAppReceiptUrl,
  type CreditPack,
} from '@/lib/creditBag';

export function CreditPanel({
  claude,
  claudeFree,
  claudeBought,
  claudeOwn,
  email,
  onlinePacks,
}: {
  claude: number;
  claudeFree: number;
  claudeBought: number;
  claudeOwn: boolean;
  email: string;
  onlinePacks: string[];
}) {
  return (
    <section id="forfaits" className="sheet mb-6 space-y-5 p-5">
      <div>
        <h2 className="font-serif text-xl">Crédits du compte</h2>
        <p className="mt-2 text-sm text-muted">
          À l’ouverture du compte : 2 actions Claude. Ce quota gratuit ne revient qu’au bout d’un an. Le jour, à Douala, le plafond est de 3 actions. Les forfaits achetés restent jusqu’à utilisation.
        </p>
        <p className="mt-2 text-sm text-muted">
          Les offres sont dans la base centrale. Chercher son métier lit ce catalogue et ne consomme pas de crédit RapidAPI.
        </p>
      </div>
      <dl>
        <div>
          <dt className="text-sm text-muted">Claude utilisable</dt>
          <dd className="font-serif text-2xl">{claudeOwn ? 'Votre clé' : claude}</dd>
          {!claudeOwn && <p className="text-sm text-muted">Dont {claudeFree} gratuits pour cette année, et {claudeBought} achetés.</p>}
        </div>
      </dl>
      <div>
        <h3 className="font-medium">Grille des forfaits</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-2 pr-3 font-medium">Forfait</th>
                <th className="py-2 pr-3 font-medium">Montant</th>
                <th className="py-2 font-medium">Paiement</th>
              </tr>
            </thead>
            <tbody>
              {CREDIT_PACKS.map((pack) => (
                <PackRow key={pack.id} pack={pack} email={email} online={onlinePacks.includes(pack.id)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <p>Orange Money : <span className="font-semibold">{ORANGE_MONEY}</span></p>
        <p>Mobile Money : <span className="font-semibold">{MOBILE_MONEY}</span></p>
        <p className="text-muted">Payez le montant du forfait, puis envoyez le reçu ou la capture. Le forfait est activé après vérification du paiement.</p>
        <a className="btn inline-flex" href={whatsAppReceiptUrl(email)} target="_blank" rel="noreferrer">
          Envoyer le reçu sur WhatsApp
        </a>
      </div>
    </section>
  );
}

function PackRow({ pack, email, online }: { pack: CreditPack; email: string; online: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function payOnline() {
    setPending(true);
    setError(null);
    const response = await fetch('/api/credits/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packId: pack.id }),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok || typeof body.checkoutUrl !== 'string') {
      setError(typeof body.error === 'string' ? body.error : 'Paiement en ligne indisponible.');
      return;
    }
    window.location.href = body.checkoutUrl;
  }

  return (
    <tr className="border-b border-line align-top">
      <td className="py-3 pr-3">{pack.label}</td>
      <td className="py-3 pr-3 whitespace-nowrap">{formatFcfa(pack.priceFcfa)}</td>
      <td className="py-3">
        <div className="flex flex-wrap gap-2">
          {online && (
            <button type="button" className="btn" disabled={pending} onClick={() => void payOnline()}>
              {pending ? 'Ouverture' : 'Payer en ligne'}
            </button>
          )}
          <a className="btn-ghost" href={whatsAppReceiptUrl(email, pack)} target="_blank" rel="noreferrer">
            Envoyer le reçu
          </a>
        </div>
        {error && <p className="mt-2 text-[#8d3d24]">{error}</p>}
      </td>
    </tr>
  );
}
