import { newId, type LangueItem } from '../types';

const NIVEAUX: LangueItem['niveau'][] = ['Notions', 'Intermédiaire', 'Courant', 'Bilingue', 'Langue maternelle'];

interface LanguesSectionProps {
  items: LangueItem[];
  onChange: (items: LangueItem[]) => void;
}

export function LanguesSection({ items, onChange }: LanguesSectionProps) {
  function update(id: string, patch: Partial<LangueItem>) {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function remove(id: string) {
    onChange(items.filter((it) => it.id !== id));
  }

  return (
    <div className="cc-section">
      <div className="cc-section-header">
        <h3>Langues</h3>
        <button
          type="button"
          className="cc-add-btn"
          onClick={() => onChange([...items, { id: newId(), langue: '', niveau: 'Courant' }])}
        >
          + Ajouter une langue
        </button>
      </div>

      {items.map((l) => (
        <div key={l.id} className="cc-inline-row">
          <input
            type="text"
            className="email-input"
            placeholder="Langue (ex. Anglais)"
            value={l.langue}
            onChange={(e) => update(l.id, { langue: e.target.value })}
          />
          <select
            className="gen-select"
            value={l.niveau}
            onChange={(e) => update(l.id, { niveau: e.target.value as LangueItem['niveau'] })}
          >
            {NIVEAUX.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button type="button" className="cc-remove-btn" onClick={() => remove(l.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
