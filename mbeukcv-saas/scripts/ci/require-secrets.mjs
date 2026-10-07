/**
 * Vérifie les secrets injectés par GitHub Actions.
 * Affiche uniquement le nom et le motif d’échec, jamais la valeur.
 */
import { checkSecret, optionalSecrets, requiredSecrets } from './secrets-policy.mjs';

const results = [
  ...requiredSecrets.map((entry) => checkSecret(entry, { required: true })),
  ...optionalSecrets.map((entry) => checkSecret(entry, { required: false })),
];

for (const result of results) {
  const line = result.ok ? `OK — ${result.message}` : `BLOQUÉ — ${result.message}`;
  if (result.ok) console.log(line);
  else console.error(line);
}

const blocked = results.filter((result) => !result.ok);
if (blocked.length) {
  console.error(`BLOQUÉ — ${blocked.length} secret(s) manquant(s) ou invalide(s). Déploiement arrêté.`);
  process.exit(1);
}
console.log('OK — secrets requis présents');
