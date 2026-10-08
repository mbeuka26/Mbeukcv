'use client';

import { useCallback, useEffect, useState } from 'react';
import { CONSENT_APPLY_TEXT } from '@/lib/jobExchange/constants';

interface OpportunityItem {
  id: string;
  status: string;
  matchScore: number | null;
  matchNote: string | null;
  offerSummary: string | null;
  companyName: string;
  jobId: string;
  jobTitle: string;
  jobUrl: string | null;
  sourceLabel: string;
}

const STATUS_LABEL: Record<string, string> = {
  DISCOVERED: 'Correspondance détectée',
  INVITED: 'Invitation entreprise',
  VIEWED: 'Consultée',
  INTERESTED: 'Intérêt signalé',
  APPLIED: 'Candidature envoyée',
  DECLINED: 'Refusée / ignorée',
  EXPIRED: 'Expirée',
};

export function OpportunitiesList() {
  const [items, setItems] = useState<OpportunityItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [applyId, setApplyId] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoadError(null);
    const response = await fetch('/api/job-exchange/invitations');
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setLoadError(typeof body.error === 'string' ? body.error : 'Chargement impossible.');
      return;
    }
    setItems(Array.isArray(body.items) ? body.items : []);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function patchStatus(id: string, status: string) {
    setPendingId(id);
    setMessage(null);
    const response = await fetch(`/api/job-exchange/invitations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setPendingId(null);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(typeof body.error === 'string' ? body.error : 'Action impossible.');
      return;
    }
    await reload();
  }

  async function confirmApply(id: string) {
    setPendingId(id);
    setMessage(null);
    const response = await fetch('/api/job-exchange/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invitationId: id,
        consent: true,
        coverLetter: coverLetter.trim(),
      }),
    });
    const body = await response.json().catch(() => ({}));
    setPendingId(null);
    if (!response.ok) {
      setMessage(typeof body.error === 'string' ? body.error : 'Candidature impossible.');
      return;
    }
    setApplyId(null);
    setCoverLetter('');
    setMessage('Candidature enregistrée. Un snapshot de votre profil a été conservé.');
    await reload();
  }

  if (loadError) {
    return <p className="mt-4 text-sm text-[#8d3d24]">{loadError}</p>;
  }

  if (items.length === 0) {
    return (
      <div className="sheet mt-6 p-6">
        <h2 className="font-serif text-xl">Aucune opportunité MbeukRH</h2>
        <p className="mt-2 text-sm text-muted">
          Activez la visibilité professionnelle dans Paramètres et complétez votre CV. Les correspondances apparaîtront ici lorsque des offres Job Exchange seront publiées.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {message && <p className="text-sm text-[#2f6b45]">{message}</p>}
      <ul className="divide-y divide-line border border-line bg-surface">
        {items.map((item) => {
          const canAct = !['APPLIED', 'DECLINED', 'EXPIRED'].includes(item.status);
          return (
            <li key={item.id} className="space-y-3 px-4 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{item.jobTitle}</p>
                <span className="text-xs uppercase tracking-wide text-muted">{STATUS_LABEL[item.status] ?? item.status}</span>
              </div>
              <p className="text-sm text-muted">
                {item.companyName} · {item.sourceLabel}
                {item.matchScore != null ? ` · Score indicatif ${item.matchScore} %` : ''}
              </p>
              {item.offerSummary && <p className="text-sm">{item.offerSummary}</p>}
              {item.matchNote && <p className="text-xs text-muted">{item.matchNote}</p>}
              <div className="flex flex-wrap gap-2">
                {item.jobUrl && (
                  <a
                    className="btn-ghost text-sm"
                    href={item.jobUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => canAct && void patchStatus(item.id, 'VIEWED')}
                  >
                    Voir l’offre
                  </a>
                )}
                {canAct && (
                  <>
                    <button
                      type="button"
                      className="btn text-sm"
                      disabled={pendingId === item.id}
                      onClick={() => {
                        void patchStatus(item.id, 'VIEWED');
                        setApplyId(item.id);
                      }}
                    >
                      Postuler
                    </button>
                    <button
                      type="button"
                      className="btn-ghost text-sm"
                      disabled={pendingId === item.id}
                      onClick={() => void patchStatus(item.id, 'DECLINED')}
                    >
                      Refuser / Ignorer
                    </button>
                  </>
                )}
              </div>
              {applyId === item.id && (
                <div className="sheet space-y-3 p-4">
                  <p className="text-sm font-medium">Confirmation de transmission</p>
                  <p className="text-sm text-muted">
                    Les informations suivantes seront transmises à l’entreprise : profil professionnel, CV PDF généré depuis votre fiche, lettre de motivation si vous en saisissez une, et horodatage de consentement.
                  </p>
                  <p className="text-xs text-muted">{CONSENT_APPLY_TEXT}</p>
                  <label className="label">
                    Lettre de motivation (optionnelle)
                    <textarea
                      className="field mt-1 min-h-[120px] w-full"
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                    />
                  </label>
                  <div className="flex gap-2">
                    <button type="button" className="btn" disabled={pendingId === item.id} onClick={() => void confirmApply(item.id)}>
                      {pendingId === item.id ? 'Envoi…' : 'Confirmer et postuler'}
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => setApplyId(null)}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
