/**
 * Export / import d'une copie pour les appareils sans dossier surveillé.
 * Le fichier .mbeuk interne reste chiffré. La clé automatique voyage avec,
 * comme dans le dossier MbeukCV. Aucun secret métier n'est ajouté en clair.
 */

import { RecoveryError } from './recoveryCrypto';

export const RECOVERY_PACK_APPLICATION = 'mbeukcv-pro-export';
export const RECOVERY_PACK_VERSION = 1;
export const RECOVERY_PACK_FILENAME = 'MbeukCV-recovery.mbeukpack';

export function packRecoveryExport(recoveryFile: string, key: string): string {
  if (key.trim().length < 8 || recoveryFile.trim().length < 2) {
    throw new RecoveryError('format', 'Copie incomplète. Export annulé.');
  }
  return JSON.stringify({
    application: RECOVERY_PACK_APPLICATION,
    schemaVersion: RECOVERY_PACK_VERSION,
    recovery: recoveryFile,
    key,
  });
}

export function unpackRecoveryExport(raw: string): { recovery: string; key: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new RecoveryError('format', 'Fichier d’export illisible.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new RecoveryError('format', 'Fichier d’export illisible.');
  }
  const record = parsed as Record<string, unknown>;
  if (record.application !== RECOVERY_PACK_APPLICATION || record.schemaVersion !== RECOVERY_PACK_VERSION) {
    throw new RecoveryError('application', 'Ce fichier n’est pas une copie MbeukCV.');
  }
  if (typeof record.recovery !== 'string' || typeof record.key !== 'string' || record.key.trim().length < 8) {
    throw new RecoveryError('format', 'Fichier d’export incomplet.');
  }
  return { recovery: record.recovery, key: record.key.trim() };
}
