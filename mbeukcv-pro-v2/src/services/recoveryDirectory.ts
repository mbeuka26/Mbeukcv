/**
 * Double copie : tmp validé, puis current, l'ancien current devenant previous.
 * Une écriture interrompue ne remplace pas la dernière copie valide.
 */

import { RecoveryError } from './recoveryCrypto';
import { parseEnvelope } from './recoveryFormat';

export const RECOVERY_CURRENT = 'recovery.current.mbeuk';
export const RECOVERY_PREVIOUS = 'recovery.previous.mbeuk';
export const RECOVERY_TMP = 'recovery.tmp';

export interface RecoveryFs {
  read(name: string): Promise<Uint8Array | null>;
  write(name: string, data: Uint8Array): Promise<void>;
  remove(name: string): Promise<void>;
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

export function createMemoryRecoveryFs(): RecoveryFs & { files: Map<string, Uint8Array> } {
  const files = new Map<string, Uint8Array>();
  return {
    files,
    async read(name) {
      const value = files.get(name);
      return value ? new Uint8Array(value) : null;
    },
    async write(name, data) {
      files.set(name, new Uint8Array(data));
    },
    async remove(name) {
      files.delete(name);
    },
  };
}

export async function commitRecoveryText(fs: RecoveryFs, serialized: string): Promise<void> {
  const bytes = new TextEncoder().encode(serialized);
  await fs.write(RECOVERY_TMP, bytes);
  const written = await fs.read(RECOVERY_TMP);
  if (!written || !sameBytes(written, bytes)) {
    throw new RecoveryError('incomplete-tmp', 'Écriture incomplète. La copie valide est conservée.');
  }
  parseEnvelope(new TextDecoder().decode(written));

  const current = await fs.read(RECOVERY_CURRENT);
  if (current && current.byteLength > 0) {
    await fs.write(RECOVERY_PREVIOUS, current);
    const previous = await fs.read(RECOVERY_PREVIOUS);
    if (!previous || !sameBytes(previous, current)) {
      throw new RecoveryError('incomplete-tmp', 'La copie précédente n’a pas pu être conservée.');
    }
  }

  await fs.write(RECOVERY_CURRENT, written);
  const promoted = await fs.read(RECOVERY_CURRENT);
  if (!promoted || !sameBytes(promoted, written)) {
    throw new RecoveryError('incomplete-tmp', 'La nouvelle copie n’est pas complète. La copie précédente reste disponible.');
  }
  await fs.remove(RECOVERY_TMP);
}

export async function readBestRecovery(fs: RecoveryFs): Promise<Uint8Array | null> {
  for (const name of [RECOVERY_CURRENT, RECOVERY_PREVIOUS]) {
    const bytes = await fs.read(name);
    if (!bytes || bytes.byteLength === 0) continue;
    try {
      parseEnvelope(new TextDecoder().decode(bytes));
      return bytes;
    } catch {
      // Copie inutilisable : essayer la précédente.
    }
  }
  return null;
}

export function directoryHandleFs(directory: FileSystemDirectoryHandle): RecoveryFs {
  return {
    async read(name) {
      try {
        const handle = await directory.getFileHandle(name);
        return new Uint8Array(await (await handle.getFile()).arrayBuffer());
      } catch {
        return null;
      }
    },
    async write(name, data) {
      const handle = await directory.getFileHandle(name, { create: true });
      const writable = await handle.createWritable();
      await writable.write(data);
      await writable.close();
    },
    async remove(name) {
      await directory.removeEntry(name).catch(() => undefined);
    },
  };
}
