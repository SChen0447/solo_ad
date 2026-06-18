export interface RGBColor {
  r: number
  g: number
  b: number
}

export function quantizeColor(color: RGBColor, levels: number): RGBColor {
  if (levels <= 1) {
    return { r: 128, g: 128, b: 128 }
  }

  const steps = levels - 1
  const stepSize = 255 / steps

  const r = Math.round(Math.round(color.r / stepSize) * stepSize)
  const g = Math.round(Math.round(color.g / stepSize) * stepSize)
  const b = Math.round(Math.round(color.b / stepSize) * stepSize)

  return {
    r: Math.min(255, Math.max(0, r)),
    g: Math.min(255, Math.max(0, g)),
    b: Math.min(255, Math.max(0, b)),
  }
}

export function colorDistance(c1: RGBColor, c2: RGBColor): number {
  const dr = c1.r - c2.r
  const dg = c1.g - c2.g
  const db = c1.b - c2.b
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

export function findNearestColor(target: RGBColor, palette: RGBColor[]): RGBColor {
  if (palette.length === 0) return target

  let nearest = palette[0]
  let minDist = colorDistance(target, nearest)

  for (let i = 1; i < palette.length; i++) {
    const dist = colorDistance(target, palette[i])
    if (dist < minDist) {
      minDist = dist
      nearest = palette[i]
    }
  }

  return nearest
}

export function generatePalette(levels: number): RGBColor[] {
  const palette: RGBColor[] = []
  if (levels <= 1) {
    return [{ r: 128, g: 128, b: 128 }]
  }

  const steps = levels - 1
  const stepSize = 255 / steps

  for (let ri = 0; ri <= steps; ri++) {
    for (let gi = 0; gi <= steps; gi++) {
      for (let bi = 0; bi <= steps; bi++) {
        palette.push({
          r: Math.round(ri * stepSize),
          g: Math.round(gi * stepSize),
          b: Math.round(bi * stepSize),
        })
      }
    }
  }

  return palette
}

export function quantizeWithLockedColors(
  color: RGBColor,
  levels: number,
  lockedColors: RGBColor[]
): RGBColor {
  const quantized = quantizeColor(color, levels)

  if (lockedColors.length === 0) {
    return quantized
  }

  const basePalette = generatePalette(levels)
  const fullPalette = [...lockedColors, ...basePalette]

  return findNearestColor(color, fullPalette)
}

export function countUniqueColors(colors: RGBColor[]): number {
  const set = new Set<string>()
  for (const c of colors) {
    set.add(`${c.r},${c.g},${c.b}`)
  }
  return set.size
}
