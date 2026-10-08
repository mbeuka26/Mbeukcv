import 'server-only';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { DEFAULT_THEME_ID } from '@/lib/appearance/types';

const META = 'mbeuk_appearance';

export async function readServerThemeId(userId: string): Promise<string> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return DEFAULT_THEME_ID;
  const raw = data.user.app_metadata?.[META];
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (raw && typeof raw === 'object' && typeof (raw as { themeId?: string }).themeId === 'string') {
    return (raw as { themeId: string }).themeId;
  }
  return DEFAULT_THEME_ID;
}

export async function writeServerThemeId(userId: string, themeId: string): Promise<void> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error('Compte introuvable.');
  const metadata = { ...(data.user.app_metadata ?? {}), [META]: { themeId } };
  const updated = await admin.auth.admin.updateUserById(userId, { app_metadata: metadata });
  if (updated.error) throw new Error(updated.error.message);
}
