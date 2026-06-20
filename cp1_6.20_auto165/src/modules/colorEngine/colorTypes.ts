export interface ColorSwatch {
  name: string
  variableName: string
  hex: string
  isLight?: boolean
}

export interface ColorPalette {
  primary: ColorSwatch
  primaryLight: ColorSwatch
  primaryDark: ColorSwatch
  secondary: ColorSwatch
  secondaryLight: ColorSwatch
  secondaryDark: ColorSwatch
  success: ColorSwatch
  warning: ColorSwatch
  error: ColorSwatch
  gray: ColorSwatch
}

export interface ContrastResult {
  ratio: number
  passAA: boolean
  passAAA: boolean
}

export type ThemeMode = 'light' | 'dark'
