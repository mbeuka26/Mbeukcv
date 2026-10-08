'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePwaInstall } from '@/hooks/usePwaInstall';

const LINKS = [
  { href: '/accueil', label: 'Accueil' },
  { href: '/classique', label: 'Classique' },
  { href: '/ia', label: 'IA' },
  { href: '/cv', label: 'Fiche' },
  { href: '/offres', label: 'Offres' },
  { href: '/ats', label: 'ATS' },
  { href: '/recherche', label: 'Recherche' },
  { href: '/candidatures', label: 'Candidatures' },
  { href: '/parametres', label: 'Paramètres' },
];

export function SideNav() {
  const pathname = usePathname();
  const { canPrompt, installed, install } = usePwaInstall();

  async function onInstall() {
    await install();
  }

  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:px-3 md:pb-0">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm transition duration-150 [color:var(--color-sidebar-text)] ${
              active ? 'bg-white/15' : 'hover:bg-white/10'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
      {!installed && (
        <Link
          href="/parametres#installer"
          className="mt-2 block whitespace-nowrap rounded-lg px-3 py-2 text-sm transition duration-150 hover:bg-white/10 [color:var(--color-sidebar-text)]"
        >
          {canPrompt ? 'Installer l’app' : 'Installer sur PC'}
        </Link>
      )}
      {canPrompt && (
        <button
          type="button"
          className="mx-3 mb-1 block w-[calc(100%-1.5rem)] rounded-lg bg-white/15 px-3 py-2 text-left text-sm font-semibold transition hover:bg-white/25 [color:var(--color-sidebar-text)]"
          onClick={() => void onInstall()}
        >
          Installer MbeukCV
        </button>
      )}
      <a
        href="/pro/index.html"
        className="mt-2 block whitespace-nowrap rounded-lg border-t border-white/15 px-3 py-2 text-sm transition duration-150 hover:bg-white/10 [color:var(--color-sidebar-text)]"
      >
        MbeukCV Pro
      </a>
    </nav>
  );
}
