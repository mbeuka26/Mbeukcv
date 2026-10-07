/**
 * Chiffrement au repos des clés JSearch / Africawork.
 * Sans COLLECT_KEYS_KEY (16 caractères minimum), le comportement actuel
 * est conservé : secret en clair, illisible par le navigateur grâce au RLS.
 * Avec la variable, les nouvelles écritures sont en AES-GCM (préfixe v1:).
 * Les lignes déjà en clair restent lisibles, puis sont réécrites chiffrées
 * à la prochaine collecte.
 */

const PREFIX = 'v1:';
const DEFAULT_ITERATIONS = 120_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function deriveKey(keyMaterial: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(keyMaterial),
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

export async function sealCollectSecretWithKey(
  plain: string,
  keyMaterial: string,
  iterations = DEFAULT_ITERATIONS,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(keyMaterial, salt, iterations);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain)),
  );
  const packed = new Uint8Array(salt.length + iv.length + cipher.length);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(cipher, salt.length + iv.length);
  return `${PREFIX}${bytesToBase64(packed)}`;
}

export async function openCollectSecretWithKey(
  stored: string,
  keyMaterial: string,
  iterations = DEFAULT_ITERATIONS,
): Promise<string> {
  if (!stored.startsWith(PREFIX)) throw new Error('Secret de collecte illisible.');
  const packed = base64ToBytes(stored.slice(PREFIX.length));
  if (packed.length < 29) throw new Error('Secret de collecte illisible.');
  const key = await deriveKey(keyMaterial, packed.slice(0, 16), iterations);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: packed.slice(16, 28) },
    key,
    packed.slice(28),
  );
  return new TextDecoder().decode(plain);
}

function configuredKey(): string {
  const raw = Deno.env.get('COLLECT_KEYS_KEY')?.trim() ?? '';
  return raw.length >= 16 ? raw : '';
}

export async function sealCollectSecret(plain: string): Promise<string> {
  const key = configuredKey();
  if (!key) return plain;
  return sealCollectSecretWithKey(plain, key);
}

export async function openCollectSecret(stored: string): Promise<{ plain: string; reseal: string | null }> {
  if (!stored.startsWith(PREFIX)) {
    const key = configuredKey();
    if (!key) return { plain: stored, reseal: null };
    return { plain: stored, reseal: await sealCollectSecretWithKey(stored, key) };
  }
  const key = configuredKey();
  if (!key) throw new Error('COLLECT_KEYS_KEY absente.');
  return { plain: await openCollectSecretWithKey(stored, key), reseal: null };
}
