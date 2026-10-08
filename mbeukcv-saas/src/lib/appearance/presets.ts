import type { AppearanceTheme } from '@/lib/appearance/types';
import { DEFAULT_THEME_ID } from '@/lib/appearance/types';

export const APPEARANCE_PRESETS: AppearanceTheme[] = [
  {
    id: DEFAULT_THEME_ID,
    label: 'Classique Mbeuk',
    paper: '#f3eee6',
    surface: '#fbf8f3',
    ink: '#1d1916',
    muted: '#5f574e',
    line: '#e0d6c8',
    sidebar: '#26211d',
    sidebarText: '#f6f1ea',
    sidebarMuted: '#c8bfb4',
    accent: '#8d3d24',
    accentHover: '#732f1c',
    focus: '#8d3d24',
  },
  {
    id: 'energy-slate',
    label: 'Énergie & ingénierie',
    paper: '#eef2f6',
    surface: '#f8fafc',
    ink: '#0f172a',
    muted: '#475569',
    line: '#cbd5e1',
    sidebar: '#0f2942',
    sidebarText: '#e2e8f0',
    sidebarMuted: '#94a3b8',
    accent: '#0ea5e9',
    accentHover: '#0284c7',
    focus: '#0369a1',
  },
  {
    id: 'process-forest',
    label: 'Process & terrain',
    paper: '#edf3ef',
    surface: '#f7faf8',
    ink: '#142019',
    muted: '#4b5c52',
    line: '#c8d9ce',
    sidebar: '#1a3328',
    sidebarText: '#ecfdf5',
    sidebarMuted: '#9ca89f',
    accent: '#2f6b45',
    accentHover: '#245538',
    focus: '#2f6b45',
  },
  {
    id: 'night-studio',
    label: 'Studio sombre',
    paper: '#1a1816',
    surface: '#24201c',
    ink: '#f5f0ea',
    muted: '#b8aea3',
    line: '#3d3630',
    sidebar: '#0f0d0b',
    sidebarText: '#f5f0ea',
    sidebarMuted: '#9a9086',
    accent: '#d4845c',
    accentHover: '#bf6f47',
    focus: '#d4845c',
  },
];

export function presetById(id: string): AppearanceTheme {
  return APPEARANCE_PRESETS.find((p) => p.id === id) ?? APPEARANCE_PRESETS[0];
}
