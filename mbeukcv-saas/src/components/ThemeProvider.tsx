'use client';

import { useEffect } from 'react';
import { applyThemeToDocument } from '@/lib/appearance/applyTheme';
import { presetById } from '@/lib/appearance/presets';
import { readLocalThemeId, writeLocalThemeId } from '@/lib/appearance/storage';
import { DEFAULT_THEME_ID } from '@/lib/appearance/types';

export function ThemeProvider({ initialThemeId }: { initialThemeId?: string | null }) {
  useEffect(() => {
    let cancelled = false;
    const apply = (id: string) => {
      applyThemeToDocument(presetById(id));
      writeLocalThemeId(id);
    };
    apply(initialThemeId || readLocalThemeId() || DEFAULT_THEME_ID);

    void fetch('/api/settings/appearance')
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (cancelled || !body || typeof body.themeId !== 'string') return;
        apply(body.themeId);
      })
      .catch(() => undefined);

    const onTheme = (event: Event) => {
      const detail = (event as CustomEvent<{ themeId: string }>).detail;
      if (!detail?.themeId) return;
      applyThemeToDocument(presetById(detail.themeId));
      writeLocalThemeId(detail.themeId);
    };
    window.addEventListener('mbeuk-theme', onTheme);
    return () => {
      cancelled = true;
      window.removeEventListener('mbeuk-theme', onTheme);
    };
  }, [initialThemeId]);

  return null;
}

export function dispatchThemeChange(themeId: string) {
  applyThemeToDocument(presetById(themeId));
  writeLocalThemeId(themeId);
  window.dispatchEvent(new CustomEvent('mbeuk-theme', { detail: { themeId } }));
}
