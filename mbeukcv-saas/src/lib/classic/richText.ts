function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const LIST_STYLE = 'margin:4px 0 6px 18px;padding:0;font-size:11px;color:#222;line-height:1.45;';
const PARA_STYLE = 'font-size:11px;color:#222;margin:2px 0;line-height:1.45;';

/**
 * Transforme saisie multiligne en HTML : tirets, puces, numérotation ou paragraphes.
 * Ex. "- Tâche A\n- Tâche B" → liste à puces.
 */
export function formatRichText(text: string, listStyle = LIST_STYLE, paraStyle = PARA_STYLE): string {
  const raw = text.trim();
  if (!raw) return '';

  const lines = raw.split(/\r?\n/);
  let html = '';
  let open: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (open) {
      html += open === 'ul' ? '</ul>' : '</ol>';
      open = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      continue;
    }
    const bullet = /^[-–—•*]\s+(.+)$/.exec(trimmed);
    const numbered = /^(\d+)[.)]\s+(.+)$/.exec(trimmed);
    if (bullet) {
      if (open !== 'ul') {
        closeList();
        html += `<ul style="${listStyle}">`;
        open = 'ul';
      }
      html += `<li>${esc(bullet[1])}</li>`;
    } else if (numbered) {
      if (open !== 'ol') {
        closeList();
        html += `<ol style="${listStyle}">`;
        open = 'ol';
      }
      html += `<li>${esc(numbered[2])}</li>`;
    } else {
      closeList();
      html += `<div style="${paraStyle}">${esc(trimmed)}</div>`;
    }
  }
  closeList();
  return html || `<div style="${paraStyle}">${esc(raw)}</div>`;
}

/** Compétences : lignes ou virgules → liste ou chips. */
export function formatSkillsList(items: string[]): string {
  if (items.length === 0) return '';
  const multiLine = items.length === 1 && items[0].includes('\n');
  if (multiLine) return formatRichText(items[0]);
  return `<ul style="${LIST_STYLE}">${items.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`;
}
