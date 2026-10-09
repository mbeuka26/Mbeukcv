/** Ouvre la boîte de dialogue d’impression (Enregistrer au format PDF dans Chrome/Edge). */
export function printClassicHtml(html: string, title = 'CV') {
  const frame = document.createElement('iframe');
  frame.setAttribute('title', title);
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.srcdoc = html;
  document.body.appendChild(frame);
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } finally {
      window.setTimeout(() => frame.remove(), 2000);
    }
  };
}

export function downloadClassicHtml(html: string, filename = 'cv-mbeuk.html') {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
