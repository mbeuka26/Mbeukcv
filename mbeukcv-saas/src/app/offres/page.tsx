import { unconfiguredScreen } from '@/components/Unconfigured';
import { Shell } from '@/components/Shell';
import { JobBoard, type JobView } from '@/components/JobBoard';
import { ensureProfile, readPublicProfile, requireUser } from '@/lib/auth';
import { deriveJobMeta, educationLabel } from '@/lib/offers/jobMeta';
import { scoreOffer } from '@/lib/matching';
import { offerMatchesProfile, profileTerms } from '@/lib/profileMatch';
import { centralCatalog } from '@/lib/supabase/factory';
import { NetworkPanel } from '@/components/NetworkPanel';
import { exchangeCall, exchangeConfigured } from '@/lib/exchange/client';
import { talentIdForUser } from '@/lib/exchange/talent';

export const dynamic = 'force-dynamic';

const TYPE_LABELS: Record<string, string> = {
  job: 'Emploi',
  scholarship: 'Bourse',
  concours: 'Concours',
  other: 'Autre',
};

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export default async function OffersPage({ searchParams }: { searchParams: { vue?: string } }) {
  const blocked = unconfiguredScreen();
  if (blocked) return blocked;
  const user = await requireUser();
  await ensureProfile(user.id, user.email ?? null);
  const profile = await readPublicProfile(user.id);
  const terms = profile?.cv ? profileTerms({
    title: profile.cv.title || profile.cv.classic?.titrePoste || '',
    skills: profile.cv.skills,
    roles: profile.cv.experiences.map((item) => item.role),
    diplomas: profile.cv.education.map((item) => item.diploma),
  }) : [];
  let jobs: JobView[] = [];
  let loadError: string | null = null;
  let catalogStats = { jsearch: 0, local: 0, rapidConfigured: false };

  try {
    const client = centralCatalog();
    catalogStats = {
      rapidConfigured: Boolean(process.env.RAPIDAPI_KEY?.trim()),
      jsearch: 0,
      local: 0,
    };
    const { data, error } = await client
      .from('job_offers')
      .select('id, title, company, location, type, source, url, description, skills, contact_email, date_posted, deadline_date, expires_at, is_active')
      .eq('is_active', true)
      .neq('source', 'system')
      .order('date_posted', { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      if (row.source === 'jsearch') catalogStats.jsearch += 1;
      else catalogStats.local += 1;
    }
    const visible = (data ?? []).filter((row) => !row.expires_at || new Date(row.expires_at).getTime() >= Date.now());
    const cv = profile?.cv;
    const hasCv = Boolean(cv && (cv.skills.length > 0 || cv.summary.trim().length >= 20 || cv.experiences.length > 0));
    jobs = visible.map((row) => {
      const scored = hasCv && cv ? scoreOffer(
        { skills: cv.skills, yearsExperience: cv.yearsExperience, location: cv.location },
        { skills: row.skills ?? [], description: row.description, location: row.location },
      ) : null;
      const meta = deriveJobMeta({
        location: row.location,
        description: row.description,
        title: row.title,
        source: row.source,
      });
      return {
        id: row.id,
        title: row.title,
        company: row.company,
        location: row.location,
        typeLabel: TYPE_LABELS[row.type] ?? row.type,
        source: row.source,
        url: row.url,
        excerpt: row.description ? row.description.replace(/\s+/g, ' ').trim().slice(0, 280) : null,
        dateLabel: row.source === 'jsearch' ? formatDate(row.date_posted) : row.date_posted ? `Repéré le ${formatDate(row.date_posted)}` : null,
        deadline: formatDate(row.deadline_date),
        contactKnown: Boolean(row.contact_email),
        score: scored?.score ?? null,
        scoreNote: hasCv ? scored?.note ?? null : 'Enregistrez un CV pour calculer la correspondance.',
        relevant: offerMatchesProfile(terms, { title: row.title, description: row.description, skills: row.skills ?? [] }),
        country: meta.country,
        isInternational: meta.isInternational,
        minExperienceYears: meta.minExperienceYears,
        educationLevel: meta.educationLevel,
        educationLabel: educationLabel(meta.educationLevel),
      };
    });
    jobs.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Lecture des offres impossible.';
  }

  return (
    <Shell email={user.email ?? ''}>
      <NetworkSection userId={user.id} discover={Boolean(profile?.cv.exchangeDiscover)} />
      {loadError ? (
        <div className="sheet p-6">
          <h1 className="font-serif text-2xl">Offres indisponibles</h1>
          <p className="mt-2 text-sm text-muted">{loadError}</p>
        </div>
      ) : (
        <JobBoard
          jobs={jobs}
          catalogStats={catalogStats}
          cvReady={Boolean(profile?.cv && (profile.cv.skills.length > 0 || profile.cv.summary.trim().length >= 20 || profile.cv.experiences.length > 0))}
          cvLabel={profile?.cv.title || profile?.cv.classic?.titrePoste || profile?.cv.fullName || 'votre CV'}
          initialView={searchParams.vue === 'toutes' ? 'toutes' : 'profil'}
          matchReady={terms.length > 0}
          prefill={{
            fullName: profile?.fullName || profile?.cv.fullName || '',
            email: profile?.email || profile?.cv.email || user.email || '',
            phone: profile?.phone || profile?.cv.phone || '',
          }}
        />
      )}
    </Shell>
  );
}

async function NetworkSection({ userId, discover }: { userId: string; discover: boolean }) {
  if (!exchangeConfigured()) {
    return <NetworkPanel configured={false} discover={discover} jobs={[]} notices={[]} note="" />;
  }
  const listed = await exchangeCall({ action: 'list_jobs' });
  const pulled = await exchangeCall({ action: 'pull_notifications', talentId: talentIdForUser(userId) });
  const jobs = Array.isArray(listed.jobs) ? listed.jobs.filter((item) => item && typeof item === 'object').map((item) => {
    const row = item as Record<string, unknown>;
    return {
      exchangeJobId: String(row.exchangeJobId || ''),
      reference: String(row.reference || ''),
      title: String(row.title || ''),
      company: String(row.company || ''),
      location: String(row.location || ''),
      description: String(row.description || ''),
      closing: typeof row.closing === 'string' ? row.closing : null,
      timezone: String(row.timezone || ''),
    };
  }).filter((item) => item.exchangeJobId) : [];
  const notices = Array.isArray(pulled.notifications) ? pulled.notifications.filter((item) => item && typeof item === 'object').map((item) => {
    const row = item as Record<string, unknown>;
    return {
      id: String(row.id || ''),
      kind: String(row.kind || ''),
      subjectId: String(row.subjectId || ''),
      label: String(row.label || ''),
      status: String(row.status || ''),
    };
  }).filter((item) => item.id) : [];
  const note = listed.confirmed === true ? '' : String(listed.message || '');
  return <NetworkPanel configured discover={discover} jobs={jobs} notices={notices} note={note} />;
}
