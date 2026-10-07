/**
 * Fichier .mbeuk versionné.
 * Les sections métier, préférences, OnKey et OnDB sont chiffrées.
 * L'en-tête (application, version, dates) reste lisible pour refuser
 * un fichier incompatible avant d'écrire quoi que ce soit.
 */

import {
  RECOVERY_KDF_ITERATIONS,
  RecoveryError,
  bytesToBase64,
  deriveRecoveryKey,
  decryptJson,
  encryptJson,
  sameText,
  sha256Hex,
} from './recoveryCrypto';

export const RECOVERY_APPLICATION = 'mbeukcv-pro';
export const RECOVERY_SCHEMA_VERSION = 1;

export interface EncryptedSection {
  encrypted: true;
  payload: string;
}

export interface RecoveryPlaintext {
  dataUpdatedAt: string;
  business: unknown;
  preferences: unknown;
  briaOnKey: unknown;
  briaOnDb: unknown;
}

export interface RecoveryEnvelope {
  application: string;
  schemaVersion: number;
  writtenAt: string;
  dataUpdatedAt: string;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  business: EncryptedSection;
  preferences: EncryptedSection;
  briaOnKey: EncryptedSection;
  briaOnDb: EncryptedSection;
  integrity: string;
}

export interface DecodedRecovery extends RecoveryPlaintext {
  writtenAt: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readSection(value: unknown): EncryptedSection {
  const record = asRecord(value);
  if (!record || record.encrypted !== true || typeof record.payload !== 'string' || record.payload.length === 0) {
    throw new RecoveryError('format', 'Section chiffrée manquante.');
  }
  return { encrypted: true, payload: record.payload };
}

export function parseEnvelope(raw: string): RecoveryEnvelope {
  const trimmed = raw.trim();
  if (trimmed.length < 20) throw new RecoveryError('truncated', 'Fichier tronqué.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new RecoveryError('format', 'Fichier illisible.');
  }
  const record = asRecord(parsed);
  if (!record) throw new RecoveryError('format', 'Fichier illisible.');
  if (record.application !== RECOVERY_APPLICATION) {
    throw new RecoveryError('application', 'Ce fichier n’appartient pas à MbeukCV Pro.');
  }
  if (record.schemaVersion !== RECOVERY_SCHEMA_VERSION) {
    throw new RecoveryError('version', 'Version de copie non prise en charge.');
  }
  if (typeof record.writtenAt !== 'string' || typeof record.dataUpdatedAt !== 'string') {
    throw new RecoveryError('format', 'Dates de copie manquantes.');
  }
  const kdf = asRecord(record.kdf);
  if (!kdf || kdf.name !== 'PBKDF2' || kdf.hash !== 'SHA-256' || typeof kdf.salt !== 'string') {
    throw new RecoveryError('format', 'Paramètres de chiffrement illisibles.');
  }
  if (typeof kdf.iterations !== 'number' || kdf.iterations < 1_000 || kdf.iterations > 2_000_000) {
    throw new RecoveryError('format', 'Paramètres de chiffrement illisibles.');
  }
  if (typeof record.integrity !== 'string' || record.integrity.length !== 64) {
    throw new RecoveryError('integrity', 'Intégrité absente.');
  }
  return {
    application: RECOVERY_APPLICATION,
    schemaVersion: RECOVERY_SCHEMA_VERSION,
    writtenAt: record.writtenAt,
    dataUpdatedAt: record.dataUpdatedAt,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: kdf.iterations, salt: kdf.salt },
    business: readSection(record.business),
    preferences: readSection(record.preferences),
    briaOnKey: readSection(record.briaOnKey),
    briaOnDb: readSection(record.briaOnDb),
    integrity: record.integrity,
  };
}

function integritySource(envelope: Omit<RecoveryEnvelope, 'integrity'>): string {
  return [
    String(envelope.schemaVersion),
    envelope.dataUpdatedAt,
    envelope.business.payload,
    envelope.preferences.payload,
    envelope.briaOnKey.payload,
    envelope.briaOnDb.payload,
  ].join('\n');
}

async function assertIntegrity(envelope: RecoveryEnvelope): Promise<void> {
  const { integrity, ...rest } = envelope;
  const digest = await sha256Hex(integritySource(rest));
  if (!sameText(digest, integrity)) throw new RecoveryError('integrity', 'Intégrité invalide. Restauration refusée.');
}

function assertSecretsHidden(serialized: string, plain: RecoveryPlaintext): void {
  const secrets = collectSecrets(plain.preferences)
    .concat(collectSecrets(plain.briaOnKey), collectSecrets(plain.briaOnDb));
  for (const secret of secrets) {
    if (secret.length >= 8 && serialized.includes(secret)) {
      throw new RecoveryError('format', 'Un secret serait écrit en clair. Écriture annulée.');
    }
  }
}

function collectSecrets(value: unknown): string[] {
  const record = asRecord(value);
  if (!record) return [];
  return Object.values(record).filter((item): item is string => typeof item === 'string' && item.trim().length >= 8);
}

export async function encodeRecovery(
  password: string,
  plain: RecoveryPlaintext,
  options?: { iterations?: number; now?: string },
): Promise<string> {
  if (password.trim().length < 8) {
    throw new RecoveryError('password', 'Le mot de passe de récupération doit contenir au moins 8 caractères.');
  }
  const iterations = options?.iterations ?? RECOVERY_KDF_ITERATIONS;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveRecoveryKey(password, salt, iterations);
  const draft: Omit<RecoveryEnvelope, 'integrity'> = {
    application: RECOVERY_APPLICATION,
    schemaVersion: RECOVERY_SCHEMA_VERSION,
    writtenAt: options?.now ?? new Date().toISOString(),
    dataUpdatedAt: plain.dataUpdatedAt,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: bytesToBase64(salt) },
    business: { encrypted: true, payload: await encryptJson(key, plain.business) },
    preferences: { encrypted: true, payload: await encryptJson(key, plain.preferences) },
    briaOnKey: { encrypted: true, payload: await encryptJson(key, plain.briaOnKey) },
    briaOnDb: { encrypted: true, payload: await encryptJson(key, plain.briaOnDb) },
  };
  const envelope: RecoveryEnvelope = { ...draft, integrity: await sha256Hex(integritySource(draft)) };
  const serialized = JSON.stringify(envelope);
  assertSecretsHidden(serialized, plain);
  return serialized;
}

export async function decodeRecovery(password: string, raw: string): Promise<DecodedRecovery> {
  const envelope = parseEnvelope(raw);
  await assertIntegrity(envelope);
  let salt: Uint8Array;
  try {
    salt = Uint8Array.from(atob(envelope.kdf.salt), (char) => char.charCodeAt(0));
  } catch {
    throw new RecoveryError('format', 'Paramètres de chiffrement illisibles.');
  }
  const key = await deriveRecoveryKey(password, salt, envelope.kdf.iterations);
  const [business, preferences, briaOnKey, briaOnDb] = await Promise.all([
    decryptJson(key, envelope.business.payload),
    decryptJson(key, envelope.preferences.payload),
    decryptJson(key, envelope.briaOnKey.payload),
    decryptJson(key, envelope.briaOnDb.payload),
  ]);
  return {
    writtenAt: envelope.writtenAt,
    dataUpdatedAt: envelope.dataUpdatedAt,
    business,
    preferences,
    briaOnKey,
    briaOnDb,
  };
}

export function assessRestore(input: {
  recoveryUpdatedAt: string;
  localUpdatedAt: string | null;
  localHasData: boolean;
  confirmOverwrite: boolean;
}): 'restore' | 'local-newer' {
  if (!input.localHasData || input.confirmOverwrite) return 'restore';
  if (!input.localUpdatedAt) return 'local-newer';
  const recoveryTime = Date.parse(input.recoveryUpdatedAt);
  const localTime = Date.parse(input.localUpdatedAt);
  if (Number.isNaN(recoveryTime) || Number.isNaN(localTime)) return 'local-newer';
  return localTime > recoveryTime ? 'local-newer' : 'restore';
}
