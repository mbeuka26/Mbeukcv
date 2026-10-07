import type { OfferWatch } from '@/ports';

/**
 * Point de montage de la veille locale. Aucun site n'est interrogé.
 * Le matching réel est une action explicite du hub.
 */
export function useOfferWatch(): void {
  // Intentionnellement vide.
}

export const localOfferWatch: OfferWatch = {
  available: false,
  async match() {
    throw new Error('Le matching des offres passe par le hub. Configurez-le dans Paramètres.');
  },
  async list() {
    return [];
  },
};
