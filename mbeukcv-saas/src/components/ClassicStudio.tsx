'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { downloadClassicHtml, printClassicHtml } from '@/lib/classic/exportPdf';
import { cvFromClassic } from '@/lib/classic/map';
import { resizePhotoFile } from '@/lib/classic/photo';
import { renderClassicCvHtml, TEMPLATE_LABELS } from '@/lib/classic/renderClassicCv';
import { newId, type ClassicCvData, type CvTemplateId, type LangueItem } from '@/lib/classic/types';
import type { CvData } from '@/lib/cv';

const NIVEAUX: LangueItem['niveau'][] = ['Notions', 'Intermédiaire', 'Courant', 'Bilingue', 'Langue maternelle'];

const LIST_HINT =
  'Utilisez des tirets (-), puces (•) ou numéros (1. 2.) en début de ligne pour des listes de tâches.';

export function ClassicStudio({ initial }: { initial: CvData }) {
  const [cv, setCv] = useState<ClassicCvData>(initial.classic ?? {
    id: 'classic',
    nom: initial.fullName,
    titrePoste: initial.title,
    email: initial.email,
    telephone: initial.phone,
    ville: initial.location,
    linkedin: '',
    photoDataUrl: null,
    resume: initial.summary,
    experiences: initial.experiences.map((item) => ({ id: newId(), poste: item.role, entreprise: item.company, dateDebut: item.period, dateFin: '', enCours: false, description: item.details })),
    formations: initial.education.map((item) => ({ id: newId(), diplome: item.diploma, etablissement: item.school, dateDebut: '', dateFin: item.year, description: '' })),
    competences: initial.skills,
    langues: [],
    certifications: [],
    centresInteret: [],
    references: [],
    templateId: 'sobre',
    creeLe: new Date().toISOString(),
    misAJourLe: new Date().toISOString(),
  });
  const [skills, setSkills] = useState(cv.competences.join(', '));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const html = useMemo(
    () => renderClassicCvHtml({ ...cv, competences: skills.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean) }),
    [cv, skills],
  );

  useEffect(() => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [html]);

  function patch(fields: Partial<ClassicCvData>) {
    setCv((current) => ({ ...current, ...fields }));
  }

  async function save() {
    setPending(true);
    setMessage(null);
    setError(null);
    const next = { ...cv, competences: skills.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean) };
    const payload = cvFromClassic(next, initial);
    const response = await fetch('/api/cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cv: payload }),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(typeof body.error === 'string' ? body.error : 'Enregistrement impossible.');
      return;
    }
    setMessage('Modèle enregistré. La fiche des offres a été mise à jour avec ces informations.');
  }

  function exportPdf() {
    printClassicHtml(html, `CV — ${cv.nom || 'MbeukCV'}`);
    setMessage('Choisissez « Enregistrer au format PDF » dans la fenêtre d’impression.');
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="label">Nom<input className="field mt-1" value={cv.nom} onChange={(event) => patch({ nom: event.target.value })} /></label>
          <label className="label">Intitulé<input className="field mt-1" value={cv.titrePoste} onChange={(event) => patch({ titrePoste: event.target.value })} /></label>
          <label className="label">E-mail<input className="field mt-1" value={cv.email} onChange={(event) => patch({ email: event.target.value })} /></label>
          <label className="label">Téléphone<input className="field mt-1" value={cv.telephone} onChange={(event) => patch({ telephone: event.target.value })} /></label>
          <label className="label">Ville<input className="field mt-1" value={cv.ville} onChange={(event) => patch({ ville: event.target.value })} /></label>
          <label className="label">LinkedIn<input className="field mt-1" value={cv.linkedin} onChange={(event) => patch({ linkedin: event.target.value })} /></label>
        </div>
        <div className="sheet flex flex-wrap items-center gap-4 p-4">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden border border-line bg-paper text-xs text-muted">
            {cv.photoDataUrl ? <img src={cv.photoDataUrl} alt="Photo du CV" className="h-full w-full object-cover" /> : 'Photo'}
          </div>
          <div>
            <p className="font-medium">Photo du candidat</p>
            <p className="mt-1 max-w-sm text-sm text-muted">Affichée sur tous les modèles. JPEG, PNG ou WebP — redimensionnée automatiquement pour l’aperçu et le PDF.</p>
            <input
              className="mt-2 block text-sm"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void resizePhotoFile(file).then((url) => {
                  if (url) patch({ photoDataUrl: url });
                });
              }}
            />
            {cv.photoDataUrl && (
              <button type="button" className="mt-2 text-sm text-accent underline-offset-2 hover:underline" onClick={() => patch({ photoDataUrl: null })}>
                Retirer la photo
              </button>
            )}
          </div>
        </div>
        <label className="label">
          Résumé
          <p className="text-xs font-normal text-muted">{LIST_HINT}</p>
          <textarea className="field mt-1 min-h-24" value={cv.resume} onChange={(event) => patch({ resume: event.target.value })} />
        </label>
        <label className="label">
          Compétences
          <p className="text-xs font-normal text-muted">Séparez par des virgules ou une ligne par compétence.</p>
          <textarea className="field mt-1 min-h-16" value={skills} onChange={(event) => setSkills(event.target.value)} />
        </label>
        <fieldset className="space-y-2">
          <legend className="font-serif text-lg">Expériences</legend>
          <p className="text-xs text-muted">{LIST_HINT}</p>
          {cv.experiences.map((item) => (
            <div key={item.id} className="sheet space-y-2 p-3">
              <div className="grid gap-2 md:grid-cols-2">
                <input className="field" placeholder="Poste" value={item.poste} onChange={(event) => patch({ experiences: cv.experiences.map((row) => row.id === item.id ? { ...row, poste: event.target.value } : row) })} />
                <input className="field" placeholder="Organisation" value={item.entreprise} onChange={(event) => patch({ experiences: cv.experiences.map((row) => row.id === item.id ? { ...row, entreprise: event.target.value } : row) })} />
                <input className="field" placeholder="Début" value={item.dateDebut} onChange={(event) => patch({ experiences: cv.experiences.map((row) => row.id === item.id ? { ...row, dateDebut: event.target.value } : row) })} />
                <input className="field" placeholder="Fin" value={item.dateFin} onChange={(event) => patch({ experiences: cv.experiences.map((row) => row.id === item.id ? { ...row, dateFin: event.target.value } : row) })} />
              </div>
              <textarea className="field min-h-24" placeholder={'Tâches et réalisations\n- point 1\n- point 2'} value={item.description} onChange={(event) => patch({ experiences: cv.experiences.map((row) => row.id === item.id ? { ...row, description: event.target.value } : row) })} />
            </div>
          ))}
          <button type="button" className="btn-ghost" onClick={() => patch({ experiences: [...cv.experiences, { id: newId(), poste: '', entreprise: '', dateDebut: '', dateFin: '', enCours: false, description: '' }] })}>
            Ajouter une expérience
          </button>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="font-serif text-lg">Formations</legend>
          {cv.formations.map((item) => (
            <div key={item.id} className="sheet space-y-2 p-3">
              <div className="grid gap-2 md:grid-cols-3">
                <input className="field" placeholder="Diplôme" value={item.diplome} onChange={(event) => patch({ formations: cv.formations.map((row) => row.id === item.id ? { ...row, diplome: event.target.value } : row) })} />
                <input className="field" placeholder="Établissement" value={item.etablissement} onChange={(event) => patch({ formations: cv.formations.map((row) => row.id === item.id ? { ...row, etablissement: event.target.value } : row) })} />
                <input className="field" placeholder="Année" value={item.dateFin} onChange={(event) => patch({ formations: cv.formations.map((row) => row.id === item.id ? { ...row, dateFin: event.target.value } : row) })} />
              </div>
              <textarea className="field min-h-16" placeholder="Détails (optionnel, listes avec tirets)" value={item.description ?? ''} onChange={(event) => patch({ formations: cv.formations.map((row) => row.id === item.id ? { ...row, description: event.target.value } : row) })} />
            </div>
          ))}
          <button type="button" className="btn-ghost" onClick={() => patch({ formations: [...cv.formations, { id: newId(), diplome: '', etablissement: '', dateDebut: '', dateFin: '', description: '' }] })}>
            Ajouter une formation
          </button>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="font-serif text-lg">Langues</legend>
          {cv.langues.map((item) => (
            <div key={item.id} className="grid gap-2 md:grid-cols-2">
              <input className="field" placeholder="Langue" value={item.langue} onChange={(event) => patch({ langues: cv.langues.map((row) => row.id === item.id ? { ...row, langue: event.target.value } : row) })} />
              <select className="field" value={item.niveau} onChange={(event) => patch({ langues: cv.langues.map((row) => row.id === item.id ? { ...row, niveau: event.target.value as LangueItem['niveau'] } : row) })}>
                {NIVEAUX.map((niveau) => (
                  <option key={niveau}>{niveau}</option>
                ))}
              </select>
            </div>
          ))}
          <button type="button" className="btn-ghost" onClick={() => patch({ langues: [...cv.langues, { id: newId(), langue: '', niveau: 'Courant' }] })}>
            Ajouter une langue
          </button>
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn" disabled={pending} onClick={() => void save()}>
            {pending ? 'Enregistrement' : 'Enregistrer le modèle'}
          </button>
          <button type="button" className="btn-ghost" onClick={() => exportPdf()}>
            Télécharger en PDF
          </button>
          <button type="button" className="btn-ghost" onClick={() => downloadClassicHtml(html, `cv-${cv.nom || 'mbeuk'}.html`)}>
            HTML
          </button>
          <Link href="/offres" className="btn-ghost">
            Voir les offres
          </Link>
        </div>
        {message && <p className="text-sm text-[#2f6b45]">{message}</p>}
        {error && <p className="text-sm text-[#8d3d24]">{error}</p>}
      </div>
      <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <label className="label">
          Modèle
          <select className="field mt-1" value={cv.templateId} onChange={(event) => patch({ templateId: event.target.value as CvTemplateId })}>
            {(Object.keys(TEMPLATE_LABELS) as CvTemplateId[]).map((id) => (
              <option key={id} value={id}>
                {TEMPLATE_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted">Si l’aperçu reste blanc, enregistrez après avoir réduit la photo ou changez de modèle.</p>
        {previewUrl ? (
          <iframe title="Aperçu du CV" sandbox="allow-same-origin allow-modals" className="h-[640px] w-full border border-line bg-white shadow-md" src={previewUrl} />
        ) : (
          <div className="flex h-[640px] items-center justify-center border border-line bg-paper text-sm text-muted">Chargement de l’aperçu…</div>
        )}
      </aside>
    </div>
  );
}
