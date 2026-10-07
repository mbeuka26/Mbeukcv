import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = readFileSync(path.join(root, 'supabase', 'schema.sql'), 'utf8');

const adminFunctions = [
  'public.consommer_credit_ia(text)',
  'public.restituer_credit_ia(text)',
  'public.reserver_envoi_email(text)',
  'public.liberer_envoi_email(text)',
];

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

assert(schema.includes('drop function if exists public.verifier_licence(text, text)'), 'ancienne surcharge retirée');

for (const fn of [...adminFunctions, 'public.verifier_licence(text)']) {
  assert(schema.includes(`revoke all on function ${fn} from public`), `REVOKE PUBLIC manquant : ${fn}`);
}

for (const fn of adminFunctions) {
  assert(schema.includes(`revoke all on function ${fn} from anon`), `REVOKE anon manquant : ${fn}`);
  assert(schema.includes(`revoke all on function ${fn} from authenticated`), `REVOKE authenticated manquant : ${fn}`);
  assert(!schema.includes(`grant execute on function ${fn} to anon`), `GRANT anon interdit : ${fn}`);
  assert(!schema.includes(`grant execute on function ${fn} to authenticated`), `GRANT authenticated interdit : ${fn}`);
  assert(schema.includes(`grant execute on function ${fn} to service_role`), `GRANT service_role manquant : ${fn}`);
}

assert(schema.includes('revoke all on function public.verifier_licence(text) from anon'), 'verifier_licence retiré à anon');
assert(schema.includes('grant execute on function public.verifier_licence(text) to authenticated'), 'verifier_licence accordé à authenticated');
assert(schema.includes('grant execute on function public.verifier_licence(text) to service_role'), 'verifier_licence accordé à service_role');
assert(schema.includes('revoke all on table public.cles_collecte from public'), 'REVOKE PUBLIC manquant : cles_collecte');
assert(schema.includes('revoke all on table public.cles_collecte from anon'), 'REVOKE anon manquant : cles_collecte');
assert(schema.includes('revoke all on table public.cles_collecte from authenticated'), 'REVOKE authenticated manquant : cles_collecte');
assert(schema.includes('grant select, insert, update, delete on table public.cles_collecte to service_role'), 'GRANT service_role manquant : cles_collecte');

console.log('révocations du schéma : ok (contrôle du fichier, pas d’une base live)');
