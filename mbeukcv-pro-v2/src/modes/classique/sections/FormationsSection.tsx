import { newId, type FormationItem } from '../types';

interface FormationsSectionProps {
  items: FormationItem[];
  onChange: (items: FormationItem[]) => void;
}

function emptyFormation(): FormationItem {
  return { id: newId(), diplome: '', etablissement: '', lieu: '', dateDebut: '', dateFin: '', description: '' };
}

export function FormationsSection({ items, onChange }: FormationsSectionProps) {
  function update(id: string, patch: Partial<FormationItem>) {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function remove(id: string) {
    onChange(items.filter((it) => it.id !== id));
  }

  return (
    <div className="cc-section">
      <div className="cc-section-header">
        <h3>Formation</h3>
        <button type="button" className="cc-add-btn" onClick={() => onChange([...items, emptyFormation()])}>
          + Ajouter une formation
        </button>
      </div>

      {items.length === 0 && <p className="cc-empty">Aucune formation ajoutée pour l'instant.</p>}

      {items.map((f, idx) => (
        <div key={f.id} className="cc-item-card">
          <div className="cc-item-card-header">
            <span>Formation {idx + 1}</span>
            <button type="button" className="cc-remove-btn" onClick={() => remove(f.id)}>
              Supprimer
            </button>
          </div>
          <div className="cc-grid-2">
            <input
              type="text"
              className="email-input"
              placeholder="Diplôme / Certification"
              value={f.diplome}
              onChange={(e) => update(f.id, { diplome: e.target.value })}
            />
            <input
              type="text"
              className="email-input"
              placeholder="Établissement"
              value={f.etablissement}
              onChange={(e) => update(f.id, { etablissement: e.target.value })}
            />
          </div>
          <div className="cc-grid-3">
            <input
              type="text"
              className="email-input"
              placeholder="Lieu (optionnel)"
              value={f.lieu ?? ''}
              onChange={(e) => update(f.id, { lieu: e.target.value })}
            />
            <input
              type="text"
              className="email-input"
              placeholder="Début"
              value={f.dateDebut}
              onChange={(e) => update(f.id, { dateDebut: e.target.value })}
            />
            <input
              type="text"
              className="email-input"
              placeholder="Fin"
              value={f.dateFin}
              onChange={(e) => update(f.id, { dateFin: e.target.value })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
