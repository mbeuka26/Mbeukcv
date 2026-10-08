import type { AppearanceTheme } from '@/lib/appearance/types';

export function themeToCssVars(theme: AppearanceTheme): Record<string, string> {
  return {
    '--color-paper': theme.paper,
    '--color-surface': theme.surface,
    '--color-ink': theme.ink,
    '--color-muted': theme.muted,
    '--color-line': theme.line,
    '--color-sidebar': theme.sidebar,
    '--color-sidebar-text': theme.sidebarText,
    '--color-sidebar-muted': theme.sidebarMuted,
    '--color-accent': theme.accent,
    '--color-accent-hover': theme.accentHover,
    '--color-focus': theme.focus,
  };
}

export function applyThemeToDocument(theme: AppearanceTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(themeToCssVars(theme))) {
    root.style.setProperty(key, value);
  }
  root.dataset.theme = theme.id;
}
