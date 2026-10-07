/**
 * Vérifie le nettoyage HTML avec jsdom (pas de navigateur).
 * Usage : node --experimental-strip-types scripts/check-sanitize.ts
 */
import { JSDOM } from 'jsdom';
import { isAllowedPhotoDataUrl, sanitizeDocumentHtml } from '../src/services/sanitizeDocumentHtml.ts';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
globalThis.DOMParser = dom.window.DOMParser;

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const dirty = `<!DOCTYPE html><html><body>
<script>localStorage.getItem('mbeukCV_claudeKey')</script>
<img src="x" onerror="alert(1)">
<a href="javascript:alert(1)">lien</a>
<iframe src="https://evil.example"></iframe>
<p>CV intact</p>
</body></html>`;

const clean = sanitizeDocumentHtml(dirty);
assert(!clean.toLowerCase().includes('<script'), 'script retiré');
assert(!clean.toLowerCase().includes('onerror'), 'onerror retiré');
assert(!clean.toLowerCase().includes('javascript:'), 'javascript: retiré');
assert(!clean.toLowerCase().includes('<iframe'), 'iframe retiré');
assert(clean.includes('CV intact'), 'texte conservé');

const photo = 'data:image/png;base64,aaaa';
assert(isAllowedPhotoDataUrl(photo), 'png accepté');
assert(!isAllowedPhotoDataUrl('data:image/svg+xml;base64,aaaa'), 'svg refusé');

console.log('sanitizeDocumentHtml : ok');
