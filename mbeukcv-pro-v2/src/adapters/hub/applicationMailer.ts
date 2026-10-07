import { sendApplicationViaBackend } from '@/services/backendApi';
import type { ApplicationMailer } from '@/ports';

export const hubApplicationMailer: ApplicationMailer = {
  kind: 'hub',
  async send(draft) {
    if (!draft.pieces || draft.pieces.length === 0) {
      throw new Error('Sélectionnez au moins un document PDF.');
    }
    return sendApplicationViaBackend({
      destinataire: draft.destinataire.trim(),
      objet: draft.objet.trim(),
      message: draft.message?.trim() || undefined,
      pieces: draft.pieces,
    });
  },
};
