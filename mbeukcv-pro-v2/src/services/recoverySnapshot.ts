/**
 * Lecture et restauration du contenu métier, des préférences, de OnKey et de OnDB.
 * Aucun jeton de session, aucune clé service-role, aucun secret Hub.
 */

import type { ClassicCvData } from '@/modes/classique/types';
import type { CvHistoryEntry } from '@/types';
import { clearCustomClaudeKey, getCustomClaudeKey, isValidClaudeKeyFormat, setCustomClaudeKey } from './byok';
import { db, type AutomationSettings } from './db';
import { clearHubLicenceCode, getHubLicenceCode, setHubLicenceCode } from './hubIdentity';
import { clearRapidApiKey } from './rapidApiKey';
import { RecoveryError } from './recoveryCrypto';
import { assessRestore, decodeRecovery, encodeRecovery, type RecoveryPlaintext } from './recoveryFormat';
import { recoverySuspended, resumeRecovery, suspendRecovery } from './recoveryGate';
import { LOCAL_TOUCHED_KEY, safeStorage } from './safeStorage';
import { clearSupabaseConfig, getSupabaseConfig, setSupabaseConfig } from './supabase';

export { LOCAL_TOUCHED_KEY };

function touchedAt(): string | null {
  return safeStorage.getItem(LOCAL_TOUCHED_KEY);
}

export function markLocalDataTouched(): void {
  if (recoverySuspended()) return;
  safeStorage.setItem(LOCAL_TOUCHED_KEY, new Date().toISOString());
}

export async function collectRecoveryPlaintext(): Promise<RecoveryPlaintext> {
  const [history, classic, automation] = await Promise.all([
    db.iaCvHistory.toArray(),
    db.classicCvs.toArray(),
    db.automationSettings.get('settings'),
  ]);
  const supabase = getSupabaseConfig();
  return {
    dataUpdatedAt: touchedAt() ?? new Date().toISOString(),
    business: { iaCvHistory: history, classicCvs: classic },
    preferences: {
      automation: automation ?? null,
      licenceCode: getHubLicenceCode(),
    },
    briaOnKey: {
      claudeKey: getCustomClaudeKey(),
      rapidApiKey: null,
    },
    briaOnDb: {
      supabaseUrl: supabase?.url ?? null,
      supabaseAnonKey: supabase?.anonKey ?? null,
    },
  };
}

export async function buildRecoveryFile(password: string): Promise<string> {
  return encodeRecovery(password, await collectRecoveryPlaintext());
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readHistory(value: unknown): CvHistoryEntry[] {
  if (!Array.isArray(value)) throw new RecoveryError('format', 'Historique des CV illisible.');
  return value.map((item) => {
    const record = asRecord(item);
    const langue = record?.langueCible;
    if (
      !record
      || typeof record.id !== 'string'
      || typeof record.nom !== 'string'
      || typeof record.cvBrutTexte !== 'string'
      || (langue !== 'fr' && langue !== 'en' && langue !== 'les-deux')
      || typeof record.creeLe !== 'string'
      || typeof record.misAJourLe !== 'string'
    ) {
      throw new RecoveryError('format', 'Historique des CV incohérent.');
    }
    return {
      id: record.id,
      nom: record.nom,
      cvBrutTexte: record.cvBrutTexte,
      langueCible: langue,
      instructionsStyle: typeof record.instructionsStyle === 'string' ? record.instructionsStyle : '',
      creeLe: record.creeLe,
      misAJourLe: record.misAJourLe,
    };
  });
}

function readClassic(value: unknown): ClassicCvData[] {
  if (!Array.isArray(value)) throw new RecoveryError('format', 'CV classiques illisibles.');
  return value.map((item) => {
    const record = asRecord(item);
    if (!record || typeof record.id !== 'string' || typeof record.misAJourLe !== 'string') {
      throw new RecoveryError('format', 'CV classiques incohérents.');
    }
    return record as unknown as ClassicCvData;
  });
}

function readAutomation(value: unknown): AutomationSettings | null {
  if (value === null || value === undefined) return null;
  const record = asRecord(value);
  if (!record || !Array.isArray(record.motsCles)) {
    throw new RecoveryError('format', 'Réglages d’automatisation illisibles.');
  }
  return {
    id: 'settings',
    active: record.active === true,
    frequenceHeures: typeof record.frequenceHeures === 'number' ? record.frequenceHeures : 24,
    scoreMinimum: typeof record.scoreMinimum === 'number' ? record.scoreMinimum : 75,
    motsCles: record.motsCles.filter((item): item is string => typeof item === 'string'),
    notificationsNavigateur: record.notificationsNavigateur === true,
    derniereExecution: typeof record.derniereExecution === 'string' ? record.derniereExecution : undefined,
  };
}

function optionalSecret(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new RecoveryError('format', 'Configuration illisible.');
  return value.trim() || null;
}

export async function localRecoveryState(): Promise<{ updatedAt: string | null; hasData: boolean }> {
  const [historyCount, classicCount] = await Promise.all([db.iaCvHistory.count(), db.classicCvs.count()]);
  const hasData = historyCount > 0
    || classicCount > 0
    || getSupabaseConfig() !== null
    || getHubLicenceCode() !== null
    || safeStorage.getItem('mbeukCV_customClaudeKey') !== null;
  return { updatedAt: touchedAt(), hasData };
}

export async function restoreRecoveryFile(
  password: string,
  raw: string,
  confirmOverwrite: boolean,
): Promise<'restored' | 'local-newer'> {
  const decoded = await decodeRecovery(password, raw);
  const business = asRecord(decoded.business);
  const preferences = asRecord(decoded.preferences);
  const onKey = asRecord(decoded.briaOnKey);
  const onDb = asRecord(decoded.briaOnDb);
  if (!business || !preferences || !onKey || !onDb) {
    throw new RecoveryError('format', 'Contenu de la copie incohérent.');
  }

  const history = readHistory(business.iaCvHistory);
  const classic = readClassic(business.classicCvs);
  const automation = readAutomation(preferences.automation);
  const licenceCode = optionalSecret(preferences.licenceCode);
  const claudeKey = optionalSecret(onKey.claudeKey);
  const supabaseUrl = optionalSecret(onDb.supabaseUrl);
  const supabaseAnonKey = optionalSecret(onDb.supabaseAnonKey);

  if (claudeKey && !isValidClaudeKeyFormat(claudeKey)) {
    throw new RecoveryError('format', 'Clé Claude de la copie refusée. Données locales intactes.');
  }
  if (Boolean(supabaseUrl) !== Boolean(supabaseAnonKey)) {
    throw new RecoveryError('format', 'Configuration Supabase incomplète. Données locales intactes.');
  }

  const local = await localRecoveryState();
  const decision = assessRestore({
    recoveryUpdatedAt: decoded.dataUpdatedAt,
    localUpdatedAt: local.updatedAt,
    localHasData: local.hasData,
    confirmOverwrite,
  });
  if (decision === 'local-newer') return 'local-newer';

  suspendRecovery();
  try {
  await db.transaction('rw', db.iaCvHistory, db.classicCvs, db.automationSettings, async () => {
    await db.iaCvHistory.clear();
    await db.classicCvs.clear();
    await db.automationSettings.clear();
    if (history.length > 0) await db.iaCvHistory.bulkPut(history);
    if (classic.length > 0) await db.classicCvs.bulkPut(classic);
    if (automation) await db.automationSettings.put(automation);
  });

  if (claudeKey) setCustomClaudeKey(claudeKey);
  else clearCustomClaudeKey();
  clearRapidApiKey();
  if (supabaseUrl && supabaseAnonKey) setSupabaseConfig(supabaseUrl, supabaseAnonKey);
  else clearSupabaseConfig();
  if (licenceCode) setHubLicenceCode(licenceCode);
  else clearHubLicenceCode();
  safeStorage.setItem(LOCAL_TOUCHED_KEY, decoded.dataUpdatedAt);
  return 'restored';
  } finally {
    resumeRecovery();
  }
}
