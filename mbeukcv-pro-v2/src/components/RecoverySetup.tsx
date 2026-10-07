import { useEffect, useState } from 'react';
import { RecoveryCarry } from '@/components/RecoveryCarry';
import { UiButton } from '@/components/UiButton';
import { detectStorageCapabilities } from '@/services/capabilities';
import { googleDriveConfigured } from '@/services/driveRecovery';
import { RecoveryError } from '@/services/recoveryCrypto';
import {
  adoptRecoveryFolder,
  enableDriveCopy,
  pickParentDirectory,
  subscribeRecovery,
  type RecoveryWatchStatus,
} from '@/services/recoveryWatcher';
import './RecoverySetup.css';

function messageFrom(error: unknown): string {
  if (error instanceof RecoveryError) return error.message;
  if (error instanceof DOMException && error.name === 'AbortError') return 'Sélection annulée.';
  if (error instanceof Error && error.message) return error.message;
  return 'Opération impossible. Les données déjà présentes restent en place.';
}

export function RecoverySetup() {
  const [status, setStatus] = useState<RecoveryWatchStatus | null>(null);
  const [pending, setPending] = useState(false);
  const [folderSupported, setFolderSupported] = useState(true);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeRecovery(setStatus), []);
  useEffect(() => {
    void detectStorageCapabilities().then((capabilities) => {
      setFolderSupported(capabilities.fileSystemAccess === 'supported');
    });
  }, []);

  if (!status?.readyKnown) return null;
  if (status.configured) {
    if (!status.lastError) return null;
    return (
      <section className="recovery-setup" aria-label="Conservation des données">
        <p className="recovery-setup-error">{status.lastError}</p>
      </section>
    );
  }

  if (status.resuming) {
    return (
      <section className="recovery-setup" aria-label="Conservation des données">
        <h2>Reprise des données</h2>
        <p>Les données enregistrées sur Drive reviennent automatiquement.</p>
      </section>
    );
  }

  async function chooseFolder() {
    setPending(true);
    setError(null);
    setInfo(null);
    try {
      await adoptRecoveryFolder(await pickParentDirectory());
      setInfo('Dossier MbeukCV prêt. S’il contenait déjà une copie, elle a été rechargée. La suite s’enregistre toute seule.');
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setPending(false);
    }
  }

  async function connectDrive() {
    setPending(true);
    setError(null);
    setInfo(null);
    try {
      await enableDriveCopy();
      setInfo('Drive relié. Hors connexion, le travail continue. La copie part au retour d’Internet.');
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="recovery-setup" aria-label="Conservation des données">
      <h2>Conservation des données</h2>
      <p>
        Choisissez un dossier dans lequel l&apos;application conservera une copie de récupération de vos données et de vos configurations protégées.
        L’application crée dedans un dossier nommé MbeukCV et y enregistre ensuite chaque modification, sans bouton.
        Les CV et les réglages sont inclus. Les clés sont chiffrées dans la copie.
        Si les données du navigateur sont effacées et que Google est encore ouvert, la copie Drive revient toute seule.
        Sur un téléphone sans choix de dossier, emportez le fichier et gardez-le dans Fichiers.
      </p>
      <div className="recovery-setup-actions">
        {folderSupported && (
          <UiButton type="button" loading={pending} onClick={() => void chooseFolder()}>
            Choisir un dossier
          </UiButton>
        )}
        {googleDriveConfigured() && (
          <UiButton type="button" variant="ghost" loading={pending} onClick={() => void connectDrive()}>
            Ajouter Google Drive
          </UiButton>
        )}
      </div>
      {!folderSupported && <RecoveryCarry />}
      {info && <p className="recovery-setup-info">{info}</p>}
      {error && <p className="recovery-setup-error">{error}</p>}
    </section>
  );
}
