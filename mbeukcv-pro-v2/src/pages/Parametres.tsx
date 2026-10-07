import { useEffect, useState } from 'react';
import { UiButton } from '@/components/UiButton';
import { getSupabaseConfig, setSupabaseConfig, clearSupabaseConfig, hasSupabaseBackend } from '@/services/supabase';
import { getHubLicenceCode, setHubLicenceCode, clearHubLicenceCode, ensureBackendSession } from '@/services/hubIdentity';
import { saveSourceKey, sourceKeyStatus } from '@/services/backendApi';
import { RecoveryPanel } from './RecoveryPanel';
import './Parametres.css';

export function ParametresPage() {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [licenceCode, setLicenceCodeInput] = useState('');
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [jsearchDraft, setJsearchDraft] = useState('');
  const [africaworkDraft, setAfricaworkDraft] = useState('');
  const [keyStatus, setKeyStatus] = useState<{ jsearch: boolean; africawork: boolean } | null>(null);
  const [keyMessage, setKeyMessage] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<'jsearch' | 'africawork' | null>(null);

  useEffect(() => {
    const config = getSupabaseConfig();
    if (config) {
      setUrl(config.url);
      setAnonKey(config.anonKey);
    }
    setLicenceCodeInput(getHubLicenceCode() ?? '');
    setSaved(hasSupabaseBackend());
    if (hasSupabaseBackend() && getHubLicenceCode()) {
      sourceKeyStatus()
        .then(setKeyStatus)
        .catch(() => setKeyStatus(null));
    }
  }, []);

  async function handleSaveKey(fournisseur: 'jsearch' | 'africawork') {
    const secret = fournisseur === 'jsearch' ? jsearchDraft : africaworkDraft;
    setSavingKey(fournisseur);
    setKeyMessage(null);
    setKeyError(null);
    try {
      await saveSourceKey(fournisseur, secret.trim());
      if (fournisseur === 'jsearch') setJsearchDraft('');
      else setAfricaworkDraft('');
      setKeyStatus(await sourceKeyStatus());
      setKeyMessage(secret.trim() ? 'Clé enregistrée sur la base de ce projet.' : 'Clé retirée.');
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setSavingKey(null);
    }
  }

  function handleSave() {
    if (url.trim() && anonKey.trim()) {
      setSupabaseConfig(url.trim(), anonKey.trim());
    }
    if (licenceCode.trim()) {
      setHubLicenceCode(licenceCode.trim());
    }
    setSaved(true);
    setTestResult(null);
    setTestError(null);
  }

  function handleClear() {
    clearSupabaseConfig();
    clearHubLicenceCode();
    setUrl('');
    setAnonKey('');
    setLicenceCodeInput('');
    setSaved(false);
    setTestResult(null);
    setTestError(null);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const session = await ensureBackendSession();
      setTestResult(`✅ Connexion réussie. Licence "${session.licenceCode}" — ${session.creditsIa} crédit(s) IA disponible(s).`);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Échec du test de connexion.');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="generator-page">
      <section className="generator-form" style={{ maxWidth: 'none' }}>
        <h1 className="generator-title">Paramètres</h1>
        <p className="generator-subtitle">
          L'application fonctionne sans configuration (mode local, clé Claude sur cet appareil). L'URL ci-dessous
          est la base métier de ce projet : offres, matchs et clés de collecte y sont stockés. Le code de licence
          relie la session au hub central, qui sert à l'authentification et au compte.
        </p>

        <div className="parametres-bridge-note">
          Les offres ne sont pas envoyées vers le hub central. La clé publique anon n'est pas une clé secrète.
          Les clés JSearch et Africawork sont écrites dans la base métier et ne sont pas relues par cette page.
        </div>

        <div className="automation-block">
          <h3>🗄️ Base métier (Supabase de ce projet)</h3>
          <label className="gen-label">URL du projet</label>
          <input
            type="text"
            className="email-input"
            placeholder="https://xxxxx.supabase.co"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <label className="gen-label">Clé publique (anon)</label>
          <input
            type="password"
            className="email-input"
            placeholder="eyJhbGciOi..."
            value={anonKey}
            onChange={(e) => setAnonKey(e.target.value)}
          />
        </div>

        <div className="automation-block">
          <h3>🔑 Licence (compte du hub central)</h3>
          <input
            type="text"
            className="email-input"
            placeholder="MB-2026-XXXXXX"
            value={licenceCode}
            onChange={(e) => setLicenceCodeInput(e.target.value)}
          />
        </div>

        <div className="cv-save-row">
          <UiButton onClick={handleSave}>💾 Enregistrer</UiButton>
          <UiButton variant="ghost" loading={testing} onClick={() => void handleTest()}>
            Tester la connexion
          </UiButton>
          {saved && (
            <button className="cv-history-delete-btn" onClick={handleClear}>
              Tout effacer
            </button>
          )}
        </div>

        {testResult && <div className="handoff-message" style={{ marginTop: 14 }}>{testResult}</div>}
        {testError && <div className="gen-error" style={{ marginTop: 14 }}>{testError}</div>}

        <div className="automation-block" style={{ marginTop: 18 }}>
          <h3>Clés de collecte</h3>
          <p className="automation-note">
            JSearch (RapidAPI) agrège LinkedIn, Indeed, Glassdoor et ZipRecruiter. Africawork n'a pas d'URL d'API
            publique : la clé n'est utilisée que si le serveur a AFRICAWORK_API_URL. Une clé vide retire la vôtre.
            Sans clé personnelle, la clé maître du projet est utilisée lorsqu'elle existe.
          </p>
          <p className="automation-note">
            JSearch : {keyStatus?.jsearch ? 'configurée' : 'non configurée'}. Africawork : {keyStatus?.africawork ? 'configurée' : 'non configurée'}.
          </p>
          <label className="gen-label">Clé JSearch</label>
          <input
            type="password"
            className="email-input"
            autoComplete="off"
            value={jsearchDraft}
            onChange={(e) => setJsearchDraft(e.target.value)}
          />
          <UiButton loading={savingKey === 'jsearch'} onClick={() => void handleSaveKey('jsearch')}>
            Enregistrer JSearch
          </UiButton>
          <label className="gen-label">Clé Africawork</label>
          <input
            type="password"
            className="email-input"
            autoComplete="off"
            value={africaworkDraft}
            onChange={(e) => setAfricaworkDraft(e.target.value)}
          />
          <UiButton loading={savingKey === 'africawork'} onClick={() => void handleSaveKey('africawork')}>
            Enregistrer Africawork
          </UiButton>
          {keyMessage && <div className="handoff-message" style={{ marginTop: 12 }}>{keyMessage}</div>}
          {keyError && <div className="gen-error" style={{ marginTop: 12 }}>{keyError}</div>}
        </div>

        <RecoveryPanel />
      </section>
    </div>
  );
}
