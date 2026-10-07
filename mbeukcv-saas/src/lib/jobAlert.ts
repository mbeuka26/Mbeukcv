import 'server-only';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

const META = 'mbeuk_alert';

export interface JobAlert {
  on: boolean;
  enabledAt: string | null;
}

export function parseAlert(value: unknown): JobAlert {
  if (!value || typeof value !== 'object') return { on: false, enabledAt: null };
  const raw = value as { on?: unknown; enabledAt?: unknown };
  const enabledAt = typeof raw.enabledAt === 'string' && !Number.isNaN(Date.parse(raw.enabledAt)) ? raw.enabledAt : null;
  return { on: raw.on === true && Boolean(enabledAt), enabledAt };
}

export async function readAlert(userId: string): Promise<JobAlert> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return { on: false, enabledAt: null };
  return parseAlert(data.user.app_metadata?.[META]);
}

export async function writeAlert(userId: string, on: boolean): Promise<JobAlert> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error('Compte introuvable.');
  const metadata = { ...(data.user.app_metadata ?? {}) };
  const next: JobAlert = on
    ? { on: true, enabledAt: new Date().toISOString() }
    : { on: false, enabledAt: null };
  metadata[META] = next;
  const updated = await admin.auth.admin.updateUserById(userId, { app_metadata: metadata });
  if (updated.error) throw new Error(updated.error.message);
  return next;
}

export function alertSince(alert: JobAlert, now = new Date()): string | null {
  if (!alert.on || !alert.enabledAt) return null;
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  return alert.enabledAt > weekAgo ? alert.enabledAt : weekAgo;
}
