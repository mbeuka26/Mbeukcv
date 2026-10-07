import Link from 'next/link';
import { unconfiguredScreen } from '@/components/Unconfigured';
import { Shell } from '@/components/Shell';
import { JobAlertPanel, type AlertOffer } from '@/components/JobAlertPanel';
import { ensureProfile, readPublicProfile, requireUser } from '@/lib/auth';
import { alertSince, readAlert } from '@/lib/jobAlert';
import { scoreOffer } from '@/lib/matching';
import { offerMatchesProfile, profileTerms } from '@/lib/profileMatch';
import { queriesForDay, dayInDouala } from '@/lib/scrape/rotation';
import { centralCatalog } from '@/lib/supabase/factory';

export const dynamic = 'force-dynamic';

interface OfferRow {
  id: string;
  title: string;
  company: string;
  location: string | null;
  description: string | null;
  skills: string[] | null;
  url: string;
  contact_email: string | null;
  expires_at: string | null;
  created_at: string;
}

function isLive(row: OfferRow, now: number): boolean {
  return !row.expires_at || new Date(row.expires_at).getTime() >= now;
}

export default async function LaunchPage() {
  const blocked = unconfiguredScreen();
  if (blocked) return blocked;
  const user = await requireUser();
  await ensureProfile(user.id, user.email ?? null);
  const profile = await readPublicProfile(user.id);
  const cv = profile?.cv;
  const terms = cv ? profileTerms({
    title: cv.title || cv.classic?.titrePoste || '',
    skills: cv.skills,
    roles: cv.experiences.map((item) => item.role),
    diplomas: cv.education.map((item) => item.diploma),
  }) : [];
  const cvReady = terms.length > 0;
  const hasCv = Boolean(cv && (cv.skills.length > 0 || cv.summary.trim().length >= 20 || cv.experiences.length > 0));
  const alert = await readAlert(user.id);
  const since = alertSince(alert);
  const day = dayInDouala();
  const dayStart = new Date(`${day}T00:00:00+01:00`).getTime();
  const plan = queriesForDay(day).map((item) => item.label).join(' et ');
  const cvLabel = cv?.title || cv?.classic?.titrePoste || 'votre CV';

  let loadError: string | null = null;
  let applications: number | null = null;
  let matchedCount: number | null = null;
  let todayCount: number | null = null;
  let readyCount: number | null = null;
  let capped = false;
  let offers: AlertOffer[] = [];

  try {
    const client = centralCatalog();
    const [offerResult, applicationResult] = await Promise.all([
      client
        .from('job_offers')
        .select('id, title, company, location, description, skills, url, contact_email, expires_at, created_at')
        .eq('is_active', true)
        .neq('source', 'system')
        .order('created_at', { ascending: false })
        .limit(200),
      client.from('applications').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);
    if (offerResult.error) throw new Error(offerResult.error.message);
    if (applicationResult.error) throw new Error(applicationResult.error.message);
    applications = applicationResult.count ?? 0;
    const rows = ((offerResult.data ?? []) as OfferRow[]).filter((row) => isLive(row, Date.now()));
    capped = (offerResult.data ?? []).length >= 200;
    if (!cvReady) {
      matchedCount = null;
      todayCount = null;
      readyCount = null;
    } else {
      const matched = rows.filter((row) => offerMatchesProfile(terms, {
        title: row.title,
        description: row.description,
        skills: row.skills ?? [],
      }));
      matchedCount = matched.length;
      todayCount = matched.filter((row) => new Date(row.created_at).getTime() >= dayStart).length;
      readyCount = matched.filter((row) => Boolean(row.contact_email?.includes('@'))).length;
      const fresh = since ? matched.filter((row) => row.created_at > since) : [];
      offers = fresh.slice(0, 8).map((row) => {
        const scored = hasCv && cv
          ? scoreOffer(
            { skills: cv.skills, yearsExperience: cv.yearsExperience, location: cv.location },
            { skills: row.skills ?? [], description: row.description, location: row.location },
          )
          : null;
        return {
          id: row.id,
          title: row.title,
          company: row.company,
          location: row.location,
          url: row.url,
          score: scored?.score ?? null,
        };
      });
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Lecture du tableau de bord impossible.';
  }

  const steps = [
    {
      title: 'Enregistrer le CV',
      text: 'L’intitulé et les compétences décident quelles offres vous sont montrées.',
      href: '/cv',
      action: cvReady ? 'Revoir la fiche' : 'Compléter le CV',
      done: cvReady,
    },
    {
      title: 'Activer l’alerte',
      text: 'Après la collecte du matin, les nouvelles offres de votre métier arrivent ici.',
      href: '/accueil#alerte',
      action: alert.on ? 'Voir l’alerte' : 'Ouvrir l’alerte',
      done: alert.on,
    },
    {
      title: 'Choisir une offre',
      text: 'Ouvrez les offres qui cadrent avec votre CV, du plus fort pourcentage au plus faible.',
      href: '/offres?vue=profil',
      action: 'Voir les offres',
      done: false,
    },
    {
      title: 'Envoyer une candidature',
      text: 'Le dossier part au recruteur quand une adresse est connue. Sinon, une copie vous est envoyée.',
      href: (applications ?? 0) > 0 ? '/candidatures' : '/offres?vue=profil',
      action: (applications ?? 0) > 0 ? 'Voir les envois' : 'Préparer un envoi',
      done: (applications ?? 0) > 0,
    },
  ];
  const current = steps.findIndex((step) => !step.done);

  return (
    <Shell email={user.email ?? ''}>
      <p className="text-sm font-semibold text-accent">Tableau de bord</p>
      <h1 className="mt-1 font-serif text-3xl">Accueil</h1>
      <p className="mt-2 max-w-2xl text-base leading-7 text-muted">
        Quatre repères sur votre activité, puis l’étape à faire maintenant. Les chiffres viennent de la base centrale et de vos envois.
      </p>

      {loadError && <p className="mt-4 text-sm text-[#8d3d24]" role="alert">{loadError}</p>}

      <section className="mt-6" aria-label="Indicateurs">
        <h2 className="font-serif text-xl">Où vous en êtes</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            href="/candidatures"
            label="Candidatures envoyées"
            value={applications == null ? 'Indisponible' : String(applications)}
            caption={applications === 0 ? 'Aucun dossier envoyé pour le moment.' : 'Dossiers déjà partis depuis ce compte.'}
          />
          <Kpi
            href="/offres?vue=profil"
            label="Aujourd’hui, pour mon CV"
            value={figure(todayCount)}
            caption={cvReady ? `Collecte du jour : ${plan}.` : 'Complétez le CV pour mesurer la journée.'}
          />
          <Kpi
            href="/offres?vue=profil"
            label="Offres qui cadrent"
            value={figure(matchedCount)}
            caption={cvReady
              ? (capped ? 'Parmi les 200 offres actives les plus récentes.' : 'Offres actives qui reprennent votre métier.')
              : 'Le métier du CV n’est pas encore assez précis.'}
          />
          <Kpi
            href="/offres?vue=profil"
            label="Prêtes à postuler"
            value={figure(readyCount)}
            caption={cvReady ? 'Celles qui ont une adresse de recruteur.' : 'Disponible une fois le CV enregistré.'}
          />
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl">Quoi faire maintenant</h2>
        <p className="mt-1 text-sm leading-6 text-muted">Suivez les étapes dans l’ordre. L’étape en cours est celle qui n’est pas encore faite.</p>
        <ol className="mt-3 grid gap-3">
          {steps.map((step, index) => {
            const state = step.done ? 'fait' : index === current ? 'encours' : 'ensuite';
            return (
              <li key={step.title} className={`sheet flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${state === 'encours' ? 'border-accent' : ''}`}>
                <div>
                  <p className="text-sm font-semibold text-accent">Étape {index + 1}</p>
                  <h3 className="mt-1 text-base font-semibold">{step.title}</h3>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{step.text}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {state === 'fait' && <span className="text-sm font-semibold text-[#2f6b45]">Fait</span>}
                  <Link href={step.href} className={state === 'encours' ? 'btn' : 'btn-ghost'}>{step.action}</Link>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="mt-8">
        <JobAlertPanel enabled={alert.on} cvReady={cvReady} cvLabel={cvLabel} offers={offers} />
      </div>
    </Shell>
  );
}

function figure(value: number | null): string {
  if (value == null) return 'À compléter';
  return String(value);
}

function Kpi({ href, label, value, caption }: { href: string; label: string; value: string; caption: string }) {
  const numeric = /^\d+$/.test(value);
  return (
    <li>
      <Link href={href} className="sheet block h-full p-4 transition duration-150 hover:border-[#c9bbaa]">
        <p className="text-sm font-medium text-muted">{label}</p>
        <p className={numeric ? 'mt-2 font-serif text-3xl leading-none' : 'mt-2 font-serif text-2xl leading-none'}>{value}</p>
        <p className="mt-2 text-sm leading-5 text-muted">{caption}</p>
      </Link>
    </li>
  );
}
