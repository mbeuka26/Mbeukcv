const DB_NAME = 'mbeukcv_recovery';
const STORE = 'kv';
const HANDLE_KEY = 'directory';
const SECRET_KEY = 'secret';

export const APP_DIRECTORY_NAME = 'MbeukCV';
export const RECOVERY_KEY_FILE = 'recovery.key';

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB indisponible.'));
  });
}

export function createRecoverySecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}

export async function saveRecoveryDirectory(handle: FileSystemDirectoryHandle): Promise<void> {
  const database = await openHandleDb();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Dossier non mémorisé.'));
  });
  database.close();
}

export async function loadRecoveryDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof indexedDB === 'undefined') return null;
  const database = await openHandleDb();
  const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
    const tx = database.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(HANDLE_KEY);
    request.onsuccess = () => resolve((request.result as FileSystemDirectoryHandle | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Dossier illisible.'));
  });
  database.close();
  return handle;
}

export async function clearRecoveryDirectory(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const database = await openHandleDb();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Dossier non oublié.'));
  });
  database.close();
}

async function putValue(key: string, value: unknown): Promise<void> {
  const database = await openHandleDb();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Mémorisation impossible.'));
  });
  database.close();
}

async function getValue<T>(key: string): Promise<T | null> {
  if (typeof indexedDB === 'undefined') return null;
  const database = await openHandleDb();
  const value = await new Promise<T | null>((resolve, reject) => {
    const tx = database.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(key);
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Lecture impossible.'));
  });
  database.close();
  return value;
}

export async function saveRecoverySecret(secret: string): Promise<void> {
  await putValue(SECRET_KEY, secret);
}

export async function loadRecoverySecret(): Promise<string | null> {
  const value = await getValue<string>(SECRET_KEY);
  return value && value.trim().length >= 8 ? value.trim() : null;
}

export const FOLDER_STEP_MS = 20_000;

export function withFolderTimeout<T>(work: Promise<T>, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), FOLDER_STEP_MS);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const FOLDER_SILENT = 'Le dossier ne répond pas. Choisissez un dossier sur ce PC, puis réessayez.';

export async function appDirectoryFrom(parent: FileSystemDirectoryHandle, create: boolean): Promise<FileSystemDirectoryHandle> {
  if (parent.name === APP_DIRECTORY_NAME) return parent;
  return withFolderTimeout(parent.getDirectoryHandle(APP_DIRECTORY_NAME, { create }), FOLDER_SILENT);
}

export async function readRecoveryKeyFile(directory: FileSystemDirectoryHandle): Promise<string | null> {
  try {
    const text = await withFolderTimeout((async () => {
      const handle = await directory.getFileHandle(RECOVERY_KEY_FILE);
      return (await (await handle.getFile()).text()).trim();
    })(), FOLDER_SILENT);
    return text.length >= 8 ? text : null;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Le dossier ne répond pas')) throw error;
    return null;
  }
}

export async function writeRecoveryKeyFile(directory: FileSystemDirectoryHandle, secret: string): Promise<void> {
  await withFolderTimeout((async () => {
    const handle = await directory.getFileHandle(RECOVERY_KEY_FILE, { create: true });
    const writable = await handle.createWritable();
    await writable.write(secret);
    await writable.close();
  })(), FOLDER_SILENT);
}
