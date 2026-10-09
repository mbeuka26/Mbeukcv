'use client';

import { FormEvent, useEffect, useState } from 'react';

export interface NetworkJob {
  exchangeJobId: string;
  reference: string;
  title: string;
  company: string;
  location: string;
  description: string;
  closing: string | null;
  timezone: string;
}

export interface NetworkNotice {
  id: string;
  kind: string;
  subjectId: string;
  label: string;
  status: string;
}

export function NetworkPanel({
  configured,
  discover,
  jobs,
  notices,
  note,
}: {
  configured: boolean;
  discover: boolean;
  jobs: NetworkJob[];
  notices: NetworkNotice[];
  note: string;
}) {
  const [message, setMessage] = useState(note);
  const [pending, setPending] = useState('');

  useEffect(() => {
    const ids = notices.map((item) => item.id).filter(Boolean);
    if (!ids.length) return;
    void fetch('/api/exchange/ack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
  }, [notices]);

  async function post(url: string, body: unknown, key: string) {
    setPending(key);
    setMessage('');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    setPending('');
    setMessage(payload && typeof payload.message === 'string' ? payload.message : 'Le réseau n\'a pas répondu.');
  }

  return (
    <section className="sheet mb-8 p-5">
      <h2 className="font-serif text-2xl">Offres MbeukRH</h2>
      <p className="mt-2 text-sm text-muted">
        Ces offres viennent des entreprises MbeukRH. Elles ne sont pas mélangées aux offres collectées sur Internet.
        {discover ? ' Votre profil public peut être proposé.' : ' Vous n\'êtes pas visible des entreprises tant que vous ne l\'autorisez pas dans les paramètres.'}
      </p>
      {message ? <p className="mt-3 text-sm">{message}</p> : null}
      {!configured ? (
        <p className="mt-4 text-sm text-muted">Réseau non configuré. Aucune offre d&apos;entreprise n&apos;est affichée.</p>
      ) : jobs.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Aucune offre d&apos;entreprise ouverte.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line border border-line">
          {jobs.map((job) => (
            <li key={job.exchangeJobId} className="px-4 py-3">
              <p className="font-medium">{job.title || 'Offre'}</p>
              <p className="text-sm text-muted">{job.company || 'Entreprise'} · {job.reference} · {job.location || 'Lieu non renseigné'}</p>
              {job.description ? <p className="mt-2 text-sm">{job.description.slice(0, 320)}</p> : null}
              <form className="mt-3" onSubmit={(event: FormEvent) => {
                event.preventDefault();
                const consent = new FormData(event.currentTarget).get('consent') === 'yes';
                void post('/api/exchange/apply', {
                  exchangeJobId: job.exchangeJobId,
                  reference: job.reference,
                  title: job.title,
                  consent,
                }, job.exchangeJobId);
              }}>
                <label className="flex items-start gap-2 text-sm">
                  <input name="consent" type="checkbox" value="yes" required />
                  <span>Je transmets mon nom, mon e-mail et le résumé public du CV. Le téléphone n&apos;est joint que s&apos;il est déjà sur le CV.</span>
                </label>
                <button className="btn mt-3" type="submit" disabled={pending === job.exchangeJobId}>Postuler</button>
              </form>
            </li>
          ))}
        </ul>
      )}
      {notices.length > 0 ? (
        <div className="mt-6">
          <h3 className="font-serif text-xl">Notifications</h3>
          <ul className="mt-2 space-y-2">
            {notices.map((notice) => (
              <li key={notice.id} className="text-sm">
                <p>{notice.kind === 'invitation' ? 'Invitation' : 'Correspondance'} · {notice.label || 'Offre'}</p>
                {notice.kind === 'invitation' ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className="btn-ghost" disabled={pending === notice.id} onClick={() => void post('/api/exchange/invitation', { invitationId: notice.subjectId, status: 'viewed' }, notice.id)}>Consulter</button>
                    <button type="button" className="btn-ghost" disabled={pending === notice.id} onClick={() => void post('/api/exchange/invitation', { invitationId: notice.subjectId, status: 'accepted' }, notice.id)}>Accepter</button>
                    <button type="button" className="btn-ghost" disabled={pending === notice.id} onClick={() => void post('/api/exchange/invitation', { invitationId: notice.subjectId, status: 'declined' }, notice.id)}>Refuser</button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
