import { create } from 'zustand'

export type TypographyLevel = 'h1' | 'h2' | 'h3' | 'body' | 'small'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

export interface TypographyStyle {
  fontSize: number
  lineHeight: number
  letterSpacing: number
  color: string
  fontWeight: number
  fontFamily: string
}

export interface TypographyState {
  styles: Record<TypographyLevel, TypographyStyle>
  selectedLevel: TypographyLevel | null
  currentBreakpoint: Breakpoint
  panelCollapsed: boolean
  setStyle: (level: TypographyLevel, property: keyof TypographyStyle, value: number | string) => void
  setSelectedLevel: (level: TypographyLevel | null) => void
  setCurrentBreakpoint: (breakpoint: Breakpoint) => void
  togglePanel: () => void
  setPanelCollapsed: (collapsed: boolean) => void
}

const fontFamilies: Record<string, string> = {
  sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono: '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
}

const defaultStyles: Record<TypographyLevel, TypographyStyle> = {
  h1: {
    fontSize: 48,
    lineHeight: 1.2,
    letterSpacing: 0,
    color: '#1a1a2e',
    fontWeight: 700,
    fontFamily: fontFamilies.sans,
  },
  h2: {
    fontSize: 36,
    lineHeight: 1.3,
    letterSpacing: 0,
    color: '#16213e',
    fontWeight: 600,
    fontFamily: fontFamilies.sans,
  },
  h3: {
    fontSize: 28,
    lineHeight: 1.4,
    letterSpacing: 0,
    color: '#0f3460',
    fontWeight: 500,
    fontFamily: fontFamilies.sans,
  },
  body: {
    fontSize: 16,
    lineHeight: 1.6,
    letterSpacing: 0,
    color: '#333333',
    fontWeight: 400,
    fontFamily: fontFamilies.sans,
  },
  small: {
    fontSize: 14,
    lineHeight: 1.5,
    letterSpacing: 0.5,
    color: '#666666',
    fontWeight: 300,
    fontFamily: fontFamilies.sans,
  },
}

export const useStore = create<TypographyState>((set) => ({
  styles: defaultStyles,
  selectedLevel: null,
  currentBreakpoint: 'desktop',
  panelCollapsed: false,

  setStyle: (level, property, value) =>
    set((state) => ({
      styles: {
        ...state.styles,
        [level]: {
          ...state.styles[level],
          [property]: value,
        },
      },
    })),

  setSelectedLevel: (level) =>
    set(() => ({
      selectedLevel: level,
    })),

  setCurrentBreakpoint: (breakpoint) =>
    set(() => ({
      currentBreakpoint: breakpoint,
    })),

  togglePanel: () =>
    set((state) => ({
      panelCollapsed: !state.panelCollapsed,
    })),

  setPanelCollapsed: (collapsed) =>
    set(() => ({
      panelCollapsed: collapsed,
    })),
}))

export const breakpointWidths: Record<Breakpoint, number> = {
  mobile: 375,
  tablet: 768,
  desktop: 1280,
}

export const fontFamilyOptions = [
  { value: 'sans', label: 'Sans-serif', fontFamily: fontFamilies.sans },
  { value: 'serif', label: 'Serif', fontFamily: fontFamilies.serif },
  { value: 'mono', label: 'Monospace', fontFamily: fontFamilies.mono },
]

export const fontWeightOptions = [100, 200, 300, 400, 500, 600, 700, 800, 900]

export const colorPresets = [
  '#1a1a2e',
  '#16213e',
  '#0f3460',
  '#e94560',
  '#533483',
  '#333333',
  '#666666',
  '#999999',
]
