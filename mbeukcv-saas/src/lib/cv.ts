import type { ClassicCvData } from '@/lib/classic/types';

export interface CvData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  title: string;
  summary: string;
  yearsExperience: number | null;
  skills: string[];
  experiences: { role: string; company: string; period: string; details: string }[];
  education: { diploma: string; school: string; year: string }[];
  sourceText: string;
  classic: ClassicCvData | null;
}

export const emptyCv = (): CvData => ({
  fullName: '',
  email: '',
  phone: '',
  location: '',
  title: '',
  summary: '',
  yearsExperience: null,
  skills: [],
  experiences: [],
  education: [],
  sourceText: '',
  classic: null,
});

export function readCv(value: unknown): CvData {
  const base = emptyCv();
  if (!value || typeof value !== 'object') return base;
  const raw = value as Partial<CvData>;
  return {
    ...base,
    fullName: typeof raw.fullName === 'string' ? raw.fullName : '',
    email: typeof raw.email === 'string' ? raw.email : '',
    phone: typeof raw.phone === 'string' ? raw.phone : '',
    location: typeof raw.location === 'string' ? raw.location : '',
    title: typeof raw.title === 'string' ? raw.title : '',
    summary: typeof raw.summary === 'string' ? raw.summary : '',
    yearsExperience: typeof raw.yearsExperience === 'number' && Number.isFinite(raw.yearsExperience) ? raw.yearsExperience : null,
    skills: Array.isArray(raw.skills) ? raw.skills.map((item) => String(item).trim()).filter(Boolean) : [],
    experiences: Array.isArray(raw.experiences)
      ? raw.experiences.slice(0, 12).map((item) => ({
          role: String(item?.role ?? ''),
          company: String(item?.company ?? ''),
          period: String(item?.period ?? ''),
          details: String(item?.details ?? ''),
        }))
      : [],
    education: Array.isArray(raw.education)
      ? raw.education.slice(0, 8).map((item) => ({
          diploma: String(item?.diploma ?? ''),
          school: String(item?.school ?? ''),
          year: String(item?.year ?? ''),
        }))
      : [],
    sourceText: typeof raw.sourceText === 'string' ? raw.sourceText.slice(0, 20000) : '',
    classic: readClassic(raw.classic),
  };
}

function readClassic(value: unknown): ClassicCvData | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<NonNullable<CvData['classic']>>;
  if (typeof raw.nom !== 'string' || typeof raw.templateId !== 'string') return null;
  const template = raw.templateId === 'moderne' || raw.templateId === 'colore' ? raw.templateId : 'sobre';
  return {
    id: typeof raw.id === 'string' ? raw.id : 'classic',
    nom: raw.nom,
    titrePoste: typeof raw.titrePoste === 'string' ? raw.titrePoste : '',
    email: typeof raw.email === 'string' ? raw.email : '',
    telephone: typeof raw.telephone === 'string' ? raw.telephone : '',
    ville: typeof raw.ville === 'string' ? raw.ville : '',
    linkedin: typeof raw.linkedin === 'string' ? raw.linkedin : '',
    photoDataUrl: typeof raw.photoDataUrl === 'string' ? raw.photoDataUrl : null,
    resume: typeof raw.resume === 'string' ? raw.resume : '',
    experiences: Array.isArray(raw.experiences) ? raw.experiences.slice(0, 12) as ClassicCvData['experiences'] : [],
    formations: Array.isArray(raw.formations) ? raw.formations.slice(0, 8) as ClassicCvData['formations'] : [],
    competences: Array.isArray(raw.competences) ? raw.competences.map((item) => String(item)).filter(Boolean).slice(0, 40) : [],
    langues: Array.isArray(raw.langues) ? raw.langues.slice(0, 8) as ClassicCvData['langues'] : [],
    certifications: Array.isArray(raw.certifications) ? raw.certifications.slice(0, 8) as ClassicCvData['certifications'] : [],
    centresInteret: Array.isArray(raw.centresInteret) ? raw.centresInteret.map((item) => String(item)).filter(Boolean).slice(0, 12) : [],
    references: Array.isArray(raw.references) ? raw.references.slice(0, 6) as ClassicCvData['references'] : [],
    templateId: template,
    creeLe: typeof raw.creeLe === 'string' ? raw.creeLe : new Date().toISOString(),
    misAJourLe: typeof raw.misAJourLe === 'string' ? raw.misAJourLe : new Date().toISOString(),
  };
}
