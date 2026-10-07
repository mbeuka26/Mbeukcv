'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export interface WatchOffer {
  id: string;
  title: string;
  location: string | null;
  score: number;
  note: string | null;
}

export function RechercheStudio({ offers }: { offers: WatchOffer[] }) {
  const [words, setWords] = useState('');
  const [minimum, setMinimum] = useState(0);
  const visible = useMemo(() => {
    const keys = words.split(/[,;\n]/).map((item) => item.trim().toLowerCase()).filter((item) => item.length >= 2);
    return offers
      .filter((offer) => offer.score >= minimum)
      .filter((offer) => keys.length === 0 || keys.some((key) => `${offer.title} ${offer.location ?? ''}`.toLowerCase().includes(key)))
      .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title, 'fr'));
  }, [offers, words, minimum]);

  return (
    <div>
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_140px]">
        <label className="label">
          Mots-clés
          <input className="field mt-1" value={words} placeholder="mécanique, Douala" onChange={(event) => setWords(event.target.value)} />
        </label>
        <label className="label">
          Pourcentage minimum
          <input className="field mt-1" type="number" min={0} max={100} value={minimum} onChange={(event) => setMinimum(Number(event.target.value) || 0)} />
        </label>
      </div>
      <p className="mb-2 text-sm text-muted">{visible.length} offre{visible.length > 1 ? 's' : ''}, du plus fort pourcentage au plus faible.</p>
      {visible.length === 0 ? (
        <div className="sheet p-6">
          <h2 className="font-serif text-xl">Aucune offre pour ces critères</h2>
          <p className="mt-2 text-sm text-muted">Élargissez les mots-clés ou baissez le pourcentage minimum.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line border border-line bg-surface">
          {visible.map((offer) => (
            <li key={offer.id} className="grid grid-cols-[5rem_1fr] gap-3 px-4 py-3">
              <span className="font-serif text-xl">{offer.score} %</span>
              <span>
                <span className="font-medium">{offer.title}</span>
                <span className="mt-1 block text-sm text-muted">{[offer.location, offer.note].filter(Boolean).join(' · ')}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link href="/offres" className="mt-4 inline-block text-sm font-semibold text-accent underline-offset-2 hover:underline">Ouvrir les offres pour postuler</Link>
    </div>
  );
}
