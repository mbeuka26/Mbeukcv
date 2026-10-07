import { z } from 'zod';

/** Analyse ATS sur l'appareil (clé personnelle). Pas d'Edge Function équivalente. */

export interface AtsSectionScore {
  nom: string;
  score: number;
  commentaire: string;
}

export interface AtsAnalysisResult {
  scoreGlobal: number;
  resume: string;
  sections: AtsSectionScore[];
  motsClesTrouves: string[];
  motsClesManquants: string[];
  recommandations: string[];
}

export const atsAnalysisZodSchema = z.object({
  scoreGlobal: z.number().min(0).max(100),
  resume: z.string().min(1).max(500),
  sections: z
    .array(
      z.object({
        nom: z.string().min(1).max(80),
        score: z.number().min(0).max(100),
        commentaire: z.string().min(1).max(400),
      })
    )
    .min(1)
    .max(10),
  motsClesTrouves: z.array(z.string()).max(40),
  motsClesManquants: z.array(z.string()).max(40),
  recommandations: z.array(z.string().max(300)).min(1).max(15),
});

export const atsAnalysisJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    scoreGlobal: {
      type: 'integer',
      minimum: 0,
      maximum: 100,
      description: 'Score global de compatibilité ATS du CV par rapport à l’offre, 0 à 100.',
    },
    resume: {
      type: 'string',
      description: 'Une phrase résumant le niveau de compatibilité global.',
    },
    sections: {
      type: 'array',
      description:
        "Score détaillé par section : évalue AU MINIMUM 'Mots-clés & compétences', 'Expérience pertinente', 'Formation', 'Structure & lisibilité'.",
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          nom: { type: 'string', description: "Nom de la section évaluée, ex. 'Mots-clés & compétences'." },
          score: { type: 'integer', minimum: 0, maximum: 100 },
          commentaire: { type: 'string', description: 'Explication concise du score attribué à cette section.' },
        },
        required: ['nom', 'score', 'commentaire'],
      },
    },
    motsClesTrouves: {
      type: 'array',
      items: { type: 'string' },
      description: "Mots-clés de l'offre retrouvés tels quels ou de façon équivalente dans le CV.",
    },
    motsClesManquants: {
      type: 'array',
      items: { type: 'string' },
      description: "Mots-clés importants de l'offre absents du CV.",
    },
    recommandations: {
      type: 'array',
      items: { type: 'string' },
      description: 'Recommandations concrètes et actionnables pour améliorer le score ATS du CV.',
    },
  },
  required: ['scoreGlobal', 'resume', 'sections', 'motsClesTrouves', 'motsClesManquants', 'recommandations'],
} as const;

export function buildAtsSystemPrompt(): string {
  return `Tu es un expert ATS (Applicant Tracking System) et consultant en recrutement. Ta mission : évaluer objectivement la compatibilité d'un CV avec une offre d'emploi précise, comme le ferait un système de tri automatique de candidatures suivi d'une relecture humaine.

═══════════════════════════════════════════
MÉTHODE
═══════════════════════════════════════════
- Extrait les mots-clés et exigences clés de l'offre (compétences techniques, outils, certifications, niveau d'expérience, soft skills explicitement demandés).
- Compare avec le contenu réel du CV fourni — ne suppose jamais une compétence non écrite.
- Évalue AU MINIMUM ces 4 sections, avec un score 0-100 et un commentaire concret pour chacune :
  1. "Mots-clés & compétences" — correspondance lexicale et sémantique avec l'offre.
  2. "Expérience pertinente" — pertinence et niveau des expériences par rapport au poste.
  3. "Formation" — adéquation du parcours académique/certifications.
  4. "Structure & lisibilité" — le CV est-il probablement bien parsé par un ATS (sections claires, pas de tableaux complexes suggérés par le texte, dates cohérentes, pas de jargon graphique) ? Base-toi sur ce que le texte brut suggère de la mise en forme.
- Le score global n'est PAS une simple moyenne mécanique des sections : pondère selon ce qui compte le plus pour CETTE offre précise (ex. si l'offre insiste fortement sur une compétence technique absente, le score global doit le refléter fortement).
- Liste les mots-clés de l'offre réellement retrouvés dans le CV, et ceux qui manquent clairement.
- Donne des recommandations concrètes et actionnables (pas génériques) : quoi ajouter, reformuler, ou mettre en avant.

═══════════════════════════════════════════
RÈGLES
═══════════════════════════════════════════
- Sois honnête et direct, y compris si le score est bas — l'objectif est d'aider le candidat, pas de le flatter.
- N'invente jamais de contenu absent du CV fourni pour "compléter" ton analyse.
- Réponds UNIQUEMENT en appelant l'outil \`return_ats_analysis\` avec les champs attendus. Aucun texte hors de l'outil.`;
}

export function buildAtsUserPrompt(cvTexte: string, offreTexte: string): string {
  return `# OFFRE D'EMPLOI

${offreTexte.trim()}

# CV À ÉVALUER

${cvTexte.trim()}

# TÂCHE

Analyse la compatibilité ATS de ce CV avec cette offre et appelle l'outil \`return_ats_analysis\`.`;
}
