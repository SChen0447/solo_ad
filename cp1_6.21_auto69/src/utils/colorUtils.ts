import { HSL, ColorRuleType } from '../types'

export function hexToHsl(hex: string): HSL {
  let r = 0, g = 0, b = 0
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16)
    g = parseInt(hex[2] + hex[2], 16)
    b = parseInt(hex[3] + hex[3], 16)
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16)
    g = parseInt(hex.substring(3, 5), 16)
    b = parseInt(hex.substring(5, 7), 16)
  }
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

export function hslToHex(h: number, s: number, l: number): string {
  h /= 360; s /= 100; l /= 100
  let r: number, g: number, b: number
  if (s === 0) {
    r = g = b = l
  } else {
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
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function isValidHex(hex: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)
}

export function generatePalette(baseHex: string, rule: ColorRuleType): string[] {
  if (!isValidHex(baseHex)) return ['#5B7B9A', '#7A95AD', '#9AB0C2', '#B9CBD5', '#D8E6E8']
  const base = hexToHsl(baseHex)
  const { h, s, l } = base

  switch (rule) {
    case 'complementary':
      return [
        baseHex,
        hslToHex(h, Math.max(s - 10, 20), Math.min(l + 15, 90)),
        hslToHex((h + 180) % 360, s, l),
        hslToHex((h + 180) % 360, Math.max(s - 10, 20), Math.min(l + 15, 90)),
        hslToHex(h, Math.max(s - 20, 10), Math.min(l + 30, 95))
      ]
    case 'analogous':
      return [
        hslToHex((h + 330) % 360, s, l),
        hslToHex((h + 345) % 360, s, Math.min(l + 8, 90)),
        baseHex,
        hslToHex((h + 15) % 360, s, Math.min(l + 8, 90)),
        hslToHex((h + 30) % 360, s, l)
      ]
    case 'triadic':
      return [
        baseHex,
        hslToHex((h + 120) % 360, s, Math.min(l + 10, 90)),
        hslToHex((h + 240) % 360, s, l),
        hslToHex((h + 120) % 360, Math.max(s - 15, 20), Math.min(l + 25, 95)),
        hslToHex(h, Math.max(s - 20, 10), Math.min(l + 30, 95))
      ]
    case 'split-complementary':
      return [
        baseHex,
        hslToHex((h + 150) % 360, s, l),
        hslToHex((h + 210) % 360, s, Math.min(l + 10, 90)),
        hslToHex((h + 150) % 360, Math.max(s - 15, 20), Math.min(l + 25, 95)),
        hslToHex(h, Math.max(s - 20, 10), Math.min(l + 30, 95))
      ]
    case 'monochromatic':
      return [
        hslToHex(h, s, Math.max(l - 30, 10)),
        hslToHex(h, s, Math.max(l - 15, 20)),
        baseHex,
        hslToHex(h, Math.max(s - 10, 20), Math.min(l + 20, 85)),
        hslToHex(h, Math.max(s - 20, 10), Math.min(l + 40, 95))
      ]
    default:
      return [baseHex]
  }
}

export function lightenColor(hex: string, amount: number): string {
  const hsl = hexToHsl(hex)
  return hslToHex(hsl.h, hsl.s, Math.min(hsl.l + amount, 95))
}

export function getContrastColor(hex: string): string {
  const hsl = hexToHsl(hex)
  return hsl.l > 60 ? '#1a1a2e' : '#ffffff'
}
