import html2pdf from 'html2pdf.js';
import type { Html2PdfOptions } from 'html2pdf.js';
import { sanitizeDocumentHtml } from '@/services/sanitizeDocumentHtml';

/**
 * ════════════════════════════════════════════════════════════
 * Compilateur HTML → PDF — MbeukCV Pro (V2)
 * ════════════════════════════════════════════════════════════
 * Les documents renvoyés par l'API sont des chaînes HTML5 COMPLÈTES et
 * autonomes (`<!DOCTYPE html><html>...<body>...</body></html>`), stylées
 * en ligne. On ne peut pas se contenter d'injecter cette chaîne dans le
 * `innerHTML` d'un `<div>` : le navigateur rejetterait/tronquerait les
 * balises `<html>`/`<head>`/`<body>` imbriquées dans un élément normal.
 *
 * La technique fiable consiste à écrire le document complet dans une
 * iframe cachée (via `document.open/write/close`), attendre son
 * chargement (+ les polices Google Fonts), puis pointer html2pdf.js
 * sur le `<body>` de cette iframe — html2canvas (utilisé en interne par
 * html2pdf.js) sait très bien traverser le DOM d'un document étranger
 * tant que l'élément est attaché et a une mise en page calculée.
 */

const A4_WIDTH_PX = 794; // 210mm à 96dpi — largeur de référence pour un rendu net
const A4_HEIGHT_PX = 1123; // 297mm à 96dpi

export interface PdfCompileOptions {
  /** Nom de fichier suggéré (sans extension), ex. "CV-Jean-Dupont-FR". */
  filename?: string;
  /** Facteur de suréchantillonnage html2canvas — 2 = bon compromis netteté/poids. */
  scale?: number;
  /** Timeout (ms) d'attente du chargement des polices avant de rendre quand même. */
  fontsTimeoutMs?: number;
}

function defaultHtml2PdfOptions(filename: string, scale: number): Html2PdfOptions {
  return {
    margin: 0,
    filename: `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale,
      useCORS: true,
      letterRendering: true,
      windowWidth: A4_WIDTH_PX,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    },
    pagebreak: { mode: ['css', 'legacy'] },
  };
}

/**
 * Écrit un document HTML complet dans une iframe hors-écran et attend
 * qu'elle soit prête à être rendue (chargement + polices).
 * L'appelant est responsable de retirer l'iframe du DOM une fois fini
 * (voir `finally` dans les fonctions exportées ci-dessous).
 */
async function renderIntoHiddenIframe(
  html: string,
  fontsTimeoutMs: number
): Promise<HTMLIFrameElement> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '-99999px';
  iframe.style.width = `${A4_WIDTH_PX}px`;
  iframe.style.height = `${A4_HEIGHT_PX}px`;
  iframe.style.border = '0';

  const loadPromise = new Promise<void>((resolve, reject) => {
    iframe.onload = () => resolve();
    iframe.onerror = () => reject(new Error("Échec du chargement du document dans l'iframe de rendu."));
  });

  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    throw new Error("Impossible d'accéder au document de l'iframe de rendu (contexte navigateur restreint).");
  }

  doc.open();
  doc.write(sanitizeDocumentHtml(html));
  doc.close();

  await loadPromise;

  // Attend que les polices Google Fonts (chargées via <link> dans le
  // <head> du document généré) soient prêtes, avec un filet de sécurité
  // en cas de connexion lente ou d'API `fonts` indisponible.
  const fontsReady = iframe.contentDocument?.fonts?.ready;
  if (fontsReady) {
    await Promise.race([
      fontsReady,
      new Promise((resolve) => setTimeout(resolve, fontsTimeoutMs)),
    ]);
  }

  return iframe;
}

/**
 * Compile un document HTML complet en PDF et déclenche le téléchargement
 * navigateur (comportement `.save()` de html2pdf.js).
 */
export async function downloadHtmlAsPdf(
  html: string,
  options: PdfCompileOptions = {}
): Promise<void> {
  const { filename = 'document', scale = 2, fontsTimeoutMs = 2000 } = options;

  const iframe = await renderIntoHiddenIframe(html, fontsTimeoutMs);
  try {
    const body = iframe.contentDocument?.body;
    if (!body) {
      throw new Error("Corps du document introuvable dans l'iframe de rendu.");
    }
    await html2pdf().set(defaultHtml2PdfOptions(filename, scale)).from(body).save();
  } finally {
    iframe.remove();
  }
}

/**
 * Compile un document HTML complet en PDF et renvoie un `Blob`
 * (pour prévisualisation, envoi vers un autre service, archivage, etc.
 * — plutôt qu'un téléchargement direct).
 */
export async function compileHtmlToPdfBlob(
  html: string,
  options: PdfCompileOptions = {}
): Promise<Blob> {
  const { filename = 'document', scale = 2, fontsTimeoutMs = 2000 } = options;

  const iframe = await renderIntoHiddenIframe(html, fontsTimeoutMs);
  try {
    const body = iframe.contentDocument?.body;
    if (!body) {
      throw new Error("Corps du document introuvable dans l'iframe de rendu.");
    }
    const result = await html2pdf()
      .set(defaultHtml2PdfOptions(filename, scale))
      .from(body)
      .outputPdf('blob');

    if (!(result instanceof Blob)) {
      throw new Error('html2pdf.js a renvoyé un format inattendu (Blob attendu).');
    }
    return result;
  } finally {
    iframe.remove();
  }
}
