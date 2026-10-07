import type { CvData } from '@/lib/cv';
import type { ClassicCvData } from '@/lib/classic/types';
import { createEmptyClassicCv } from '@/lib/classic/types';

export function classicFromCv(cv: CvData): ClassicCvData {
  if (cv.classic) return cv.classic;
  const base = createEmptyClassicCv('classic');
  return {
    ...base,
    nom: cv.fullName,
    titrePoste: cv.title,
    email: cv.email,
    telephone: cv.phone,
    ville: cv.location,
    resume: cv.summary,
    competences: cv.skills,
    experiences: cv.experiences.map((item, index) => ({
      id: `exp-${index}`,
      poste: item.role,
      entreprise: item.company,
      dateDebut: item.period,
      dateFin: '',
      enCours: false,
      description: item.details,
    })),
    formations: cv.education.map((item, index) => ({
      id: `form-${index}`,
      diplome: item.diploma,
      etablissement: item.school,
      dateDebut: '',
      dateFin: item.year,
    })),
  };
}

export function cvFromClassic(classic: ClassicCvData, previous: CvData): CvData {
  return {
    ...previous,
    fullName: classic.nom,
    title: classic.titrePoste,
    email: classic.email,
    phone: classic.telephone,
    location: classic.ville,
    summary: classic.resume,
    skills: classic.competences,
    experiences: classic.experiences.map((item) => ({
      role: item.poste,
      company: item.entreprise,
      period: [item.dateDebut, item.enCours ? "Aujourd'hui" : item.dateFin].filter(Boolean).join(' — '),
      details: item.description,
    })),
    education: classic.formations.map((item) => ({
      diploma: item.diplome,
      school: item.etablissement,
      year: item.dateFin || item.dateDebut,
    })),
    classic: { ...classic, misAJourLe: new Date().toISOString() },
  };
}
