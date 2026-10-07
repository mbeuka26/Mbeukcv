import { useEffect, useState } from 'react';
import { UiButton } from '@/components/UiButton';
import { TagListEditor } from '@/modes/classique/sections/TagListEditor';
import { localOfferSearchAvailable } from '@/services/jobSearch';
import { hasSupabaseBackend } from '@/services/supabase';
import { offerWatch } from '@/usecases/ports';
import { runHubMatching } from '@/usecases/runHubMatching';
import { getAutomationSettings, saveAutomationSettings } from './automationStorage';
import { getNotificationPermission, requestNotificationPermission, showNotification } from './notifications';
import type { AutomationSettings } from '@/services/db';
import type { UserMatch } from '@/types';
import './AutomationPage.css';

export function AutomationPage() {
  // ── Paramètres d'automatisation ──
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission());

  // ── Matching IA (backend) ──
  const backendAvailable = hasSupabaseBackend();
  const [matches, setMatches] = useState<UserMatch[]>([]);
  const [matchingRunning, setMatchingRunning] = useState(false);
  const [matchingInfo, setMatchingInfo] = useState<string | null>(null);
  const [matchingError, setMatchingError] = useState<string | null>(null);

  useEffect(() => {
    getAutomationSettings()
      .then(setSettings)
      .catch(() => setSettings({ id: 'settings', active: false, frequenceHeures: 24, scoreMinimum: 75, motsCles: [], notificationsNavigateur: false }));
    if (backendAvailable) {
      offerWatch('hub')
        .list()
        .then(setMatches)
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRunMatching() {
    setMatchingError(null);
    setMatchingInfo(null);
    setMatchingRunning(true);
    try {
      const result = await runHubMatching({
        motsCles: settings?.motsCles ?? [],
        scoreMinimum: settings?.scoreMinimum ?? 75,
      });
      setMatchingInfo(
        result.info ?? `${result.nbMatchs} match(s) trouvé(s) sur ${result.nbOffresAnalysees} offre(s) analysée(s).`
      );
      const updated = await offerWatch('hub').list();
      setMatches(updated);
    } catch (err) {
      setMatchingError(err instanceof Error ? err.message : 'Échec du matching.');
    } finally {
      setMatchingRunning(false);
    }
  }

  async function handleSaveSettings() {
    if (!settings) return;
    setSavingSettings(true);
    setSaveMessage(null);
    try {
      await saveAutomationSettings(settings);
      setSaveMessage('✅ Paramètres enregistrés.');
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleEnableNotifications() {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === 'granted' && settings) {
      setSettings({ ...settings, notificationsNavigateur: true });
    }
  }

  function handleTestNotification() {
    showNotification('MbeukCV Pro', 'Ceci est une notification de test — tout fonctionne !');
  }

  if (!settings) return null;

  return (
    <div className="generator-page">
      <section className="generator-form" style={{ maxWidth: 'none' }}>
        <h1 className="generator-title">Recherche & Automatisation</h1>
        <p className="generator-subtitle">
          Le matching interroge JSearch avec vos mots-clés, puis compare le CV aux offres de la base métier.
          Les sites africains sont collectés par le cron, pas à chaque clic.
        </p>

        {!localOfferSearchAvailable() && (
          <div className="automation-block">
            <h3>Recherche d'offres</h3>
            <p className="automation-note">
              Aucune offre n'est inventée. Configurez la base métier dans Paramètres, puis lancez l'analyse :
              JSearch est appelé avec vos mots-clés si une clé est enregistrée ou posée sur le serveur.
            </p>
          </div>
        )}

        {backendAvailable && (
          <div className="automation-block">
            <h3>🎯 Mes Matchs (matching IA côté backend)</h3>
            <p className="automation-note">
              L'analyse enregistre d'abord les offres JSearch (et Africawork si son URL d'API est posée sur le
              serveur) dans la base métier. Cette collecte ne consomme pas de crédit. Ensuite les mots-clés
              et le CV le plus récent sont écrits dans le profil, puis les scores sont calculés. Un crédit
              n'est pris que si Claude est appelé. Les scores sous le minimum ne sont pas conservés.
              Limité à une analyse toutes les 6 heures.
            </p>
            <UiButton loading={matchingRunning} onClick={() => void handleRunMatching()}>
              🔄 Lancer l'analyse
            </UiButton>
            {matchingInfo && <div className="handoff-message" style={{ marginTop: 12 }}>{matchingInfo}</div>}
            {matchingError && <div className="gen-error" style={{ marginTop: 12 }}>{matchingError}</div>}

            {matches.length > 0 && (
              <div className="job-results-list" style={{ marginTop: 14 }}>
                {matches.map((m) => (
                  <a key={m.offreId} href={m.url} target="_blank" rel="noreferrer" className="job-result-item">
                    <strong>
                      {Math.round(m.score)}% — {m.titre}
                    </strong>
                    <span>
                      {m.entreprise}
                      {m.lieu ? ` — ${m.lieu}` : ''} · {m.resume}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="automation-block">
          <h3>Critères de veille</h3>
          <p className="automation-note">
            Cet appareil ne consulte aucun site d'offres. Les critères sont enregistrés localement.
            Le score minimum est envoyé au hub au lancement de l'analyse et s'applique comme seuil
            inclusif, y compris sur une analyse déjà en cache.
          </p>

          <div className="cc-grid-2">
            <div>
              <label className="gen-label">Fréquence (heures)</label>
              <input
                type="number"
                min={1}
                max={168}
                className="email-input"
                value={settings.frequenceHeures}
                onChange={(e) => setSettings({ ...settings, frequenceHeures: Number(e.target.value) || 1 })}
              />
            </div>
            <div>
              <label className="gen-label">Score minimum du matching hub (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                className="email-input"
                value={settings.scoreMinimum}
                onChange={(e) => setSettings({ ...settings, scoreMinimum: Number(e.target.value) || 0 })}
              />
            </div>
          </div>

          <TagListEditor
            label="Mots-clés surveillés"
            placeholder="Ex. Chef de projet — Entrée pour ajouter"
            items={settings.motsCles}
            onChange={(motsCles) => setSettings({ ...settings, motsCles })}
          />

          <label className="cc-checkbox-row">
            <input
              type="checkbox"
              checked={settings.notificationsNavigateur}
              disabled={notifPermission !== 'granted'}
              onChange={(e) => setSettings({ ...settings, notificationsNavigateur: e.target.checked })}
            />
            Préférence enregistrée pour le hub. Cet appareil n'émet pas d'alerte d'offres.
          </label>

          {notifPermission !== 'granted' && (
            <UiButton variant="ghost" onClick={() => void handleEnableNotifications()}>
              Autoriser les notifications
            </UiButton>
          )}
          {notifPermission === 'granted' && (
            <UiButton variant="ghost" onClick={handleTestNotification}>
              Tester l'affichage d'une notification
            </UiButton>
          )}

          <div className="cv-save-row">
            <UiButton loading={savingSettings} onClick={() => void handleSaveSettings()}>
              💾 Enregistrer les paramètres
            </UiButton>
            {saveMessage && <span className="cv-save-message">{saveMessage}</span>}
          </div>
        </div>
      </section>
    </div>
  );
}
