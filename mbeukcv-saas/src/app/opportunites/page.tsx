import { unconfiguredScreen } from '@/components/Unconfigured';
import { OpportunitiesList } from '@/components/OpportunitiesList';
import { Shell } from '@/components/Shell';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function OpportunitiesPage() {
  const blocked = unconfiguredScreen();
  if (blocked) return blocked;
  const user = await requireUser();

  return (
    <Shell email={user.email ?? ''}>
      <h1 className="font-serif text-3xl">Opportunités MbeukRH</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Invitations et correspondances issues du Job Exchange. Les statuts affichés reflètent uniquement ce que le système connaît dans CVPro.
      </p>
      <OpportunitiesList />
    </Shell>
  );
}
