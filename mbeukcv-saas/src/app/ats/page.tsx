import Link from 'next/link';
import { AtsStudio } from '@/components/AtsStudio';
import { unconfiguredScreen } from '@/components/Unconfigured';
import { Shell } from '@/components/Shell';
import { ensureProfile, readPublicProfile, requireUser } from '@/lib/auth';
import { scoreOffer } from '@/lib/matching';
import { centralCatalog } from '@/lib/supabase/factory';

export const dynamic = 'force-dynamic';

export default async function MatchPage() {
  const blocked = unconfiguredScreen();
  if (blocked) return blocked;
  const user = await requireUser();
  await ensureProfile(user.id, user.email ?? null);
  const profile = await readPublicProfile(user.id);
  const cv = profile?.cv;
  const hasCv = Boolean(cv && (cv.skills.length > 0 || cv.summary.trim().length >= 20 || cv.experiences.length > 0));
  let rows: { id: string; title: string; location: string | null; score: number; note: string | null }[] = [];
  let loadError: string | null = null;

  if (hasCv && cv) {
    try {
      const client = centralCatalog();
      const { data, error } = await client
        .from('job_offers')
        .select('id, title, location, description, skills, expires_at, is_active')
        .eq('is_active', true)
        .neq('source', 'system')
        .limit(200);
      if (error) throw new Error(error.message);
      rows = (data ?? [])
        .filter((row) => !row.expires_at || new Date(row.expires_at).getTime() >= Date.now())
        .map((row) => {
          const scored = scoreOffer(
            { skills: cv.skills, yearsExperience: cv.yearsExperience, location: cv.location },
            { skills: row.skills ?? [], description: row.description, location: row.location },
          );
          return { id: row.id, title: row.title, location: row.location, score: scored.score, note: scored.note };
        })
        .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title, 'fr'));
    } catch (error) {
      loadError = error instanceof Error ? error.message : 'Lecture impossible.';
    }
  }

  return (
    <Shell email={user.email ?? ''}>
      <h1 className="font-serif text-3xl">Correspondance</h1>
      <AtsStudio sourceText={[cv?.sourceText, cv?.summary, cv?.skills.join(', ')].filter(Boolean).join('\n')} />
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Le pourcentage vaut 70 pour les compétences indiquées sur l’offre, 20 pour l’expérience exigée, 10 pour le lieu.
        Une offre sans compétences reste basse. Rien n’est estimé à la place d’une information absente.
      </p>
      {loadError && <p className="mt-4 text-sm text-[#8d3d24]">{loadError}</p>}
      {!hasCv ? (
        <div className="sheet mt-6 p-6">
          <h2 className="font-serif text-xl">CV requis</h2>
          <p className="mt-2 text-sm text-muted">Enregistrez la fiche avant de lire les pourcentages.</p>
          <Link href="/cv" className="btn mt-4">Ouvrir le CV</Link>
        </div>
      ) : rows.length === 0 ? (
        <div className="sheet mt-6 p-6">
          <h2 className="font-serif text-xl">Aucune offre à comparer</h2>
          <p className="mt-2 text-sm text-muted">La collecte n’a pas encore d’offre active.</p>
        </div>
      ) : (
        <ol className="mt-6 divide-y divide-line border border-line bg-surface">
          {rows.map((row, index) => (
            <li key={row.id} className="grid grid-cols-[3rem_5rem_1fr] items-baseline gap-3 px-4 py-3">
              <span className="text-sm text-muted">{index + 1}</span>
              <span className="font-serif text-xl">{row.score} %</span>
              <span>
                <span className="font-medium">{row.title}</span>
                <span className="mt-1 block text-sm text-muted">{[row.location, row.note].filter(Boolean).join(' · ') || 'Correspondance calculée.'}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
      <Link href="/offres" className="mt-4 inline-block text-sm font-semibold text-accent underline-offset-2 hover:underline">
        Rechercher et postuler
      </Link>
    </Shell>
  );
}
