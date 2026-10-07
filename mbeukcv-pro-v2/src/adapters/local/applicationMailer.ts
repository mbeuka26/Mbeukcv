import type { ApplicationMailer } from '@/ports';

const DEFAULT_MESSAGE = `Bonjour,

Veuillez trouver ci-joint ma candidature.

Cordialement.`;

export const localApplicationMailer: ApplicationMailer = {
  kind: 'mailto',
  async send(draft) {
    const params = new URLSearchParams();
    if (draft.objet.trim()) params.set('subject', draft.objet.trim());
    params.set('body', draft.message?.trim() || DEFAULT_MESSAGE);
    const mailto = `mailto:${encodeURIComponent(draft.destinataire.trim())}?${params.toString().replace(/\+/g, '%20')}`;
    window.location.href = mailto;
  },
};
