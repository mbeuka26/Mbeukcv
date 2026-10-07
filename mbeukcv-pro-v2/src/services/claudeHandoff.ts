import { buildSystemPrompt, buildUserPrompt } from '@contracts/documents';
import type { GenerateDocsPayload } from '@/types';

/**
 * ════════════════════════════════════════════════════════════
 * Handoff vers Claude.ai (interface de discussion externe)
 * ════════════════════════════════════════════════════════════
 * Permet de générer son CV/lettre SANS clé API : le prompt est copié
 * dans le presse-papier, puis Claude.ai s'ouvre dans un nouvel onglet.
 *
 * ⚠️ LIMITE TECHNIQUE RÉELLE, à ne pas cacher : il est IMPOSSIBLE pour
 * notre application de coller automatiquement le texte DANS le champ
 * de saisie de claude.ai. Ce n'est pas une fonctionnalité qu'il
 * "manque" — c'est une protection de sécurité fondamentale de TOUS les
 * navigateurs (politique de même origine) : un site web ne peut pas
 * écrire dans le DOM d'un autre site ouvert dans un onglet séparé,
 * sinon n'importe quel site pourrait manipuler n'importe quel autre
 * site à l'insu de l'utilisateur. Aucun contournement légitime
 * n'existe côté navigateur pour ce cas (une extension avec permissions
 * spéciales le pourrait, mais ce n'est pas ce que cette app est).
 *
 * Ce qui EST fait, concrètement :
 *   1. Le prompt complet est copié dans le presse-papier.
 *   2. claude.ai/new s'ouvre dans un nouvel onglet.
 *   3. L'utilisateur n'a plus qu'à coller (Ctrl+V / Cmd+V) et envoyer —
 *      le texte est déjà prêt, c'est la seule étape manuelle restante.
 */

export type ClaudeHandoffPayload = Pick<GenerateDocsPayload, 'candidat' | 'offreEmploi' | 'instructionsStyle'>;

export interface ClaudeHandoffResult {
  clipboardOk: boolean;
  windowOpened: boolean;
}

const CLAUDE_CHAT_URL = 'https://claude.ai/new';

/** Combine system + user prompt en un seul texte, adapté à un copier-coller dans un chat. */
function buildStandaloneChatPrompt(payload: ClaudeHandoffPayload): string {
  const system = buildSystemPrompt();
  const user = buildUserPrompt(payload as GenerateDocsPayload);
  return `${system}\n\n${'═'.repeat(50)}\n\n${user}`;
}

export async function sendToClaudeAi(payload: ClaudeHandoffPayload): Promise<ClaudeHandoffResult> {
  const prompt = buildStandaloneChatPrompt(payload);

  // window.open DOIT être appelé de façon synchrone, avant tout `await`,
  // sous peine d'être bloqué par le navigateur : les bloqueurs de
  // popup n'autorisent l'ouverture que si elle a lieu directement dans
  // le geste utilisateur (le clic), pas après une opération asynchrone
  // qui a rendu la main à la boucle d'événements entre-temps.
  const win = window.open(CLAUDE_CHAT_URL, '_blank', 'noopener,noreferrer');

  let clipboardOk = false;
  try {
    await navigator.clipboard.writeText(prompt);
    clipboardOk = true;
  } catch {
    clipboardOk = false;
  }

  return { clipboardOk, windowOpened: win !== null };
}
