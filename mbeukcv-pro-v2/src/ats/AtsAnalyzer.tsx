import { useEffect, useState } from 'react';
import { UiButton } from '@/components/UiButton';
import type { AtsAnalysisResult } from '@contracts/ats';
import { atsAnalyzer } from '@/usecases/ports';
import { getCustomClaudeKey } from '@/services/byok';
import './AtsAnalyzer.css';

function scoreColorClass(score: number): string {
  if (score >= 75) return 'ats-score-good';
  if (score >= 50) return 'ats-score-mid';
  return 'ats-score-low';
}

export function AtsAnalyzer() {
  const [cvTexte, setCvTexte] = useState('');
  const [offreTexte, setOffreTexte] = useState('');
  const [byokKey, setByokKey] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AtsAnalysisResult | null>(null);

  useEffect(() => {
    setByokKey(getCustomClaudeKey());
  }, []);

  async function handleAnalyze() {
    setError(null);
    setResult(null);

    if (!byokKey) {
      setError(
        'Ajoutez votre clé API Claude dans le mode "IA" (⚙️ Renseigner ma clé API Claude) avant d\'utiliser l\'analyseur ATS.'
      );
      return;
    }
    if (cvTexte.trim().length < 50) {
      setError('Collez le CV à analyser (au moins quelques lignes).');
      return;
    }
    if (offreTexte.trim().length < 50) {
      setError("Collez le texte complet de l'offre d'emploi.");
      return;
    }

    setAnalyzing(true);
    try {
      const analysis = await atsAnalyzer('local').analyze(cvTexte.trim(), offreTexte.trim());
      setResult(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue lors de l’analyse.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="generator-page">
      <div className="generator-grid">
        <section className="generator-form">
          <h1 className="generator-title">Analyseur ATS</h1>
          <p className="generator-subtitle">
            Évaluez la compatibilité d'un CV avec une offre d'emploi précise : score détaillé par section,
            mots-clés manquants, recommandations concrètes.
          </p>

          {!byokKey && (
            <div className="ats-warning">
              ⚠️ Aucune clé API Claude détectée. Rendez-vous dans le mode "IA" pour la renseigner — elle sera
              automatiquement réutilisée ici.
            </div>
          )}

          <label className="gen-label" htmlFor="ats-cv">
            CV à analyser (texte brut)
          </label>
          <textarea
            id="ats-cv"
            className="gen-textarea"
            rows={10}
            placeholder="Collez ici le CV à évaluer…"
            value={cvTexte}
            onChange={(e) => setCvTexte(e.target.value)}
            disabled={analyzing}
          />

          <label className="gen-label" htmlFor="ats-offre">
            Offre d'emploi (texte brut)
          </label>
          <textarea
            id="ats-offre"
            className="gen-textarea"
            rows={8}
            placeholder="Collez ici le texte complet de l'offre d'emploi…"
            value={offreTexte}
            onChange={(e) => setOffreTexte(e.target.value)}
            disabled={analyzing}
          />

          {error && <div className="gen-error">{error}</div>}

          <UiButton className="gen-submit-btn" loading={analyzing} onClick={() => void handleAnalyze()}>
            {analyzing ? 'Analyse en cours…' : '🎯 Analyser la compatibilité ATS'}
          </UiButton>
        </section>

        <section className="generator-result">
          {!result && !analyzing && (
            <div className="generator-placeholder">
              <div className="placeholder-icon" aria-hidden="true">
                🎯
              </div>
              <p>Le score de compatibilité ATS détaillé apparaîtra ici.</p>
            </div>
          )}

          {analyzing && (
            <div className="generator-placeholder">
              <span className="ui-spinner ui-spinner-lg" aria-hidden="true" />
              <p>Analyse en cours…</p>
            </div>
          )}

          {result && (
            <div className="ats-results">
              <div className="ats-global-score">
                <div className={`ats-score-circle ${scoreColorClass(result.scoreGlobal)}`}>
                  {Math.round(result.scoreGlobal)}
                  <span>/100</span>
                </div>
                <p className="ats-resume">{result.resume}</p>
              </div>

              <div className="ats-sections">
                {result.sections.map((s) => (
                  <div key={s.nom} className="ats-section-row">
                    <div className="ats-section-header">
                      <span>{s.nom}</span>
                      <span className={scoreColorClass(s.score)}>{Math.round(s.score)}/100</span>
                    </div>
                    <div className="ats-bar-track">
                      <div
                        className={`ats-bar-fill ${scoreColorClass(s.score)}`}
                        style={{ width: `${Math.max(4, s.score)}%` }}
                      />
                    </div>
                    <p className="ats-section-comment">{s.commentaire}</p>
                  </div>
                ))}
              </div>

              {result.motsClesTrouves.length > 0 && (
                <div className="ats-keywords-block">
                  <h4>✅ Mots-clés retrouvés</h4>
                  <div className="ats-tag-list">
                    {result.motsClesTrouves.map((k) => (
                      <span key={k} className="ats-tag ats-tag-found">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.motsClesManquants.length > 0 && (
                <div className="ats-keywords-block">
                  <h4>❌ Mots-clés manquants</h4>
                  <div className="ats-tag-list">
                    {result.motsClesManquants.map((k) => (
                      <span key={k} className="ats-tag ats-tag-missing">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="ats-recommandations">
                <h4>💡 Recommandations</h4>
                <ul>
                  {result.recommandations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
