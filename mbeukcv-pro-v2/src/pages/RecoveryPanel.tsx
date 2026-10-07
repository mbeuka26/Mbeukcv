import { useEffect, useState } from 'react';
import { RecoveryCarry } from '@/components/RecoveryCarry';
import { UiButton } from '@/components/UiButton';
import {
  adoptRecoveryFolder,
  enableDriveCopy,
  forgetRecoveryFolder,
  pickParentDirectory,
  subscribeRecovery,
  type RecoveryWatchStatus,
} from '@/services/recoveryWatcher';
import { googleDriveConfigured } from '@/services/driveRecovery';
import { readRecoveryChoices } from '@/services/recoveryChoices';

export function RecoveryPanel() {
  const [status, setStatus] = useState<RecoveryWatchStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const choices = readRecoveryChoices();

  useEffect(() => subscribeRecovery(setStatus), []);

  async function changeFolder() {
    setPending(true);
    setMessage(null);
    try {
      await adoptRecoveryFolder(await pickParentDirectory());
      setMessage('Dossier MbeukCV prêt. L’enregistrement continue automatiquement.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Dossier non retenu.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="automation-block" style={{ marginTop: 18 }}>
      <h3>Récupération</h3>
      <p className="automation-note">
        Le choix du dossier se fait une seule fois. Ensuite, chaque modification est enregistrée dans le dossier MbeukCV, et sur Drive quand la connexion est là.
        Aucun mot de passe n’est demandé. Après un effacement du navigateur, Drive revient tout seul si la session Google est encore ouverte. Sinon, le même choix de dossier recharge la copie déjà présente.
        Sur iPhone, ou si le navigateur ne permet pas un dossier, emportez une copie fichier.
      </p>
      <p className="automation-note">
        Dossier : {status?.folderName ?? 'pas encore choisi'}.
        {choices.drive ? ' Drive activé.' : ' Drive non activé.'}
        {status?.driveConnected ? ' Session Drive ouverte.' : ''}
        {status?.lastWriteAt ? ` Dernière copie : ${new Date(status.lastWriteAt).toLocaleString('fr-FR')}.` : ''}
      </p>
      <div className="cv-save-row">
        <UiButton type="button" loading={pending} onClick={() => void changeFolder()}>
          {status?.folderName ? 'Changer de dossier' : 'Choisir un dossier'}
        </UiButton>
        {googleDriveConfigured() && !choices.drive && (
          <UiButton
            type="button"
            variant="ghost"
            loading={pending}
            onClick={() => {
              setPending(true);
              void enableDriveCopy()
                .then(() => setMessage('Drive relié.'))
                .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Drive non relié.'))
                .finally(() => setPending(false));
            }}
          >
            Ajouter Google Drive
          </UiButton>
        )}
        {status?.folderName && (
          <button
            type="button"
            className="cv-history-delete-btn"
            onClick={() => {
              void forgetRecoveryFolder();
              setMessage('Dossier oublié pour les prochaines copies. Les fichiers déjà écrits restent.');
            }}
          >
            Oublier le dossier
          </button>
        )}
      </div>
      <RecoveryCarry />
      {(message || status?.lastError) && <div className="gen-error" style={{ marginTop: 14 }}>{message ?? status?.lastError}</div>}
    </div>
  );
}
