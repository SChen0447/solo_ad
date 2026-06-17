export type ColorTheme = 'Ocean' | 'Fire' | 'Aurora'

export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  glow: string
}

export const THEMES: Record<ColorTheme, ThemeColors> = {
  Ocean: {
    primary: '#00d4ff',
    secondary: '#0066cc',
    accent: '#00ffee',
    glow: '#00aaff',
  },
  Fire: {
    primary: '#ff4400',
    secondary: '#ff8800',
    accent: '#ffcc00',
    glow: '#ff6600',
  },
  Aurora: {
    primary: '#aa00ff',
    secondary: '#00ff88',
    accent: '#00ccff',
    glow: '#ff00aa',
  },
}
