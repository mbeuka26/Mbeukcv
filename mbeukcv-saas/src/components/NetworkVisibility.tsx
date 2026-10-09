'use client';

import { useState } from 'react';

export function NetworkVisibility({ enabled }: { enabled: boolean }) {
  const [discover, setDiscover] = useState(enabled);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function save(next: boolean) {
    setPending(true);
    setMessage('');
    const response = await fetch('/api/exchange/visibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discover: next }),
    });
    const payload = await response.json().catch(() => null);
    setPending(false);
    if (payload?.confirmed === true) setDiscover(next);
    setMessage(typeof payload?.message === 'string' ? payload.message : 'Le réseau n\'a pas répondu.');
  }

  return (
    <section className="sheet p-4">
      <h2 className="font-serif text-xl">Visibilité auprès des entreprises</h2>
      <p className="mt-2 text-sm text-muted">
        {discover
          ? 'Les entreprises peuvent voir votre métier, votre résumé, vos compétences et votre localisation.'
          : 'Vous n\'apparaissez pas dans la recherche des entreprises.'}
        {' '}Le téléphone, l&apos;e-mail et les documents ne sont pas montrés à ce stade.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn" disabled={pending || discover} onClick={() => void save(true)}>Être visible</button>
        <button type="button" className="btn-ghost" disabled={pending || !discover} onClick={() => void save(false)}>Ne plus être visible</button>
      </div>
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
    </section>
  );
}
