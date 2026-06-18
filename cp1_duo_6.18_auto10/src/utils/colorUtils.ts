import * as THREE from 'three'

export const hexToThreeColor = (hex: string): THREE.Color => {
  return new THREE.Color(hex)
}

export const threeColorToHex = (color: THREE.Color): string => {
  return '#' + color.getHexString()
}

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  let r, g, b

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

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

export interface ColorScheme {
  shade: string
  pole: string
  base: string
}

export const generateHarmoniousSchemes = (count: number): ColorScheme[] => {
  const schemes: ColorScheme[] = []

  for (let i = 0; i < count; i++) {
    const baseHue = Math.random()
    const offset1 = (Math.random() - 0.5) * (40 / 360)
    const offset2 = (Math.random() - 0.5) * (40 / 360)

    const h1 = baseHue
    const h2 = (baseHue + 120 / 360 + offset1) % 1
    const h3 = (baseHue + 240 / 360 + offset2) % 1

    const s1 = 0.55 + Math.random() * 0.25
    const s2 = 0.55 + Math.random() * 0.25
    const s3 = 0.55 + Math.random() * 0.25

    const l1 = 0.4 + Math.random() * 0.15
    const l2 = 0.4 + Math.random() * 0.15
    const l3 = 0.35 + Math.random() * 0.15

    const [r1, g1, b1] = hslToRgb(h1, s1, l1)
    const [r2, g2, b2] = hslToRgb(h2, s2, l2)
    const [r3, g3, b3] = hslToRgb(h3, s3, l3)

    schemes.push({
      shade: rgbToHex(r1, g1, b1),
      pole: rgbToHex(r2, g2, b2),
      base: rgbToHex(r3, g3, b3)
    })
  }

  return schemes
}
