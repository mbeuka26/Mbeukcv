import { db } from '@/services/db';
import { createEmptyClassicCv, newId, type ClassicCvData } from './types';

export async function listClassicCvs(): Promise<ClassicCvData[]> {
  return db.classicCvs.orderBy('misAJourLe').reverse().toArray();
}

export async function getClassicCv(id: string): Promise<ClassicCvData | undefined> {
  return db.classicCvs.get(id);
}

export async function saveClassicCv(cv: ClassicCvData): Promise<void> {
  await db.classicCvs.put({ ...cv, misAJourLe: new Date().toISOString() });
}

export async function deleteClassicCv(id: string): Promise<void> {
  await db.classicCvs.delete(id);
}

export function createNewClassicCv(): ClassicCvData {
  return createEmptyClassicCv(newId());
}
