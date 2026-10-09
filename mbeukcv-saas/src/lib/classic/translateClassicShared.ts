import type { ClassicCvData } from '@/lib/classic/types';

/** Vérifie qu’il y a assez de texte à traduire. */
export function hasTranslatableContent(cv: ClassicCvData, competences: string[]): boolean {
  const text = [
    cv.nom,
    cv.titrePoste,
    cv.resume,
    ...competences,
    ...cv.experiences.flatMap((e) => [e.poste, e.entreprise, e.description]),
  ]
    .join(' ')
    .trim();
  return text.length >= 24;
}
