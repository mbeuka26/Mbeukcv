import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/global.css';

/**
 * HashRouter (pas BrowserRouter) : indispensable pour la compatibilité
 * avec le mode "fichier HTML autonome" (file://), où l'API History
 * (pushState/replaceState avec des URLs de chemin) est bloquée par les
 * navigateurs. HashRouter navigue via `location.hash` (`#/classique`),
 * toujours autorisé quel que soit le protocole — voir l'historique du
 * projet pour le détail de ce correctif.
 */
function mount() {
  const container = document.getElementById('root');

  if (!container) {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
    return;
  }

  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <ErrorBoundary>
        <HashRouter>
          <App />
        </HashRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

mount();
