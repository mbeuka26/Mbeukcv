import assert from 'node:assert/strict';
import { formatRichText } from '../src/lib/classic/richText.ts';

const html = formatRichText('- Conception P&ID\n- Suivi chantier\n1. Audit\n2. Rapport');
assert.ok(html.includes('<ul'), 'puces attendues');
assert.ok(html.includes('<ol'), 'numérotation attendue');
assert.ok(html.includes('Conception'), 'contenu préservé');

const left = formatRichText('Paragraphe long sans liste.', { justify: false });
assert.ok(!left.includes('text-align:justify'), 'justify désactivable');

console.log('test-classic-rich-text: OK');
