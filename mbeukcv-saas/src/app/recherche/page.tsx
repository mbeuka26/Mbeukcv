import { unconfiguredScreen } from '@/components/Unconfigured';
import { Shell } from '@/components/Shell';
import { RechercheStudio } from '@/components/RechercheStudio';
import { ensureProfile, readPublicProfile, requireUser } from '@/lib/auth';
import { scoreOffer } from '@/lib/matching';
import { centralCatalog } from '@/lib/supabase/factory';

export const dynamic = 'force-dynamic';

export default async function RecherchePage() {
  const blocked = unconfiguredScreen();
  if (blocked) return blocked;
  const user = await requireUser();
  await ensureProfile(user.id, user.email ?? null);
  const profile = await readPublicProfile(user.id);
  const cv = profile?.cv;
  const hasCv = Boolean(cv && (cv.skills.length > 0 || cv.summary.trim().length >= 20 || cv.experiences.length > 0));
  let offers: { id: string; title: string; location: string | null; score: number; note: string | null }[] = [];
  let loadError: string | null = null;
  if (hasCv && cv) {
    try {
      const client = centralCatalog();
      const { data, error } = await client.from('job_offers').select('id, title, location, description, skills, expires_at, is_active').eq('is_active', true).neq('source', 'system').limit(200);
      if (error) throw new Error(error.message);
      offers = (data ?? [])
        .filter((row) => !row.expires_at || new Date(row.expires_at).getTime() >= Date.now())
        .map((row) => {
          const scored = scoreOffer(
            { skills: cv.skills, yearsExperience: cv.yearsExperience, location: cv.location },
            { skills: row.skills ?? [], description: row.description, location: row.location },
          );
          return { id: row.id, title: row.title, location: row.location, score: scored.score, note: scored.note };
        });
    } catch (error) {
      loadError = error instanceof Error ? error.message : 'Lecture impossible.';
    }
  }

  return (
    <Shell email={user.email ?? ''}>
      <h1 className="font-serif text-3xl">Recherche</h1>
      <p className="mb-6 mt-2 max-w-2xl text-sm text-muted">
        Filtre les offres déjà collectées par mots-clés et par pourcentage minimum. La collecte des sites reste le cron, pas ce bouton.
      </p>
      {loadError && <p className="mb-4 text-sm text-[#8d3d24]">{loadError}</p>}
      {!hasCv ? <p className="text-sm text-muted">Enregistrez un CV pour calculer les pourcentages.</p> : <RechercheStudio offers={offers} />}
    </Shell>
  );
}
