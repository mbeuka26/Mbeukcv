import { newId, type ExperienceItem } from '../types';

interface ExperiencesSectionProps {
  items: ExperienceItem[];
  onChange: (items: ExperienceItem[]) => void;
}

function emptyExperience(): ExperienceItem {
  return {
    id: newId(),
    poste: '',
    entreprise: '',
    lieu: '',
    dateDebut: '',
    dateFin: '',
    enCours: false,
    description: '',
  };
}

export function ExperiencesSection({ items, onChange }: ExperiencesSectionProps) {
  function update(id: string, patch: Partial<ExperienceItem>) {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function remove(id: string) {
    onChange(items.filter((it) => it.id !== id));
  }
  function add() {
    onChange([...items, emptyExperience()]);
  }

  return (
    <div className="cc-section">
      <div className="cc-section-header">
        <h3>Expériences professionnelles</h3>
        <button type="button" className="cc-add-btn" onClick={add}>
          + Ajouter une expérience
        </button>
      </div>

      {items.length === 0 && <p className="cc-empty">Aucune expérience ajoutée pour l'instant.</p>}

      {items.map((exp, idx) => (
        <div key={exp.id} className="cc-item-card">
          <div className="cc-item-card-header">
            <span>Expérience {idx + 1}</span>
            <button type="button" className="cc-remove-btn" onClick={() => remove(exp.id)}>
              Supprimer
            </button>
          </div>
          <div className="cc-grid-2">
            <input
              type="text"
              className="email-input"
              placeholder="Intitulé du poste"
              value={exp.poste}
              onChange={(e) => update(exp.id, { poste: e.target.value })}
            />
            <input
              type="text"
              className="email-input"
              placeholder="Entreprise"
              value={exp.entreprise}
              onChange={(e) => update(exp.id, { entreprise: e.target.value })}
            />
          </div>
          <div className="cc-grid-3">
            <input
              type="text"
              className="email-input"
              placeholder="Lieu (optionnel)"
              value={exp.lieu ?? ''}
              onChange={(e) => update(exp.id, { lieu: e.target.value })}
            />
            <input
              type="text"
              className="email-input"
              placeholder="Début (ex. Jan 2022)"
              value={exp.dateDebut}
              onChange={(e) => update(exp.id, { dateDebut: e.target.value })}
            />
            <input
              type="text"
              className="email-input"
              placeholder="Fin (ex. Déc 2023)"
              value={exp.dateFin}
              disabled={exp.enCours}
              onChange={(e) => update(exp.id, { dateFin: e.target.value })}
            />
          </div>
          <label className="cc-checkbox-row">
            <input
              type="checkbox"
              checked={exp.enCours}
              onChange={(e) => update(exp.id, { enCours: e.target.checked, dateFin: '' })}
            />
            Poste actuel (en cours)
          </label>
          <textarea
            className="gen-textarea"
            rows={3}
            placeholder="Missions, réalisations, résultats chiffrés…"
            value={exp.description}
            onChange={(e) => update(exp.id, { description: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}
