import { cvHistoryStore, offerWatch } from '@/usecases/ports';
import { collectOffersViaBackend } from '@/services/backendApi';
import type { MatchRunResult } from '@/ports';

/**
 * Écrit le profil (mots-clés + CV) sous RLS, puis lance le matching hub.
 * Le CV vient de l'historique hub s'il en contient un, sinon de l'historique de l'appareil.
 */
export async function runHubMatching(input: { motsCles: string[]; scoreMinimum: number }): Promise<MatchRunResult> {
  const motsCles = input.motsCles.map((mot) => mot.trim()).filter(Boolean);
  if (motsCles.length === 0) {
    throw new Error('Ajoutez au moins un mot-clé avant de lancer le matching.');
  }

  const hubEntries = await cvHistoryStore('hub').list();
  const source = hubEntries.length > 0 ? hubEntries : await cvHistoryStore('local').list();
  const cvBrutTexte = source[0]?.cvBrutTexte?.trim() ?? '';
  if (cvBrutTexte.length < 50) {
    throw new Error('Aucun CV exploitable. Enregistrez un CV dans le mode IA avant le matching.');
  }

  let collecte = '';
  try {
    const collected = await collectOffersViaBackend(motsCles);
    collecte = collected.info;
  } catch (err) {
    collecte = err instanceof Error ? err.message : 'Collecte des offres indisponible.';
  }

  const match = await offerWatch('hub').match({
    motsCles,
    cvBrutTexte,
    scoreMinimum: input.scoreMinimum,
  });
  return { ...match, info: [collecte, match.info].filter(Boolean).join(' ') };
}
