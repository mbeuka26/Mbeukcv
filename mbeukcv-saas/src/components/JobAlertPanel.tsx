'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface AlertOffer {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  score: number | null;
}

export function JobAlertPanel({
  enabled,
  cvReady,
  cvLabel,
  offers,
}: {
  enabled: boolean;
  cvReady: boolean;
  cvLabel: string;
  offers: AlertOffer[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function toggle(on: boolean) {
    setPending(true);
    setError(null);
    setSaved(null);
    const response = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ on }),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(typeof body.error === 'string' ? body.error : 'Enregistrement impossible.');
      return;
    }
    setSaved(on ? 'C’est enregistré. L’alerte est active.' : 'C’est enregistré. L’alerte est arrêtée.');
    router.refresh();
  }

  return (
    <section id="alerte" className="sheet mb-8 scroll-mt-6 p-5">
      <p className="text-sm font-semibold text-accent">Après la collecte</p>
      <h2 className="mt-1 font-serif text-2xl">Nouvelles offres pour mon métier</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
        La collecte de 05:00, heure de Douala, alimente la base centrale. L’alerte reprend le métier du CV et montre ici les offres arrivées ensuite.
      </p>
      {enabled ? (
        <div className="mt-4">
          <p className="text-sm font-medium text-[#2f6b45]" role="status">Alerte active pour {cvLabel}.</p>
          {offers.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Aucune nouvelle offre pour ce métier depuis l’activation. Revenez après la prochaine collecte.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line border border-line bg-surface">
              {offers.map((offer) => (
                <li key={offer.id} className="px-4 py-3">
                  <a href={offer.url} target="_blank" rel="noreferrer" className="font-semibold underline-offset-2 hover:underline">
                    {offer.title}
                  </a>
                  <p className="mt-1 text-sm text-muted">
                    {offer.company}
                    {offer.location ? ` · ${offer.location}` : ''}
                    {offer.score == null ? '' : ` · ${offer.score} %`}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="btn" href="/offres?vue=profil">Voir les offres pour mon CV</a>
            <button type="button" className="btn-ghost" disabled={pending} onClick={() => void toggle(false)}>
              {pending ? 'Enregistrement' : 'Ne plus me prévenir'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <button type="button" className="btn" disabled={pending || !cvReady} onClick={() => void toggle(true)}>
            {pending ? 'Enregistrement' : 'Me prévenir'}
          </button>
          {!cvReady && (
            <p className="mt-3 text-sm text-muted">
              Ajoutez un intitulé ou des compétences au CV pour que l’alerte connaisse votre métier.
            </p>
          )}
        </div>
      )}
      {saved && <p className="mt-3 text-sm font-medium text-[#2f6b45]" role="status">{saved}</p>}
      {error && <p className="mt-3 text-sm text-[#8d3d24]" role="alert">{error}</p>}
    </section>
  );
}
