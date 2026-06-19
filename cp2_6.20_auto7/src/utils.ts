export function formatPercent(value: number, total: number): string {
  if (total <= 0) return '0.0'
  const pct = (value / total) * 100
  return pct.toFixed(1)
}

const THEME_HUE_BASE = 235
const THEME_SATURATION = 68
const THEME_LIGHT_DARK = 29
const THEME_LIGHT_MID = 53
const THEME_LIGHT_LIGHT = 74

function hsl(h: number, s: number, l: number) {
  const hp = ((h % 360) + 360) % 360
  return `hsl(${hp}, ${s}%, ${l}%)`
}

export interface GradientPair {
  vertical: string
  horizontal: string
  glow: string
}

export function generateGradient(index: number, total: number): GradientPair {
  const hueStep = total > 1 ? 360 / total : 0
  const hue = THEME_HUE_BASE + index * hueStep

  const dark = hsl(hue, THEME_SATURATION, THEME_LIGHT_DARK)
  const mid = hsl(hue, THEME_SATURATION, THEME_LIGHT_MID)
  const light = hsl(hue, THEME_SATURATION - 10, THEME_LIGHT_LIGHT)

  return {
    vertical: `linear-gradient(to top, ${dark} 0%, ${mid} 50%, ${light} 100%)`,
    horizontal: `linear-gradient(to right, ${dark}, ${mid})`,
    glow: `hsla(${((hue % 360) + 360) % 360}, ${THEME_SATURATION}%, ${THEME_LIGHT_MID}%, 0.4)`
  }
}
