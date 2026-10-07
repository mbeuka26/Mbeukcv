/**
 * Clés de collecte : AES-GCM, pas de clair, mauvais secret refusé.
 * Usage : node --experimental-strip-types scripts/check-collect-crypto.ts
 */
import { openCollectSecretWithKey, sealCollectSecretWithKey } from '../supabase/functions/_shared/collectCrypto.ts';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const plain = 'jsearch-user-secret-0123456789';
const key = 'collect-key-material-32chars';
const sealed = await sealCollectSecretWithKey(plain, key, 1_000);
assert(sealed.startsWith('v1:'), 'préfixe absent');
assert(!sealed.includes(plain), 'secret en clair');
assert(await openCollectSecretWithKey(sealed, key, 1_000) === plain, 'déchiffrement incorrect');

let rejected = false;
try {
  await openCollectSecretWithKey(sealed, 'autre-cle-materielle-32', 1_000);
} catch {
  rejected = true;
}
assert(rejected, 'mauvaise clé acceptée');
assert(await openCollectSecretWithKey(plain, key, 1_000).then(() => false, () => true), 'clair traité comme chiffré');

console.log('collect crypto : ok');
