import type { ClassicCvData } from '@/lib/classic/types';

export interface TranslatableClassicPayload {
  nom: string;
  titrePoste: string;
  ville: string;
  resume: string;
  competences: string[];
  experiences: {
    id: string;
    poste: string;
    entreprise: string;
    lieu?: string;
    description: string;
  }[];
  formations: {
    id: string;
    diplome: string;
    etablissement: string;
    lieu?: string;
    description?: string;
  }[];
  langues: { id: string; langue: string; niveau: string }[];
  certifications: { id: string; nom: string; organisme: string }[];
  centresInteret: string[];
  references: { id: string; nom: string; poste: string; entreprise: string }[];
}

export function payloadFromClassic(cv: ClassicCvData, competences: string[]): TranslatableClassicPayload {
  return {
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
    certifications: cv.certifications.map((c) => ({ id: c.id, nom: c.nom, organisme: c.organisme })),
    centresInteret: cv.centresInteret,
    references: cv.references.map((r) => ({ id: r.id, nom: r.nom, poste: r.poste, entreprise: r.entreprise })),
  };
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function mergeTranslation(source: ClassicCvData, raw: unknown, competences: string[]): Partial<ClassicCvData> {
  if (!raw || typeof raw !== 'object') throw new Error('Traduction invalide.');
  const t = raw as Record<string, unknown>;
  const experiences = Array.isArray(t.experiences)
    ? source.experiences.map((row) => {
        const hit = (t.experiences as unknown[]).find((item) => item && typeof item === 'object' && (item as { id?: string }).id === row.id) as
          | { poste?: string; entreprise?: string; lieu?: string; description?: string }
          | undefined;
        return {
          ...row,
          poste: readString(hit?.poste) || row.poste,
          entreprise: readString(hit?.entreprise) || row.entreprise,
          lieu: readString(hit?.lieu) || row.lieu,
          description: readString(hit?.description) || row.description,
        };
      })
    : source.experiences;

  const formations = Array.isArray(t.formations)
    ? source.formations.map((row) => {
        const hit = (t.formations as unknown[]).find((item) => item && typeof item === 'object' && (item as { id?: string }).id === row.id) as
          | { diplome?: string; etablissement?: string; lieu?: string; description?: string }
          | undefined;
        return {
          ...row,
          diplome: readString(hit?.diplome) || row.diplome,
          etablissement: readString(hit?.etablissement) || row.etablissement,
          lieu: readString(hit?.lieu) || row.lieu,
          description: readString(hit?.description) || row.description,
        };
      })
    : source.formations;

  const langues = Array.isArray(t.langues)
    ? source.langues.map((row) => {
        const hit = (t.langues as unknown[]).find((item) => item && typeof item === 'object' && (item as { id?: string }).id === row.id) as
          | { langue?: string; niveau?: string }
          | undefined;
        return {
          ...row,
          langue: readString(hit?.langue) || row.langue,
          niveau: (readString(hit?.niveau) || row.niveau) as ClassicCvData['langues'][0]['niveau'],
        };
      })
    : source.langues;

  const competencesOut = Array.isArray(t.competences)
    ? (t.competences as unknown[]).map((item) => String(item).trim()).filter(Boolean)
    : competences;

  return {
    nom: readString(t.nom) || source.nom,
    titrePoste: readString(t.titrePoste) || source.titrePoste,
    ville: readString(t.ville) || source.ville,
    resume: readString(t.resume) || source.resume,
    competences: competencesOut,
    experiences,
    formations,
    langues,
    certifications: source.certifications,
    centresInteret: Array.isArray(t.centresInteret)
      ? (t.centresInteret as unknown[]).map((item) => String(item).trim()).filter(Boolean)
      : source.centresInteret,
    references: source.references,
  };
}
