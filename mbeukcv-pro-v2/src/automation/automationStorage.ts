import { db, type AutomationSettings } from '@/services/db';

const DEFAULTS: AutomationSettings = {
  id: 'settings',
  active: false,
  frequenceHeures: 24,
  scoreMinimum: 75,
  motsCles: [],
  notificationsNavigateur: false,
};

export async function getAutomationSettings(): Promise<AutomationSettings> {
  const existing = await db.automationSettings.get('settings');
  return existing ?? DEFAULTS;
}

export async function saveAutomationSettings(settings: Omit<AutomationSettings, 'id'>): Promise<void> {
  await db.automationSettings.put({ id: 'settings', ...settings });
}

export async function markAutomationRun(): Promise<void> {
  const current = await getAutomationSettings();
  await db.automationSettings.put({ ...current, derniereExecution: new Date().toISOString() });
}
