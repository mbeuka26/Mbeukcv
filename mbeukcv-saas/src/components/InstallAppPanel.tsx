'use client';

import { useState } from 'react';
import { usePwaInstall, type InstallPlatform } from '@/hooks/usePwaInstall';

function manualSteps(platform: InstallPlatform): string[] {
  switch (platform) {
    case 'desktop-chromium':
      return [
        'Ouvrez MbeukCV dans Chrome ou Edge (pas en navigation privée).',
        'Connectez-vous au moins une fois, puis restez sur l’accueil quelques secondes.',
        'Cliquez l’icône « Installer » (⊕ ou ordinateur) dans la barre d’adresse, ou menu ⋮ → « Installer MbeukCV » / « Applications disponibles ».',
        'Validez « Installer » : l’application s’ouvre dans sa propre fenêtre.',
      ];
    case 'desktop-safari':
      return [
        'Dans Safari : menu Fichier → « Ajouter au Dock » (macOS Sonoma+) ou Partager → « Sur l’écran d’accueil ».',
        'L’application apparaît comme une icône sur le Dock ou le bureau.',
      ];
    case 'ios':
      return [
        'Safari : touche Partager (carré avec flèche) → « Sur l’écran d’accueil ».',
      ];
    case 'android':
      return [
        'Chrome : menu ⋮ → « Installer l’application » ou « Ajouter à l’écran d’accueil ».',
      ];
    default:
      return [
        'Utilisez Chrome ou Edge sur ordinateur pour l’installation en un clic lorsque le navigateur l’ propose.',
      ];
  }
}

export function InstallAppPanel({ compact = false }: { compact?: boolean }) {
  const { canPrompt, installed, platform, install, showManualHint } = usePwaInstall();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  if (installed) {
    return (
      <p className={`text-sm text-muted ${compact ? '' : 'sheet p-4'}`}>
        Application installée sur cet appareil.
      </p>
    );
  }

  async function onInstallClick() {
    setPending(true);
    setMessage(null);
    const result = await install();
    setPending(false);
    if (result.ok) {
      setMessage('Installation lancée. MbeukCV apparaît dans vos applications.');
      return;
    }
    if (result.reason === 'no_prompt') {
      setShowHelp(true);
      setMessage('Le navigateur n’a pas encore proposé l’installation. Suivez les étapes ci-dessous.');
    } else {
      setMessage('Installation annulée. Réessayez ou utilisez le menu du navigateur.');
    }
  }

  return (
    <div className={compact ? 'space-y-2' : 'sheet space-y-3 p-4'}>
      {!compact && <h2 className="font-serif text-xl">Installer MbeukCV</h2>}
      <p className="text-sm text-muted">
        Installez l’application sur votre ordinateur ou téléphone : accès rapide, fenêtre dédiée, même compte.
      </p>
      {canPrompt ? (
        <button type="button" className="btn w-full sm:w-auto" disabled={pending} onClick={() => void onInstallClick()}>
          {pending ? 'Installation…' : 'Installer l’application'}
        </button>
      ) : (
        <button type="button" className="btn-ghost w-full sm:w-auto" onClick={() => setShowHelp((v) => !v)}>
          {showHelp ? 'Masquer les instructions' : 'Comment installer sur cet appareil'}
        </button>
      )}
      {(showHelp || showManualHint) && (
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
          {manualSteps(platform).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
      {message && <p className="text-sm text-[#2f6b45]">{message}</p>}
    </div>
  );
}
