import type { ThemeConfig } from '@/types/resume';

export type ThemePresetId = 'classic' | 'modern' | 'minimal' | 'elegant' | 'bold' | 'creative' | 'mint';

export interface PresetTheme {
  id: ThemePresetId;
  colors: [string, string, string, string];
  config: ThemeConfig;
}

export const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#1a1a1a',
  accentColor: '#18181b',
  fontFamily: 'Inter',
  fontSize: 'medium',
  lineSpacing: 1.5,
  margin: { top: 20, right: 20, bottom: 20, left: 20 },
  sectionSpacing: 16,
  avatarStyle: 'circle',
};

export const FONT_OPTIONS = [
  'Inter', 'Georgia', 'Helvetica', 'Arial', 'Palatino', 'Verdana',
  'Times New Roman', 'Garamond', 'Courier New',
] as const;

export const PRESET_THEMES: PresetTheme[] = [
  { id: 'classic', colors: ['#1a1a1a', '#18181b', '#ffffff', '#374151'], config: { ...DEFAULT_THEME, fontFamily: 'Georgia', margin: { top: 24, right: 24, bottom: 24, left: 24 } } },
  { id: 'modern', colors: ['#0f172a', '#6366f1', '#f8fafc', '#475569'], config: { ...DEFAULT_THEME, primaryColor: '#0f172a', accentColor: '#6366f1', lineSpacing: 1.6, sectionSpacing: 14 } },
  { id: 'minimal', colors: ['#27272a', '#a1a1aa', '#ffffff', '#52525b'], config: { ...DEFAULT_THEME, primaryColor: '#27272a', accentColor: '#a1a1aa', fontFamily: 'Helvetica', fontSize: 'small', lineSpacing: 1.4, margin: { top: 28, right: 28, bottom: 28, left: 28 }, sectionSpacing: 12 } },
  { id: 'elegant', colors: ['#1c1917', '#b45309', '#fffbeb', '#57534e'], config: { ...DEFAULT_THEME, primaryColor: '#1c1917', accentColor: '#b45309', fontFamily: 'Palatino', lineSpacing: 1.6, margin: { top: 26, right: 26, bottom: 26, left: 26 }, sectionSpacing: 18 } },
  { id: 'bold', colors: ['#020617', '#e11d48', '#fff1f2', '#334155'], config: { ...DEFAULT_THEME, primaryColor: '#020617', accentColor: '#e11d48', fontFamily: 'Arial', fontSize: 'large' } },
  { id: 'creative', colors: ['#134e4a', '#0d9488', '#f0fdfa', '#115e59'], config: { ...DEFAULT_THEME, primaryColor: '#134e4a', accentColor: '#0d9488', fontFamily: 'Verdana', margin: { top: 22, right: 22, bottom: 22, left: 22 }, sectionSpacing: 14 } },
  { id: 'mint', colors: ['#0A1F44', '#00C897', '#F5FBFA', '#334155'], config: { ...DEFAULT_THEME, primaryColor: '#0A1F44', accentColor: '#00C897', lineSpacing: 1.55, margin: { top: 22, right: 22, bottom: 22, left: 22 }, sectionSpacing: 15 } },
];

export const THEME_PRESET_IDS = PRESET_THEMES.map((preset) => preset.id) as [ThemePresetId, ...ThemePresetId[]];

export function getThemePreset(id: string) {
  return PRESET_THEMES.find((preset) => preset.id === id);
}
