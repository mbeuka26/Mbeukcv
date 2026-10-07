import { unconfiguredScreen } from '@/components/Unconfigured';
import { Shell } from '@/components/Shell';
import { ClassicStudio } from '@/components/ClassicStudio';
import { ensureProfile, readPublicProfile, requireUser } from '@/lib/auth';
import { emptyCv } from '@/lib/cv';

export const dynamic = 'force-dynamic';

export default async function ClassicPage() {
  const blocked = unconfiguredScreen();
  if (blocked) return blocked;
  const user = await requireUser();
  await ensureProfile(user.id, user.email ?? null);
  const profile = await readPublicProfile(user.id);
  const cv = profile?.cv ?? emptyCv();
  if (!cv.email) cv.email = user.email ?? '';
  return (
    <Shell email={user.email ?? ''}>
      <h1 className="font-serif text-3xl">CV classique</h1>
      <p className="mb-6 mt-2 max-w-2xl text-sm text-muted">
        Trois modèles visuels, sans appel à l’IA. L’enregistrement met à jour la fiche utilisée pour le pourcentage des offres.
      </p>
      <ClassicStudio initial={cv} />
    </Shell>
  );
}
