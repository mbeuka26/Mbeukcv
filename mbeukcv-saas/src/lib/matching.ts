export interface MatchCv {
  skills: string[];
  yearsExperience: number | null;
  location: string;
}

export interface MatchOffer {
  skills: string[];
  description: string | null;
  location: string | null;
}

function normalize(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (key.length < 2 || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
}

export function requiredYears(description: string | null): number | null {
  if (!description) return null;
  const match = description.match(/(\d{1,2})\s*(?:ans|ann[ée]es)(?:\s+d['’]exp[ée]rience)?/i);
  if (!match) return null;
  const years = Number(match[1]);
  return years >= 0 && years <= 50 ? years : null;
}

function locationMatch(cvLocation: string, offerLocation: string | null): number {
  const left = cvLocation.trim().toLowerCase();
  const right = (offerLocation ?? '').trim().toLowerCase();
  if (left.length < 3 || right.length < 3) return 0;
  return left.includes(right) || right.includes(left) ? 1 : 0;
}

export interface ScoreResult {
  score: number;
  note: string | null;
}

export function scoreOffer(cv: MatchCv, offer: MatchOffer): ScoreResult {
  const required = normalize(offer.skills);
  const owned = new Set(normalize(cv.skills));
  let skillPart = 0;
  let note: string | null = null;
  if (required.length === 0) {
    note = 'Compétences de l’offre non indiquées.';
  } else if (owned.size === 0) {
    note = 'Ajoutez vos compétences au CV pour le volet compétences.';
  } else {
    const matched = required.filter((skill) => owned.has(skill)).length;
    skillPart = (matched / required.length) * 70;
  }

  const years = requiredYears(offer.description);
  let experience = 0;
  if (years != null && cv.yearsExperience != null && years > 0) {
    experience = Math.min(1, cv.yearsExperience / years);
  } else if (years == null) {
    note = note ?? 'Expérience exigée non indiquée.';
  }

  const location = locationMatch(cv.location, offer.location);
  const score = Math.round(skillPart + experience * 20 + location * 10);
  return { score: Math.max(0, Math.min(100, score)), note };
}
