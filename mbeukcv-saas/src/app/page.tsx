import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-16">
      <p className="text-sm font-medium text-accent">MbeukCV</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">Un CV, les offres encore ouvertes, puis la candidature.</h1>
      <p className="mt-4 max-w-xl text-base text-muted">
        Vous enregistrez une fiche, à la main ou extraite de votre CV. Cette fiche est comparée aux offres actives.
        La candidature envoie ce même CV lorsqu’une adresse est connue.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="btn" href="/accueil">Lancer MbeukCV</Link>
        <Link className="btn-ghost" href="/login">Ouvrir une session</Link>
      </div>
    </main>
  );
}
