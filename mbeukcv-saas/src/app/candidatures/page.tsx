import { unconfiguredScreen } from '@/components/Unconfigured';
import { Shell } from '@/components/Shell';
import { ApplicationList } from '@/components/ApplicationList';
import { requireUser } from '@/lib/auth';
import { centralCatalog } from '@/lib/supabase/factory';

export const dynamic = 'force-dynamic';

export default async function ApplicationsPage() {
  const blocked = unconfiguredScreen();
  if (blocked) return blocked;
  const user = await requireUser();
  let rows: { id: string; applied_at: string; status: string; job_title: string | null; job_url: string | null }[] = [];
  let loadError: string | null = null;
  try {
    const client = centralCatalog();
    const { data, error } = await client
      .from('applications')
      .select('id, applied_at, status, job_title, job_url')
      .eq('user_id', user.id)
      .order('applied_at', { ascending: false });
    if (error) throw new Error(error.message);
    rows = data ?? [];
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Lecture impossible.';
  }

  return (
    <Shell email={user.email ?? ''}>
      <h1 className="font-serif text-3xl">Candidatures</h1>
      {loadError ? (
        <p className="mt-4 text-sm text-[#8d3d24]">{loadError}</p>
      ) : rows.length === 0 ? (
        <div className="sheet mt-6 p-6">
          <h2 className="font-serif text-xl">Aucune candidature</h2>
          <p className="mt-2 text-sm text-muted">Les envois confirmés apparaîtront ici.</p>
        </div>
      ) : (
        <ApplicationList
          items={rows.map((row) => ({
            id: row.id,
            title: row.job_title || 'Offre',
            status: row.status,
            url: row.job_url,
            when: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(row.applied_at)),
          }))}
        />
      )}
    </Shell>
  );
}
