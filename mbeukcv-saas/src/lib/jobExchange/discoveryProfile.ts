import type { CvData } from '@/lib/cv';
import { profileTerms } from '@/lib/profileMatch';

export interface DiscoveryProfile {
  candidateId: string;
  jobTitle: string;
  skills: string[];
  experienceSummary: string;
  summary: string;
  generalLocation: string;
  matchScore: number;
  matchJustification: string | null;
}

function generalLocation(location: string): string {
  const trimmed = location.trim();
  if (!trimmed) return 'Non indiquée';
  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 2) return parts.join(', ');
  return parts.slice(-2).join(', ');
}

export function buildDiscoveryProfile(input: {
  userId: string;
  cv: CvData;
  matchScore: number;
  matchNote: string | null;
}): DiscoveryProfile {
  const title = input.cv.title || input.cv.classic?.titrePoste || 'Profil';
  const roles = input.cv.experiences.slice(0, 4).map((e) => `${e.role} (${e.company})`.trim()).filter(Boolean);
  return {
    candidateId: input.userId,
    jobTitle: title,
    skills: input.cv.skills.slice(0, 24),
    experienceSummary: roles.join(' · ') || 'Non renseignée',
    summary: input.cv.summary.trim().slice(0, 600) || 'Non renseigné',
    generalLocation: generalLocation(input.cv.location || input.cv.classic?.ville || ''),
    matchScore: input.matchScore,
    matchJustification: input.matchNote,
  };
}

export function discoveryTerms(cv: CvData): string[] {
  return profileTerms({
    title: cv.title || cv.classic?.titrePoste || '',
    skills: cv.skills,
    roles: cv.experiences.map((item) => item.role),
    diplomas: cv.education.map((item) => item.diploma),
  });
}
