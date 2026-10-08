import { DEFAULT_THEME_ID } from '@/lib/appearance/types';

const KEY = 'mbeuk_appearance_theme';

export function readLocalThemeId(): string {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  try {
    return localStorage.getItem(KEY) || DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function writeLocalThemeId(id: string) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // navigation privée
  }
}
