/**
 * Copie le build Vite MbeukCV Pro dans public/pro pour Next.js / Vercel.
 * Exécuté en prebuild si le bundle est absent.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const saasRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(saasRoot, '..');
const proRoot = existsSync(join(repoRoot, 'mbeukcv-pro-v2', 'package.json'))
  ? join(repoRoot, 'mbeukcv-pro-v2')
  : join(saasRoot, 'mbeukcv-pro-v2');
const dist = join(proRoot, 'dist');
const target = join(saasRoot, 'public', 'pro');
const index = join(target, 'index.html');

function ensureProDependencies() {
  const vite = join(proRoot, 'node_modules', 'vite');
  if (existsSync(vite)) return;
  console.log('sync-pro-bundle: installation des dépendances mbeukcv-pro-v2…');
  execSync('npm ci', { cwd: proRoot, stdio: 'inherit' });
}

function buildPro() {
  if (!existsSync(join(proRoot, 'package.json'))) {
    console.warn('sync-pro-bundle: mbeukcv-pro-v2 introuvable — /pro/ restera vide.');
    return false;
  }
  ensureProDependencies();
  console.log('sync-pro-bundle: construction MbeukCV Pro…');
  execSync('npm run build', {
    cwd: proRoot,
    stdio: 'inherit',
    env: { ...process.env, VITE_BASE: '/pro/' },
  });
  return existsSync(join(dist, 'index.html'));
}

if (!existsSync(index)) {
  if (!existsSync(join(dist, 'index.html'))) {
    if (!buildPro()) process.exit(1);
  }
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  cpSync(dist, target, { recursive: true });
  console.log('sync-pro-bundle: copié vers public/pro');
} else {
  console.log('sync-pro-bundle: public/pro déjà présent');
}
