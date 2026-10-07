import { Link } from 'react-router-dom';
import './Accueil.css';

interface ModeCard {
  to: string;
  icon: string;
  titre: string;
  description: string;
  badge?: string;
}

const MODES: ModeCard[] = [
  {
    to: '/classique',
    icon: '📝',
    titre: 'Mode Classique',
    description:
      "Formulaire structuré (expériences, formation, compétences...), plusieurs modèles visuels. Aucune clé API requise, aucune donnée envoyée où que ce soit.",
    badge: '100% hors-ligne',
  },
  {
    to: '/ia',
    icon: '✨',
    titre: 'Mode IA',
    description:
      "Collez votre CV et une offre d'emploi : Claude rédige un dossier complet optimisé ATS (CV + lettre, FR/EN). Nécessite votre clé API Claude.",
    badge: 'Clé API requise',
  },
  {
    to: '/ats',
    icon: '🎯',
    titre: 'Analyseur ATS',
    description:
      "Évaluez la compatibilité d'un CV existant avec une offre d'emploi : score détaillé par section, mots-clés manquants, recommandations.",
    badge: 'Clé API requise',
  },
  {
    to: '/recherche',
    icon: '🔍',
    titre: 'Recherche & Automatisation',
    description:
      "Enregistrez vos critères de veille. La recherche directe n'est pas branchée sur cet appareil. Le matching utilise les offres du hub lorsqu'il est configuré.",
    badge: 'Matching via le hub',
  },
];

export function Accueil() {
  return (
    <div className="accueil-page">
      <h1 className="accueil-title">Que souhaitez-vous faire ?</h1>
      <p className="accueil-subtitle">
        Le projet final est MbeukCV SaaS. Le lien de lancement ouvre l’accueil unique : fiche CV, extraction, offres classées, correspondance et candidatures.
      </p>
      <p className="accueil-subtitle">
        <a href="http://localhost:3000/accueil">Lancer MbeukCV</a>
      </p>

      <div className="accueil-grid">
        {MODES.map((mode) => (
          <Link key={mode.to} to={mode.to} className="mode-card">
            <div className="mode-card-icon" aria-hidden="true">
              {mode.icon}
            </div>
            <div className="mode-card-title">{mode.titre}</div>
            <p className="mode-card-desc">{mode.description}</p>
            {mode.badge && <span className="mode-card-badge">{mode.badge}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
