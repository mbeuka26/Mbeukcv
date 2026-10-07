/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

/**
 * Aucune clé de service n'est injectée au build.
 * La clé API Claude est saisie par l'utilisateur et stockée dans son navigateur
 * (voir services/byok.ts).
 * VITE_GOOGLE_CLIENT_ID est l'identifiant OAuth public du projet, pas un secret.
 */

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface GoogleTokenClient {
  requestAccessToken: (override?: { prompt?: string }) => void;
}

interface Window {
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          callback: (response: { access_token?: string; error?: string }) => void;
        }) => GoogleTokenClient;
      };
    };
  };
}
