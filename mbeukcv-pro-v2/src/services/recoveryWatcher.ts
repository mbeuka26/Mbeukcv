/**
 * Copie automatique non bloquante.
 * Aucun mot de passe n'est demandé. La clé est créée par l'application,
 * gardée dans le dossier MbeukCV et, si Drive est relié, dans Drive.
 */

import { requestPersistentStorage } from './capabilities';
import { installDbDirtyHooks, onLocalDataChange } from './db';
import { clearRecoveryDirectory, createRecoverySecret, loadRecoveryDirectory, loadRecoverySecret, readRecoveryKeyFile, saveRecoveryDirectory, saveRecoverySecret, writeRecoveryKeyFile, appDirectoryFrom, withFolderTimeout } from './recoveryFolder';
import { commitRecoveryText, directoryHandleFs, readBestRecovery } from './recoveryDirectory';
import { RecoveryError } from './recoveryCrypto';
import { decodeRecovery } from './recoveryFormat';
import { recoverySuspended } from './recoveryGate';
import { packRecoveryExport, unpackRecoveryExport } from './recoveryExchange';
import { buildRecoveryFile, localRecoveryState, markLocalDataTouched, restoreRecoveryFile } from './recoverySnapshot';
import { driveSyncPlan, readRecoveryChoices, writeRecoveryChoices } from './recoveryChoices';
import { downloadDriveRecoveryBundle, driveAccessToken, uploadRecoveryToDrive, connectGoogleDrive, googleDriveConfigured } from './driveRecovery';
import { onSafeStorageChange, safeStorage } from './safeStorage';

export interface RecoveryWatchStatus {
  unlocked: boolean;
  folderName: string | null;
  driveConnected: boolean;
  online: boolean;
  lastWriteAt: string | null;
  lastError: string | null;
  persistent: 'granted' | 'denied' | 'unsupported' | 'unknown';
  readyKnown: boolean;
  configured: boolean;
  resuming: boolean;
}

const listeners = new Set<(status: RecoveryWatchStatus) => void>();
let folderEpoch = 0;
let password: string | null = null;
let folder: FileSystemDirectoryHandle | null = null;
let dirty = false;
let timer: number | null = null;
let flushing = false;
let flushQueued = false;
let lastWriteAt: string | null = null;
let lastError: string | null = null;
let persistent: RecoveryWatchStatus['persistent'] = 'unknown';
let readyKnown = false;
let configured = false;
let resuming = false;
const READY_KEY = 'mbeukCV_recoveryReady';

function status(): RecoveryWatchStatus {
  return {
    unlocked: password !== null,
    folderName: folder?.name ?? null,
    driveConnected: driveAccessToken() !== null,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    lastWriteAt,
    lastError,
    persistent,
    readyKnown,
    configured,
    resuming,
  };
}

function emit(): void {
  const current = status();
  for (const listener of listeners) listener(current);
}

export function subscribeRecovery(listener: (status: RecoveryWatchStatus) => void): () => void {
  listeners.add(listener);
  listener(status());
  return () => listeners.delete(listener);
}

export function recoverySessionPassword(): string | null {
  return password;
}

export function unlockRecoverySession(value: string): void {
  password = value;
  lastError = null;
  emit();
}

export function lockRecoverySession(): void {
  password = null;
  if (timer !== null) window.clearTimeout(timer);
  timer = null;
  emit();
}

export async function adoptRecoveryFolder(parent: FileSystemDirectoryHandle): Promise<void> {
  const previous = folder;
  const previousEpoch = folderEpoch;
  folderEpoch += 1;
  let restoredExisting = false;
  try {
    folder = await appDirectoryFrom(parent, true);
    const existingKey = await readRecoveryKeyFile(folder);
    const existingBytes = existingKey ? await readBestRecovery(directoryHandleFs(folder)) : null;
    const local = await localRecoveryState();
    if (existingKey && existingBytes && !local.hasData) {
      await applyRecoveryCopies(existingKey, [new TextDecoder().decode(existingBytes)], false);
      password = existingKey;
      await saveRecoverySecret(existingKey);
      restoredExisting = true;
    } else {
      password = await ensureRecoverySecret(folder);
    }
  } catch (error) {
    folder = previous;
    folderEpoch = previousEpoch;
    throw error;
  }
  try {
    await saveRecoveryDirectory(folder);
    lastError = null;
  } catch {
    lastError = 'Le dossier est utilisé pour cette session, mais n’a pas pu être mémorisé.';
  }
  writeRecoveryChoices({ ...readRecoveryChoices(), deviceFolder: true });
  markRecoveryReady();
  dirty = !restoredExisting;
  emit();
  if (!restoredExisting) void flushRecoveryNow();
}

export async function forgetRecoveryFolder(): Promise<void> {
  folderEpoch += 1;
  folder = null;
  writeRecoveryChoices({ ...readRecoveryChoices(), deviceFolder: false });
  await clearRecoveryDirectory();
  emit();
}

function schedule(): void {
  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    void flushRecoveryNow();
  }, 4000);
}

export function noteLocalChange(): void {
  if (recoverySuspended()) return;
  try {
    markLocalDataTouched();
  } catch {
    return;
  }
  dirty = true;
  const choices = readRecoveryChoices();
  if (password && (folder || choices.drive)) schedule();
}

export async function flushRecoveryNow(): Promise<void> {
  if (flushing) {
    flushQueued = true;
    return;
  }
  flushing = true;
  try {
    await flushRecoveryBody();
  } finally {
    flushing = false;
    if (flushQueued) {
      flushQueued = false;
      void flushRecoveryNow();
    }
  }
}

async function flushRecoveryBody(): Promise<void> {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
  if (!password) password = await loadRecoverySecret();
  const choices = readRecoveryChoices();
  const wantsFolder = Boolean(folder) && choices.deviceFolder;
  const wantsDrive = choices.drive;
  if (recoverySuspended() || !password || (!wantsFolder && !wantsDrive)) {
    emit();
    return;
  }
  if (!dirty) {
    emit();
    return;
  }
  dirty = false;
  const notes: string[] = [];
  let wrote = false;
  try {
    const file = await buildRecoveryFile(password);
    if (wantsFolder && folder) {
      try {
        await withFolderTimeout(
          commitRecoveryText(directoryHandleFs(folder), file),
          'Le dossier ne répond pas. L’enregistrement dans le navigateur continue.',
        );
        wrote = true;
      } catch (error) {
        dirty = true;
        notes.push(error instanceof Error ? error.message : 'Le dossier n’a pas pu être mis à jour.');
        scheduleRetry();
      }
    }
    if (wantsDrive) {
      const plan = driveSyncPlan({
        enabled: true,
        online: navigator.onLine,
        hasToken: driveAccessToken() !== null,
      });
      if (plan === 'upload') {
        try {
          await uploadRecoveryToDrive(file, password);
          wrote = true;
        } catch (error) {
          dirty = true;
          notes.push(error instanceof Error ? error.message : 'Drive n’a pas pu être mis à jour.');
          scheduleRetry();
        }
      } else if (plan === 'wait-network') {
        dirty = true;
        notes.push('Hors connexion. Le travail local continue. La copie Drive partira au retour d’Internet.');
      } else if (plan === 'wait-auth') {
        dirty = true;
        notes.push('Drive n’est pas connecté. Reconnectez-vous pour envoyer la copie. Le travail local continue.');
      }
    }
    if (wrote) lastWriteAt = new Date().toISOString();
    lastError = notes[0] ?? null;
  } catch (error) {
    dirty = true;
    lastError = error instanceof RecoveryError
      ? error.message
      : 'La copie automatique n’a pas pu être écrite.';
    timer = window.setTimeout(() => {
      timer = null;
      void flushRecoveryNow();
    }, 30_000);
  }
  emit();
}

function scheduleRetry(): void {
  if (timer !== null) return;
  timer = window.setTimeout(() => {
    timer = null;
    void flushRecoveryNow();
  }, 30_000);
}

export async function verifyRecoveryPassword(value: string): Promise<void> {
  if (!folder) return;
  const bytes = await readBestRecovery(directoryHandleFs(folder));
  if (!bytes) return;
  await decodeRecovery(value, new TextDecoder().decode(bytes));
}

async function ensureRecoverySecret(directory: FileSystemDirectoryHandle | null): Promise<string> {
  const fromFile = directory ? await readRecoveryKeyFile(directory) : null;
  if (fromFile) {
    password = fromFile;
    await saveRecoverySecret(fromFile);
    return fromFile;
  }
  const secret = password ?? (await loadRecoverySecret()) ?? createRecoverySecret();
  password = secret;
  await saveRecoverySecret(secret);
  if (directory) await writeRecoveryKeyFile(directory, secret);
  return secret;
}

function markRecoveryReady(): void {
  safeStorage.setItem(READY_KEY, '1');
  configured = true;
  readyKnown = true;
}

function refreshConfigured(): void {
  const choices = readRecoveryChoices();
  configured = safeStorage.getItem(READY_KEY) === '1' || Boolean(password && (folder || choices.drive));
  readyKnown = true;
}

async function applyRecoveryCopies(secret: string, copies: string[], confirm: boolean): Promise<'restored' | 'local-newer'> {
  let failure: unknown = null;
  for (const raw of copies) {
    try {
      return await restoreRecoveryFile(secret, raw, confirm);
    } catch (error) {
      if (error instanceof RecoveryError && (error.code === 'password' || error.code === 'application')) throw error;
      failure = error;
    }
  }
  throw failure instanceof Error ? failure : new Error('Copie inutilisable. Les données locales sont intactes.');
}

export async function restoreFromDrive(confirm = false): Promise<'restored' | 'local-newer'> {
  if (!navigator.onLine) throw new Error('Hors connexion. Restaurez depuis le dossier MbeukCV de cet appareil.');
  if (!googleDriveConfigured()) throw new Error('Drive n’est pas activé sur cette installation. Restaurez depuis le dossier MbeukCV.');
  try {
    await connectGoogleDrive('');
  } catch {
    await connectGoogleDrive('consent');
  }
  const bundle = await downloadDriveRecoveryBundle();
  const result = await applyRecoveryCopies(bundle.secret, bundle.copies, confirm);
  if (result === 'restored') {
    password = bundle.secret;
    await saveRecoverySecret(bundle.secret);
    writeRecoveryChoices({ ...readRecoveryChoices(), drive: true });
    markRecoveryReady();
    emit();
  }
  return result;
}

export async function restoreFromDevice(parent: FileSystemDirectoryHandle, confirm = false): Promise<'restored' | 'local-newer'> {
  const appDir = await appDirectoryFrom(parent, false);
  const secret = await readRecoveryKeyFile(appDir);
  const bytes = secret ? await readBestRecovery(directoryHandleFs(appDir)) : null;
  if (!secret || !bytes) throw new Error('Aucune copie MbeukCV dans ce dossier.');
  const result = await applyRecoveryCopies(secret, [new TextDecoder().decode(bytes)], confirm);
  if (result === 'restored') {
    password = secret;
    folder = appDir;
    await saveRecoverySecret(secret);
    await saveRecoveryDirectory(appDir);
    writeRecoveryChoices({ ...readRecoveryChoices(), deviceFolder: true });
    markRecoveryReady();
    emit();
  }
  return result;
}

export async function buildRecoveryExport(): Promise<string> {
  if (!password) password = (await loadRecoverySecret()) ?? createRecoverySecret();
  await saveRecoverySecret(password);
  return packRecoveryExport(await buildRecoveryFile(password), password);
}

export async function importRecoveryExport(raw: string, confirm = false): Promise<'restored' | 'local-newer'> {
  const unpacked = unpackRecoveryExport(raw);
  const result = await restoreRecoveryFile(unpacked.key, unpacked.recovery, confirm);
  if (result === 'restored') {
    password = unpacked.key;
    await saveRecoverySecret(unpacked.key);
    lastError = null;
    emit();
  }
  return result;
}

export function acknowledgePortableCopy(): void {
  if (typeof window !== 'undefined' && window.showDirectoryPicker) return;
  markRecoveryReady();
  emit();
}

export async function enableDriveCopy(): Promise<void> {
  await connectGoogleDrive('consent');
  password = await ensureRecoverySecret(folder);
  writeRecoveryChoices({ ...readRecoveryChoices(), drive: true });
  markRecoveryReady();
  dirty = true;
  emit();
  await flushRecoveryNow();
}

export async function pickParentDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!window.showDirectoryPicker) {
    throw new Error('Ce navigateur ne permet pas de choisir un dossier. Utilisez Drive, ou enregistrez le fichier dans Fichiers.');
  }
  try {
    return await window.showDirectoryPicker({ mode: 'readwrite', id: 'mbeukcv-parent', startIn: 'documents' });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    return window.showDirectoryPicker({ mode: 'readwrite' });
  }
}

async function trySilentDriveRestore(): Promise<void> {
  if (configured || !navigator.onLine || !googleDriveConfigured()) return;
  resuming = true;
  emit();
  try {
    await connectGoogleDrive('');
    const bundle = await downloadDriveRecoveryBundle(false);
    const result = await applyRecoveryCopies(bundle.secret, bundle.copies, false);
    if (result !== 'restored') return;
    password = bundle.secret;
    await saveRecoverySecret(bundle.secret);
    writeRecoveryChoices({ ...readRecoveryChoices(), drive: true });
    markRecoveryReady();
    lastError = null;
  } catch {
    // Première installation, ou session Google absente. Aucune fenêtre n'est ouverte.
  } finally {
    resuming = false;
    refreshConfigured();
  }
}

export function startRecoveryWatcher(): () => void {
  installDbDirtyHooks();
  const stopData = onLocalDataChange(noteLocalChange);
  const stopStorage = onSafeStorageChange(() => noteLocalChange());
  let active = true;
  void requestPersistentStorage().then((result) => {
    if (!active) return;
    persistent = result;
    emit();
  });
  const epochAtStart = folderEpoch;
  void (async () => {
    try {
      const storedSecret = await loadRecoverySecret();
      if (!active) return;
      if (storedSecret) password = storedSecret;
      const handle = await loadRecoveryDirectory();
      if (active && handle && !folder && epochAtStart === folderEpoch) {
        folder = handle;
        const choices = readRecoveryChoices();
        if (!choices.deviceFolder) writeRecoveryChoices({ ...choices, deviceFolder: true });
        const permission = await handle.queryPermission?.({ mode: 'readwrite' });
        if (permission === 'granted') await ensureRecoverySecret(handle);
      }
    } catch {
      // Le prochain enregistrement réessaiera.
    }
    if (!active) return;
    refreshConfigured();
    if (!configured) await trySilentDriveRestore();
    emit();
  })();
  const onOnline = () => {
    if (dirty) void flushRecoveryNow();
    else emit();
  };
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', emit);
  return () => {
    active = false;
    stopData();
    stopStorage();
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', emit);
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  };
}
