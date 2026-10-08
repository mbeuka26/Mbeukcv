import type { SupabaseClient } from '@supabase/supabase-js';
import { readCv, type CvData } from '@/lib/cv';
import { DISCOVERY_SCORE_MIN, MAX_MATCHES_PER_OFFER } from '@/lib/jobExchange/constants';
import { discoveryTerms } from '@/lib/jobExchange/discoveryProfile';
import { scoreOffer } from '@/lib/matching';
import { offerMatchesProfile } from '@/lib/profileMatch';

export interface MatchedCandidate {
  userId: string;
  cv: CvData;
  score: number;
  note: string | null;
  discoveryEnabled: boolean;
}

function cvToMatch(cv: CvData) {
  return {
    skills: cv.skills,
    yearsExperience: cv.yearsExperience,
    location: cv.location || cv.classic?.ville || '',
  };
}

export async function matchCandidatesForOffer(
  client: SupabaseClient,
  offer: {
    title: string;
    description: string | null;
    skills: string[];
    location: string | null;
  },
): Promise<MatchedCandidate[]> {
  const { data: profiles, error } = await client
    .from('user_profiles')
    .select('id, cv_data, professional_discovery_enabled')
    .eq('professional_discovery_enabled', true)
    .limit(500);
  if (error) throw new Error(error.message);

  const matches: MatchedCandidate[] = [];
  for (const row of profiles ?? []) {
    const cv = readCv(row.cv_data);
    const terms = discoveryTerms(cv);
    if (terms.length === 0) continue;
    if (!offerMatchesProfile(terms, offer)) continue;
    const scored = scoreOffer(cvToMatch(cv), {
      skills: offer.skills,
      description: offer.description,
      location: offer.location,
    });
    if (scored.score < DISCOVERY_SCORE_MIN) continue;
    matches.push({
      userId: row.id,
      cv,
      score: scored.score,
      note: scored.note,
      discoveryEnabled: Boolean(row.professional_discovery_enabled),
    });
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, MAX_MATCHES_PER_OFFER);
}
