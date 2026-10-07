import { decideRetention, graceCutoff, parseDeadline } from '../src/lib/offers/rules.ts';
import { scoreOffer } from '../src/lib/matching.ts';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const now = new Date('2026-09-27T06:00:00.000Z');

const future = decideRetention({
  description: 'Merci de postuler. Date limite 30 Sept 2026.',
  datePosted: '2026-09-01',
  now,
});
assert(future.store, 'offre avec limite future conservée');
assert(future.deadlineDate === '2026-09-30', 'date limite extraite');

const past = decideRetention({
  description: 'Date limite 01 janv 2020.',
  datePosted: '2020-01-01',
  now,
});
assert(!past.store, 'offre échue refusée');

const aged = decideRetention({
  description: 'Poste ouvert sans date limite.',
  datePosted: '2020-01-01',
  now,
});
assert(!aged.store, 'offre de plus de 30 jours refusée');

const fresh = decideRetention({
  description: 'Poste ouvert sans date limite.',
  datePosted: '2026-09-20',
  now,
});
assert(fresh.store, 'offre récente conservée');
assert(fresh.deadlineDate === null, 'pas de date limite inventée');

const numeric = parseDeadline('Clôture des candidatures : 15/10/2026');
assert(numeric?.day === 15 && numeric.monthIndex === 9 && numeric.year === 2026, 'date numérique');

const unrelated = parseDeadline('Créée le 01/01/2020. Poste à pourvoir.');
assert(unrelated === null, 'une date hors contexte n’est pas une limite');

const cutoff = new Date(graceCutoff(now));
assert(now.getTime() - cutoff.getTime() === 2 * 24 * 60 * 60 * 1000, 'délai de grâce de 2 jours');

const partial = scoreOffer(
  { skills: ['gestion'], yearsExperience: 4, location: 'Douala' },
  { skills: ['gestion', 'sql'], description: '3 ans d’expérience à Douala', location: 'Douala' },
);
assert(partial.score === 65, `score attendu 65, reçu ${partial.score}`);

const unknownSkills = scoreOffer(
  { skills: ['gestion'], yearsExperience: null, location: '' },
  { skills: [], description: 'Description sans compétence.', location: 'Yaoundé' },
);
assert(unknownSkills.score === 0, 'sans compétence d’offre ni expérience chiffrée, le score reste à 0');

console.log('règles d’offres : ok');
