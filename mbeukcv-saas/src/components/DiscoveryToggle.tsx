'use client';

import { FormEvent, useState } from 'react';

export function DiscoveryToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);
    const response = await fetch('/api/job-exchange/discovery', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !enabled }),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(typeof body.error === 'string' ? body.error : 'Enregistrement impossible.');
      return;
    }
    setEnabled(Boolean(body.enabled));
    setMessage(typeof body.note === 'string' ? body.note : 'Préférence enregistrée.');
  }

  return (
    <form onSubmit={onSubmit} className="sheet space-y-3 p-4">
      <h2 className="font-serif text-xl">Visibilité professionnelle MbeukRH</h2>
      <p className="text-sm text-muted">
        Si cette option est activée, les entreprises du Job Exchange peuvent voir un profil limité (métier, compétences, expérience, résumé, zone géographique, score). Votre e-mail, téléphone et documents privés ne sont jamais transmis automatiquement.
      </p>
      <p className="text-sm font-medium">{enabled ? 'ON — découverte autorisée' : 'OFF — non visible pour la découverte'}</p>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Enregistrement…' : enabled ? 'Désactiver' : 'Activer'}
      </button>
      {message && <p className="text-sm text-[#2f6b45]">{message}</p>}
      {error && <p className="text-sm text-[#8d3d24]">{error}</p>}
    </form>
  );
}
