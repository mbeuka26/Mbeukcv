import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Filet de sécurité final : si un composant plante pendant le rendu
 * (erreur imprévue, bug futur, etc.), affiche un écran d'erreur lisible
 * plutôt que de laisser l'utilisateur face à un écran vide/sombre sans
 * aucune explication.
 *
 * Note : les erreurs survenant PENDANT le chargement des modules (avant
 * que React ne monte quoi que ce soit) ne peuvent pas être interceptées
 * ici — d'où l'importance de garder main.tsx défensif (voir le montage
 * différé si `#root` n'existe pas encore).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Erreur interceptée :', error, info.componentStack);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: '#0a0a0f',
          color: 'white',
          fontFamily: 'Inter, sans-serif',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2.5rem' }}>⚠️</div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.3rem', margin: 0 }}>
          Une erreur inattendue est survenue
        </h1>
        <p style={{ maxWidth: 480, color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          L'application n'a pas pu démarrer correctement. Essayez de recharger la page. Si le
          problème persiste, vérifiez que votre clé API Claude est correctement renseignée dans
          les paramètres.
        </p>
        <pre
          style={{
            maxWidth: 560,
            overflow: 'auto',
            background: 'rgba(255,255,255,0.06)',
            padding: 12,
            borderRadius: 8,
            fontSize: '0.72rem',
            color: 'rgba(255,255,255,0.5)',
            textAlign: 'left',
          }}
        >
          {this.state.error.message}
        </pre>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '11px 22px',
            borderRadius: 10,
            border: 'none',
            background: 'linear-gradient(135deg, #0a0a0f 0%, #1a3a5c 100%)',
            color: 'white',
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          Recharger la page
        </button>
      </div>
    );
  }
}
