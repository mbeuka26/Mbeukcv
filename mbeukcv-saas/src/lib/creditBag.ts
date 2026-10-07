export type CreditKind = 'claude' | 'rapidapi';
export type Pool = 'free' | 'bought';

export const FREE_YEARLY = { claude: 2, rapidapi: 2 } as const;
export const DAILY_CAP = { claude: 3, rapidapi: 2 } as const;
const PREVIOUS_FREE = { claude: 8, rapidapi: 6 } as const;

export const ORANGE_MONEY = '691465788';
export const MOBILE_MONEY = '676571765';
export const WHATSAPP_E164 = '237676571765';

export interface CreditPack {
  id: string;
  kind: CreditKind;
  credits: number;
  priceFcfa: number;
  label: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: 'claude-10', kind: 'claude', credits: 10, priceFcfa: 1500, label: '10 actions Claude' },
  { id: 'claude-30', kind: 'claude', credits: 30, priceFcfa: 4000, label: '30 actions Claude' },
  { id: 'claude-80', kind: 'claude', credits: 80, priceFcfa: 9000, label: '80 actions Claude' },
];

export function packById(id: string): CreditPack | null {
  return CREDIT_PACKS.find((pack) => pack.id === id) ?? null;
}

export function formatFcfa(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`;
}

export function whatsAppReceiptUrl(email: string, pack?: CreditPack): string {
  const lines = [
    'Bonjour, je viens de payer un forfait MbeukCV.',
    pack ? `Forfait : ${pack.label}, ${formatFcfa(pack.priceFcfa)}.` : 'Je précise le forfait choisi.',
    `E-mail du compte : ${email.trim() || 'à préciser'}.`,
    'J’envoie le reçu ou la capture du paiement pour activer le forfait.',
  ];
  return `https://wa.me/${WHATSAPP_E164}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export interface CreditBag {
  quota: 'year';
  freeAnchor: string;
  day: string;
  claudeFreeUsed: number;
  rapidapiFreeUsed: number;
  claudeBought: number;
  rapidapiBought: number;
  claudeDayUsed: number;
  rapidapiDayUsed: number;
  lastClaude: Pool | null;
  lastRapid: Pool | null;
  appliedSales: string[];
}

export function plusDays(iso: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dueForYearlyFree(anchor: string, today: string): boolean {
  return plusDays(anchor, 365) <= today;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function emptyBag(day: string): CreditBag {
  return {
    quota: 'year',
    freeAnchor: day,
    day,
    claudeFreeUsed: 0,
    rapidapiFreeUsed: 0,
    claudeBought: 0,
    rapidapiBought: 0,
    claudeDayUsed: 0,
    rapidapiDayUsed: 0,
    lastClaude: null,
    lastRapid: null,
    appliedSales: [],
  };
}

function capFreeUsed(previousAllowance: number, previousUsed: number): number {
  const previousLeft = Math.max(0, previousAllowance - previousUsed);
  const left = Math.min(FREE_YEARLY.claude, previousLeft);
  return FREE_YEARLY.claude - left;
}

function capRapidUsed(previousAllowance: number, previousUsed: number): number {
  const previousLeft = Math.max(0, previousAllowance - previousUsed);
  const left = Math.min(FREE_YEARLY.rapidapi, previousLeft);
  return FREE_YEARLY.rapidapi - left;
}

export function parseBag(value: unknown, today: string): CreditBag {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const base = emptyBag(today);
  const sameDay = raw.day === today;
  const bought = {
    claudeBought: Math.max(0, numberOr(raw.claudeBought, 0)),
    rapidapiBought: Math.max(0, numberOr(raw.rapidapiBought, 0)),
  };
  const dayUse = {
    claudeDayUsed: sameDay ? numberOr(raw.claudeDayUsed, numberOr(raw.claudeUsed, 0)) : 0,
    rapidapiDayUsed: sameDay ? numberOr(raw.rapidapiDayUsed, numberOr(raw.rapidapiUsed, 0)) : 0,
  };
  const trail = {
    lastClaude: raw.lastClaude === 'free' || raw.lastClaude === 'bought' ? raw.lastClaude : null,
    lastRapid: raw.lastRapid === 'free' || raw.lastRapid === 'bought' ? raw.lastRapid : null,
    appliedSales: Array.isArray(raw.appliedSales) ? raw.appliedSales.filter((item) => typeof item === 'string').slice(-40) : [],
  } as const;

  if (raw.quota === 'year' && typeof raw.freeAnchor === 'string') {
    const renew = dueForYearlyFree(raw.freeAnchor, today);
    return {
      ...base,
      ...bought,
      ...dayUse,
      ...trail,
      freeAnchor: renew ? today : raw.freeAnchor,
      claudeFreeUsed: renew ? 0 : numberOr(raw.claudeFreeUsed, 0),
      rapidapiFreeUsed: renew ? 0 : numberOr(raw.rapidapiFreeUsed, 0),
    };
  }

  if (typeof raw.month === 'string') {
    return {
      ...base,
      ...bought,
      ...dayUse,
      ...trail,
      freeAnchor: typeof raw.day === 'string' ? raw.day : today,
      claudeFreeUsed: capFreeUsed(PREVIOUS_FREE.claude, numberOr(raw.claudeFreeUsed, 0)),
      rapidapiFreeUsed: capRapidUsed(PREVIOUS_FREE.rapidapi, numberOr(raw.rapidapiFreeUsed, 0)),
    };
  }

  const legacyClaude = numberOr(raw.claude, FREE_YEARLY.claude);
  const legacyRapid = numberOr(raw.rapidapi, FREE_YEARLY.rapidapi);
  return {
    ...base,
    ...dayUse,
    ...trail,
    claudeBought: Math.max(0, legacyClaude - PREVIOUS_FREE.claude),
    rapidapiBought: Math.max(0, legacyRapid - PREVIOUS_FREE.rapidapi),
    claudeFreeUsed: capFreeUsed(PREVIOUS_FREE.claude, Math.max(0, PREVIOUS_FREE.claude - legacyClaude)),
    rapidapiFreeUsed: capRapidUsed(PREVIOUS_FREE.rapidapi, Math.max(0, PREVIOUS_FREE.rapidapi - legacyRapid)),
  };
}

export function bagNeedsSave(stored: unknown, bag: CreditBag): boolean {
  if (!stored || typeof stored !== 'object') return true;
  const raw = stored as Record<string, unknown>;
  return raw.quota !== 'year'
    || raw.freeAnchor !== bag.freeAnchor
    || raw.claudeFreeUsed !== bag.claudeFreeUsed
    || raw.rapidapiFreeUsed !== bag.rapidapiFreeUsed;
}

export function balances(bag: CreditBag): {
  claude: number;
  rapidapi: number;
  claudeFree: number;
  rapidapiFree: number;
  claudeBought: number;
  rapidapiBought: number;
} {
  const claudeFree = Math.max(0, FREE_YEARLY.claude - bag.claudeFreeUsed);
  const rapidapiFree = Math.max(0, FREE_YEARLY.rapidapi - bag.rapidapiFreeUsed);
  return {
    claudeFree,
    rapidapiFree,
    claudeBought: bag.claudeBought,
    rapidapiBought: bag.rapidapiBought,
    claude: claudeFree + bag.claudeBought,
    rapidapi: rapidapiFree + bag.rapidapiBought,
  };
}

function refused(kind: CreditKind, reason: 'day' | 'empty'): string {
  if (kind === 'claude' && reason === 'day') {
    return 'Plafond du jour atteint pour Claude : 3 actions. Le plafond du jour revient demain, heure de Douala. Le quota gratuit, lui, ne revient qu’au bout d’un an.';
  }
  if (kind === 'claude') {
    return 'Quota Claude épuisé. Le gratuit ne revient qu’un an après l’ouverture du compte. Achetez un forfait, ou envoyez le reçu pour un rechargement.';
  }
  if (reason === 'day') {
    return 'Plafond du jour atteint pour RapidAPI : 2 recherches. Le plafond du jour revient demain, heure de Douala. Le quota gratuit, lui, ne revient qu’au bout d’un an.';
  }
  return 'Quota RapidAPI épuisé. Le gratuit ne revient qu’un an après l’ouverture du compte. Achetez un forfait, ou envoyez le reçu pour un rechargement.';
}

export function consumeBag(bag: CreditBag, kind: CreditKind): { ok: true; bag: CreditBag } | { ok: false; reason: string } {
  const dayUsed = kind === 'claude' ? bag.claudeDayUsed : bag.rapidapiDayUsed;
  if (dayUsed >= DAILY_CAP[kind]) return { ok: false, reason: refused(kind, 'day') };
  const left = balances(bag);
  const free = kind === 'claude' ? left.claudeFree : left.rapidapiFree;
  const bought = kind === 'claude' ? left.claudeBought : left.rapidapiBought;
  if (free + bought <= 0) return { ok: false, reason: refused(kind, 'empty') };
  const next: CreditBag = { ...bag, appliedSales: bag.appliedSales };
  const pool: Pool = free > 0 ? 'free' : 'bought';
  if (kind === 'claude') {
    if (pool === 'free') next.claudeFreeUsed += 1;
    else next.claudeBought -= 1;
    next.claudeDayUsed += 1;
    next.lastClaude = pool;
  } else {
    if (pool === 'free') next.rapidapiFreeUsed += 1;
    else next.rapidapiBought -= 1;
    next.rapidapiDayUsed += 1;
    next.lastRapid = pool;
  }
  return { ok: true, bag: next };
}

export function refundBag(bag: CreditBag, kind: CreditKind): CreditBag {
  const next: CreditBag = { ...bag, appliedSales: bag.appliedSales };
  const pool = kind === 'claude' ? bag.lastClaude : bag.lastRapid;
  if (kind === 'claude') {
    if (pool === 'bought') next.claudeBought += 1;
    else next.claudeFreeUsed = Math.max(0, next.claudeFreeUsed - 1);
    next.claudeDayUsed = Math.max(0, next.claudeDayUsed - 1);
    next.lastClaude = null;
  } else {
    if (pool === 'bought') next.rapidapiBought += 1;
    else next.rapidapiFreeUsed = Math.max(0, next.rapidapiFreeUsed - 1);
    next.rapidapiDayUsed = Math.max(0, next.rapidapiDayUsed - 1);
    next.lastRapid = null;
  }
  return next;
}

export function grantBag(bag: CreditBag, pack: CreditPack, saleId: string): { bag: CreditBag; applied: boolean } {
  if (bag.appliedSales.includes(saleId)) return { bag, applied: false };
  const next: CreditBag = { ...bag, appliedSales: [...bag.appliedSales, saleId].slice(-40) };
  if (pack.kind === 'claude') next.claudeBought += pack.credits;
  else next.rapidapiBought += pack.credits;
  return { bag: next, applied: true };
}
