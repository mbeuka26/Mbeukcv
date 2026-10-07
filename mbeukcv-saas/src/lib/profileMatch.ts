const STOP = new Set([
  'ingenieur', 'ingenieure', 'technicien', 'technicienne', 'agent', 'assistant', 'assistante',
  'manager', 'responsable', 'charge', 'chargee', 'emploi', 'emplois', 'stage', 'offre', 'offres',
  'senior', 'junior', 'expert', 'confirme', 'debutant', 'temps', 'plein', 'partiel',
  'avec', 'pour', 'dans', 'cette', 'notre', 'votre', 'leurs', 'entre', 'plus', 'moins',
  'experience', 'experiences', 'competence', 'competences', 'formation', 'formations',
  'annee', 'annees', 'poste', 'travail', 'entreprise', 'societe', 'candidat', 'mission', 'missions',
  'profil', 'recherche', 'recherchons', 'bonne', 'bon', 'tres', 'tout', 'tous', 'toute',
  'projet', 'projets', 'gestion', 'etude', 'etudes', 'bureau', 'service', 'direction', 'directeur', 'genie',
  'the', 'and', 'for', 'with', 'from', 'your', 'our', 'job', 'jobs', 'work',
]);

export function fold(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function profileTerms(input: { title: string; skills: string[]; roles: string[]; diplomas?: string[] }): string[] {
  const tokens = new Set<string>();
  for (const chunk of [input.title, ...input.skills, ...input.roles, ...(input.diplomas ?? [])]) {
    const words = fold(chunk).split(/[^a-z0-9]+/).filter((word) => word.length >= 4 && !STOP.has(word));
    for (const word of words) tokens.add(word);
  }
  return [...tokens].slice(0, 24);
}

export function offerMatchesProfile(
  terms: string[],
  offer: { title: string; description: string | null; skills: string[] },
): boolean {
  if (terms.length === 0) return false;
  const haystack = fold([offer.title, ...offer.skills].join(' '));
  return terms.some((term) => haystack.includes(term));
}

export function searchQueryFromTerms(terms: string[], location: string): string | null {
  const words = terms.filter((term) => !term.includes(' ')).slice(0, 4);
  if (words.length === 0) return null;
  return [words.join(' '), location.trim()].filter(Boolean).join(' ').slice(0, 120);
}
