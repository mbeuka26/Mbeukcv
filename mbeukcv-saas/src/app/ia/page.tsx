import { unconfiguredScreen } from '@/components/Unconfigured';
import { Shell } from '@/components/Shell';
import { IaStudio } from '@/components/IaStudio';
import { ensureProfile, readPublicProfile, requireUser } from '@/lib/auth';
import { emptyCv } from '@/lib/cv';

export const dynamic = 'force-dynamic';

function asText(cv: ReturnType<typeof emptyCv>): string {
  if (cv.sourceText.trim()) return cv.sourceText;
  return [cv.fullName, cv.title, cv.summary, cv.skills.join(', '), ...cv.experiences.map((item) => `${item.role} ${item.company} ${item.details}`)].filter(Boolean).join('\n');
}

export default async function IaPage() {
  const blocked = unconfiguredScreen();
  if (blocked) return blocked;
  const user = await requireUser();
  await ensureProfile(user.id, user.email ?? null);
  const profile = await readPublicProfile(user.id);
  const cv = profile?.cv ?? emptyCv();
  return (
    <Shell email={user.email ?? ''}>
      <h1 className="font-serif text-3xl">Dossier IA</h1>
      <p className="mb-6 mt-2 max-w-2xl text-sm text-muted">
        Collez le CV et l’offre. Le dossier produit un CV et une lettre en français et en anglais, sans ajouter de fait absent du texte.
      </p>
      <IaStudio sourceText={asText(cv)} />
    </Shell>
  );
}
