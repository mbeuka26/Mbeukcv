'use client';

import { useEffect, useState } from 'react';

const DOCS = [
  { key: 'cv_fr_html', label: 'CV français' },
  { key: 'cv_en_html', label: 'CV anglais' },
  { key: 'lettre_fr_html', label: 'Lettre française' },
  { key: 'lettre_en_html', label: 'Lettre anglaise' },
] as const;

export function DossierDialog({
  job,
  prefill,
  onClose,
  onSent,
}: {
  job: { id: string; title: string; contactKnown: boolean };
  prefill: { fullName: string; email: string; phone: string };
  onClose: () => void;
  onSent: (message: string) => void;
}) {
  const [recruiterName, setRecruiterName] = useState('');
  const [recruiterEmail, setRecruiterEmail] = useState('');
  const [documents, setDocuments] = useState<Record<string, string> | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({
    cv_fr_html: true,
    cv_en_html: true,
    lettre_fr_html: true,
    lettre_en_html: true,
  });
  const [active, setActive] = useState<(typeof DOCS)[number]['key']>('lettre_fr_html');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<string | null>(null);
  const [handoffNote, setHandoffNote] = useState<string | null>(null);
  const [contactNote, setContactNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const response = await fetch(`/api/jobs/${job.id}`);
      const body = await response.json().catch(() => ({}));
      if (cancelled || !response.ok) return;
      if (typeof body.recruiterName === 'string' && body.recruiterName) setRecruiterName(body.recruiterName);
      if (typeof body.contactEmail === 'string' && body.contactEmail) setRecruiterEmail(body.contactEmail);
      if (!body.recruiterName && !body.contactEmail) {
        setContactNote(body.organisation
          ? `Organisation repérée : ${body.organisation}. Le nom et l’e-mail de la personne n’ont pas été trouvés. Saisissez-les si vous les connaissez.`
          : 'Le nom et l’e-mail du recruteur n’ont pas été trouvés. Saisissez-les si vous les connaissez.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [job.id]);

  async function generate() {
    setPending(true);
    setError(null);
    setHandoff(null);
    setHandoffNote(null);
    const response = await fetch('/api/cv/dossier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id, recruiterName, language: 'les-deux' }),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(typeof body.error === 'string' ? body.error : 'Génération impossible.');
      setHandoff(typeof body.handoff === 'string' ? body.handoff : null);
      return;
    }
    setDocuments(body.documents);
  }

  async function openClaude() {
    const response = await fetch('/api/cv/handoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id, recruiterName }),
    });
    const body = await response.json().catch(() => ({}));
    const prompt = typeof body.prompt === 'string' ? body.prompt : handoff;
    if (!prompt) {
      setHandoffNote('Le prompt n’a pas pu être préparé.');
      return;
    }
    window.open('https://claude.ai/new', '_blank', 'noopener,noreferrer');
    try {
      await navigator.clipboard.writeText(prompt);
      setHandoffNote('Prompt copié. Dans Claude.ai, collez-le avec Ctrl+V, puis envoyez.');
    } catch {
      setHandoff(prompt);
      setHandoffNote('Claude.ai est ouvert. La copie a été refusée : sélectionnez le texte ci-dessous, copiez-le, puis envoyez.');
    }
  }

  async function send() {
    if (!documents) return;
    const selected: Record<string, string> = {};
    for (const doc of DOCS) {
      if (picked[doc.key]) selected[doc.key] = documents[doc.key];
    }
    setPending(true);
    setError(null);
    const response = await fetch('/api/apply/dossier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: job.id,
        fullName: prefill.fullName,
        email: prefill.email,
        phone: prefill.phone,
        recruiterName,
        recruiterEmail,
        documents: selected,
      }),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(typeof body.error === 'string' ? body.error : 'Envoi impossible.');
      return;
    }
    if (typeof body.openUrl === 'string') window.open(body.openUrl, '_blank', 'noopener,noreferrer');
    onSent(body.copyOnly ? 'Copie envoyée sur votre adresse. L’offre est ouverte.' : 'Dossier envoyé au recruteur.');
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#1d1916]/40 p-4 md:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="sheet max-h-[92vh] w-full max-w-3xl overflow-y-auto p-5" onClick={(event) => event.stopPropagation()}>
        <h2 className="font-serif text-2xl">Dossier pour cette offre</h2>
        <p className="mt-1 text-sm text-muted">{job.title}</p>
        <p className="mt-2 text-sm text-muted">Le CV enregistré et cette offre servent à rédiger le CV et les lettres, en français et en anglais.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="label">Nom du recruteur<input className="field mt-1" value={recruiterName} onChange={(event) => setRecruiterName(event.target.value)} /></label>
          <label className="label">E-mail du recruteur<input className="field mt-1" type="email" value={recruiterEmail} onChange={(event) => setRecruiterEmail(event.target.value)} placeholder={job.contactKnown ? 'Adresse déjà repérée dans l’offre' : 'À saisir si elle est connue'} /></label>
        </div>
        {contactNote && <p className="mt-3 text-sm text-muted">{contactNote}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn" disabled={pending} onClick={() => void generate()}>{pending ? 'Rédaction' : 'Générer le CV et les lettres'}</button>
          <button type="button" className="btn-ghost" onClick={() => void openClaude()}>Générer dans Claude.ai</button>
        </div>
        {error && <p className="mt-3 text-sm text-[#8d3d24]">{error}</p>}
        {handoffNote && <p className="mt-3 text-sm text-muted">{handoffNote}</p>}
        {handoff && handoffNote?.includes('refusée') && <textarea className="field mt-2 min-h-28" readOnly value={handoff} />}
        {documents && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-3 text-sm">
              {DOCS.map((doc) => (
                <label key={doc.key} className="flex items-center gap-2">
                  <input type="checkbox" checked={picked[doc.key]} onChange={(event) => setPicked((current) => ({ ...current, [doc.key]: event.target.checked }))} />
                  {doc.label}
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {DOCS.map((doc) => (
                <button key={doc.key} type="button" className={active === doc.key ? 'btn' : 'btn-ghost'} onClick={() => setActive(doc.key)}>{doc.label}</button>
              ))}
            </div>
            <iframe title={active} sandbox="" className="h-[420px] w-full border border-line bg-white" srcDoc={documents[active]} />
            <button type="button" className="btn" disabled={pending} onClick={() => void send()}>{pending ? 'Envoi' : 'Envoyer les documents cochés'}</button>
          </div>
        )}
        <button type="button" className="btn-ghost mt-3" onClick={onClose}>Fermer</button>
      </div>
    </div>
  );
}
