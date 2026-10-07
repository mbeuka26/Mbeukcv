/**
 * Chiffrement du fichier de récupération — Web Crypto, AES-GCM.
 * Le mot de passe n'est pas stocké. Chaque section a son IV.
 */

/** La clé est déjà aléatoire. 210 000 tours bloquaient le premier enregistrement. */
export const RECOVERY_KDF_ITERATIONS = 20_000;

export class RecoveryError extends Error {
  readonly code:
    | 'truncated'
    | 'format'
    | 'application'
    | 'version'
    | 'integrity'
    | 'password'
    | 'local-newer'
    | 'incomplete-tmp';

  constructor(
    code:
      | 'truncated'
      | 'format'
      | 'application'
      | 'version'
      | 'integrity'
      | 'password'
      | 'local-newer'
      | 'incomplete-tmp',
    message: string,
  ) {
    super(message);
    this.name = 'RecoveryError';
    this.code = code;
  }
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function sameText(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

export async function deriveRecoveryKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptJson(key: CryptoKey, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(value))),
  );
  const packed = new Uint8Array(iv.length + cipher.length);
  packed.set(iv, 0);
  packed.set(cipher, iv.length);
  return bytesToBase64(packed);
}

export async function decryptJson(key: CryptoKey, payload: string): Promise<unknown> {
  let packed: Uint8Array;
  try {
    packed = base64ToBytes(payload);
  } catch {
    throw new RecoveryError('format', 'Section chiffrée illisible.');
  }
  if (packed.length < 13) throw new RecoveryError('truncated', 'Section tronquée.');
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: packed.slice(0, 12) },
      key,
      packed.slice(12),
    );
    return JSON.parse(new TextDecoder().decode(plain)) as unknown;
  } catch (error) {
    if (error instanceof RecoveryError) throw error;
    throw new RecoveryError('password', 'Mot de passe incorrect ou fichier altéré.');
  }
}
