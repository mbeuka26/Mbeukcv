'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:px-3 md:pb-0">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`block whitespace-nowrap px-3 py-2 text-sm text-[#f6f1ea] ${active ? 'bg-white/15' : 'hover:bg-white/10'}`}
          >
            {link.label}
          </Link>
        );
      })}
      <a
        href="/pro/"
        className="mt-2 block whitespace-nowrap border-t border-white/15 px-3 py-2 text-sm text-[#f6f1ea] hover:bg-white/10"
      >
        MbeukCV Pro
      </a>
    </nav>
  );
}
