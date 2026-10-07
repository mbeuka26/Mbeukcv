/**
 * ════════════════════════════════════════════════════════════
 * Mode Classique — CV à champs structurés (sans IA)
 * ════════════════════════════════════════════════════════════
 * Contrairement au mode IA (texte libre analysé par Claude), ce mode
 * fonctionne à 100% sans clé API : l'utilisateur remplit des champs
 * structurés, choisit un modèle visuel, et le document est assemblé
 * directement en HTML côté client (voir templates/).
 */

export interface ExperienceItem {
  id: string;
  poste: string;
  entreprise: string;
  lieu?: string;
  dateDebut: string;
  dateFin: string;
  enCours: boolean;
  description: string;
}

export interface FormationItem {
  id: string;
  diplome: string;
  etablissement: string;
  lieu?: string;
  dateDebut: string;
  dateFin: string;
  description?: string;
}

export interface CertificationItem {
  id: string;
  nom: string;
  organisme: string;
  annee: string;
}

export interface LangueItem {
  id: string;
  langue: string;
  niveau: 'Notions' | 'Intermédiaire' | 'Courant' | 'Bilingue' | 'Langue maternelle';
}

export interface ReferenceItem {
  id: string;
  nom: string;
  poste: string;
  entreprise: string;
  contact: string;
}

export type CvTemplateId = 'sobre' | 'moderne' | 'colore';

export interface ClassicCvData {
  id: string;
  nom: string;
  titrePoste: string;
  email: string;
  telephone: string;
  ville: string;
  linkedin: string;
  photoDataUrl: string | null;
  resume: string;
  experiences: ExperienceItem[];
  formations: FormationItem[];
  competences: string[];
  langues: LangueItem[];
  certifications: CertificationItem[];
  centresInteret: string[];
  references: ReferenceItem[];
  templateId: CvTemplateId;
  creeLe: string;
  misAJourLe: string;
}

export function createEmptyClassicCv(id: string): ClassicCvData {
  const now = new Date().toISOString();
  return {
    id,
    nom: '',
    titrePoste: '',
    email: '',
    telephone: '',
    ville: '',
    linkedin: '',
    photoDataUrl: null,
    resume: '',
    experiences: [],
    formations: [],
    competences: [],
    langues: [],
    certifications: [],
    centresInteret: [],
    references: [],
    templateId: 'sobre',
    creeLe: now,
    misAJourLe: now,
  };
}

export function newId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
