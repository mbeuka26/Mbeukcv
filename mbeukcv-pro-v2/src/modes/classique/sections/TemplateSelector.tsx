import { TEMPLATE_LABELS } from '../templates/renderClassicCv';
import type { CvTemplateId } from '../types';

interface TemplateSelectorProps {
  value: CvTemplateId;
  onChange: (id: CvTemplateId) => void;
}

export function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  return (
    <div className="cc-template-selector">
      {(Object.keys(TEMPLATE_LABELS) as CvTemplateId[]).map((id) => (
        <button
          key={id}
          type="button"
          className={['cc-template-option', value === id ? 'cc-template-option-active' : ''].join(' ')}
          onClick={() => onChange(id)}
        >
          {TEMPLATE_LABELS[id]}
        </button>
      ))}
    </div>
  );
}
