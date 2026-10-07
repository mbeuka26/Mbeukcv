import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

function encryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY?.trim();
  if (!raw || raw.length < 16) {
    throw new Error('ENCRYPTION_KEY absente ou trop courte.');
  }
  return scryptSync(raw, 'mbeukcv-saas', 32);
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${Buffer.concat([iv, tag, encrypted]).toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  if (!payload.startsWith('v1:')) throw new Error('Secret illisible.');
  const buffer = Buffer.from(payload.slice(3), 'base64');
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
