/**
 * Barrière locale avant déploiement.
 * Signale les noms de fichiers et les règles. N’imprime jamais une valeur secrète.
 */
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === '.git') continue;
    const path = join(dir, name);
    const info = statSync(path);
    if (info.isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

function rel(path) {
  return relative(root, path).replaceAll('\\', '/');
}

function isClientSurface(file, text) {
  const path = rel(file);
  if (path.startsWith('src/app/api/')) return false;
  if (path === 'src/middleware.ts') return true;
  if (path.startsWith('src/components/') || path.startsWith('src/mbeuk-gate/')) return true;
  return text.includes("'use client'") || text.includes('"use client"');
}

const CLIENT_FORBIDDEN = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'MBEUK_HUB_API_KEY',
  'MBEUK_AUTH_BRIDGE_SECRET',
  'MBEUK_SERVICE_ROLE_KEY',
  'RAPIDAPI_KEY',
  'ANTHROPIC_API_KEY',
  'BREVO_API_KEY',
  'CREDIT_GRANT_SECRET',
  'ENCRYPTION_KEY',
  'CRON_SECRET',
  'whsec_',
];

const LIVE_SECRET = [
  /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
  /sk-ant-api\d{2}-[A-Za-z0-9_-]{16,}/,
  /whsec_[A-Za-z0-9]{16,}/,
  /NEXT_PUBLIC_[A-Z0-9_]*(?:SERVICE_ROLE|HUB_API_KEY|BRIDGE|RAPIDAPI|ANTHROPIC|BREVO|CREDIT_GRANT|ENCRYPTION|CRON_SECRET)/,
];

function scanTree(dir) {
  const files = walk(join(root, dir)).filter((file) => /\.(ts|tsx|js|jsx|mjs|css|json|html|sql|md|example|toml)$/.test(file));
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const path = rel(file);
    for (const pattern of LIVE_SECRET) {
      if (pattern.test(text)) fail(`secret ou préfixe interdit dans ${path}`);
    }
    if (!path.startsWith('src/')) continue;
    if (!isClientSurface(file, text)) continue;
    for (const token of CLIENT_FORBIDDEN) {
      if (text.includes(token)) fail(`clé serveur visible côté client (${token}) dans ${path}`);
    }
  }
}

function mustInclude(file, needles) {
  const text = readFileSync(join(root, file), 'utf8');
  for (const needle of needles) {
    if (!text.includes(needle)) fail(`${file} ne contient pas « ${needle} »`);
  }
}

function audit() {
  let raw = '';
  try {
    raw = execSync('npm audit --omit=dev --json', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    raw = `${error.stdout || ''}\n${error.stderr || ''}`;
  }
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < start) {
    fail('npm audit n’a pas renvoyé de rapport');
    return;
  }
  const report = JSON.parse(raw.slice(start, end + 1));
  const baseline = JSON.parse(readFileSync(join(root, 'scripts/ci/audit-baseline.json'), 'utf8'));
  const allowed = new Set(baseline.allow);
  for (const vuln of Object.values(report.vulnerabilities || {})) {
    const vias = Array.isArray(vuln.via) ? vuln.via : [];
    for (const via of vias) {
      if (!via || typeof via !== 'object') continue;
      if (via.severity !== 'high' && via.severity !== 'critical') continue;
      if (allowed.has(via.source)) {
        notes.push(`connu, non bloquant tant que le correctif exige une autre version majeure : ${via.title}`);
        continue;
      }
      fail(`dépendance ${via.severity} hors liste connue : ${via.title}`);
    }
  }
}

scanTree('src');
scanTree('public');
mustInclude('supabase/schema.sql', [
  'alter table public.job_offers enable row level security',
  'alter table public.user_profiles enable row level security',
  'alter table public.applications enable row level security',
  'id = auth.uid()',
  'user_id = auth.uid()',
]);
mustInclude('src/lib/cron.ts', ['if (!secret) return false']);
mustInclude('src/app/api/credits/grant/route.ts', ['timingSafeEqual']);
mustInclude('src/lib/supabase/admin.ts', ["import 'server-only'"]);
mustInclude('next.config.mjs', [
  'poweredByHeader: false',
  'X-Content-Type-Options',
  'X-Frame-Options',
  'Referrer-Policy',
]);
mustInclude('.gitignore', ['.env.local', '.env']);

const trackedEnv = ['.env', '.env.local', '.env.production'];
for (const name of trackedEnv) {
  try {
    const text = readFileSync(join(root, name), 'utf8');
    if (text.length > 0) notes.push(`${name} existe sur cette machine et ne doit pas être commité`);
  } catch {
    // absent : attendu dans le clone CI
  }
}

audit();

for (const note of notes) console.log(`NOTE — ${note}`);
if (failures.length) {
  for (const message of failures) console.error(`BLOQUÉ — ${message}`);
  console.error(`BLOQUÉ — ${failures.length} contrôle(s) de sécurité en échec. Déploiement arrêté.`);
  process.exit(1);
}
console.log('OK — barrière de sécurité locale passée');
