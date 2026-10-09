import type { CvData } from '@/lib/cv';

export function talentIdForUser(userId: string) {
  const hex = userId.replace(/-/g, '').toUpperCase();
  if (!/^[0-9A-F]{32}$/.test(hex)) return '';
  return `CVP-${hex}`;
}

export function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { givenName: parts[0] || '', familyName: '' };
  return { givenName: parts[0], familyName: parts.slice(1).join(' ') };
}

export function publicTalent(cv: CvData) {
  const years = typeof cv.yearsExperience === 'number' ? `${cv.yearsExperience} ans` : '';
  return {
    occupation: cv.title.trim(),
    summary: cv.summary.trim(),
    skills: cv.skills,
    experience: years,
    location: cv.location.trim(),
    discover: true,
  };
}
