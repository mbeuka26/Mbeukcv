import { newId, type ReferenceItem } from '../types';

interface ReferencesSectionProps {
  items: ReferenceItem[];
  onChange: (items: ReferenceItem[]) => void;
}

export function ReferencesSection({ items, onChange }: ReferencesSectionProps) {
  function update(id: string, patch: Partial<ReferenceItem>) {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function remove(id: string) {
    onChange(items.filter((it) => it.id !== id));
  }

  return (
    <div className="cc-section">
      <div className="cc-section-header">
        <h3>Références (optionnel)</h3>
        <button
          type="button"
          className="cc-add-btn"
          onClick={() => onChange([...items, { id: newId(), nom: '', poste: '', entreprise: '', contact: '' }])}
        >
          + Ajouter une référence
        </button>
      </div>

      {items.map((r, idx) => (
        <div key={r.id} className="cc-item-card">
          <div className="cc-item-card-header">
            <span>Référence {idx + 1}</span>
            <button type="button" className="cc-remove-btn" onClick={() => remove(r.id)}>
              Supprimer
            </button>
          </div>
          <div className="cc-grid-2">
            <input
              type="text"
              className="email-input"
              placeholder="Nom complet"
              value={r.nom}
              onChange={(e) => update(r.id, { nom: e.target.value })}
            />
            <input
              type="text"
              className="email-input"
              placeholder="Poste occupé"
              value={r.poste}
              onChange={(e) => update(r.id, { poste: e.target.value })}
            />
          </div>
          <div className="cc-grid-2">
            <input
              type="text"
              className="email-input"
              placeholder="Entreprise"
              value={r.entreprise}
              onChange={(e) => update(r.id, { entreprise: e.target.value })}
            />
            <input
              type="text"
              className="email-input"
              placeholder="Contact (e-mail/téléphone)"
              value={r.contact}
              onChange={(e) => update(r.id, { contact: e.target.value })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
