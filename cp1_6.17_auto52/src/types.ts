export type ColorKey =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'background'
  | 'surface'
  | 'textPrimary'
  | 'textSecondary'
  | 'error'
  | 'success'
  | 'warning';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  error: string;
  success: string;
  warning: string;
}

export interface Theme extends ThemeColors {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export enum ComponentState {
  Normal = 'normal',
  Hover = 'hover',
  Active = 'active',
  Disabled = 'disabled',
}

export const COLOR_KEY_LABELS: Record<ColorKey, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  background: 'Background',
  surface: 'Surface',
  textPrimary: 'Text Primary',
  textSecondary: 'Text Secondary',
  error: 'Error',
  success: 'Success',
  warning: 'Warning',
};

export const COLOR_KEYS: ColorKey[] = [
  'primary',
  'secondary',
  'accent',
  'background',
  'surface',
  'textPrimary',
  'textSecondary',
  'error',
  'success',
  'warning',
];

export const DEFAULT_THEME_COLORS: ThemeColors = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  accent: '#f59e0b',
  background: '#f8fafc',
  surface: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  error: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
};

export function isValidThemeColors(data: unknown): data is ThemeColors {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return COLOR_KEYS.every((key) => typeof obj[key] === 'string');
}
