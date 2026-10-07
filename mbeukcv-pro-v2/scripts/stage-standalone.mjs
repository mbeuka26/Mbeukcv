/**
 * Déplace le HTML autonome produit par Vite de dist/ vers dist-standalone/.
 * Utilise l'API Node pour fonctionner sous Windows comme sous Unix.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const source = path.join(distDir, 'index.html');
const outDir = path.join(root, 'dist-standalone');
const target = path.join(outDir, 'index.html');

if (!fs.existsSync(source)) {
  console.error('dist/index.html introuvable. Le build Vite a échoué.');
  process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(source, target);
fs.rmSync(distDir, { recursive: true, force: true });
console.log(`Fichier autonome écrit : ${target}`);
