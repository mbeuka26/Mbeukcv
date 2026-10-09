'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { downloadClassicHtml, printClassicHtml } from '@/lib/classic/exportPdf';
import { cvFromClassic } from '@/lib/classic/map';
import {
  CLASSIC_DISPLAY_LOCALES,
  LOCALE_LABELS,
  type ClassicDisplayLocale,
} from '@/lib/classic/locales';
import { resizePhotoFile } from '@/lib/classic/photo';
import { renderClassicCvHtml, TEMPLATE_LABELS } from '@/lib/classic/renderClassicCv';
import { newId, type ClassicCvData, type CvTemplateId, type LangueItem } from '@/lib/classic/types';
import type { CvData } from '@/lib/cv';

const NIVEAUX: LangueItem['niveau'][] = ['Notions', 'Intermédiaire', 'Courant', 'Bilingue', 'Langue maternelle'];

const LIST_HINT =
  'Utilisez des tirets (-), puces (•) ou numéros (1. 2.) en début de ligne pour des listes de tâches.';

type TranslationEntry = {
  sourceKey: string;
  patch: Partial<ClassicCvData>;
  competences: string[];
};

function competencesFromSkills(skills: string): string[] {
  return skills
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function classicSourceKey(cv: ClassicCvData, competences: string[]): string {
  return JSON.stringify({
    nom: cv.nom,
    titrePoste: cv.titrePoste,
    ville: cv.ville,
    resume: cv.resume,
    competences,
    experiences: cv.experiences.map((e) => ({
      id: e.id,
      poste: e.poste,
      entreprise: e.entreprise,
      lieu: e.lieu,
      description: e.description,
    })),
    formations: cv.formations.map((f) => ({
      id: f.id,
      diplome: f.diplome,
      etablissement: f.etablissement,
      lieu: f.lieu,
      description: f.description,
    })),
    langues: cv.langues.map((l) => ({ id: l.id, langue: l.langue, niveau: l.niveau })),
    centresInteret: cv.centresInteret,
  });
}

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
  const [displayLocale, setDisplayLocale] = useState<ClassicDisplayLocale>('fr');
  const [justifyText, setJustifyText] = useState(true);
  const [translationCache, setTranslationCache] = useState<Partial<Record<ClassicDisplayLocale, TranslationEntry>>>({});
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [translateEngine, setTranslateEngine] = useState<'local' | 'claude' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const competencesList = useMemo(() => competencesFromSkills(skills), [skills]);
  const sourceKey = useMemo(() => classicSourceKey(cv, competencesList), [cv, competencesList]);

  const previewCv = useMemo(() => {
    const base: ClassicCvData = { ...cv, competences: competencesList };
    if (displayLocale === 'fr') return base;
    const hit = translationCache[displayLocale];
    if (!hit || hit.sourceKey !== sourceKey) return base;
    return {
      ...base,
      ...hit.patch,
      competences: hit.competences.length ? hit.competences : competencesList,
    };
  }, [cv, competencesList, displayLocale, translationCache, sourceKey]);

  useEffect(() => {
    if (displayLocale === 'fr') {
      setTranslateError(null);
      setTranslating(false);
      setTranslateEngine(null);
      return;
    }
    const hit = translationCache[displayLocale];
    if (hit?.sourceKey === sourceKey) return;

    let cancelled = false;
    setTranslating(true);
    setTranslateError(null);

    const payload: ClassicCvData = { ...cv, competences: competencesList };

    void fetch('/api/cv/classic-translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cv: payload, competences: competencesList, locale: displayLocale }),
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
          translated?: Partial<ClassicCvData>;
          engine?: 'local' | 'claude';
        };
        if (cancelled) return;
        if (!response.ok) {
          throw new Error(typeof body.error === 'string' ? body.error : 'Traduction impossible.');
        }
        setTranslateEngine(body.engine === 'claude' ? 'claude' : 'local');
        const translated = body.translated ?? {};
        const comps = Array.isArray(translated.competences)
          ? translated.competences.map((item) => String(item).trim()).filter(Boolean)
          : competencesList;
        setTranslationCache((current) => ({
          ...current,
          [displayLocale]: { sourceKey, patch: translated, competences: comps },
        }));
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setTranslateError(err instanceof Error ? err.message : 'Traduction impossible.');
        }
      })
      .finally(() => {
        if (!cancelled) setTranslating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [displayLocale, sourceKey, cv, competencesList]);

  const html = useMemo(
    () => renderClassicCvHtml(previewCv, { locale: displayLocale, justify: justifyText }),
    [previewCv, displayLocale, justifyText],
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
    const next = { ...cv, competences: competencesList };
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
    printClassicHtml(html, `CV — ${previewCv.nom || 'MbeukCV'}`);
    setMessage('Choisissez « Enregistrer au format PDF » dans la fenêtre d’impression.');
  }

  const previewPending = displayLocale !== 'fr' && (translating || translationCache[displayLocale]?.sourceKey !== sourceKey);

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
          <button type="button" className="btn-ghost" disabled={previewPending} onClick={() => exportPdf()}>
            Télécharger en PDF
          </button>
          <button type="button" className="btn-ghost" disabled={previewPending} onClick={() => downloadClassicHtml(html, `cv-${previewCv.nom || 'mbeuk'}.html`)}>
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
          Langue de l’aperçu et du PDF
          <select
            className="field mt-1"
            value={displayLocale}
            onChange={(event) => setDisplayLocale(event.target.value as ClassicDisplayLocale)}
          >
            {CLASSIC_DISPLAY_LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {LOCALE_LABELS[locale]}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted">
          Le formulaire reste en français. La traduction passe d’abord par le moteur intégré (gratuit, sans crédit Claude). En cas d’échec, un repli IA peut être utilisé (1 crédit).
        </p>
        {translateEngine === 'local' && displayLocale !== 'fr' && !translateError && (
          <p className="text-xs text-[#2f6b45]">Traduction économique — aucun crédit consommé.</p>
        )}
        {translateEngine === 'claude' && !translateError && (
          <p className="text-xs text-muted">Repli IA utilisé pour cette traduction (crédit consommé).</p>
        )}
        {translateError && <p className="text-xs text-[#8d3d24]">{translateError}</p>}
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={justifyText}
            onChange={(event) => setJustifyText(event.target.checked)}
          />
          <span>
            <span className="font-medium">Texte justifié</span>
            <span className="mt-0.5 block text-xs text-muted">Paragraphes et listes alignés sur toute la largeur (recommandé pour l’impression).</span>
          </span>
        </label>
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
        <div className="relative">
          {previewPending && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-paper/80 text-sm text-muted">
              Traduction en cours…
            </div>
          )}
          {previewUrl ? (
            <iframe title="Aperçu du CV" sandbox="allow-same-origin allow-modals" className="h-[640px] w-full border border-line bg-white shadow-md" src={previewUrl} />
          ) : (
            <div className="flex h-[640px] items-center justify-center border border-line bg-paper text-sm text-muted">Chargement de l’aperçu…</div>
          )}
        </div>
      </aside>
    </div>
  );
}
