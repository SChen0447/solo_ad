export interface HSLColor {
  h: number
  s: number
  l: number
}

export interface RGBColor {
  r: number
  g: number
  b: number
}

export interface ColorSwatch {
  name: string
  hex: string
  hsl: HSLColor
  rgb: RGBColor
}

export interface Palette {
  primary: ColorSwatch[]
  secondary: ColorSwatch[]
  neutral: ColorSwatch[]
  functional: {
    success: ColorSwatch
    warning: ColorSwatch
    danger: ColorSwatch
  }
}

export type InputColorFormat = 'hex' | 'rgb' | 'hsl'
