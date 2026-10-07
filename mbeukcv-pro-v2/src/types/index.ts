/**
 * ════════════════════════════════════════════════════════════
 * Types partagés — MbeukCV Pro
 * ════════════════════════════════════════════════════════════
 * L'application fonctionne intégralement en local (BYOK, historique
 * IndexedDB) SANS aucun backend. Un backend Supabase optionnel (voir
 * services/supabase.ts, services/backendApi.ts) débloque un mode
 * "quota" (crédits partagés, sans clé perso), l'envoi d'e-mail réel,
 * et le matching IA — jamais requis pour l'usage de base.
 */

export interface GeneratedDocuments {
  cv_fr_html: string;
  cv_en_html: string;
  lettre_fr_html: string;
  lettre_en_html: string;
}

export interface GenerateDocsPayload {
  candidat: {
    cvBrutTexte: string;
    langueCible: 'fr' | 'en' | 'les-deux';
  };
  offreEmploi: string;
  instructionsStyle?: string;
  /** Clé API Anthropic personnelle — requise en mode local (BYOK), absente en mode backend/quota. */
  customClaudeKey?: string;
}

/**
 * ════════════════════════════════════════════════════════════
 * Types — Envoi d'e-mail via le backend (optionnel)
 * ════════════════════════════════════════════════════════════
 */
export interface EmailAttachmentPayload {
  filename: string;
  contentBase64: string;
  mimeType: 'application/pdf';
}

export interface SendApplicationPayload {
  licenceCode: string;
  destinataire: string;
  objet: string;
  message?: string;
  emailCandidatReplyTo?: string;
  pieces: EmailAttachmentPayload[];
}

export interface SendApplicationResult {
  id: string | null;
}

/**
 * ════════════════════════════════════════════════════════════
 * Types — Matching IA (résultats lus depuis le backend, optionnel)
 * ════════════════════════════════════════════════════════════
 */
export interface UserMatch {
  offreId: string;
  titre: string;
  entreprise: string;
  lieu?: string | null;
  url: string;
  emailRecruteur?: string | null;
  description?: string | null;
  score: number;
  resume: string;
  matchedAt: string;
}

/**
 * ════════════════════════════════════════════════════════════
 * Historique des CV — IndexedDB sur l'appareil, ou table hub historique_cv.
 * ════════════════════════════════════════════════════════════
 * Permet de gérer plusieurs profils de candidats différents dans le
 * même navigateur (CV de plusieurs personnes), chacun modifiable et
 * supprimable indépendamment.
 */
export interface CvHistoryEntry {
  /** Identifiant local (généré côté client, pas de base de données). */
  id: string;
  /** Nom/étiquette libre pour identifier ce CV dans la liste, ex. "Jean Dupont". */
  nom: string;
  cvBrutTexte: string;
  langueCible: 'fr' | 'en' | 'les-deux';
  instructionsStyle?: string;
  /** ISO 8601 */
  creeLe: string;
  /** ISO 8601 */
  misAJourLe: string;
}

/**
 * ════════════════════════════════════════════════════════════
 * Types — Recherche d'offres (squelette, voir services/jobSearch.ts)
 * ════════════════════════════════════════════════════════════
 * Contrat d'une offre réelle. La recherche sur l'appareil n'a pas de
 * fournisseur : elle refuse au lieu de renvoyer des résultats fictifs.
 * Les offres affichées viennent du matching hub.
 */
export interface JobSearchQuery {
  motCle: string;
  localisation?: string;
  limite?: number;
}

export interface JobOffer {
  id: string;
  titre: string;
  entreprise: string;
  lieu?: string;
  url: string;
  description?: string;
  datePublication?: string;
  source: 'hub';
}
