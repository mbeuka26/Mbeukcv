import { newId, type CertificationItem } from '../types';

interface CertificationsSectionProps {
  items: CertificationItem[];
  onChange: (items: CertificationItem[]) => void;
}

export function CertificationsSection({ items, onChange }: CertificationsSectionProps) {
  function update(id: string, patch: Partial<CertificationItem>) {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function remove(id: string) {
    onChange(items.filter((it) => it.id !== id));
  }

  return (
    <div className="cc-section">
      <div className="cc-section-header">
        <h3>Certifications</h3>
        <button
          type="button"
          className="cc-add-btn"
          onClick={() => onChange([...items, { id: newId(), nom: '', organisme: '', annee: '' }])}
        >
          + Ajouter une certification
        </button>
      </div>

      {items.map((c) => (
        <div key={c.id} className="cc-inline-row">
          <input
            type="text"
            className="email-input"
            placeholder="Nom de la certification"
            value={c.nom}
            onChange={(e) => update(c.id, { nom: e.target.value })}
          />
          <input
            type="text"
            className="email-input"
            placeholder="Organisme"
            value={c.organisme}
            onChange={(e) => update(c.id, { organisme: e.target.value })}
          />
          <input
            type="text"
            className="email-input cc-year-input"
            placeholder="Année"
            value={c.annee}
            onChange={(e) => update(c.id, { annee: e.target.value })}
          />
          <button type="button" className="cc-remove-btn" onClick={() => remove(c.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
