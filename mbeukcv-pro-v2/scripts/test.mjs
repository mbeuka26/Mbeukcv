import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runNode(script) {
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', '--import', './scripts/register-alias.mjs', script],
    { cwd: project, stdio: 'inherit' }
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

runNode('scripts/check-sanitize.ts');
runNode('scripts/check-classic-sections.ts');
runNode('scripts/check-documents.ts');
runNode('scripts/check-recovery.ts');
runNode('scripts/check-collect-crypto.ts');

const grants = spawnSync(process.execPath, ['scripts/check-schema-grants.mjs'], { cwd: project, stdio: 'inherit' });
if (grants.status !== 0) process.exit(grants.status ?? 1);

const sources = spawnSync(process.execPath, ['scripts/check-job-sources.mjs'], { cwd: project, stdio: 'inherit' });
if (sources.status !== 0) process.exit(sources.status ?? 1);

const databaseUrl = process.env.MBEUK_TEST_DATABASE_URL;
if (!databaseUrl) {
  console.log('privilèges live : non exécutés (MBEUK_TEST_DATABASE_URL absent)');
  process.exit(0);
}

const live = spawnSync(
  'psql',
  [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-f', 'supabase/tests/check-revokes.sql'],
  { cwd: project, stdio: 'inherit' }
);
if (live.error) {
  console.error('psql introuvable. Le contrôle live des privilèges n’a pas tourné.');
  process.exit(1);
}
if (live.status !== 0) process.exit(live.status ?? 1);
console.log('privilèges live : ok');
