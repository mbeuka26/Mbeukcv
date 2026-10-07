import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { PwaUpdateNotice } from '@/components/PwaUpdateNotice';
import { RecoverySetup } from '@/components/RecoverySetup';

interface LayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/classique', label: 'Classique' },
  { to: '/ia', label: 'IA' },
  { to: '/ats', label: 'ATS' },
  { to: '/recherche', label: 'Recherche' },
  { to: '/parametres', label: 'Paramètres' },
];

export function Layout({ children }: LayoutProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-logo">
          Mbeuk<span>CV</span>pro
        </div>
        <nav className="app-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => ['app-nav-link', isActive ? 'app-nav-link-active' : ''].join(' ')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <OfflineIndicator />
      <RecoverySetup />
      <main className="app-main">{children}</main>
      <PwaUpdateNotice />
    </div>
  );
}
