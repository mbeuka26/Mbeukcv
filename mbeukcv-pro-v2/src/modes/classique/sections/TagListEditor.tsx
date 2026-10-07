import { useState } from 'react';

interface TagListEditorProps {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
}

export function TagListEditor({ label, placeholder, items, onChange }: TagListEditorProps) {
  const [input, setInput] = useState('');

  function addTag() {
    const trimmed = input.trim();
    if (!trimmed || items.includes(trimmed)) {
      setInput('');
      return;
    }
    onChange([...items, trimmed]);
    setInput('');
  }

  function removeTag(tag: string) {
    onChange(items.filter((t) => t !== tag));
  }

  return (
    <div className="cc-field">
      <label className="gen-label">{label}</label>
      <div className="cc-tag-input-row">
        <input
          type="text"
          className="email-input"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
        />
        <button type="button" className="cc-add-tag-btn" onClick={addTag}>
          Ajouter
        </button>
      </div>
      {items.length > 0 && (
        <div className="cc-tag-list">
          {items.map((tag) => (
            <span key={tag} className="cc-tag">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} aria-label={`Retirer ${tag}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
