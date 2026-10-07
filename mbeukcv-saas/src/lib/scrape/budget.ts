import type { SupabaseClient } from '@supabase/supabase-js';
import {
  JSEARCH_MONTHLY_CAP,
  queriesForDay,
  dayInDouala,
  type MetierQuery,
} from '@/lib/scrape/rotation';

const BUDGET_URL = 'https://mbeukcv.internal/jsearch-budget';

interface BudgetState {
  month: string;
  used: number;
  day: string;
}

export interface RotationPlan {
  day: string;
  queries: MetierQuery[];
  note: string;
}

function emptyState(): BudgetState {
  return { month: '', used: 0, day: '' };
}

function readState(value: unknown): BudgetState {
  if (typeof value !== 'string' || !value.startsWith('{')) return emptyState();
  try {
    const raw = JSON.parse(value) as Partial<BudgetState>;
    return {
      month: typeof raw.month === 'string' ? raw.month : '',
      used: typeof raw.used === 'number' && Number.isFinite(raw.used) ? raw.used : 0,
      day: typeof raw.day === 'string' ? raw.day : '',
    };
  } catch {
    return emptyState();
  }
}

async function loadState(client: SupabaseClient): Promise<BudgetState> {
  const { data, error } = await client
    .from('job_offers')
    .select('description')
    .eq('url', BUDGET_URL)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return readState(data?.description);
}

async function saveState(client: SupabaseClient, state: BudgetState): Promise<void> {
  const { error } = await client.from('job_offers').upsert({
    title: 'Suivi technique de la collecte',
    company: 'MbeukCV',
    location: null,
    type: 'other',
    source: 'system',
    url: BUDGET_URL,
    description: JSON.stringify(state),
    skills: [],
    contact_email: null,
    date_posted: null,
    deadline_date: null,
    expires_at: '2099-01-01T00:00:00.000Z',
    is_active: false,
  }, { onConflict: 'url' });
  if (error) throw new Error(error.message);
}

export async function planRotation(client: SupabaseClient, now = new Date()): Promise<RotationPlan> {
  const day = dayInDouala(now);
  const month = day.slice(0, 7);
  const state = await loadState(client);
  const used = state.month === month ? state.used : 0;
  if (state.day === day) {
    return { day, queries: [], note: 'JSearch déjà lancé aujourd’hui. Les sites publics sont tout de même relus.' };
  }
  const queries = queriesForDay(day);
  if (used + queries.length > JSEARCH_MONTHLY_CAP) {
    return { day, queries: [], note: 'Plafond mensuel JSearch atteint. La collecte reprend le mois prochain.' };
  }
  return {
    day,
    queries,
    note: queries.map((item) => item.label).join(', '),
  };
}

export async function commitRotation(client: SupabaseClient, day: string, attempted: number): Promise<void> {
  if (attempted <= 0) return;
  const month = day.slice(0, 7);
  const state = await loadState(client);
  const used = state.month === month ? state.used : 0;
  await saveState(client, { month, used: used + attempted, day });
}
