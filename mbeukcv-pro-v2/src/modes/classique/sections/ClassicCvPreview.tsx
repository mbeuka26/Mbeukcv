import { useMemo, useState } from 'react';
import { downloadHtmlAsPdf } from '@/services/pdfCompiler';
import { sanitizeDocumentHtml } from '@/services/sanitizeDocumentHtml';
import { UiButton } from '@/components/UiButton';

interface ClassicCvPreviewProps {
  html: string;
  filenamePrefix: string;
}

export function ClassicCvPreview({ html, filenamePrefix }: ClassicCvPreviewProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const safeHtml = useMemo(() => sanitizeDocumentHtml(html), [html]);

  async function handleDownload() {
    setError(null);
    setDownloading(true);
    try {
      await downloadHtmlAsPdf(html, { filename: filenamePrefix, scale: 2 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'export PDF.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="doc-preview">
      <div className="doc-preview-toolbar">
        <span className="doc-preview-current">Aperçu en direct</span>
        <UiButton className="doc-download-btn" loading={downloading} onClick={() => void handleDownload()}>
          {downloading ? 'Export en cours…' : '⬇ Télécharger en PDF'}
        </UiButton>
      </div>
      {error && <div className="doc-preview-error">{error}</div>}
      <div className="doc-preview-frame-wrap">
        <iframe title="Aperçu du CV" className="doc-preview-frame" srcDoc={safeHtml} sandbox="" />
      </div>
    </div>
  );
}
