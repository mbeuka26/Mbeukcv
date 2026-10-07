/**
 * Écrit un fichier temporaire KEY=valeur pour supabase secrets set.
 * Le chemin est le seul texte renvoyé. Le fichier ne doit pas être commité.
 */
import { chmodSync, writeFileSync } from 'node:fs';
import { optionalSecrets, readSecret, requiredSecrets } from './secrets-policy.mjs';

const target = process.argv[2];
if (!target) {
  console.error('BLOQUÉ — chemin du fichier de secrets manquant.');
  process.exit(1);
}

const lines = [];
for (const entry of [...requiredSecrets, ...optionalSecrets]) {
  if (!entry.targets.includes('supabase')) continue;
  const value = readSecret(entry.name);
  if (!value) continue;
  if (/[\r\n]/.test(value)) {
    console.error(`BLOQUÉ — valeur sur plusieurs lignes refusée : ${entry.name}`);
    process.exit(1);
  }
  const name = entry.supabaseName || entry.name;
  if (name.startsWith('SUPABASE_')) {
    console.error(`BLOQUÉ — secret Supabase interdit avec le préfixe SUPABASE_ : ${name}`);
    process.exit(1);
  }
  lines.push(`${name}=${value}`);
  console.log(`OK — secret Edge préparé : ${name}`);
}

const appUrl = readSecret('PRODUCTION_APP_URL');
if (appUrl) {
  lines.push(`APP_URL=${appUrl}`);
  console.log('OK — secret Edge préparé : APP_URL');
} else if (readSecret('MBEUK_ENVIRONMENT') === 'production') {
  lines.push('APP_URL=https://cvpro-swart.vercel.app');
  console.log('OK — secret Edge préparé : APP_URL (alias production par défaut)');
}

writeFileSync(target, `${lines.join('\n')}\n`, { mode: 0o600 });
chmodSync(target, 0o600);
