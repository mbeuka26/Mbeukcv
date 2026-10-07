'use client';

import { useState } from 'react';
import { CvForm } from '@/components/CvForm';
import { readCv, type CvData } from '@/lib/cv';

export function CvWorkspace({ initial, accountEmail }: { initial: CvData; accountEmail: string }) {
  const [draft, setDraft] = useState(initial);
  const [revision, setRevision] = useState(0);
  const [text, setText] = useState(initial.sourceText);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function extract() {
    setPending(true);
    setError(null);
    setNotice(null);
    const response = await fetch('/api/cv/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(typeof body.error === 'string' ? body.error : 'Extraction impossible.');
      return;
    }
    const cv = readCv(body.cv);
    if (!cv.email.trim() && accountEmail) cv.email = accountEmail;
    cv.sourceText = text.slice(0, 20000);
    setDraft(cv);
    setRevision((value) => value + 1);
    setNotice('Fiche extraite. Relisez-la, corrigez ce qui manque, puis enregistrez. Seule la fiche enregistrée est comparée aux offres.');
  }

  return (
    <div className="space-y-8">
      <section id="extraction" className="sheet p-5">
        <h2 className="font-serif text-xl">À partir d’un CV existant</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Collez le texte de votre CV. L’extraction reprend uniquement ce qui est écrit, puis remplit la fiche ci-dessous.
        </p>
        <label className="label mt-4">
          Texte du CV
          <textarea className="field mt-1 min-h-40" value={text} onChange={(event) => setText(event.target.value)} />
        </label>
        <button type="button" className="btn mt-4" disabled={pending} onClick={() => void extract()}>
          {pending ? 'Lecture du CV' : 'Extraire la fiche'}
        </button>
        {notice && <p className="mt-3 text-sm text-[#2f6b45]">{notice}</p>}
        {error && <p className="mt-3 text-sm text-[#8d3d24]">{error}</p>}
      </section>
      <section>
        <h2 className="font-serif text-xl">Fiche utilisée pour les offres</h2>
        <p className="mb-4 mt-2 max-w-2xl text-sm text-muted">
          Cette fiche est celle du score et du PDF envoyé avec la candidature.
        </p>
        <CvForm key={revision} initial={draft} />
      </section>
    </div>
  );
}
