import type { JobOffer, JobSearchQuery } from '@/types';

/**
 * Port de recherche d'offres côté appareil.
 * Aucun fournisseur n'est branché : la fonction refuse, elle ne fabrique
 * pas de résultats. La veille réelle passe par le hub (offres collectées
 * côté serveur), pas par cet appel.
 */
export class OfferSearchUnavailableError extends Error {
  constructor() {
    super("Aucun fournisseur d'offres n'est branché sur cet appareil.");
    this.name = 'OfferSearchUnavailableError';
  }
}

export function localOfferSearchAvailable(): boolean {
  return false;
}

export async function searchJobs(query: JobSearchQuery): Promise<JobOffer[]> {
  void query;
  throw new OfferSearchUnavailableError();
}
