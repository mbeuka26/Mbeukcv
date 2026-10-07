import { useEffect, useMemo, useRef, useState } from 'react';
import { UiButton } from '@/components/UiButton';
import { renderClassicCvHtml } from './templates/renderClassicCv';
import { isAllowedPhotoDataUrl } from '@/services/sanitizeDocumentHtml';
import { ExperiencesSection } from './sections/ExperiencesSection';
import { FormationsSection } from './sections/FormationsSection';
import { LanguesSection } from './sections/LanguesSection';
import { CertificationsSection } from './sections/CertificationsSection';
import { ReferencesSection } from './sections/ReferencesSection';
import { TagListEditor } from './sections/TagListEditor';
import { TemplateSelector } from './sections/TemplateSelector';
import { ClassicCvPreview } from './sections/ClassicCvPreview';
import { createNewClassicCv, deleteClassicCv, listClassicCvs, saveClassicCv } from './classicCvStorage';
import type { ClassicCvData } from './types';
import './ClassicCvBuilder.css';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const MAX_PHOTO_BYTES = 1_500_000; // ~1.5 Mo, raisonnable pour une photo de CV

export function ClassicCvBuilder() {
  const [cv, setCv] = useState<ClassicCvData>(() => createNewClassicCv());
  const [history, setHistory] = useState<ClassicCvData[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const hasAutoLoadedRef = useRef(false);

  async function refreshHistory() {
    setHistory(await listClassicCvs());
  }

  useEffect(() => {
    listClassicCvs()
      .then((entries) => {
        setHistory(entries);
        if (!hasAutoLoadedRef.current && entries.length > 0) {
          hasAutoLoadedRef.current = true;
          setCv(entries[0]);
        }
      })
      .catch(() => {
        // IndexedDB indisponible : l'app reste utilisable avec un CV vierge.
      });
  }, []);

  const html = useMemo(() => renderClassicCvHtml(cv), [cv]);

  function patch(fields: Partial<ClassicCvData>) {
    setCv((prev) => ({ ...prev, ...fields }));
    setSaveMessage(null);
  }

  function handleNewCv() {
    setCv(createNewClassicCv());
    setSaveMessage(null);
  }

  async function handleSave() {
    setSaveMessage(null);
    if (cv.nom.trim().length === 0) {
      setSaveMessage('❌ Renseignez au moins votre nom avant d\'enregistrer.');
      return;
    }
    setSaving(true);
    try {
      await saveClassicCv(cv);
      await refreshHistory();
      setSaveMessage('✅ CV enregistré.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry: ClassicCvData) {
    if (!window.confirm(`Supprimer définitivement le CV "${entry.nom || 'sans nom'}" ?`)) return;
    await deleteClassicCv(entry.id);
    await refreshHistory();
    if (entry.id === cv.id) handleNewCv();
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Formats acceptés : JPEG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('Image trop volumineuse (max ~1,5 Mo).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      if (!isAllowedPhotoDataUrl(value)) {
        setPhotoError('Formats acceptés : JPEG, PNG ou WebP.');
        return;
      }
      patch({ photoDataUrl: value });
    };
    reader.onerror = () => setPhotoError('Échec de la lecture de l\'image.');
    reader.readAsDataURL(file);
  }

  return (
    <div className="generator-page">
      <div className="cc-history-bar">
        <button className="history-toggle-btn" onClick={() => setShowHistory((v) => !v)}>
          📁 Mes CV classiques {history.length > 0 && `(${history.length})`}
        </button>
        <button className="history-new-btn" onClick={handleNewCv}>
          + Nouveau
        </button>
      </div>

      {showHistory && (
        <div className="cv-history-panel">
          {history.length === 0 ? (
            <p className="cv-history-empty">Aucun CV enregistré pour l'instant.</p>
          ) : (
            history.map((entry) => (
              <div
                key={entry.id}
                className={['cv-history-item', entry.id === cv.id ? 'cv-history-item-active' : ''].join(' ')}
              >
                <div className="cv-history-item-info">
                  <strong>{entry.nom || 'Sans nom'}</strong>
                  <span className="cv-history-item-date">Modifié le {formatDate(entry.misAJourLe)}</span>
                </div>
                <div className="cv-history-item-actions">
                  <button onClick={() => setCv(entry)}>Modifier</button>
                  <button className="cv-history-delete-btn" onClick={() => void handleDelete(entry)}>
                    Supprimer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="generator-grid">
        <section className="generator-form">
          <h1 className="generator-title">CV classique — champs structurés</h1>
          <p className="generator-subtitle">
            Aucune IA, aucune clé API : tout est assemblé directement dans votre navigateur.
          </p>

          <div className="cc-section">
            <h3>Informations personnelles</h3>
            <div className="cc-grid-2">
              <input className="email-input" placeholder="Nom complet" value={cv.nom} onChange={(e) => patch({ nom: e.target.value })} />
              <input className="email-input" placeholder="Titre / poste visé" value={cv.titrePoste} onChange={(e) => patch({ titrePoste: e.target.value })} />
            </div>
            <div className="cc-grid-2">
              <input className="email-input" placeholder="E-mail" value={cv.email} onChange={(e) => patch({ email: e.target.value })} />
              <input className="email-input" placeholder="Téléphone" value={cv.telephone} onChange={(e) => patch({ telephone: e.target.value })} />
            </div>
            <div className="cc-grid-2">
              <input className="email-input" placeholder="Ville" value={cv.ville} onChange={(e) => patch({ ville: e.target.value })} />
              <input className="email-input" placeholder="LinkedIn / portfolio (optionnel)" value={cv.linkedin} onChange={(e) => patch({ linkedin: e.target.value })} />
            </div>

            <label className="gen-label" htmlFor="cc-photo">Photo (optionnelle)</label>
            <input id="cc-photo" type="file" accept="image/*" onChange={handlePhotoChange} />
            {photoError && <div className="gen-error">{photoError}</div>}
            {cv.photoDataUrl && (
              <div className="cc-photo-preview-row">
                <img src={cv.photoDataUrl} alt="Aperçu photo" className="cc-photo-preview" />
                <button type="button" className="cc-remove-btn" onClick={() => patch({ photoDataUrl: null })}>
                  Retirer la photo
                </button>
              </div>
            )}

            <label className="gen-label" htmlFor="cc-resume">Résumé / accroche (optionnel)</label>
            <textarea
              id="cc-resume"
              className="gen-textarea"
              rows={3}
              placeholder="2-3 phrases qui résument votre profil…"
              value={cv.resume}
              onChange={(e) => patch({ resume: e.target.value })}
            />
          </div>

          <ExperiencesSection items={cv.experiences} onChange={(experiences) => patch({ experiences })} />
          <FormationsSection items={cv.formations} onChange={(formations) => patch({ formations })} />

          <div className="cc-section">
            <TagListEditor
              label="Compétences"
              placeholder="Ex. Gestion de projet — Entrée pour ajouter"
              items={cv.competences}
              onChange={(competences) => patch({ competences })}
            />
          </div>

          <LanguesSection items={cv.langues} onChange={(langues) => patch({ langues })} />
          <CertificationsSection items={cv.certifications} onChange={(certifications) => patch({ certifications })} />

          <div className="cc-section">
            <TagListEditor
              label="Centres d'intérêt (optionnel)"
              placeholder="Ex. Photographie — Entrée pour ajouter"
              items={cv.centresInteret}
              onChange={(centresInteret) => patch({ centresInteret })}
            />
          </div>

          <ReferencesSection items={cv.references} onChange={(references) => patch({ references })} />

          <div className="cc-section">
            <h3>Modèle visuel</h3>
            <TemplateSelector value={cv.templateId} onChange={(templateId) => patch({ templateId })} />
          </div>

          <div className="cv-save-row">
            <UiButton variant="ghost" loading={saving} onClick={() => void handleSave()}>
              💾 Enregistrer ce CV
            </UiButton>
            {saveMessage && <span className="cv-save-message">{saveMessage}</span>}
          </div>
        </section>

        <section className="generator-result">
          <ClassicCvPreview html={html} filenamePrefix={(cv.nom || 'CV-Classique').replace(/\s+/g, '-')} />
        </section>
      </div>
    </div>
  );
}
