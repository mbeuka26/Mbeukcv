'use client';

import { useState } from 'react';

interface Section { nom: string; score: number; commentaire: string }
interface Analysis {
  scoreGlobal: number;
  resume: string;
  sections: Section[];
  motsClesTrouves: string[];
  motsClesManquants: string[];
  recommandations: string[];
}

export function AtsStudio({ sourceText }: { sourceText: string }) {
  const [cv, setCv] = useState(sourceText);
  const [offer, setOffer] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  async function analyze() {
    setPending(true);
    setError(null);
    setAnalysis(null);
    const response = await fetch('/api/ats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cv, offer }),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(typeof body.error === 'string' ? body.error : 'Analyse impossible.');
      return;
    }
    setAnalysis(body.analysis as Analysis);
  }

  return (
    <section className="sheet mb-8 p-5">
      <h2 className="font-serif text-xl">Analyse d’une offre précise</h2>
      <p className="mt-2 text-sm text-muted">Compare le texte du CV au texte d’une offre. Les compétences absentes du CV ne sont pas ajoutées.</p>
      <label className="label mt-4">CV<textarea className="field mt-1 min-h-28" value={cv} onChange={(event) => setCv(event.target.value)} /></label>
      <label className="label mt-3">Offre<textarea className="field mt-1 min-h-28" value={offer} onChange={(event) => setOffer(event.target.value)} /></label>
      <button type="button" className="btn mt-4" disabled={pending} onClick={() => void analyze()}>{pending ? 'Analyse' : 'Analyser'}</button>
      {error && <p className="mt-3 text-sm text-[#8d3d24]">{error}</p>}
      {analysis && (
        <div className="mt-4 space-y-3">
          <p className="font-serif text-3xl">{analysis.scoreGlobal} %</p>
          <p className="text-sm">{analysis.resume}</p>
          <ul className="divide-y divide-line border border-line">
            {analysis.sections?.map((section) => (
              <li key={section.nom} className="px-3 py-2 text-sm">
                <span className="font-semibold">{section.nom} — {section.score} %</span>
                <span className="mt-1 block text-muted">{section.commentaire}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm"><span className="font-semibold">Présents. </span>{analysis.motsClesTrouves?.join(', ') || 'Aucun'}</p>
          <p className="text-sm"><span className="font-semibold">Absents. </span>{analysis.motsClesManquants?.join(', ') || 'Aucun'}</p>
          <ul className="list-disc pl-5 text-sm">
            {analysis.recommandations?.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}
