import type { HSLColor, RGBColor, ColorSwatch, Palette } from './types'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function hexToRgb(hex: string): RGBColor {
  const clean = hex.replace('#', '')
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean
  return {
    r: parseInt(full.substring(0, 2), 16),
    g: parseInt(full.substring(2, 4), 16),
    b: parseInt(full.substring(4, 6), 16)
  }
}

export function rgbToHex(rgb: RGBColor): string {
  const toHex = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0')
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

export function rgbToHsl(rgb: RGBColor): HSLColor {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

export function hslToRgb(hsl: HSLColor): RGBColor {
  const h = hsl.h / 360
  const s = clamp(hsl.s, 0, 100) / 100
  const l = clamp(hsl.l, 0, 100) / 100

  if (s === 0) {
    const v = Math.round(l * 255)
    return { r: v, g: v, b: v }
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q

  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  }
}

export function hexToHsl(hex: string): HSLColor {
  return rgbToHsl(hexToRgb(hex))
}

export function hslToHex(hsl: HSLColor): string {
  return rgbToHex(hslToRgb(hsl))
}

export function parseColor(input: string): HSLColor {
  const trimmed = input.trim()
  if (trimmed.startsWith('#')) {
    return hexToHsl(trimmed)
  }
  const rgbMatch = trimmed.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i)
  if (rgbMatch) {
    return rgbToHsl({
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3])
    })
  }
  const hslMatch = trimmed.match(/^hsl\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)$/i)
  if (hslMatch) {
    return {
      h: parseInt(hslMatch[1]),
      s: parseInt(hslMatch[2]),
      l: parseInt(hslMatch[3])
    }
  }
  return { h: 220, s: 80, l: 50 }
}

function createSwatch(name: string, hsl: HSLColor): ColorSwatch {
  const rgb = hslToRgb(hsl)
  return {
    name,
    hex: rgbToHex(rgb),
    hsl: { ...hsl },
    rgb
  }
}

function generatePrimaryShades(baseHsl: HSLColor): ColorSwatch[] {
  const lightnesses = [90, 70, 50, 30, 10]
  return lightnesses.map((l, i) => {
    const names = ['100', '300', '500', '700', '900']
    return createSwatch(`primary-${names[i]}`, {
      h: baseHsl.h,
      s: clamp(baseHsl.s, 20, 90),
      l: clamp(l, 0, 100)
    })
  })
}

function generateSecondaryColors(baseHsl: HSLColor): ColorSwatch[] {
  const angles = [120, 180, 240]
  const names = ['secondary-a', 'secondary-b', 'secondary-c']
  return angles.map((angle, i) => {
    return createSwatch(names[i], {
      h: (baseHsl.h + angle) % 360,
      s: clamp(baseHsl.s, 30, 80),
      l: clamp(baseHsl.l, 35, 65)
    })
  })
}

function generateNeutralColors(baseHsl: HSLColor): ColorSwatch[] {
  const lightnesses = [92, 75, 50, 25]
  const names = ['neutral-100', 'neutral-300', 'neutral-500', 'neutral-700']
  return lightnesses.map((l, i) => {
    return createSwatch(names[i], {
      h: baseHsl.h,
      s: 8,
      l: clamp(l, 0, 100)
    })
  })
}

function generateFunctionalColors(baseHsl: HSLColor): Palette['functional'] {
  const successHsl: HSLColor = { h: 140, s: clamp(baseHsl.s, 50, 80), l: 45 }
  const warningHsl: HSLColor = { h: 40, s: clamp(baseHsl.s, 60, 90), l: 50 }
  const dangerHsl: HSLColor = { h: 0, s: clamp(baseHsl.s, 60, 90), l: 50 }
  return {
    success: createSwatch('success', successHsl),
    warning: createSwatch('warning', warningHsl),
    danger: createSwatch('danger', dangerHsl)
  }
}

export function generatePalette(baseColor: string): Palette {
  const baseHsl = parseColor(baseColor)
  return {
    primary: generatePrimaryShades(baseHsl),
    secondary: generateSecondaryColors(baseHsl),
    neutral: generateNeutralColors(baseHsl),
    functional: generateFunctionalColors(baseHsl)
  }
}

export function getColorLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function isDarkColor(hex: string): boolean {
  return getColorLuminance(hex) < 0.4
}

export function exportAsCSSVariables(palette: Palette): string {
  const lines: string[] = [':root {']
  palette.primary.forEach(s => lines.push(`  --color-${s.name}: ${s.hex};`))
  palette.secondary.forEach(s => lines.push(`  --color-${s.name}: ${s.hex};`))
  palette.neutral.forEach(s => lines.push(`  --color-${s.name}: ${s.hex};`))
  lines.push(`  --color-success: ${palette.functional.success.hex};`)
  lines.push(`  --color-warning: ${palette.functional.warning.hex};`)
  lines.push(`  --color-danger: ${palette.functional.danger.hex};`)
  lines.push('}')
  return lines.join('\n')
}

export function exportAsSCSSMap(palette: Palette): string {
  const lines: string[] = ['$colors: (']
  palette.primary.forEach(s => lines.push(`  '${s.name}': ${s.hex},`))
  palette.secondary.forEach(s => lines.push(`  '${s.name}': ${s.hex},`))
  palette.neutral.forEach(s => lines.push(`  '${s.name}': ${s.hex},`))
  lines.push(`  'success': ${palette.functional.success.hex},`)
  lines.push(`  'warning': ${palette.functional.warning.hex},`)
  lines.push(`  'danger': ${palette.functional.danger.hex}`)
  lines.push(');')
  return lines.join('\n')
}
