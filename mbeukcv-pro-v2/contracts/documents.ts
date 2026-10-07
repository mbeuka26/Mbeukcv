import { z } from 'zod';

/**
 * Contrat unique de génération CV / lettres.
 * Importé par Vite (`@contracts/documents`) et par les Edge Functions.
 */

export interface DocumentPromptInput {
  candidat: {
    cvBrutTexte: string;
    langueCible: 'fr' | 'en' | 'les-deux';
  };
  offreEmploi: string;
  instructionsStyle?: string;
}

export const documentsZodSchema = z.object({
  cv_fr_html: z.string().min(50, 'cv_fr_html trop court ou vide'),
  cv_en_html: z.string().min(50, 'cv_en_html trop court ou vide'),
  lettre_fr_html: z.string().min(50, 'lettre_fr_html trop court ou vide'),
  lettre_en_html: z.string().min(50, 'lettre_en_html trop court ou vide'),
});

export const documentsJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    cv_fr_html: {
      type: 'string',
      description:
        'Document HTML5 complet (DOCTYPE, <html>, <head>, <body>) : CV en français. CSS exclusivement en attributs style="" inline sur chaque élément (pas de balise <style>, pas de feuille externe), prêt pour export PDF au format A4.',
    },
    cv_en_html: {
      type: 'string',
      description: 'Identique à cv_fr_html mais traduit et adapté (pas une simple traduction littérale) pour un lectorat anglophone.',
    },
    lettre_fr_html: {
      type: 'string',
      description: 'Document HTML5 complet : lettre de motivation en français, structure Vous-Moi-Nous, format A4, CSS inline uniquement.',
    },
    lettre_en_html: {
      type: 'string',
      description: 'Identique à lettre_fr_html mais en anglais.',
    },
  },
  required: ['cv_fr_html', 'cv_en_html', 'lettre_fr_html', 'lettre_en_html'],
} as const;

export function buildSystemPrompt(): string {
  return `Tu es un expert ATS (Applicant Tracking System) et recruteur senior. Ta mission : analyser le CV brut d'un candidat et une offre d'emploi, puis générer un dossier de candidature complet et optimisé.

═══════════════════════════════════════════
ANALYSE
═══════════════════════════════════════════
- Lis l'offre d'emploi et identifie ses mots-clés (compétences techniques, outils, soft skills, titre du poste).
- Compare avec le CV brut du candidat et repère les correspondances réelles.
- N'invente JAMAIS une compétence, une expérience, un diplôme ou un chiffre que le candidat ne possède pas. Reformuler et mettre en valeur : oui. Fabriquer : non.
- Intègre les mots-clés détectés de façon fluide et naturelle dans le CV et la lettre, jamais en liste brute artificielle.

═══════════════════════════════════════════
LETTRE DE MOTIVATION — STRUCTURE "VOUS - MOI - NOUS"
═══════════════════════════════════════════
- VOUS : ouvre sur l'entreprise et le poste, avec une compréhension précise du contexte donné dans l'offre.
- MOI : présente le candidat en miroir direct des besoins identifiés, avec 2 à 3 preuves concrètes tirées du CV.
- NOUS : projette la collaboration future et clôture avec un appel à l'échange (entretien).
- Une seule page A4.

═══════════════════════════════════════════
RÈGLES CSS — IMPÉRATIVES (impact direct sur l'export PDF)
═══════════════════════════════════════════
- Format de page fixe A4 (\`@page { size: A4; margin: 0; }\`, conteneur principal en \`210mm\` de large).
- INTERDICTION STRICTE de \`display: flex\` ou \`display: grid\` sur le \`body\` racine : ces conteneurs cassent les sauts de page lors de la conversion HTML → PDF. Utilise des \`<table>\` ou des largeurs fixes pour toute mise en page multi-colonnes.
- Styles CSS EXCLUSIVEMENT en attributs \`style=""\` inline sur chaque élément. Aucune balise \`<style>\`, aucune feuille de style externe (à l'exception de l'import des polices Google, voir ci-dessous).
- Polices : Google Fonts uniquement, importées via \`<link>\` dans le \`<head>\` (ex. Inter, Syne, Playfair Display) ; prévois toujours un \`font-family\` de repli (\`, sans-serif\`) dans chaque attribut \`style\` au cas où la police distante ne charge pas.
- Marges confortables (au moins 15mm) sur les bords extérieurs du contenu.
- Le CV tient sur une seule page A4.

═══════════════════════════════════════════
FORMAT DE SORTIE
═══════════════════════════════════════════
Tu réponds en produisant les arguments de l'outil \`return_documents\` avec exactement ces 4 clés :
- cv_fr_html : document HTML5 complet et autonome (CV en français)
- cv_en_html : document HTML5 complet et autonome (CV en anglais, adapté aux codes culturels anglophones, pas une traduction littérale)
- lettre_fr_html : document HTML5 complet et autonome (lettre de motivation en français, structure Vous-Moi-Nous)
- lettre_en_html : document HTML5 complet et autonome (lettre de motivation en anglais)

Chaque valeur est une chaîne HTML5 complète (\`<!DOCTYPE html><html>...<body>...</body></html>\`), stylisée entièrement en ligne comme décrit ci-dessus. Aucun texte, explication ou commentaire en dehors des champs de l'outil.`;
}

export function buildUserPrompt(payload: DocumentPromptInput): string {
  const styleLine = payload.instructionsStyle?.trim()
    ? `\n\nINSTRUCTIONS DE STYLE SUPPLÉMENTAIRES DU CANDIDAT (à respecter si compatibles avec les règles CSS du system prompt) :\n${payload.instructionsStyle.trim()}`
    : '';

  return `# OFFRE D'EMPLOI (texte brut copié par le candidat)

${payload.offreEmploi.trim()}

# CV BRUT DU CANDIDAT (texte brut, à restructurer — ne jamais inventer au-delà de ce contenu)

${payload.candidat.cvBrutTexte.trim()}

# LANGUE(S) CIBLE(S) DEMANDÉE(S)

${payload.candidat.langueCible === 'les-deux' ? 'Français ET anglais (générer les 4 documents avec un soin égal).' : payload.candidat.langueCible === 'fr' ? 'Français prioritaire (génère quand même les 4 documents comme demandé, la version anglaise peut être plus succincte).' : 'Anglais prioritaire (génère quand même les 4 documents comme demandé, la version française peut être plus succincte).'}${styleLine}

# TÂCHE

Génère le dossier de candidature complet (CV FR, CV EN, lettre FR, lettre EN) en respectant intégralement les règles du system prompt, puis appelle l'outil \`return_documents\` avec les 4 champs attendus.`;
}
