import 'server-only';
import { decryptSecret, encryptSecret } from '@/lib/crypto';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

const META = 'mbeuk_claude';

export async function claudeKeyStatus(userId: string): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.auth.admin.getUserById(userId);
  return typeof data.user?.app_metadata?.[META] === 'string';
}

export async function claudeKeyForUser(userId: string): Promise<string> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.auth.admin.getUserById(userId);
  const stored = data.user?.app_metadata?.[META];
  if (typeof stored === 'string' && stored.startsWith('v1:')) {
    try {
      return decryptSecret(stored);
    } catch {
      return process.env.ANTHROPIC_API_KEY?.trim() ?? '';
    }
  }
  return process.env.ANTHROPIC_API_KEY?.trim() ?? '';
}

export async function saveClaudeKey(userId: string, plain: string): Promise<void> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error('Compte introuvable.');
  const metadata = { ...(data.user.app_metadata ?? {}) };
  if (!plain.trim()) delete metadata[META];
  else metadata[META] = encryptSecret(plain.trim());
  const updated = await admin.auth.admin.updateUserById(userId, { app_metadata: metadata });
  if (updated.error) throw new Error(updated.error.message);
}
