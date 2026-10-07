import 'server-only';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { claudeKeyForUser, claudeKeyStatus } from '@/lib/userClaude';
import {
  bagNeedsSave,
  balances,
  consumeBag,
  CREDIT_PACKS,
  grantBag,
  packById,
  parseBag,
  refundBag,
  type CreditBag,
  type CreditKind,
  type CreditPack,
} from '@/lib/creditBag';

const META = 'mbeuk_credits';

export function contactEmail(): string {
  return process.env.CONTACT_EMAIL?.trim() || process.env.BREVO_FROM_EMAIL?.trim() || '';
}

export function dayDouala(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Douala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function onlinePackIds(): string[] {
  return CREDIT_PACKS.filter((pack) => Boolean(productIdFor(pack))).map((pack) => pack.id);
}

export function productIdFor(pack: CreditPack): string {
  const key = `MBEUK_HUB_PRODUCT_${pack.id.replace(/-/g, '_').toUpperCase()}`;
  return process.env[key]?.trim() ?? '';
}

async function readStoredBag(userId: string): Promise<{ bag: CreditBag; userEmail: string }> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error('Compte introuvable.');
  const stored = data.user.app_metadata?.[META];
  const bag = parseBag(stored, dayDouala());
  if (bagNeedsSave(stored, bag)) await writeBag(userId, bag);
  return { bag, userEmail: data.user.email ?? '' };
}

async function writeBag(userId: string, bag: CreditBag): Promise<void> {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error('Compte introuvable.');
  const metadata = { ...(data.user.app_metadata ?? {}), [META]: bag };
  const updated = await admin.auth.admin.updateUserById(userId, { app_metadata: metadata });
  if (updated.error) throw new Error(updated.error.message);
}

export async function readCreditBalances(userId: string) {
  const { bag } = await readStoredBag(userId);
  return balances(bag);
}

async function consume(userId: string, kind: CreditKind): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { bag } = await readStoredBag(userId);
  const result = consumeBag(bag, kind);
  if (!result.ok) return result;
  await writeBag(userId, result.bag);
  return { ok: true };
}

export async function refundCredit(userId: string, kind: CreditKind): Promise<void> {
  const { bag } = await readStoredBag(userId);
  await writeBag(userId, refundBag(bag, kind));
}

export async function grantPackToUser(userId: string, packId: string, saleId: string): Promise<{ applied: boolean; pack: CreditPack }> {
  const pack = packById(packId);
  if (!pack) throw new Error('Forfait inconnu.');
  const cleanSale = saleId.trim();
  if (cleanSale.length < 8 || cleanSale.length > 120) throw new Error('Référence de paiement invalide.');
  const { bag } = await readStoredBag(userId);
  const granted = grantBag(bag, pack, cleanSale);
  if (granted.applied) await writeBag(userId, granted.bag);
  return { applied: granted.applied, pack };
}

export async function takeClaudeCredit(userId: string): Promise<
  { key: string; refund: () => Promise<void> } | { error: string; status: number }
> {
  const own = await claudeKeyStatus(userId);
  const key = await claudeKeyForUser(userId);
  if (!key) {
    return { error: 'Aucune clé Claude n’est disponible. Enregistrez la vôtre dans Paramètres, ou utilisez Claude.ai.', status: 503 };
  }
  if (own) return { key, refund: async () => {} };
  const taken = await consume(userId, 'claude');
  if (!taken.ok) return { error: taken.reason, status: 402 };
  return { key, refund: () => refundCredit(userId, 'claude') };
}

export async function takeRapidCredit(userId: string, ownKey: boolean): Promise<
  { refund: () => Promise<void> } | { error: string; status: number }
> {
  if (ownKey) return { refund: async () => {} };
  const taken = await consume(userId, 'rapidapi');
  if (!taken.ok) return { error: taken.reason, status: 402 };
  return { refund: () => refundCredit(userId, 'rapidapi') };
}
