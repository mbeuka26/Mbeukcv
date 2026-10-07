'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import type { CvData } from '@/lib/cv';

export function CvForm({ initial }: { initial: CvData }) {
  const [cv, setCv] = useState(initial);
  const [skills, setSkills] = useState(initial.skills.join(', '));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set<K extends keyof CvData>(key: K, value: CvData[K]) {
    setCv((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);
    const payload: CvData = {
      ...cv,
      skills: skills.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean),
      sourceText: cv.sourceText,
    };
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
    setMessage('CV enregistré.');
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="label">Nom complet<input className="field mt-1" value={cv.fullName} onChange={(event) => set('fullName', event.target.value)} /></label>
        <label className="label">Intitulé<input className="field mt-1" value={cv.title} onChange={(event) => set('title', event.target.value)} /></label>
        <label className="label">E-mail<input className="field mt-1" type="email" value={cv.email} onChange={(event) => set('email', event.target.value)} /></label>
        <label className="label">Téléphone<input className="field mt-1" value={cv.phone} onChange={(event) => set('phone', event.target.value)} /></label>
        <label className="label">Lieu<input className="field mt-1" value={cv.location} onChange={(event) => set('location', event.target.value)} /></label>
        <label className="label">
          Années d’expérience
          <input className="field mt-1" type="number" min={0} max={50} value={cv.yearsExperience ?? ''} onChange={(event) => set('yearsExperience', event.target.value === '' ? null : Number(event.target.value))} />
        </label>
      </div>
      <label className="label">
        Résumé
        <textarea className="field mt-1 min-h-28" value={cv.summary} onChange={(event) => set('summary', event.target.value)} />
      </label>
      <label className="label">
        Compétences, séparées par des virgules
        <textarea className="field mt-1 min-h-20" value={skills} onChange={(event) => setSkills(event.target.value)} />
      </label>
      <fieldset className="space-y-3">
        <legend className="font-serif text-lg">Expérience</legend>
        {cv.experiences.map((item, index) => (
          <div key={index} className="grid gap-2 md:grid-cols-4">
            <input className="field" placeholder="Poste" value={item.role} onChange={(event) => updateExperience(index, 'role', event.target.value)} />
            <input className="field" placeholder="Organisation" value={item.company} onChange={(event) => updateExperience(index, 'company', event.target.value)} />
            <input className="field" placeholder="Période" value={item.period} onChange={(event) => updateExperience(index, 'period', event.target.value)} />
            <input className="field" placeholder="Détail" value={item.details} onChange={(event) => updateExperience(index, 'details', event.target.value)} />
          </div>
        ))}
        <button type="button" className="btn-ghost" onClick={() => set('experiences', [...cv.experiences, { role: '', company: '', period: '', details: '' }])}>
          Ajouter une expérience
        </button>
      </fieldset>
      <fieldset className="space-y-3">
        <legend className="font-serif text-lg">Formation</legend>
        {cv.education.map((item, index) => (
          <div key={index} className="grid gap-2 md:grid-cols-3">
            <input className="field" placeholder="Diplôme" value={item.diploma} onChange={(event) => updateEducation(index, 'diploma', event.target.value)} />
            <input className="field" placeholder="Établissement" value={item.school} onChange={(event) => updateEducation(index, 'school', event.target.value)} />
            <input className="field" placeholder="Année" value={item.year} onChange={(event) => updateEducation(index, 'year', event.target.value)} />
          </div>
        ))}
        <button type="button" className="btn-ghost" onClick={() => set('education', [...cv.education, { diploma: '', school: '', year: '' }])}>
          Ajouter une formation
        </button>
      </fieldset>
      <button className="btn" disabled={pending} type="submit">{pending ? 'Enregistrement' : 'Enregistrer le CV'}</button>
      {message && (
        <p className="text-sm text-[#2f6b45]">
          {message}{' '}
          <Link href="/offres" className="font-semibold underline underline-offset-2">Voir les offres correspondantes</Link>
        </p>
      )}
      {error && <p className="text-sm text-[#8d3d24]">{error}</p>}
    </form>
  );

  function updateExperience(index: number, key: 'role' | 'company' | 'period' | 'details', value: string) {
    set('experiences', cv.experiences.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  }

  function updateEducation(index: number, key: 'diploma' | 'school' | 'year', value: string) {
    set('education', cv.education.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
  }
}
