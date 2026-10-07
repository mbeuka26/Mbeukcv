import { useMemo, useState } from 'react';
import type { GeneratedDocuments } from '@/types';
import { downloadHtmlAsPdf } from '@/services/pdfCompiler';
import { sanitizeDocumentHtml } from '@/services/sanitizeDocumentHtml';
import './DocPreview.css';

type DocKey = keyof GeneratedDocuments;

const TABS: { key: DocKey; label: string; filenameSuffix: string }[] = [
  { key: 'cv_fr_html', label: 'CV — FR', filenameSuffix: 'CV-FR' },
  { key: 'cv_en_html', label: 'CV — EN', filenameSuffix: 'CV-EN' },
  { key: 'lettre_fr_html', label: 'Lettre — FR', filenameSuffix: 'Lettre-FR' },
  { key: 'lettre_en_html', label: 'Lettre — EN', filenameSuffix: 'Lettre-EN' },
];

interface DocPreviewProps {
  documents: GeneratedDocuments;
  /** Préfixe de nom de fichier, ex. nom du candidat. */
  filenamePrefix?: string;
}

export function DocPreview({ documents, filenamePrefix = 'MbeukCV' }: DocPreviewProps) {
  const [activeKey, setActiveKey] = useState<DocKey>('cv_fr_html');
  const [downloading, setDownloading] = useState<DocKey | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const activeTab = useMemo(() => TABS.find((t) => t.key === activeKey)!, [activeKey]);
  const activeHtml = useMemo(() => sanitizeDocumentHtml(documents[activeKey]), [documents, activeKey]);

  async function handleDownload(tab: (typeof TABS)[number]) {
    setDownloading(tab.key);
    setDownloadError(null);
    try {
      await downloadHtmlAsPdf(documents[tab.key], {
        filename: `${filenamePrefix}-${tab.filenameSuffix}`,
        scale: 2,
      });
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : "Échec de l'export PDF. Réessayez."
      );
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="doc-preview">
      <div className="doc-preview-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={tab.key === activeKey}
            className={['doc-tab', tab.key === activeKey ? 'doc-tab-active' : ''].join(' ')}
            onClick={() => setActiveKey(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="doc-preview-toolbar">
        <span className="doc-preview-current">{activeTab.label}</span>
        <button
          className="doc-download-btn"
          disabled={downloading !== null}
          onClick={() => void handleDownload(activeTab)}
        >
          {downloading === activeTab.key ? (
            <>
              <span className="ui-spinner" aria-hidden="true" /> Export en cours…
            </>
          ) : (
            <>⬇ Télécharger en PDF</>
          )}
        </button>
      </div>

      {downloadError && <div className="doc-preview-error">{downloadError}</div>}

      <div className="doc-preview-frame-wrap">
        <iframe
          key={activeKey}
          title={activeTab.label}
          className="doc-preview-frame"
          srcDoc={activeHtml}
          // HTML déjà nettoyé (sanitizeDocumentHtml). Sandbox vide :
          // pas de script, pas d'accès au stockage de l'application.
          sandbox=""
        />
      </div>
    </div>
  );
}
