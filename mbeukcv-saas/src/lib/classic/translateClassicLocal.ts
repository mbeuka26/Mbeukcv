import 'server-only';
import type { ClassicDisplayLocale } from '@/lib/classic/locales';
import { machineTranslateMultiline, machineTranslateSegment } from '@/lib/classic/machineTranslate';
import { mergeTranslation, payloadFromClassic } from '@/lib/classic/translateClassicMerge';
import type { ClassicCvData } from '@/lib/classic/types';

/** Traduction structurée sans crédit Claude (LibreTranslate si configuré, sinon moteur Google public). */
export async function translateClassicCvLocal(
  cv: ClassicCvData,
  competences: string[],
  target: ClassicDisplayLocale,
): Promise<Partial<ClassicCvData>> {
  if (target === 'fr') return {};

  const payload = payloadFromClassic(cv, competences);

  const translatedPayload = {
    nom: await machineTranslateSegment(payload.nom, target),
    titrePoste: await machineTranslateSegment(payload.titrePoste, target),
    ville: await machineTranslateSegment(payload.ville, target),
    resume: await machineTranslateMultiline(payload.resume, target),
    competences: await Promise.all(payload.competences.map((item) => machineTranslateSegment(item, target))),
    experiences: await Promise.all(
      payload.experiences.map(async (row) => ({
        ...row,
        poste: await machineTranslateSegment(row.poste, target),
        entreprise: await machineTranslateSegment(row.entreprise, target),
        lieu: row.lieu ? await machineTranslateSegment(row.lieu, target) : row.lieu,
        description: await machineTranslateMultiline(row.description, target),
      })),
    ),
    formations: await Promise.all(
      payload.formations.map(async (row) => ({
        ...row,
        diplome: await machineTranslateSegment(row.diplome, target),
        etablissement: await machineTranslateSegment(row.etablissement, target),
        lieu: row.lieu ? await machineTranslateSegment(row.lieu, target) : row.lieu,
        description: row.description ? await machineTranslateMultiline(row.description, target) : row.description,
      })),
    ),
    langues: await Promise.all(
      payload.langues.map(async (row) => ({
        ...row,
        langue: await machineTranslateSegment(row.langue, target),
        niveau: await machineTranslateSegment(row.niveau, target),
      })),
    ),
    centresInteret: await Promise.all(payload.centresInteret.map((item) => machineTranslateSegment(item, target))),
  };

  return mergeTranslation(cv, translatedPayload, competences);
}
