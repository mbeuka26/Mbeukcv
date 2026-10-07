/**
 * ════════════════════════════════════════════════════════════
 * verify-standalone.mjs — MbeukCV Pro (édition locale, sans backend)
 * ════════════════════════════════════════════════════════════
 * Vérifie que `dist-standalone/index.html` s'affiche correctement même
 * dans le pire cas réaliste d'ouverture en double-clic (`file://`) :
 * ni IndexedDB, ni localStorage disponibles (jsdom ne les implémente
 * pas par défaut — ce qui, pratiquement, simule bien les restrictions
 * imposées par certains navigateurs sous origine "opaque").
 *
 * Usage :
 *   npm run build:standalone
 *   npm run verify:standalone
 */
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';

const DIST_PATH = './dist-standalone/index.html';

if (!fs.existsSync(DIST_PATH)) {
  console.error(`❌ ${DIST_PATH} introuvable. Lancez d'abord : npm run build:standalone`);
  process.exit(1);
}

const html = fs.readFileSync(DIST_PATH, 'utf-8');
const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('❌ Aucun <script> trouvé dans le fichier — le build a-t-il échoué ?');
  process.exit(1);
}
const jsCode = scriptMatch[1];

const capturedErrors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => capturedErrors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...args) => capturedErrors.push('console.error: ' + args.map(String).join(' ')));

const dom = new JSDOM(
  `<!DOCTYPE html><html><head></head><body><div id="root"></div></body></html>`,
  {
    url: 'file:///tmp/MbeukCVPro-standalone.html',
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole: vc,
  }
);

const win = dom.window;

// jsdom ne fournit pas `fetch` sur son `window` par défaut (contrairement
// à TOUS les navigateurs réels, qui l'ont nativement depuis des années).
// Le SDK Anthropic vérifie sa présence au chargement du module — sans ce
// polyfill de test, on obtiendrait un faux échec ici alors que l'app
// fonctionne normalement en conditions réelles (vérifié avec un vrai
// Chrome headless lors du développement de cette fonctionnalité).
win.fetch = fetch;
win.Request = Request;
win.Response = Response;
win.Headers = Headers;

let syncError = null;
try {
  win.eval(jsCode);
} catch (e) {
  syncError = e;
}

await new Promise((resolve) => setTimeout(resolve, 3000));

const root = win.document.getElementById('root');
const rendered = root.innerHTML;

console.log('════════════════════════════════════════');
console.log('Environnement simulé : file://, sans IndexedDB, sans localStorage');
console.log('════════════════════════════════════════');
console.log('IndexedDB disponible :', typeof win.indexedDB !== 'undefined');
console.log('Erreur synchrone au chargement :', syncError ? `❌ ${syncError.message}` : '✅ aucune');
console.log('Contenu rendu (root) :', rendered.length > 0 ? `✅ ${rendered.length} caractères` : '❌ VIDE');

const looksLikeMainPage = rendered.includes('Que souhaitez-vous faire') || rendered.includes('Mode Classique');
console.log("Page d'accueil correctement affichée :", looksLikeMainPage ? '✅ oui' : '❌ non');

if (capturedErrors.length > 0) {
  console.log('\n⚠️ Erreurs/avertissements capturés :');
  capturedErrors.forEach((e) => console.log('  -', e));
} else {
  console.log('\n✅ Aucune erreur console capturée.');
}

const success = !syncError && rendered.length > 0 && looksLikeMainPage;
console.log('\n' + (success ? '✅ VÉRIFICATION RÉUSSIE' : '❌ VÉRIFICATION ÉCHOUÉE'));
process.exit(success ? 0 : 1);
