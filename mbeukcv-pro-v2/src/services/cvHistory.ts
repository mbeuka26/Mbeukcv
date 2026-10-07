import { db } from './db';
import type { CvHistoryEntry } from '@/types';

/**
 * ════════════════════════════════════════════════════════════
 * Historique des CV (mode IA) — IndexedDB via Dexie
 * ════════════════════════════════════════════════════════════
 * Toutes les fonctions sont désormais asynchrones (Dexie/IndexedDB),
 * contrairement à l'ancienne version basée sur localStorage.
 */

function generateId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `cv-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function listCvHistory(): Promise<CvHistoryEntry[]> {
  return db.iaCvHistory.orderBy('misAJourLe').reverse().toArray();
}

export interface CvHistoryInput {
  nom: string;
  cvBrutTexte: string;
  langueCible: CvHistoryEntry['langueCible'];
  instructionsStyle?: string;
}

export async function createCvHistoryEntry(data: CvHistoryInput): Promise<string> {
  const now = new Date().toISOString();
  const entry: CvHistoryEntry = {
    id: generateId(),
    nom: data.nom,
    cvBrutTexte: data.cvBrutTexte,
    langueCible: data.langueCible,
    instructionsStyle: data.instructionsStyle ?? '',
    creeLe: now,
    misAJourLe: now,
  };
  await db.iaCvHistory.put(entry);
  return entry.id;
}

export async function updateCvHistoryEntry(entryId: string, data: CvHistoryInput): Promise<void> {
  const existing = await db.iaCvHistory.get(entryId);
  const now = new Date().toISOString();
  await db.iaCvHistory.put({
    id: entryId,
    nom: data.nom,
    cvBrutTexte: data.cvBrutTexte,
    langueCible: data.langueCible,
    instructionsStyle: data.instructionsStyle ?? '',
    creeLe: existing?.creeLe ?? now,
    misAJourLe: now,
  });
}

export async function deleteCvHistoryEntry(entryId: string): Promise<void> {
  await db.iaCvHistory.delete(entryId);
}
