import { unconfiguredScreen } from '@/components/Unconfigured';
import { Shell } from '@/components/Shell';
import { CvWorkspace } from '@/components/CvWorkspace';
import { ensureProfile, readPublicProfile, requireUser } from '@/lib/auth';
import { emptyCv } from '@/lib/cv';

export const dynamic = 'force-dynamic';

export default async function CvPage() {
  const blocked = unconfiguredScreen();
  if (blocked) return blocked;
  const user = await requireUser();
  await ensureProfile(user.id, user.email ?? null);
  const profile = await readPublicProfile(user.id);
  const cv = profile?.cv ?? emptyCv();
  if (!cv.email) cv.email = user.email ?? '';
  if (!cv.fullName && profile?.fullName) cv.fullName = profile.fullName;
  return (
    <Shell email={user.email ?? ''}>
      <h1 className="font-serif text-3xl">CV</h1>
      <p className="mb-6 mt-2 max-w-2xl text-sm text-muted">
        Un seul CV pour ce compte. Il sert au score des offres et au fichier joint à la candidature.
      </p>
      <CvWorkspace initial={cv} accountEmail={user.email ?? ''} />
    </Shell>
  );
}
