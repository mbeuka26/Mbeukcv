/**
 * Nettoyage du HTML de documents (CV classique ou sortie du modèle).
 * L'aperçu est en plus isolé par une iframe sandboxée. L'export PDF doit
 * lire le DOM : il écrit donc ce HTML déjà nettoyé dans une iframe de
 * la même origine, sans balise script ni gestionnaire d'événement.
 */

const REMOVED_TAGS = new Set([
  'script',
  'iframe',
  'object',
  'embed',
  'base',
  'form',
  'svg',
  'math',
  'frame',
  'frameset',
  'applet',
  'noscript',
  'template',
]);

const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formaction', 'poster', 'xlink:href']);

const PHOTO_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i;

export function isAllowedPhotoDataUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  const compact = value.trim().replace(/\s/g, '');
  if (compact.length > 2_200_000) return false;
  return PHOTO_DATA_URL.test(compact);
}

function compactProtocol(value: string): string {
  let out = '';
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    if (code <= 32 || code === 127) continue;
    out += ch.toLowerCase();
  }
  return out;
}

export function isSafeDocumentUrl(raw: string, attribute: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  const compact = compactProtocol(trimmed);
  if (
    compact.startsWith('javascript:') ||
    compact.startsWith('vbscript:') ||
    compact.startsWith('data:text') ||
    compact.startsWith('data:image/svg')
  ) {
    return false;
  }
  if (compact.startsWith('data:')) {
    return attribute === 'src' && isAllowedPhotoDataUrl(trimmed);
  }
  if (compact.startsWith('https:') || compact.startsWith('http:') || compact.startsWith('mailto:')) {
    return true;
  }
  return attribute === 'href' && trimmed.startsWith('#');
}

function sanitizeStyle(css: string): string {
  const withoutImports = css
    .replace(/expression\s*\(/gi, '(')
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/@import/gi, '')
    .replace(/-moz-binding\s*:/gi, '')
    .replace(/behavior\s*:/gi, '');

  return withoutImports.replace(/url\s*\(\s*(['"]?)([\s\S]*?)\1\s*\)/gi, (_match, _quote, url: string) => {
    const candidate = String(url).trim();
    if (isSafeDocumentUrl(candidate, 'src') || isSafeDocumentUrl(candidate, 'href')) {
      return `url("${candidate.replace(/"/g, '')}")`;
    }
    return 'none';
  });
}

export function sanitizeDocumentHtml(html: string): string {
  if (typeof DOMParser === 'undefined') {
    throw new Error('Nettoyage HTML indisponible dans ce contexte.');
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const doomed: Element[] = [];

  doc.querySelectorAll('*').forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (REMOVED_TAGS.has(tag)) {
      doomed.push(el);
      return;
    }
    if (tag === 'meta' && (el.getAttribute('http-equiv') ?? '').toLowerCase() === 'refresh') {
      doomed.push(el);
      return;
    }

    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || name === 'srcdoc' || name === 'srcset') {
        el.removeAttribute(attr.name);
        continue;
      }
      if (name === 'style') {
        const cleaned = sanitizeStyle(attr.value);
        if (cleaned.trim()) el.setAttribute(attr.name, cleaned);
        else el.removeAttribute(attr.name);
        continue;
      }
      if (URL_ATTRIBUTES.has(name) && !isSafeDocumentUrl(attr.value, name)) {
        el.removeAttribute(attr.name);
      }
    }
  });

  for (const el of doomed) el.remove();

  doc.querySelectorAll('style').forEach((styleEl) => {
    styleEl.textContent = sanitizeStyle(styleEl.textContent ?? '');
  });

  return `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
}
