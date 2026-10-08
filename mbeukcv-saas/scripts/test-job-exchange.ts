import { createHmac } from 'node:crypto';
import assert from 'node:assert/strict';
import { normalizeOfferSource } from '../src/lib/jobExchange/sources.ts';
import { scoreOffer } from '../src/lib/matching.ts';
import { offerMatchesProfile, profileTerms } from '../src/lib/profileMatch.ts';

assert.equal(normalizeOfferSource('jsearch'), 'RAPIDAPI');
assert.equal(normalizeOfferSource('INTERNAL_MBEUKRH'), 'INTERNAL_MBEUKRH');
assert.equal(normalizeOfferSource('emploi_cm'), 'SCRAPING');

const terms = profileTerms({
  title: 'Ingénieur process',
  skills: ['AutoCAD', 'P&ID'],
  roles: ['Ingénieur projets'],
  diplomas: [],
});
assert.ok(terms.length > 0);
assert.ok(
  offerMatchesProfile(terms, {
    title: 'Ingénieur process — P&ID',
    description: 'AutoCAD requis',
    skills: ['AutoCAD'],
  }),
);

const scored = scoreOffer(
  { skills: ['AutoCAD', 'P&ID'], yearsExperience: 5, location: 'Douala' },
  { skills: ['AutoCAD'], description: '5 ans d’expérience', location: 'Douala' },
);
assert.ok(scored.score >= 50);

const body = JSON.stringify({ action: 'upsert', externalRef: 'JX-1', title: 'T', company: 'C' });
const sig = createHmac('sha256', 'test-secret').update(body).digest('hex');
assert.ok(sig.length === 64);

console.log('test-job-exchange: OK');
