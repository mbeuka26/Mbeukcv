/**
 * Capacités de stockage réellement disponibles dans ce navigateur.
 * Aucune de ces capacités n'autorise une écriture silencieuse hors de l'origine.
 */

export type CapabilityState = 'supported' | 'unsupported';

export interface StorageCapabilities {
  indexedDb: CapabilityState;
  dexie: CapabilityState;
  opfs: CapabilityState;
  persistentStorage: CapabilityState;
  fileSystemAccess: CapabilityState;
  webCrypto: CapabilityState;
  serviceWorker: CapabilityState;
  estimate: { usage: number; quota: number } | null;
}

function has(value: unknown): CapabilityState {
  return value ? 'supported' : 'unsupported';
}

export async function detectStorageCapabilities(): Promise<StorageCapabilities> {
  const storage = typeof navigator === 'undefined' ? undefined : navigator.storage;
  let estimate: StorageCapabilities['estimate'] = null;
  try {
    if (storage?.estimate) {
      const result = await storage.estimate();
      if (typeof result.usage === 'number' && typeof result.quota === 'number') {
        estimate = { usage: result.usage, quota: result.quota };
      }
    }
  } catch {
    estimate = null;
  }

  const indexedDb = has(typeof indexedDB !== 'undefined');
  return {
    indexedDb,
    dexie: indexedDb,
    opfs: has(storage && 'getDirectory' in storage),
    persistentStorage: has(storage && 'persist' in storage),
    fileSystemAccess: has(typeof window !== 'undefined' && 'showDirectoryPicker' in window),
    webCrypto: has(typeof crypto !== 'undefined' && crypto.subtle),
    serviceWorker: has(typeof navigator !== 'undefined' && 'serviceWorker' in navigator),
    estimate,
  };
}

export async function requestPersistentStorage(): Promise<'granted' | 'denied' | 'unsupported'> {
  try {
    if (!navigator.storage?.persist || !navigator.storage.persisted) return 'unsupported';
    if (await navigator.storage.persisted()) return 'granted';
    return (await navigator.storage.persist()) ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}
