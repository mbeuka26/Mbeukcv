import type { SupabaseClient } from '@supabase/supabase-js';
import { MAX_NOTIFICATIONS_PER_USER_DAY } from '@/lib/jobExchange/constants';

const OPPORTUNITY_TITLE = '🎯 Nouvelle opportunité correspondant à votre profil';

export async function countRecentNotifications(client: SupabaseClient, userId: string, sinceIso: string): Promise<number> {
  const { count, error } = await client
    .from('job_exchange_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', sinceIso);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function canNotifyUser(client: SupabaseClient, userId: string): Promise<boolean> {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const used = await countRecentNotifications(client, userId, dayStart.toISOString());
  return used < MAX_NOTIFICATIONS_PER_USER_DAY;
}

export async function createOpportunityNotification(
  client: SupabaseClient,
  input: {
    userId: string;
    invitationId: string;
    companyName: string;
    jobTitle: string;
    score: number;
    force?: boolean;
  },
): Promise<boolean> {
  if (!input.force && !(await canNotifyUser(client, input.userId))) return false;
  const body = `${input.companyName} — ${input.jobTitle} (score indicatif ${input.score} %).`;
  const { error } = await client.from('job_exchange_notifications').insert({
    user_id: input.userId,
    invitation_id: input.invitationId,
    kind: 'opportunity',
    title: OPPORTUNITY_TITLE,
    body,
  });
  if (error) throw new Error(error.message);
  return true;
}
