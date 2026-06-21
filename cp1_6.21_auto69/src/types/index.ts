export interface BrandProject {
  id: string
  name: string
  logoDataUrl: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  headingFont: string
  bodyFont: string
  createdAt: string
  lastAccessedAt: string
}

export interface ColorPalette {
  id: string
  baseColor: string
  ruleType: ColorRuleType
  colors: string[]
  createdAt: string
}

export type ColorRuleType =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'split-complementary'
  | 'monochromatic'

export type ViewType = 'home' | 'detail' | 'generator'

export interface HSL {
  h: number
  s: number
  l: number
}
