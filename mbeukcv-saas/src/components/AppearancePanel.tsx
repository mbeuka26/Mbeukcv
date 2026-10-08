'use client';

import { FormEvent, useState } from 'react';
import { APPEARANCE_PRESETS } from '@/lib/appearance/presets';
import { dispatchThemeChange } from '@/components/ThemeProvider';

export function AppearancePanel({ initialThemeId }: { initialThemeId: string }) {
  const [themeId, setThemeId] = useState(initialThemeId);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function preview(id: string) {
    setThemeId(id);
    dispatchThemeChange(id);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);
    const response = await fetch('/api/settings/appearance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeId }),
    });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(typeof body.error === 'string' ? body.error : 'Enregistrement impossible.');
      return;
    }
    dispatchThemeChange(themeId);
    setMessage('Apparence enregistrée sur votre compte.');
  }

  return (
    <form onSubmit={onSubmit} className="sheet space-y-4 p-4">
      <h2 className="font-serif text-xl">Apparence</h2>
      <p className="text-sm text-muted">
        Personnalisez la barre latérale, le fond, les cartes et les accents. L’aperçu est immédiat ; l’enregistrement synchronise tous vos appareils connectés.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {APPEARANCE_PRESETS.map((preset) => {
          const active = themeId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => preview(preset.id)}
              className={`rounded-xl border p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                active ? 'border-accent ring-2 ring-accent/30' : 'border-line'
              }`}
              style={{ background: preset.surface }}
            >
              <div className="mb-2 flex gap-1.5">
                <span className="h-8 flex-1 rounded-md" style={{ background: preset.sidebar }} />
                <span className="h-8 w-10 rounded-md" style={{ background: preset.accent }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: preset.ink }}>
                {preset.label}
              </p>
              <p className="text-xs" style={{ color: preset.muted }}>
                Fond · cartes · texte
              </p>
            </button>
          );
        })}
      </div>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Enregistrement…' : 'Enregistrer l’apparence'}
      </button>
      {message && <p className="text-sm text-[#2f6b45]">{message}</p>}
      {error && <p className="text-sm text-[#8d3d24]">{error}</p>}
    </form>
  );
}
