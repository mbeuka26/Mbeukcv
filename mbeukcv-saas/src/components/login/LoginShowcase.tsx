'use client';

import { useEffect, useState } from 'react';

const SLIDES = [
  {
    title: 'CV structuré, prêt à envoyer',
    body: 'Classique, IA ou ATS : un même profil, des modèles professionnels et un PDF soigné.',
    accent: 'cv',
  },
  {
    title: 'Offres qui correspondent',
    body: 'Scraping, JSearch et Job Exchange : score de correspondance et alertes ciblées.',
    accent: 'match',
  },
  {
    title: 'Candidature en confiance',
    body: 'Lettre assistée, dossier complet et suivi dans « Mes candidatures ».',
    accent: 'apply',
  },
] as const;

function Scene({ kind }: { kind: (typeof SLIDES)[number]['accent'] }) {
  return (
    <div className="login-scene" aria-hidden>
      <div className="login-scene__glow" />
      <div className="login-scene__card login-scene__float-a">
        {kind === 'cv' && (
          <svg viewBox="0 0 200 260" className="h-full w-full">
            <defs>
              <linearGradient id="cv-paper" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fbf8f3" />
                <stop offset="100%" stopColor="#e8dfd2" />
              </linearGradient>
            </defs>
            <rect x="24" y="16" width="152" height="210" rx="8" fill="url(#cv-paper)" stroke="#c9bbaa" />
            <circle cx="68" cy="58" r="22" fill="#8d3d24" opacity="0.85" />
            <rect x="100" y="44" width="56" height="8" rx="2" fill="#5f574e" />
            <rect x="100" y="58" width="40" height="6" rx="2" fill="#b8aea3" />
            <rect x="40" y="96" width="120" height="6" rx="2" fill="#d4c4b0" />
            <rect x="40" y="112" width="100" height="6" rx="2" fill="#d4c4b0" />
            <rect x="40" y="140" width="120" height="6" rx="2" fill="#e0d6c8" />
            <rect x="40" y="156" width="88" height="6" rx="2" fill="#e0d6c8" />
          </svg>
        )}
        {kind === 'match' && (
          <svg viewBox="0 0 200 260" className="h-full w-full">
            <rect x="20" y="40" width="160" height="44" rx="10" fill="#26211d" opacity="0.92" />
            <rect x="32" y="52" width="80" height="8" rx="2" fill="#f6f1ea" />
            <rect x="32" y="66" width="48" height="6" rx="2" fill="#c8bfb4" />
            <rect x="20" y="100" width="160" height="44" rx="10" fill="#fbf8f3" stroke="#e0d6c8" />
            <rect x="32" y="112" width="72" height="8" rx="2" fill="#1d1916" />
            <rect x="140" y="108" width="28" height="28" rx="14" fill="#2f6b45" />
            <text x="149" y="127" fill="#fff" fontSize="11" fontWeight="700">
              87
            </text>
            <path d="M100 160 L118 178 L148 148" stroke="#8d3d24" strokeWidth="5" fill="none" strokeLinecap="round" />
          </svg>
        )}
        {kind === 'apply' && (
          <svg viewBox="0 0 200 260" className="h-full w-full">
            <rect x="28" y="48" width="144" height="168" rx="12" fill="#fbf8f3" stroke="#e0d6c8" />
            <rect x="44" y="72" width="112" height="10" rx="3" fill="#8d3d24" opacity="0.9" />
            <rect x="44" y="92" width="96" height="6" rx="2" fill="#5f574e" />
            <rect x="44" y="108" width="112" height="6" rx="2" fill="#d4c4b0" />
            <rect x="44" y="124" width="104" height="6" rx="2" fill="#d4c4b0" />
            <rect x="44" y="160" width="64" height="28" rx="6" fill="#2f6b45" />
            <rect x="36" y="200" width="48" height="36" rx="6" fill="#26211d" transform="rotate(-8 60 218)" />
          </svg>
        )}
      </div>
      <div className="login-scene__orb login-scene__float-b" />
    </div>
  );
}

export function LoginShowcase() {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="relative flex flex-col justify-center overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-lg md:min-h-[520px] md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">MbeukCV</p>
      <h2 className="mt-2 font-serif text-2xl leading-tight text-ink md:text-3xl">{slide.title}</h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{slide.body}</p>
      <div className="mt-6 flex-1 md:mt-8">
        <Scene kind={slide.accent} />
      </div>
      <div className="mt-6 flex items-center gap-2">
        {SLIDES.map((item, i) => (
          <button
            key={item.accent}
            type="button"
            aria-label={`Illustration ${i + 1}`}
            className={`h-2.5 rounded-full transition-all duration-300 ${i === index ? 'w-8 bg-accent' : 'w-2.5 bg-line hover:bg-muted'}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </section>
  );
}
