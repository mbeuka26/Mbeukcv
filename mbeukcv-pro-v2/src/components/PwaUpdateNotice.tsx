import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * ════════════════════════════════════════════════════════════
 * Notification PWA — mise à jour disponible / prêt hors-ligne
 * ════════════════════════════════════════════════════════════
 * `useRegisterSW` (fourni par vite-plugin-pwa) gère l'enregistrement
 * du service worker et expose deux états à afficher à l'utilisateur :
 *   - `offlineReady` : le service worker a fini de mettre les fichiers
 *     essentiels en cache, l'app fonctionne maintenant hors-ligne.
 *   - `needRefresh` : une nouvelle version est disponible, il faut
 *     recharger pour l'activer (le SW ne s'auto-remplace jamais tant
 *     qu'un onglet de l'ancienne version reste ouvert, par sécurité).
 *
 * En dehors d'un contexte PWA (ex. build standalone sans SW), ce hook
 * ne fait simplement rien — sûr à monter inconditionnellement.
 */
export function PwaUpdateNotice() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      // eslint-disable-next-line no-console
      console.warn('[PWA] Échec d’enregistrement du service worker (mode hors-ligne indisponible).', error);
    },
  });

  function close() {
    setOfflineReady(false);
    setNeedRefresh(false);
  }

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="pwa-toast" role="status">
      {needRefresh ? (
        <>
          <span>🔄 Nouvelle version disponible.</span>
          <button className="pwa-toast-btn" onClick={() => void updateServiceWorker(true)}>
            Mettre à jour
          </button>
        </>
      ) : (
        <span>✅ Application prête pour un usage hors-ligne.</span>
      )}
      <button className="pwa-toast-close" onClick={close} aria-label="Fermer">
        ×
      </button>
    </div>
  );
}
