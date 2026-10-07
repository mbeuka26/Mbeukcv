import { useEffect, useState } from 'react';
import { documentGenerator, cvHistoryStore } from '@/usecases/ports';
import { hasSupabaseBackend } from '@/services/supabase';
import { sendToClaudeAi } from '@/services/claudeHandoff';
import {
  clearCustomClaudeKey,
  getCustomClaudeKey,
  isValidClaudeKeyFormat,
  maskClaudeKey,
  setCustomClaudeKey,
} from '@/services/byok';
import { DocPreview } from '@/components/DocPreview';
import { EmailForm } from '@/components/EmailForm';
import { UiButton } from '@/components/UiButton';
import type { CvHistoryEntry, GeneratedDocuments, GenerateDocsPayload } from '@/types';
import './IaGenerator.css';

type LangueCible = GenerateDocsPayload['candidat']['langueCible'];

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

export function IaGenerator() {
  // ── Formulaire ──
  const [nom, setNom] = useState('');
  const [cvBrutTexte, setCvBrutTexte] = useState('');
  const [offreEmploi, setOffreEmploi] = useState('');
  const [instructionsStyle, setInstructionsStyle] = useState('');
  const [langueCible, setLangueCible] = useState<LangueCible>('les-deux');

  // ── Historique des CV (local, voir services/cvHistory.ts) ──
  const [cvHistory, setCvHistory] = useState<CvHistoryEntry[]>([]);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [saveCvMessage, setSaveCvMessage] = useState<string | null>(null);

  // ── BYOK (obligatoire désormais — plus de clé "maître" côté serveur) ──
  const [byokKey, setByokKey] = useState<string | null>(null);
  const [showByokPanel, setShowByokPanel] = useState(false);
  const [byokInput, setByokInput] = useState('');
  const [byokFormatError, setByokFormatError] = useState<string | null>(null);

  // ── Mode de génération : local (BYOK) ou backend (crédits partagés) ──
  const backendAvailable = hasSupabaseBackend();
  const [useBackendMode, setUseBackendMode] = useState(false);

  // ── Génération ──
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<GeneratedDocuments | null>(null);

  // ── Envoi vers Claude.ai (sans clé API) ──
  const [handoffMessage, setHandoffMessage] = useState<string | null>(null);
  const [handoffSending, setHandoffSending] = useState(false);

  const history = () => cvHistoryStore(useBackendMode ? 'hub' : 'local');

  async function refreshHistory() {
    setCvHistory(await history().list());
  }

  useEffect(() => {
    setByokKey(getCustomClaudeKey());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const store = cvHistoryStore(useBackendMode ? 'hub' : 'local');
    store
      .list()
      .then((entries) => {
        if (cancelled) return;
        setCvHistory(entries);
        if (entries[0]) {
          loadEntryIntoForm(entries[0]);
        } else {
          setNom('');
          setCvBrutTexte('');
          setInstructionsStyle('');
          setLangueCible('les-deux');
          setCurrentEntryId(null);
          setSaveCvMessage(null);
          setDocuments(null);
        }
      })
      .catch(() => {
        if (!cancelled) setCvHistory([]);
      });
    return () => {
      cancelled = true;
    };
    // Le chargement suit le mode. loadEntryIntoForm lit l'état courant sans dépendance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useBackendMode]);

  const hasByok = byokKey !== null;

  function loadEntryIntoForm(entry: CvHistoryEntry) {
    setNom(entry.nom);
    setCvBrutTexte(entry.cvBrutTexte);
    setLangueCible(entry.langueCible);
    setInstructionsStyle(entry.instructionsStyle ?? '');
    setCurrentEntryId(entry.id);
    setSaveCvMessage(null);
    setDocuments(null);
  }

  function handleNewCv() {
    setNom('');
    setCvBrutTexte('');
    setInstructionsStyle('');
    setLangueCible('les-deux');
    setCurrentEntryId(null);
    setSaveCvMessage(null);
    setDocuments(null);
  }

  async function handleSaveCv() {
    setSaveCvMessage(null);

    if (nom.trim().length === 0) {
      setSaveCvMessage('❌ Donnez un nom à ce CV (ex. "Jean Dupont") avant de l’enregistrer.');
      return;
    }
    if (cvBrutTexte.trim().length < 50) {
      setSaveCvMessage('❌ Le CV semble trop court pour être enregistré.');
      return;
    }

    const payload = {
      nom: nom.trim(),
      cvBrutTexte: cvBrutTexte.trim(),
      langueCible,
      instructionsStyle: instructionsStyle.trim() || undefined,
    };
    const onHub = useBackendMode;

    try {
      if (currentEntryId) {
        await history().update(currentEntryId, payload);
        setSaveCvMessage(onHub ? 'CV mis à jour sur le hub.' : 'CV mis à jour sur cet appareil.');
      } else {
        const newId = await history().create(payload);
        setCurrentEntryId(newId);
        setSaveCvMessage(onHub ? 'CV enregistré sur le hub.' : 'CV enregistré sur cet appareil.');
      }
      await refreshHistory();
    } catch (err) {
      setSaveCvMessage(err instanceof Error ? err.message : 'Enregistrement impossible.');
    }
  }

  async function handleDeleteEntry(entry: CvHistoryEntry) {
    if (!window.confirm(`Supprimer définitivement le CV "${entry.nom}" de votre historique ?`)) {
      return;
    }
    try {
      await history().remove(entry.id);
    } catch (err) {
      setSaveCvMessage(err instanceof Error ? err.message : 'Suppression impossible.');
      return;
    }
    await refreshHistory();
    if (currentEntryId === entry.id) {
      handleNewCv();
    }
  }

  function handleSaveByokKey() {
    setByokFormatError(null);
    if (!isValidClaudeKeyFormat(byokInput)) {
      setByokFormatError('Format invalide. Une clé Anthropic commence par "sk-ant-".');
      return;
    }
    setCustomClaudeKey(byokInput);
    setByokKey(getCustomClaudeKey());
    setByokInput('');
    setShowByokPanel(false);
  }

  function handleClearByokKey() {
    clearCustomClaudeKey();
    setByokKey(null);
  }

  async function handleGenerate() {
    setError(null);

    if (!useBackendMode && !byokKey) {
      setError('Ajoutez votre clé API Claude ci-dessus avant de générer.');
      setShowByokPanel(true);
      return;
    }
    if (cvBrutTexte.trim().length < 50) {
      setError('Collez votre CV complet (au moins quelques lignes) avant de générer.');
      return;
    }
    if (offreEmploi.trim().length < 50) {
      setError("Collez le texte complet de l'offre d'emploi avant de générer.");
      return;
    }

    setGenerating(true);
    setDocuments(null);

    try {
      const basePayload = {
        candidat: { cvBrutTexte: cvBrutTexte.trim(), langueCible },
        offreEmploi: offreEmploi.trim(),
        instructionsStyle: instructionsStyle.trim() || undefined,
      };

      const result = await documentGenerator(useBackendMode ? 'hub' : 'local').generate(basePayload);

      setDocuments(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue lors de la génération.');
    } finally {
      setGenerating(false);
    }
  }

  /**
   * "Générer via Claude.ai" — alternative pour les utilisateurs SANS
   * clé API : ne fait aucun appel réseau depuis notre app, se contente
   * de préparer le prompt, le copier, et ouvrir Claude.ai. Voir
   * services/claudeHandoff.ts pour le détail (et la limite technique
   * réelle : impossible de coller automatiquement dans un autre site).
   */
  async function handleSendToClaudeAi() {
    setError(null);
    setHandoffMessage(null);

    if (cvBrutTexte.trim().length < 50) {
      setError('Collez votre CV complet (au moins quelques lignes) avant de continuer.');
      return;
    }
    if (offreEmploi.trim().length < 50) {
      setError("Collez le texte complet de l'offre d'emploi avant de continuer.");
      return;
    }

    setHandoffSending(true);
    try {
      const payload = {
        candidat: { cvBrutTexte: cvBrutTexte.trim(), langueCible },
        offreEmploi: offreEmploi.trim(),
        instructionsStyle: instructionsStyle.trim() || undefined,
      };

      const result = await sendToClaudeAi(payload);

      if (result.clipboardOk) {
        setHandoffMessage(
          '✅ Prompt copié dans le presse-papier et Claude.ai ouvert dans un nouvel onglet — il ne vous reste qu\'à coller (Ctrl+V) et envoyer.'
        );
      } else {
        setHandoffMessage(
          "⚠️ Claude.ai a été ouvert, mais la copie automatique a échoué (autorisation refusée par le navigateur). Revenez ici, sélectionnez le texte ci-dessous et copiez-le manuellement."
        );
      }
    } finally {
      setHandoffSending(false);
    }
  }

  return (
    <div className="generator-page">
      <div className="generator-topbar">
        <div className="local-badge">
          <span className="credits-badge-dot" aria-hidden="true" />
          {useBackendMode
            ? 'Mode backend — crédits partagés via votre hub'
            : '100% local — aucune donnée envoyée à un serveur (sauf Claude, avec votre clé)'}
        </div>
        <div className="generator-topbar-actions">
          {backendAvailable && (
            <button
              className="byok-toggle"
              onClick={() => {
                setCurrentEntryId(null);
                setUseBackendMode((v) => !v);
              }}
            >
              {useBackendMode ? '🗄️ Basculer en mode local (BYOK)' : '🗄️ Utiliser mes crédits (backend)'}
            </button>
          )}
          {!useBackendMode && (
            <button className="byok-toggle" onClick={() => setShowByokPanel((v) => !v)}>
              {hasByok ? `🔑 ${maskClaudeKey(byokKey!)}` : '⚙️ Renseigner ma clé API Claude'}
            </button>
          )}
        </div>
      </div>

      {!useBackendMode && showByokPanel && (
        <div className="byok-panel">
          <p className="byok-panel-desc">
            Une clé API Anthropic (Claude) personnelle est nécessaire pour générer vos documents —
            il n'y a plus de serveur intermédiaire, l'application appelle Claude directement depuis
            votre navigateur. Récupérez votre clé sur{' '}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
              console.anthropic.com
            </a>
            . Elle est stockée uniquement sur cet appareil (localStorage), jamais envoyée ailleurs
            qu'à l'API Anthropic.
          </p>

          {hasByok ? (
            <div className="byok-current">
              <span>Clé active : {maskClaudeKey(byokKey!)}</span>
              <button className="byok-clear-btn" onClick={handleClearByokKey}>
                Retirer ma clé
              </button>
            </div>
          ) : (
            <div className="byok-input-row">
              <input
                type="password"
                className="byok-input"
                placeholder="sk-ant-..."
                autoComplete="off"
                spellCheck={false}
                value={byokInput}
                onChange={(e) => {
                  setByokInput(e.target.value);
                  setByokFormatError(null);
                }}
              />
              <UiButton variant="ghost" onClick={handleSaveByokKey}>
                Enregistrer
              </UiButton>
            </div>
          )}
          {byokFormatError && <div className="byok-error">{byokFormatError}</div>}
        </div>
      )}

      <div className="generator-grid">
        <section className="generator-form">
          <div className="cv-history-bar">
            <button className="history-toggle-btn" onClick={() => setShowHistory((v) => !v)}>
              📁 Mes CV enregistrés {cvHistory.length > 0 && `(${cvHistory.length})`}
            </button>
            <button className="history-new-btn" onClick={handleNewCv}>
              + Nouveau
            </button>
          </div>

          {showHistory && (
            <div className="cv-history-panel">
              {cvHistory.length === 0 ? (
                <p className="cv-history-empty">
                  {useBackendMode
                    ? 'Aucun CV sur le hub pour cette licence.'
                    : 'Aucun CV enregistré sur cet appareil.'}
                </p>
              ) : (
                cvHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className={['cv-history-item', entry.id === currentEntryId ? 'cv-history-item-active' : ''].join(' ')}
                  >
                    <div className="cv-history-item-info">
                      <strong>{entry.nom}</strong>
                      <span className="cv-history-item-date">Modifié le {formatDate(entry.misAJourLe)}</span>
                    </div>
                    <div className="cv-history-item-actions">
                      <button onClick={() => loadEntryIntoForm(entry)}>Modifier</button>
                      <button className="cv-history-delete-btn" onClick={() => void handleDeleteEntry(entry)}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <h1 className="generator-title">
            {currentEntryId ? `Modification : ${nom || 'CV'}` : 'Générer mon dossier de candidature'}
          </h1>
          <p className="generator-subtitle">
            Collez votre CV et l'offre d'emploi visée — le dossier est généré et optimisé
            spécifiquement pour ce poste. Vos informations de CV restent enregistrées sur cet
            appareil d'une visite à l'autre.
          </p>

          <label className="gen-label" htmlFor="nomInput">
            Nom de ce CV (pour le retrouver dans l'historique)
          </label>
          <input
            id="nomInput"
            type="text"
            className="email-input"
            placeholder='Ex. "Jean Dupont" ou "CV Marketing"'
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            disabled={generating}
          />

          <label className="gen-label" htmlFor="cvInput">
            Votre CV (texte brut)
          </label>
          <textarea
            id="cvInput"
            className="gen-textarea"
            rows={10}
            placeholder="Collez ici l'intégralité de votre CV actuel…"
            value={cvBrutTexte}
            onChange={(e) => setCvBrutTexte(e.target.value)}
            disabled={generating}
          />

          <div className="cv-save-row">
            <UiButton variant="ghost" onClick={() => void handleSaveCv()}>
              💾 {currentEntryId ? 'Mettre à jour ce CV' : 'Enregistrer ce CV'}
            </UiButton>
            {saveCvMessage && <span className="cv-save-message">{saveCvMessage}</span>}
          </div>

          <label className="gen-label" htmlFor="offreInput">
            Offre d'emploi visée (texte brut)
          </label>
          <textarea
            id="offreInput"
            className="gen-textarea"
            rows={8}
            placeholder="Collez ici le texte complet de l'offre d'emploi…"
            value={offreEmploi}
            onChange={(e) => setOffreEmploi(e.target.value)}
            disabled={generating}
          />

          <div className="gen-row">
            <div className="gen-col">
              <label className="gen-label" htmlFor="langueSelect">
                Langue(s) cible(s)
              </label>
              <select
                id="langueSelect"
                className="gen-select"
                value={langueCible}
                onChange={(e) => setLangueCible(e.target.value as LangueCible)}
                disabled={generating}
              >
                <option value="les-deux">Français + Anglais</option>
                <option value="fr">Français prioritaire</option>
                <option value="en">Anglais prioritaire</option>
              </select>
            </div>
          </div>

          <label className="gen-label" htmlFor="styleInput">
            Instructions de style (optionnel)
          </label>
          <textarea
            id="styleInput"
            className="gen-textarea"
            rows={3}
            placeholder='Ex. "Ton direct, couleurs sobres bleu marine, une seule page."'
            value={instructionsStyle}
            onChange={(e) => setInstructionsStyle(e.target.value)}
            disabled={generating}
          />

          {error && <div className="gen-error">{error}</div>}

          <UiButton className="gen-submit-btn" loading={generating} onClick={() => void handleGenerate()}>
            {generating ? 'Génération en cours…' : '✨ Générer mon dossier'}
          </UiButton>

          <div className="handoff-divider">ou, sans clé API</div>

          <UiButton
            variant="ghost"
            className="gen-submit-btn"
            loading={handoffSending}
            onClick={() => void handleSendToClaudeAi()}
          >
            📋 Générer via Claude.ai (ouvre un nouvel onglet)
          </UiButton>
          {handoffMessage && <div className="handoff-message">{handoffMessage}</div>}
        </section>

        <section className="generator-result">
          {!documents && !generating && (
            <div className="generator-placeholder">
              <div className="placeholder-icon" aria-hidden="true">
                📄
              </div>
              <p>Votre dossier généré (CV + lettre, FR/EN) apparaîtra ici.</p>
            </div>
          )}

          {generating && (
            <div className="generator-placeholder">
              <span className="ui-spinner ui-spinner-lg" aria-hidden="true" />
              <p>Analyse de l'offre et rédaction en cours… cela peut prendre une minute.</p>
            </div>
          )}

          {documents && (
            <>
              <DocPreview documents={documents} filenamePrefix={(nom || 'MbeukCV').replace(/\s+/g, '-')} />
              <EmailForm documents={documents} filenamePrefix={(nom || 'MbeukCV').replace(/\s+/g, '-')} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
