export interface AppearanceTheme {
  id: string;
  label: string;
  paper: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  sidebar: string;
  sidebarText: string;
  sidebarMuted: string;
  accent: string;
  accentHover: string;
  focus: string;
}

export const DEFAULT_THEME_ID = 'mbeuk-classic';
