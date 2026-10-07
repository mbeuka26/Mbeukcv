/**
 * Corrige les réglages Vercel tirés par `vercel pull` avant `vercel build`.
 * Un Output Directory à `public` casse Next.js : seuls les fichiers statiques partent en prod.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const path = join(process.cwd(), '.vercel', 'project.json');
let data;
try {
  data = JSON.parse(readFileSync(path, 'utf8'));
} catch {
  console.error('BLOQUÉ — .vercel/project.json introuvable. Lancez vercel pull avant.');
  process.exit(1);
}

data.settings = data.settings || {};
const before = data.settings.outputDirectory ?? '(vide)';
data.settings.framework = 'nextjs';
data.settings.buildCommand = data.settings.buildCommand || 'npm run build';
data.settings.installCommand = data.settings.installCommand || 'npm ci';
if (data.settings.outputDirectory === 'public' || data.settings.outputDirectory === './public') {
  delete data.settings.outputDirectory;
}

writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
console.log(`OK — réglages Vercel normalisés (framework nextjs, outputDirectory ${before} → défaut Next)`);
