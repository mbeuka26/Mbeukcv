import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = readFileSync(path.join(root, 'contracts', 'jobSources.ts'), 'utf8');
const jsearch = readFileSync(path.join(root, 'supabase', 'functions', '_shared', 'jsearch.ts'), 'utf8');

const hosts = [
  'jobs.doopinet.com',
  'emploi.cm',
  'jobinfocamer.com',
  'cameroundesk.com',
  'minajobs.net',
  'africawork.com',
  'emploidakar.com',
  'senjob.com',
  'emploi.sn',
  'emploi.ci',
  'novojob.ci',
  'malijob.net',
  'emploi.ml',
  'burkinaemploi.net',
  'emploi.bf',
  'emploi.bj',
  'jobbenin.com',
  'emploitogo.info',
  'emploiguinee.com',
  'jobguinee.com',
  'nigeremploi.net',
  'anpe.ne',
  'emploi.cd',
  'jobrdc.com',
  'mediacongo.net',
  'emploi.cg',
  'emploi.ga',
  'jobgabon.com',
  'tchadcarriere.com',
];

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

for (const host of hosts) {
  assert(catalog.includes(host), `source absente : ${host}`);
}
assert(!catalog.includes('linkedin.com'), 'LinkedIn ne doit pas être scrapé');
assert(!catalog.includes('indeed.com'), 'Indeed ne doit pas être scrapé');
assert(jsearch.includes('jsearch.p.rapidapi.com'), 'hôte JSearch manquant');
assert(jsearch.includes('num_pages'), 'pagination JSearch manquante');

console.log('catalogue des sources : ok');
