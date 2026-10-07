import { useRef, useState } from 'react';
import { UiButton } from '@/components/UiButton';
import { RecoveryError } from '@/services/recoveryCrypto';
import { RECOVERY_PACK_FILENAME } from '@/services/recoveryExchange';
import {
  acknowledgePortableCopy,
  buildRecoveryExport,
  importRecoveryExport,
} from '@/services/recoveryWatcher';

function messageFrom(error: unknown): string {
  if (error instanceof RecoveryError) return error.message;
  if (error instanceof DOMException && error.name === 'AbortError') return 'Export annulé.';
  if (error instanceof Error && error.message) return error.message;
  return 'La copie n’a pas pu être traitée. Les données déjà présentes restent en place.';
}

export function RecoveryCarry() {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingRaw = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  async function carryOut() {
    setPending(true);
    setError(null);
    setInfo(null);
    try {
      const packed = await buildRecoveryExport();
      const file = new File([packed], RECOVERY_PACK_FILENAME, { type: 'application/json' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Copie MbeukCV' });
        acknowledgePortableCopy();
        setInfo('Copie envoyée vers l’emplacement que vous avez choisi.');
        return;
      }
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = RECOVERY_PACK_FILENAME;
      link.click();
      URL.revokeObjectURL(url);
      acknowledgePortableCopy();
      setInfo('Copie téléchargée. Gardez ce fichier hors du navigateur.');
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setPending(false);
    }
  }

  async function readFile(file: File, confirm: boolean) {
    setPending(true);
    setError(null);
    setInfo(null);
    try {
      const raw = confirm && pendingRaw.current ? pendingRaw.current : await file.text();
      const result = await importRecoveryExport(raw, confirm);
      if (result === 'local-newer') {
        pendingRaw.current = raw;
        setNeedsConfirm(true);
        setError('Cet appareil a des données plus récentes. Elles n’ont pas été remplacées.');
        return;
      }
      pendingRaw.current = null;
      setNeedsConfirm(false);
      acknowledgePortableCopy();
      setInfo('Copie importée.');
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="recovery-setup-actions">
      <UiButton type="button" variant="ghost" loading={pending} onClick={() => void carryOut()}>
        Emporter une copie
      </UiButton>
      <UiButton type="button" variant="ghost" loading={pending} onClick={() => inputRef.current?.click()}>
        Importer une copie
      </UiButton>
      <input
        ref={inputRef}
        type="file"
        accept=".mbeukpack,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void readFile(file, false);
        }}
      />
      {needsConfirm && (
        <UiButton
          type="button"
          loading={pending}
          onClick={() => {
            const raw = pendingRaw.current;
            if (!raw) return;
            const file = new File([raw], RECOVERY_PACK_FILENAME, { type: 'application/json' });
            void readFile(file, true);
          }}
        >
          Remplacer par la copie
        </UiButton>
      )}
      {info && <p className="recovery-setup-info">{info}</p>}
      {error && <p className="recovery-setup-error">{error}</p>}
    </div>
  );
}
