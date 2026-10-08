import { unconfiguredScreen } from '@/components/Unconfigured';
import { Shell } from '@/components/Shell';
import { CreditPanel } from '@/components/CreditPanel';
import { AppearancePanel } from '@/components/AppearancePanel';
import { InstallAppPanel } from '@/components/InstallAppPanel';
import { SettingsForm } from '@/components/SettingsForm';
import { readServerThemeId } from '@/lib/appearance/server';
import { ensureProfile, requireUser } from '@/lib/auth';
import { onlinePackIds, readCreditBalances } from '@/lib/credits';
import { claudeKeyStatus } from '@/lib/userClaude';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const blocked = unconfiguredScreen();
  if (blocked) return blocked;
  const user = await requireUser();
  await ensureProfile(user.id, user.email ?? null);
  let initial = {
    claudeKey: false,
  };
  let themeId = 'mbeuk-classic';
  let loadError: string | null = null;
  let credits = { claude: 0, rapidapi: 0, claudeFree: 0, rapidapiFree: 0, claudeBought: 0, rapidapiBought: 0 };
  try {
    credits = await readCreditBalances(user.id);
    initial = {
      claudeKey: await claudeKeyStatus(user.id),
    };
    themeId = await readServerThemeId(user.id);
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Lecture impossible.';
  }

  return (
    <Shell email={user.email ?? ''}>
      <h1 className="font-serif text-3xl">Paramètres</h1>
      <p className="mb-6 mt-2 max-w-2xl text-sm text-muted">
        Les offres et les candidatures restent dans la base centrale. Chaque compte garde son CV, sa clé Claude et ses crédits Claude.
      </p>
      <div className="sheet mb-6 space-y-2 p-4 text-sm text-muted">
        <p className="font-serif text-lg text-ink">Services plateforme (hébergement)</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>RapidAPI / JSearch (offres internationales) : {process.env.RAPIDAPI_KEY?.trim() ? 'configuré' : 'non configuré sur Vercel'}</li>
          <li>Claude (secours si vous n’avez pas de clé perso) : {process.env.ANTHROPIC_API_KEY?.trim() ? 'configuré' : 'non configuré'}</li>
          <li>Brevo (envoi candidatures) : {process.env.BREVO_API_KEY?.trim() && process.env.BREVO_FROM_EMAIL?.trim() ? 'configuré' : 'incomplet'} — si l’envoi échoue pour IP, désactivez la restriction IP dans Brevo.</li>
        </ul>
      </div>
      <CreditPanel
        claude={credits.claude}
        claudeFree={credits.claudeFree}
        claudeBought={credits.claudeBought}
        claudeOwn={initial.claudeKey}
        email={user.email ?? ''}
        onlinePacks={onlinePackIds()}
      />
      {loadError ? (
        <p className="text-sm text-[#8d3d24]">{loadError}</p>
      ) : (
        <div className="space-y-6">
          <div id="installer">
            <InstallAppPanel />
          </div>
          <AppearancePanel initialThemeId={themeId} />
          <SettingsForm initial={initial} />
        </div>
      )}
    </Shell>
  );
}
