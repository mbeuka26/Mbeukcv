import Dexie, { type Table } from 'dexie';
import type { CvHistoryEntry } from '@/types';
import type { ClassicCvData } from '@/modes/classique/types';

/**
 * ════════════════════════════════════════════════════════════
 * Base de données locale — IndexedDB via Dexie
 * ════════════════════════════════════════════════════════════
 * Remplace `localStorage` comme stockage PRINCIPAL des données
 * applicatives (historique CV mode IA, CV du mode Classique,
 * paramètres d'automatisation). `localStorage` (via `safeStorage.ts`)
 * reste utilisé uniquement pour de petites valeurs simples (clés API,
 * préférences ponctuelles) — pas pour des collections de données.
 */

export interface AutomationSettings {
  id: 'settings';
  active: boolean;
  frequenceHeures: number;
  scoreMinimum: number;
  motsCles: string[];
  notificationsNavigateur: boolean;
  derniereExecution?: string;
}

class MbeukCvDatabase extends Dexie {
  iaCvHistory!: Table<CvHistoryEntry, string>;
  classicCvs!: Table<ClassicCvData, string>;
  automationSettings!: Table<AutomationSettings, string>;

  constructor() {
    super('mbeukcv_pro_db');
    this.version(1).stores({
      iaCvHistory: 'id, misAJourLe',
      classicCvs: 'id, misAJourLe',
      automationSettings: 'id',
    });
  }
}

export const db = new MbeukCvDatabase();

const dataListeners = new Set<() => void>();
let hooksInstalled = false;

export function onLocalDataChange(listener: () => void): () => void {
  dataListeners.add(listener);
  return () => dataListeners.delete(listener);
}

export function installDbDirtyHooks(): void {
  if (hooksInstalled) return;
  hooksInstalled = true;
  const emit = () => {
    for (const listener of dataListeners) {
      try {
        listener();
      } catch {
        // Un listener ne doit pas annuler la transaction IndexedDB.
      }
    }
  };
  for (const table of [db.iaCvHistory, db.classicCvs, db.automationSettings]) {
    table.hook('creating', emit);
    table.hook('updating', emit);
    table.hook('deleting', emit);
  }
}

/**
 * Migration ponctuelle depuis l'ancien stockage localStorage (versions
 * précédentes de l'app) — exécutée une fois au démarrage, sans danger
 * si aucune donnée n'existe à migrer.
 */
export async function migrateLegacyLocalStorageIfNeeded(): Promise<void> {
  try {
    const raw = localStorage.getItem('mbeukCV_historiqueCv');
    if (!raw) return;
    const entries = JSON.parse(raw) as CvHistoryEntry[];
    if (!Array.isArray(entries) || entries.length === 0) return;

    const existingCount = await db.iaCvHistory.count();
    if (existingCount > 0) return;

    await db.iaCvHistory.bulkPut(entries);
    localStorage.removeItem('mbeukCV_historiqueCv');
    // eslint-disable-next-line no-console
    console.info(`[db] ${entries.length} CV migré(s) depuis localStorage vers IndexedDB.`);
  } catch {
    // Migration best-effort.
  }
}
