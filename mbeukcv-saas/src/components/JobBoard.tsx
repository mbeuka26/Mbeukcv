'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DossierDialog } from '@/components/DossierDialog';
import { FormEvent, useEffect, useMemo, useState } from 'react';

export interface JobView {
  id: string;
  title: string;
  company: string;
  location: string | null;
  typeLabel: string;
  source: string;
  url: string;
  excerpt: string | null;
  dateLabel: string | null;
  deadline: string | null;
  contactKnown: boolean;
  score: number | null;
  scoreNote: string | null;
  relevant: boolean;
  country: string | null;
  isInternational: boolean;
  minExperienceYears: number | null;
  educationLevel: string;
  educationLabel: string;
}

export function JobBoard({
  jobs,
  catalogStats,
  prefill,
  cvReady,
  cvLabel,
  initialView,
  matchReady,
}: {
  jobs: JobView[];
  catalogStats?: { jsearch: number; local: number; rapidConfigured: boolean };
  prefill: { fullName: string; email: string; phone: string };
  cvReady: boolean;
  cvLabel: string;
  initialView: 'profil' | 'toutes';
  matchReady: boolean;
}) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selected, setSelected] = useState<JobView | null>(null);
  const [dossier, setDossier] = useState<JobView | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('Tous');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'jsearch' | 'local'>('all');
  const [intlOnly, setIntlOnly] = useState(false);
  const [countryFilter, setCountryFilter] = useState('Tous');
  const [experienceFilter, setExperienceFilter] = useState('Tous');
  const [educationFilter, setEducationFilter] = useState('Tous');
  const [scope, setScope] = useState<'profil' | 'toutes'>(initialView);
  const [searching, setSearching] = useState(false);
  const [collectingIntl, setCollectingIntl] = useState(false);
  const router = useRouter();

  function chooseScope(next: 'profil' | 'toutes') {
    setScope(next);
    setTypeFilter('Tous');
    router.replace(next === 'toutes' ? '/offres?vue=toutes' : '/offres?vue=profil', { scroll: false });
  }

  async function collectInternational() {
    setCollectingIntl(true);
    setSyncError(null);
    const response = await fetch('/api/jobs/collect-international', { method: 'POST' });
    const body = await response.json().catch(() => ({}));
    setCollectingIntl(false);
    if (!response.ok) {
      setSyncError(typeof body.error === 'string' ? body.error : 'Collecte internationale impossible.');
      return;
    }
    const stored = typeof body.stored === 'number' ? body.stored : 0;
    setToast(stored > 0
      ? `${stored} offre${stored > 1 ? 's' : ''} internationale${stored > 1 ? 's' : ''} ajoutée${stored > 1 ? 's' : ''} (JSearch / RapidAPI).`
      : 'Collecte terminée. Aucune nouvelle offre internationale pour le moment.');
    router.refresh();
  }

  async function searchForProfile() {
    setSearching(true);
    setSyncError(null);
    const response = await fetch('/api/jobs/for-profile', { method: 'POST' });
    const body = await response.json().catch(() => ({}));
    setSearching(false);
    if (!response.ok) {
      setSyncError(typeof body.error === 'string' ? body.error : 'Recherche impossible.');
      return;
    }
    const matched = typeof body.matched === 'number' ? body.matched : 0;
    setToast(matched === 0
      ? 'Aucune offre de la base centrale ne correspond à ce CV.'
      : `${matched} offre${matched > 1 ? 's' : ''} de la base centrale correspond${matched > 1 ? 'ent' : ''} à ce CV.`);
    chooseScope('profil');
    router.refresh();
  }

  const scoped = useMemo(
    () => (scope === 'profil' ? jobs.filter((job) => job.relevant) : jobs),
    [jobs, scope],
  );
  const types = useMemo(() => ['Tous', ...new Set(scoped.map((job) => job.typeLabel))], [scoped]);
  const countries = useMemo(
    () => ['Tous', ...new Set(scoped.map((job) => job.country).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'fr')),
    [scoped],
  );
  const educationOptions = useMemo(
    () => ['Tous', ...new Set(scoped.map((job) => job.educationLabel))],
    [scoped],
  );
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const maxExp = experienceFilter === 'Tous' ? null : Number(experienceFilter);
    return scoped
      .filter((job) => {
        if (typeFilter !== 'Tous' && job.typeLabel !== typeFilter) return false;
        if (sourceFilter === 'jsearch' && job.source !== 'jsearch') return false;
        if (sourceFilter === 'local' && job.source === 'jsearch') return false;
        if (intlOnly && !job.isInternational) return false;
        if (countryFilter !== 'Tous' && job.country !== countryFilter) return false;
        if (educationFilter !== 'Tous' && job.educationLabel !== educationFilter) return false;
        if (maxExp != null && !Number.isNaN(maxExp)) {
          if (job.minExperienceYears == null || job.minExperienceYears > maxExp) return false;
        }
        if (!needle) return true;
        return [job.title, job.company, job.location, job.source, job.typeLabel, job.excerpt, job.country]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(needle);
      })
      .sort((left, right) => (right.score ?? -1) - (left.score ?? -1) || left.title.localeCompare(right.title, 'fr'));
  }, [scoped, query, typeFilter, sourceFilter, intlOnly, countryFilter, educationFilter, experienceFilter]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Offres actives</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            {scope === 'profil'
              ? `Offres qui reprennent le métier de ${cvLabel}. Le reste du catalogue n’est pas mélangé ici.`
              : 'Toute la liste commune, classée avec votre CV quand il est enregistré.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={scope === 'profil' ? 'btn' : 'btn-ghost'} onClick={() => chooseScope('profil')}>Pour mon CV</button>
            <button type="button" className={scope === 'toutes' ? 'btn' : 'btn-ghost'} onClick={() => chooseScope('toutes')}>Toute la liste</button>
          </div>
          <Link href="/cv" className="mt-3 inline-block text-sm font-semibold text-accent underline-offset-2 hover:underline">
            {cvReady ? 'Modifier le CV' : 'Créer le CV'}
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {matchReady && (
            <button type="button" className="btn" disabled={searching} onClick={() => void searchForProfile()}>
              {searching ? 'Recherche' : 'Chercher pour mon métier'}
            </button>
          )}
          <button type="button" className="btn-ghost" disabled={collectingIntl} onClick={() => void collectInternational()}>
            {collectingIntl ? 'Collecte…' : 'Actualiser offres internationales'}
          </button>
        </div>
      </div>
      {catalogStats && (
        <p className="mb-4 text-sm text-muted">
          Catalogue actif : {catalogStats.jsearch} offre{catalogStats.jsearch > 1 ? 's' : ''} JSearch (international / RapidAPI),{' '}
          {catalogStats.local} via sites publics (scraping).
          {!catalogStats.rapidConfigured && (
<<<<<<< HEAD
            <span className="text-[#8d3d24]"> La clé serveur RAPIDAPI_KEY n’est pas configurée — seul le scraping alimente la base.</span>
=======
            <span className="text-[#8d3d24]"> La clé RapidAPI (JSearch) n’est pas configurée sur le serveur — seul le scraping alimente la base.</span>
>>>>>>> cursor/offers-jsearch-diagnostics-a5f3
          )}
          {catalogStats.rapidConfigured && catalogStats.jsearch === 0 && (
            <span> Utilisez « Actualiser offres internationales » ou attendez la collecte automatique (05:00, Douala).</span>
          )}
        </p>
      )}
      {matchReady && scope === 'profil' && (
        <p className="mb-4 text-sm text-muted">
          La recherche lit la base centrale et ne consomme pas de crédit RapidAPI.
        </p>
      )}
      {syncError && <p className="mb-4 text-sm text-[#8d3d24]">{syncError}</p>}
      {jobs.length > 0 && (
        <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="label md:col-span-2 lg:col-span-3">
            Rechercher une offre
            <input
              className="field mt-1"
              value={query}
              placeholder="Titre, lieu, entreprise, pays, source"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="label">
            Type
            <select className="field mt-1" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              {types.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label className="label">
            Source
            <select className="field mt-1" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as 'all' | 'jsearch' | 'local')}>
              <option value="all">Toutes</option>
              <option value="jsearch">JSearch (international / RapidAPI)</option>
              <option value="local">Sites publics (scraping)</option>
            </select>
          </label>
          <label className="label">
            Pays (offre)
            <select className="field mt-1" value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)}>
              {countries.map((country) => (
                <option key={country}>{country}</option>
              ))}
            </select>
          </label>
          <label className="label">
            Expérience max demandée
            <select className="field mt-1" value={experienceFilter} onChange={(event) => setExperienceFilter(event.target.value)}>
              <option>Tous</option>
              <option value="0">Débutant (0 an)</option>
              <option value="2">Jusqu’à 2 ans</option>
              <option value="5">Jusqu’à 5 ans</option>
              <option value="10">Jusqu’à 10 ans</option>
            </select>
          </label>
          <label className="label">
            Niveau d’études
            <select className="field mt-1" value={educationFilter} onChange={(event) => setEducationFilter(event.target.value)}>
              {educationOptions.map((level) => (
                <option key={level}>{level}</option>
              ))}
            </select>
          </label>
          <label className="label flex items-end gap-2 pb-2">
            <input type="checkbox" checked={intlOnly} onChange={(event) => setIntlOnly(event.target.checked)} />
            <span>International / télétravail uniquement</span>
          </label>
        </div>
      )}
      {jobs.length === 0 ? (
        <div className="sheet p-6">
          <h2 className="font-serif text-xl">Aucune offre active</h2>
          <p className="mt-2 text-sm text-muted">
            La collecte quotidienne (05:00, heure de Douala) alimente la base centrale. Elle n’a encore rien enregistré, ou toutes les offres trouvées étaient échues.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-2 text-sm text-muted">
            {visible.length} offre{visible.length > 1 ? 's' : ''} affichée{visible.length > 1 ? 's' : ''}, du plus fort pourcentage au plus faible.
          </p>
          {visible.length === 0 ? (
            <div className="sheet p-6">
              <h2 className="font-serif text-xl">{scope === 'profil' && !query && typeFilter === 'Tous' ? 'Rien pour ce CV' : 'Aucune offre pour cette recherche'}</h2>
              <p className="mt-2 text-sm text-muted">
                {scope === 'profil' && !query && typeFilter === 'Tous'
                  ? matchReady
                    ? 'Aucune offre de la base centrale ne reprend votre métier. Ouvrez toute la liste, ou activez l’alerte : les prochaines offres de ce métier apparaîtront à l’accueil après la collecte du matin.'
                    : 'Ajoutez un intitulé ou des compétences au CV pour isoler votre métier. Toute la liste reste disponible.'
                  : 'Modifiez le texte ou le type.'}
              </p>
              {scope === 'profil' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="btn" onClick={() => chooseScope('toutes')}>Voir toute la liste</button>
                  <Link href="/accueil#alerte" className="btn-ghost">Me prévenir</Link>
                </div>
              )}
            </div>
          ) : (
        <ul className="divide-y divide-line border border-line bg-surface">
          {visible.map((job) => (
            <li key={job.id} className="grid gap-3 px-4 py-4 md:grid-cols-[88px_1fr_auto] md:items-center">
              <p className="font-serif text-2xl leading-none">{job.score == null ? '—' : `${job.score} %`}</p>
              <div>
                <h2 className="text-base font-semibold">{job.title}</h2>
                <p className="mt-1 text-sm text-muted">
                  {[job.company, job.location, job.typeLabel].filter(Boolean).join(' · ')}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {[
                    job.source === 'jsearch' ? 'JSearch' : job.source,
                    job.isInternational ? 'International' : null,
                    job.country,
                    job.minExperienceYears != null ? `${job.minExperienceYears}+ ans exp.` : null,
                    job.educationLabel !== 'Non précisé' ? job.educationLabel : null,
                    job.dateLabel,
                    job.deadline ? `Limite ${job.deadline}` : null,
                  ].filter(Boolean).join(' · ')}
                </p>
                {job.excerpt && <p className="mt-2 text-sm text-ink">{job.excerpt}</p>}
                {job.scoreNote && <p className="mt-1 text-xs text-muted">{job.scoreNote}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-ghost" onClick={() => setDetailId(job.id)}>
                  Détail
                </button>
                <button type="button" className="btn" onClick={() => setDossier(job)}>
                  Générer le dossier
                </button>
                <button type="button" className="btn-ghost" onClick={() => setSelected(job)}>
                  Postuler en 1 clic
                </button>
              </div>
            </li>
          ))}
        </ul>
          )}
        </>
      )}
      {detailId && (
        <DetailDialog
          jobId={detailId}
          onClose={() => setDetailId(null)}
          onApply={(job) => {
            setDetailId(null);
            setSelected(job);
          }}
          onDossier={(job) => {
            setDetailId(null);
            setDossier(job);
          }}
        />
      )}
      {selected && (
        <ApplyDialog
          job={selected}
          prefill={prefill}
          onClose={() => setSelected(null)}
          onSent={(text) => {
            setSelected(null);
            setToast(text);
          }}
        />
      )}
      {dossier && (
        <DossierDialog
          job={dossier}
          prefill={prefill}
          onClose={() => setDossier(null)}
          onSent={(text) => {
            setDossier(null);
            setToast(text);
          }}
        />
      )}
      {toast && (
        <p role="status" className="fixed bottom-4 right-4 max-w-sm border border-line bg-surface px-4 py-3 text-sm shadow-sheet">
          {toast}
        </p>
      )}
    </div>
  );
}

function DetailDialog({
  jobId,
  onClose,
  onApply,
  onDossier,
}: {
  jobId: string;
  onClose: () => void;
  onApply: (job: JobView) => void;
  onDossier: (job: JobView) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    title: string;
    company: string;
    location: string | null;
    source: string;
    url: string;
    description: string | null;
    contactKnown: boolean;
    score: number | null;
    scoreNote: string | null;
    deadline: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const response = await fetch(`/api/jobs/${jobId}`);
      const body = await response.json().catch(() => ({}));
      if (cancelled) return;
      if (!response.ok) {
        setError(typeof body.error === 'string' ? body.error : 'Détail indisponible.');
        setLoading(false);
        return;
      }
      setDetail(body);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const asJob = (): JobView => ({
    id: jobId,
    title: detail?.title ?? '',
    company: detail?.company ?? '',
    location: detail?.location ?? null,
    typeLabel: '',
    source: detail?.source ?? '',
    url: detail?.url ?? '',
    excerpt: null,
    dateLabel: null,
    deadline: detail?.deadline ?? null,
    contactKnown: Boolean(detail?.contactKnown),
    score: detail?.score ?? null,
    scoreNote: detail?.scoreNote ?? null,
    relevant: false,
    country: null,
    isInternational: false,
    minExperienceYears: null,
    educationLevel: 'any',
    educationLabel: 'Non précisé',
  });

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-[#1d1916]/40 p-4 md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        className="sheet max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="detail-title" className="font-serif text-2xl">{detail?.title ?? 'Détail de l’offre'}</h2>
        {loading && <p className="mt-3 text-sm text-muted">Lecture de l’offre…</p>}
        {error && <p className="mt-3 text-sm text-[#8d3d24]">{error}</p>}
        {detail && (
          <>
            <p className="mt-2 text-sm text-muted">
              {[detail.company, detail.location, detail.source, detail.deadline ? `Limite ${detail.deadline}` : null].filter(Boolean).join(' · ')}
            </p>
            <p className="mt-3 font-serif text-2xl">{detail.score == null ? 'Correspondance non calculée' : `${detail.score} % de correspondance`}</p>
            {detail.scoreNote && <p className="mt-1 text-xs text-muted">{detail.scoreNote}</p>}
            <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-ink">
              {detail.description ?? 'Le site n’a pas fourni de texte lisible pour cette offre.'}
            </div>
            <p className="mt-4">
              <a className="text-sm text-accent underline-offset-2 hover:underline" href={detail.url} target="_blank" rel="noreferrer">
                Voir la page d’origine
              </a>
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn" onClick={() => onDossier(asJob())}>Générer le dossier</button>
              <button type="button" className="btn-ghost" onClick={() => onApply(asJob())}>Postuler en 1 clic</button>
              <button type="button" className="btn-ghost" onClick={onClose}>Fermer</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ApplyDialog({
  job,
  prefill,
  onClose,
  onSent,
}: {
  job: JobView;
  prefill: { fullName: string; email: string; phone: string };
  onClose: () => void;
  onSent: (message: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [attachLetterPdf, setAttachLetterPdf] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function generateLetter() {
    setGenerating(true);
    setError(null);
    const response = await fetch('/api/apply/cover-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id }),
    });
    const body = await response.json().catch(() => ({}));
    setGenerating(false);
    if (!response.ok) {
      setError(typeof body.error === 'string' ? body.error : 'Génération impossible.');
      return;
    }
    if (typeof body.letter === 'string') setCoverLetter(body.letter);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    form.set('jobId', job.id);
    form.set('coverLetter', coverLetter);
    form.set('attachLetterPdf', attachLetterPdf ? 'true' : 'false');
    const response = await fetch('/api/apply', { method: 'POST', body: form });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(typeof body.error === 'string' ? body.error : 'Envoi impossible.');
      return;
    }
    if (typeof body.openUrl === 'string') window.open(body.openUrl, '_blank', 'noopener,noreferrer');
    onSent('Candidature envoyée par email');
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-[#1d1916]/40 p-4 md:items-center" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-title"
        className="sheet max-h-[90vh] w-full max-w-lg overflow-y-auto p-5"
        onClick={(event) => event.stopPropagation()}
        onSubmit={onSubmit}
      >
        <h2 id="apply-title" className="font-serif text-2xl">Postuler</h2>
        <p className="mt-1 text-sm text-muted">{job.title}</p>
        <p className="mt-2 text-sm text-muted">
          {job.contactKnown
            ? 'L’e-mail part vers l’adresse trouvée dans l’offre, avec le CV et vos pièces.'
            : 'Aucune adresse de recruteur n’est indiquée. Une copie vous sera envoyée et l’offre s’ouvrira dans un nouvel onglet.'}
        </p>
        <div className="mt-4 space-y-3">
          <label className="label">Nom<input className="field mt-1" name="fullName" required defaultValue={prefill.fullName} /></label>
          <label className="label">E-mail<input className="field mt-1" type="email" name="email" required defaultValue={prefill.email} /></label>
          <label className="label">Téléphone<input className="field mt-1" name="phone" defaultValue={prefill.phone} /></label>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="label mb-0">Lettre de motivation</span>
              <button type="button" className="btn-ghost text-sm" disabled={generating || pending} onClick={() => void generateLetter()}>
                {generating ? 'Rédaction…' : 'Rédiger avec l’IA (Claude)'}
              </button>
            </div>
            <textarea
              className="field min-h-32"
              name="coverLetter"
              required
              minLength={20}
              value={coverLetter}
              onChange={(event) => setCoverLetter(event.target.value)}
              placeholder="Saisissez votre texte ou utilisez l’IA pour l’adapter à cette offre (votre clé Claude dans Paramètres)."
            />
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={attachLetterPdf} onChange={(event) => setAttachLetterPdf(event.target.checked)} />
              Joindre aussi la lettre en PDF (en plus du texte dans l’e-mail)
            </label>
          </div>
          <label className="label">
            Autres pièces (CNI, diplômes)
            <input className="mt-1 block w-full text-sm" type="file" name="attachments" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" />
          </label>
          <p className="text-xs text-muted">Le CV enregistré est joint automatiquement en PDF.</p>
        </div>
        {error && <p className="mt-3 text-sm text-[#8d3d24]">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button className="btn" type="submit" disabled={pending}>{pending ? 'Envoi' : 'Envoyer'}</button>
          <button className="btn-ghost" type="button" onClick={onClose}>Annuler</button>
        </div>
      </form>
    </div>
  );
}
