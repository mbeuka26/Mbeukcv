'use client';

import { useState } from 'react';

const DOCS = [
  { key: 'cv_fr_html', label: 'CV français' },
  { key: 'cv_en_html', label: 'CV anglais' },
  { key: 'lettre_fr_html', label: 'Lettre française' },
  { key: 'lettre_en_html', label: 'Lettre anglaise' },
] as const;

export function IaStudio({ sourceText }: { sourceText: string }) {
  const [cv, setCv] = useState(sourceText);
  const [offer, setOffer] = useState('');
  const [style, setStyle] = useState('');
  const [language, setLanguage] = useState<'fr' | 'en' | 'les-deux'>('les-deux');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<string | null>(null);
  const [handoffNote, setHandoffNote] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Record<string, string> | null>(null);
  const [active, setActive] = useState<(typeof DOCS)[number]['key']>('cv_fr_html');

  async function openClaude() {
    const response = await fetch('/api/cv/handoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cv, offer }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || typeof body.prompt !== 'string') {
      setError(typeof body.error === 'string' ? body.error : 'Le prompt n’a pas pu être préparé.');
      return;
    }
    window.open('https://claude.ai/new', '_blank', 'noopener,noreferrer');
    try {
      await navigator.clipboard.writeText(body.prompt);
      setHandoffNote('Prompt copié. Dans Claude.ai, collez-le avec Ctrl+V, puis envoyez.');
      setHandoff(null);
    } catch {
      setHandoff(body.prompt);
      setHandoffNote('Claude.ai est ouvert. La copie a été refusée : copiez le texte ci-dessous, puis envoyez.');
    }
  }

  async function generate() {
    setPending(true);
    setError(null);
    setHandoff(null);
    setHandoffNote(null);
    const response = await fetch('/api/cv/dossier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cv, offer, style, language }),
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

  return (
    <div className="space-y-4">
      <label className="label">CV brut<textarea className="field mt-1 min-h-36" value={cv} onChange={(event) => setCv(event.target.value)} /></label>
      <label className="label">Offre visée<textarea className="field mt-1 min-h-36" value={offer} onChange={(event) => setOffer(event.target.value)} /></label>
      <label className="label">Consigne de style, facultative<input className="field mt-1" value={style} onChange={(event) => setStyle(event.target.value)} /></label>
      <label className="label">
        Langue prioritaire
        <select className="field mt-1 max-w-xs" value={language} onChange={(event) => setLanguage(event.target.value as 'fr' | 'en' | 'les-deux')}>
          <option value="les-deux">Français et anglais</option>
          <option value="fr">Français</option>
          <option value="en">Anglais</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" disabled={pending} onClick={() => void generate()}>{pending ? 'Rédaction' : 'Générer le dossier'}</button>
        <button type="button" className="btn-ghost" onClick={() => void openClaude()}>Générer dans Claude.ai</button>
      </div>
      {error && <p className="text-sm text-[#8d3d24]">{error}</p>}
      {handoffNote && <p className="text-sm text-muted">{handoffNote}</p>}
      {handoff && <textarea className="field min-h-28" readOnly value={handoff} />}
      {documents && (
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            {DOCS.map((doc) => (
              <button key={doc.key} type="button" className={active === doc.key ? 'btn' : 'btn-ghost'} onClick={() => setActive(doc.key)}>{doc.label}</button>
            ))}
          </div>
          <iframe title={active} sandbox="" className="h-[720px] w-full border border-line bg-white" srcDoc={documents[active]} />
        </div>
      )}
    </div>
  );
}
