/**
 * Destinations de copie. Plusieurs peuvent être actives en même temps.
 * Le plan Drive est pur : il ne contacte pas Google.
 */

import { safeStorage } from './safeStorage';

const CHOICES_KEY = 'mbeukCV_recoveryChoices';

export interface RecoveryChoices {
  deviceFolder: boolean;
  drive: boolean;
}

export function readRecoveryChoices(): RecoveryChoices {
  try {
    const raw = safeStorage.getItem(CHOICES_KEY);
    if (!raw) return { deviceFolder: false, drive: false };
    const parsed = JSON.parse(raw) as Partial<RecoveryChoices>;
    return {
      deviceFolder: parsed.deviceFolder === true,
      drive: parsed.drive === true,
    };
  } catch {
    return { deviceFolder: false, drive: false };
  }
}

export function writeRecoveryChoices(choices: RecoveryChoices): void {
  safeStorage.setItem(CHOICES_KEY, JSON.stringify(choices));
}

export type DriveSyncPlan = 'skip' | 'upload' | 'wait-network' | 'wait-auth';

export function driveSyncPlan(input: { enabled: boolean; online: boolean; hasToken: boolean }): DriveSyncPlan {
  if (!input.enabled) return 'skip';
  if (!input.online) return 'wait-network';
  if (!input.hasToken) return 'wait-auth';
  return 'upload';
}
