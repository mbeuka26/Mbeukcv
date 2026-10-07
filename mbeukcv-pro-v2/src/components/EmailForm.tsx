import { useState } from 'react';
import type { GeneratedDocuments } from '@/types';
import { downloadHtmlAsPdf, compileHtmlToPdfBlob } from '@/services/pdfCompiler';
import { applicationMailer, modeFromSettings } from '@/usecases/ports';
import { UiButton } from '@/components/UiButton';
import './EmailForm.css';

type DocKey = keyof GeneratedDocuments;

const ATTACHMENT_OPTIONS: { key: DocKey; label: string; filenameSuffix: string }[] = [
  { key: 'cv_fr_html', label: 'CV — Français', filenameSuffix: 'CV-FR' },
  { key: 'cv_en_html', label: 'CV — Anglais', filenameSuffix: 'CV-EN' },
  { key: 'lettre_fr_html', label: 'Lettre de motivation — Français', filenameSuffix: 'Lettre-FR' },
  { key: 'lettre_en_html', label: 'Lettre de motivation — Anglais', filenameSuffix: 'Lettre-EN' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailFormProps {
  documents: GeneratedDocuments;
  /** Utilisé pour préfixer les noms de fichiers PDF téléchargés. */
  filenamePrefix?: string;
  /** Pré-remplit le destinataire, ex. e-mail recruteur trouvé manuellement. */
  defaultDestinataire?: string;
  /** Pré-remplit l'objet. */
  defaultObjet?: string;
}

/**
 * Convertit un Blob PDF en chaîne Base64 (sans le préfixe data:...),
 * nécessaire pour l'envoi via l'Edge Function send-application (voir
 * services/backendApi.ts).
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Lecture du PDF échouée.'));
        return;
      }
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Échec de lecture du fichier PDF.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * ════════════════════════════════════════════════════════════
 * Envoi de candidature — deux chemins possibles
 * ════════════════════════════════════════════════════════════
 * 1. SANS backend (toujours disponible) : téléchargement des PDF +
 *    ouverture du client mail par défaut (`mailto:`) pré-rempli.
 *    `mailto:` ne permet PAS de joindre des fichiers (limite du
 *    navigateur/OS) — il faut glisser-déposer les PDF téléchargés.
 * 2. AVEC backend configuré (voir Paramètres) : envoi RÉEL et
 *    automatique via l'Edge Function `send-application` (Brevo côté
 *    serveur), pièces jointes incluses, en un clic.
 */
export function EmailForm({
  documents,
  filenamePrefix = 'MbeukCV',
  defaultDestinataire = '',
  defaultObjet = '',
}: EmailFormProps) {
  const mailer = applicationMailer(modeFromSettings());
  const backendAvailable = mailer.kind === 'hub';

  const [selected, setSelected] = useState<Set<DocKey>>(new Set(['cv_fr_html', 'lettre_fr_html']));
  const [destinataire, setDestinataire] = useState(defaultDestinataire);
  const [objet, setObjet] = useState(defaultObjet);
  const [message, setMessage] = useState('');

  const [downloading, setDownloading] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const [sendingBackend, setSendingBackend] = useState(false);
  const [backendSuccess, setBackendSuccess] = useState<string | null>(null);

  function toggleDoc(key: DocKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function validateRecipientForSend(): boolean {
    setError(null);
    if (selected.size === 0) {
      setError('Sélectionnez au moins un document.');
      return false;
    }
    if (!destinataire.trim() || !EMAIL_REGEX.test(destinataire.trim())) {
      setError('Adresse e-mail du destinataire invalide.');
      return false;
    }
    if (!objet.trim()) {
      setError("Renseignez un objet pour l'e-mail.");
      return false;
    }
    return true;
  }

  async function handleDownloadAll() {
    setError(null);
    setDownloaded(false);

    if (selected.size === 0) {
      setError('Sélectionnez au moins un document à télécharger.');
      return;
    }

    setDownloading(true);
    try {
      const docsToDownload = ATTACHMENT_OPTIONS.filter((opt) => selected.has(opt.key));

      // Téléchargements séquentiels (pas en parallèle) : plus lisible
      // pour l'utilisateur (une popup de téléchargement à la fois) et
      // limite le pic mémoire si les 4 documents sont sélectionnés.
      for (const opt of docsToDownload) {
        setProgressLabel(`Téléchargement : ${opt.label}…`);
        await downloadHtmlAsPdf(documents[opt.key], {
          filename: `${filenamePrefix}-${opt.filenameSuffix}`,
          scale: 2,
        });
      }
      setDownloaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du téléchargement. Réessayez.');
    } finally {
      setDownloading(false);
      setProgressLabel(null);
    }
  }

  async function handleOpenMailClient() {
    setError(null);
    if (destinataire.trim() && !EMAIL_REGEX.test(destinataire.trim())) {
      setError('Adresse e-mail du destinataire invalide.');
      return;
    }

    await applicationMailer('local').send({
      destinataire: destinataire.trim(),
      objet: objet.trim(),
      message: message.trim() || undefined,
    });
  }

  async function handleSendViaBackend() {
    setBackendSuccess(null);
    if (!validateRecipientForSend()) return;

    setSendingBackend(true);
    try {
      const docsToSend = ATTACHMENT_OPTIONS.filter((opt) => selected.has(opt.key));
      const pieces = [];

      for (const opt of docsToSend) {
        setProgressLabel(`Préparation du PDF : ${opt.label}…`);
        const blob = await compileHtmlToPdfBlob(documents[opt.key], {
          filename: `${filenamePrefix}-${opt.filenameSuffix}`,
          scale: 2,
        });
        const contentBase64 = await blobToBase64(blob);
        pieces.push({
          filename: `${filenamePrefix}-${opt.filenameSuffix}.pdf`,
          contentBase64,
          mimeType: 'application/pdf' as const,
        });
      }

      setProgressLabel("Envoi de l'e-mail…");
      await applicationMailer('hub').send({
        destinataire: destinataire.trim(),
        objet: objet.trim(),
        message: message.trim() || undefined,
        pieces,
      });

      setBackendSuccess(`✅ E-mail envoyé avec succès à ${destinataire.trim()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi via le backend.");
    } finally {
      setSendingBackend(false);
      setProgressLabel(null);
    }
  }

  return (
    <div className="email-form">
      <h3 className="email-form-title">✉️ Préparer ma candidature</h3>
      {!backendAvailable && (
        <p className="email-form-note">
          Sans serveur, l'envoi automatique avec pièces jointes n'est pas possible (aucun service
          d'e-mail n'accepte qu'on lui confie une clé secrète depuis un simple fichier HTML). À la
          place : téléchargez les PDF ci-dessous, puis ouvrez votre messagerie pré-remplie et
          glissez-y les fichiers téléchargés. Un envoi automatique réel est possible en configurant
          un backend dans Paramètres.
        </p>
      )}

      <div className="email-form-field">
        <span className="gen-label">Documents à joindre</span>
        <div className="email-attachments-list">
          {ATTACHMENT_OPTIONS.map((opt) => (
            <label key={opt.key} className="email-attachment-option">
              <input
                type="checkbox"
                checked={selected.has(opt.key)}
                onChange={() => toggleDoc(opt.key)}
                disabled={downloading || sendingBackend}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div className="email-form-field">
        <label className="gen-label" htmlFor="ef-destinataire">
          E-mail du destinataire (recruteur)
        </label>
        <input
          id="ef-destinataire"
          type="email"
          className="email-input"
          placeholder="recrutement@entreprise.com"
          value={destinataire}
          onChange={(e) => setDestinataire(e.target.value)}
        />
      </div>

      <div className="email-form-field">
        <label className="gen-label" htmlFor="ef-objet">
          Objet
        </label>
        <input
          id="ef-objet"
          type="text"
          className="email-input"
          placeholder="Candidature — [Votre nom] — [Intitulé du poste]"
          value={objet}
          onChange={(e) => setObjet(e.target.value)}
        />
      </div>

      <div className="email-form-field">
        <label className="gen-label" htmlFor="ef-message">
          Message (optionnel — sinon un message par défaut est utilisé)
        </label>
        <textarea
          id="ef-message"
          className="gen-textarea"
          rows={4}
          placeholder="Madame, Monsieur, veuillez trouver ci-joint..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {error && <div className="gen-error">{error}</div>}
      {backendSuccess && <div className="email-success">{backendSuccess}</div>}

      {backendAvailable && (
        <UiButton
          className="email-send-btn"
          loading={sendingBackend}
          onClick={() => void handleSendViaBackend()}
        >
          {sendingBackend ? progressLabel ?? 'Envoi en cours…' : '📨 Envoyer directement (via le backend)'}
        </UiButton>
      )}

      <UiButton
        variant={backendAvailable ? 'ghost' : 'primary'}
        className="email-download-btn"
        loading={downloading}
        onClick={() => void handleDownloadAll()}
      >
        {downloading ? progressLabel ?? 'Téléchargement…' : '⬇ Télécharger les PDF sélectionnés'}
      </UiButton>
      {downloaded && <div className="email-success">✅ PDF téléchargés dans votre dossier de téléchargements.</div>}

      <UiButton variant="ghost" className="email-send-btn" onClick={() => void handleOpenMailClient()}>
        📧 Ouvrir ma messagerie (n'oubliez pas de joindre les PDF)
      </UiButton>
    </div>
  );
}
