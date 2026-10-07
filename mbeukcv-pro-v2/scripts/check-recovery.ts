/**
 * Recovery : chiffrement, intégrité, corruption, double copie.
 * Usage : node --experimental-strip-types scripts/check-recovery.ts
 */
import { RecoveryError } from '../src/services/recoveryCrypto.ts';
import {
  RECOVERY_CURRENT,
  RECOVERY_PREVIOUS,
  RECOVERY_TMP,
  commitRecoveryText,
  createMemoryRecoveryFs,
  readBestRecovery,
} from '../src/services/recoveryDirectory.ts';
import { packRecoveryExport, unpackRecoveryExport } from '../src/services/recoveryExchange.ts';
import { assessRestore, decodeRecovery, encodeRecovery, type RecoveryPlaintext } from '../src/services/recoveryFormat.ts';
import { driveSyncPlan } from '../src/services/recoveryChoices.ts';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const CLAUDE = 'sk-ant-api03-recovery-test-key-abcdef';
const RAPID = 'rapidapi-test-key-0123456789';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon';
const LICENCE = 'MB-2026-ABCDEF';
const CV = 'CV-CONFIDENTIEL-NE-DOIT-PAS-APPARAITRE';
const PASSWORD = 'phrase-de-test';

function sample(updatedAt: string): RecoveryPlaintext {
  return {
    dataUpdatedAt: updatedAt,
    business: {
      iaCvHistory: [{
        id: 'cv-1',
        nom: 'Profil',
        cvBrutTexte: CV,
        langueCible: 'fr',
        instructionsStyle: '',
        creeLe: updatedAt,
        misAJourLe: updatedAt,
      }],
      classicCvs: [],
    },
    preferences: { automation: null, licenceCode: LICENCE },
    briaOnKey: { claudeKey: CLAUDE, rapidApiKey: RAPID },
    briaOnDb: { supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: ANON },
  };
}

const fast = { iterations: 1_000, now: '2026-09-30T06:00:00.000Z' };
const file = await encodeRecovery(PASSWORD, sample('2026-09-30T05:00:00.000Z'), fast);

for (const secret of [CLAUDE, RAPID, ANON, LICENCE, CV]) {
  assert(!file.includes(secret), `secret visible dans le fichier : ${secret.slice(0, 8)}`);
}
assert(file.includes('"encrypted":true'), 'section chiffrée absente');

const decoded = await decodeRecovery(PASSWORD, file);
assert(JSON.stringify(decoded.briaOnKey).includes(CLAUDE), 'clé non restaurée');
assert(JSON.stringify(decoded.business).includes(CV), 'CV non restauré');

let passwordFailed = false;
try {
  await decodeRecovery('mauvais-mot-de-passe', file);
} catch (error) {
  passwordFailed = error instanceof RecoveryError && error.code === 'password';
}
assert(passwordFailed, 'mauvais mot de passe accepté');

let truncated = false;
try {
  await decodeRecovery(PASSWORD, '{');
} catch (error) {
  truncated = error instanceof RecoveryError && (error.code === 'truncated' || error.code === 'format');
}
assert(truncated, 'fichier tronqué accepté');

const brokenApp = file.replace('mbeukcv-pro', 'autre-app');
let appFailed = false;
try {
  await decodeRecovery(PASSWORD, brokenApp);
} catch (error) {
  appFailed = error instanceof RecoveryError && error.code === 'application';
}
assert(appFailed, 'mauvaise application acceptée');

const brokenVersion = file.replace('"schemaVersion":1', '"schemaVersion":99');
let versionFailed = false;
try {
  await decodeRecovery(PASSWORD, brokenVersion);
} catch (error) {
  versionFailed = error instanceof RecoveryError && error.code === 'version';
}
assert(versionFailed, 'mauvaise version acceptée');

const brokenIntegrity = file.replace(/"integrity":"[a-f0-9]+"/, `"integrity":"${'ab'.repeat(32)}"`);
let integrityFailed = false;
try {
  await decodeRecovery(PASSWORD, brokenIntegrity);
} catch (error) {
  integrityFailed = error instanceof RecoveryError && error.code === 'integrity';
}
assert(integrityFailed, 'intégrité invalide acceptée');

assert(assessRestore({
  recoveryUpdatedAt: '2026-09-30T05:00:00.000Z',
  localUpdatedAt: '2026-09-30T06:00:00.000Z',
  localHasData: true,
  confirmOverwrite: false,
}) === 'local-newer', 'donnée locale plus récente écrasée');
assert(assessRestore({
  recoveryUpdatedAt: '2026-09-30T05:00:00.000Z',
  localUpdatedAt: '2026-09-30T06:00:00.000Z',
  localHasData: true,
  confirmOverwrite: true,
}) === 'restore', 'confirmation ignorée');
assert(assessRestore({
  recoveryUpdatedAt: '2026-09-30T07:00:00.000Z',
  localUpdatedAt: '2026-09-30T06:00:00.000Z',
  localHasData: true,
  confirmOverwrite: false,
}) === 'restore', 'copie plus récente refusée');

const older = await encodeRecovery(PASSWORD, sample('2026-09-30T04:00:00.000Z'), { iterations: 1_000, now: '2026-09-30T04:00:00.000Z' });
const newer = await encodeRecovery(PASSWORD, sample('2026-09-30T05:00:00.000Z'), { iterations: 1_000, now: '2026-09-30T05:00:00.000Z' });
const fs = createMemoryRecoveryFs();
await commitRecoveryText(fs, older);
await commitRecoveryText(fs, newer);
assert(new TextDecoder().decode(fs.files.get(RECOVERY_CURRENT) ?? new Uint8Array()) === newer, 'current incorrect');
assert(new TextDecoder().decode(fs.files.get(RECOVERY_PREVIOUS) ?? new Uint8Array()) === older, 'previous incorrect');
assert(!fs.files.has(RECOVERY_TMP), 'tmp conservé après succès');

const kept = fs.files.get(RECOVERY_CURRENT);
const partial: typeof fs = {
  files: fs.files,
  async read(name) {
    if (name === RECOVERY_TMP) {
      const bytes = await fs.read(name);
      return bytes ? bytes.slice(0, 12) : null;
    }
    return fs.read(name);
  },
  write: (name, data) => fs.write(name, data),
  remove: (name) => fs.remove(name),
};
let incomplete = false;
try {
  await commitRecoveryText(partial, older);
} catch (error) {
  incomplete = error instanceof RecoveryError && error.code === 'incomplete-tmp';
}
assert(incomplete, 'tmp incomplet promu');
assert(
  new TextDecoder().decode(fs.files.get(RECOVERY_CURRENT) ?? new Uint8Array()) === new TextDecoder().decode(kept ?? new Uint8Array()),
  'current détruit par un tmp incomplet',
);

fs.files.set(RECOVERY_CURRENT, new TextEncoder().encode('{pas un fichier'));
const best = await readBestRecovery(fs);
assert(best !== null && new TextDecoder().decode(best) === older, 'previous ignoré quand current est corrompu');
assert(fs.files.has(RECOVERY_PREVIOUS), 'previous supprimé');

assert(driveSyncPlan({ enabled: false, online: true, hasToken: true }) === 'skip', 'Drive inactif envoyé');
assert(driveSyncPlan({ enabled: true, online: false, hasToken: true }) === 'wait-network', 'hors ligne envoyé');
assert(driveSyncPlan({ enabled: true, online: true, hasToken: false }) === 'wait-auth', 'Drive sans session envoyé');
assert(driveSyncPlan({ enabled: true, online: true, hasToken: true }) === 'upload', 'Drive prêt ignoré');

const packed = packRecoveryExport(file, PASSWORD);
for (const secret of [CLAUDE, RAPID, ANON, LICENCE, CV]) {
  assert(!packed.includes(secret), `secret visible dans l’export : ${secret.slice(0, 8)}`);
}
const unpacked = unpackRecoveryExport(packed);
assert(unpacked.key === PASSWORD, 'clé d’export perdue');
const fromPack = await decodeRecovery(unpacked.key, unpacked.recovery);
assert(JSON.stringify(fromPack.briaOnKey).includes(CLAUDE), 'export non relisible');
let foreignPack = false;
try {
  unpackRecoveryExport('{"application":"autre","schemaVersion":1,"recovery":"{}","key":"12345678"}');
} catch (error) {
  foreignPack = error instanceof RecoveryError && error.code === 'application';
}
assert(foreignPack, 'export d’une autre application accepté');

console.log('recovery : ok');
