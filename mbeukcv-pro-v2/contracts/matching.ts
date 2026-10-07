import { z } from 'zod';

/** Contrat unique du matching hub. Le navigateur n'appelle pas Claude pour ce cas. */

export const matchesJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    matches: {
      type: 'array',
      description: 'Un élément par offre évaluée, dans le même ordre que la liste fournie.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          offreId: { type: 'string', description: "L'identifiant exact de l'offre, recopié tel quel." },
          score: { type: 'integer', minimum: 0, maximum: 100 },
          resume: { type: 'string', description: 'Une phrase expliquant le score attribué.' },
        },
        required: ['offreId', 'score', 'resume'],
      },
    },
  },
  required: ['matches'],
} as const;

export const matchesZodSchema = z.object({
  matches: z.array(
    z.object({
      offreId: z.string().min(1),
      score: z.number().min(0).max(100),
      resume: z.string().min(1).max(500),
    })
  ),
});

export interface MatchingOffre {
  id: string;
  titre: string;
  entreprise: string;
  lieu?: string | null;
  description?: string | null;
}

export function buildMatchingSystemPrompt(): string {
  return `Tu es un expert en recrutement chargé d'évaluer la pertinence d'offres d'emploi par rapport au profil d'un candidat.

Pour CHAQUE offre fournie, attribue un score de pertinence de 0 à 100 :
- 90-100 : correspondance quasi parfaite
- 75-89 : très bonne correspondance
- 50-74 : correspondance partielle
- 0-49 : peu ou pas pertinent

Base-toi sur les mots-clés du profil ET, si fourni, sur le CV complet. Raisonne par proximité sémantique, pas seulement par correspondance textuelle exacte.

Réponds en appelant l'outil \`return_matches\` avec un score pour CHAQUE offre listée. Recopie l'\`offreId\` exactement tel qu'il apparaît dans la liste fournie.`;
}

export function buildMatchingUserPrompt(
  profil: { motsCles: string[]; cvBrutTexte?: string },
  offres: MatchingOffre[]
): string {
  const motsClesLigne = profil.motsCles.join(', ');
  const cvExtrait = profil.cvBrutTexte?.trim()
    ? `\n\n# CV COMPLET DU CANDIDAT\n\n${profil.cvBrutTexte.trim().slice(0, 6000)}`
    : '';

  const offresListe = offres
    .map((o) => {
      const desc = o.description ? `\n  description: ${o.description.slice(0, 400)}` : '';
      return `- offreId: ${o.id}\n  titre: ${o.titre}\n  entreprise: ${o.entreprise}\n  lieu: ${o.lieu ?? 'non précisé'}${desc}`;
    })
    .join('\n');

  return `# PROFIL DU CANDIDAT

Mots-clés : ${motsClesLigne}${cvExtrait}

# OFFRES À ÉVALUER (${offres.length})

${offresListe}

# TÂCHE

Évalue chacune de ces ${offres.length} offres et appelle l'outil \`return_matches\`.`;
}
