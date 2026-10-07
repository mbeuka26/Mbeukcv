/**
 * Identifiant unique du modèle Claude pour le navigateur et les Edge Functions.
 * Sonnet 5 rejette temperature / top_p / top_k hors valeurs par défaut :
 * les appelants ne doivent pas envoyer ces paramètres.
 * https://platform.claude.com/docs/en/models/sonnet-5/overview
 */
export const CLAUDE_MODEL_ID = 'claude-sonnet-5';

/** Plafond de sortie pour un dossier CV / une analyse ATS. */
export const CLAUDE_MAX_OUTPUT_TOKENS = 8000;
