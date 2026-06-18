export interface RGB {
  r: number
  g: number
  b: number
}

export interface HSL {
  h: number
  s: number
  l: number
}

export interface ContrastResult {
  ratio: number
  level: 'AAA' | 'AA' | 'Fail'
}

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '')
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean
  const num = parseInt(full, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  }
}

export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const h = Math.round(Math.max(0, Math.min(255, n))).toString(16)
    return h.length === 1 ? '0' + h : h
  }
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
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
  return { h: h * 360, s: s * 100, l: l * 100 }
}

export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360
  const s = hsl.s / 100
  const l = hsl.l / 100

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

export function hexToHsl(hex: string): HSL {
  return rgbToHsl(hexToRgb(hex))
}

export function hslToHex(hsl: HSL): string {
  return rgbToHex(hslToRgb(hsl))
}

function luminance(rgb: RGB): number {
  const channel = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
}

export function calculateContrast(color1: string, color2: string): ContrastResult {
  const l1 = luminance(hexToRgb(color1))
  const l2 = luminance(hexToRgb(color2))
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  const ratio = (lighter + 0.05) / (darker + 0.05)
  const rounded = Math.round(ratio * 100) / 100

  let level: 'AAA' | 'AA' | 'Fail' = 'Fail'
  if (rounded >= 7) level = 'AAA'
  else if (rounded >= 4.5) level = 'AA'

  return { ratio: rounded, level }
}

export function getReadableTextColor(bgColor: string, lightText = '#ffffff', darkText = '#212529'): string {
  const contrastLight = calculateContrast(bgColor, lightText).ratio
  const contrastDark = calculateContrast(bgColor, darkText).ratio
  return contrastLight >= contrastDark ? lightText : darkText
}

export function darkenColor(hex: string, percent: number): string {
  const hsl = hexToHsl(hex)
  hsl.l = Math.max(0, hsl.l * (1 - percent / 100))
  return hslToHex(hsl)
}

export function lightenColor(hex: string, percent: number): string {
  const hsl = hexToHsl(hex)
  hsl.l = Math.min(100, hsl.l + (100 - hsl.l) * (percent / 100))
  return hslToHex(hsl)
}

export function isValidHex(hex: string): boolean {
  return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex)
}

export function normalizeHex(hex: string): string {
  let clean = hex.replace('#', '')
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('')
  }
  return '#' + clean.toUpperCase()
}

export interface ColorExportItem {
  name: string
  hex: string
  usage: string
  contrastRatio: number
  contrastLevel: string
}

export function generateCSSVariables(colors: { name: string; hex: string; usage: string }[]): string {
  const lines = colors.map(c => {
    const varName = `--color-${c.name.toLowerCase().replace(/\s+/g, '-')}`
    return `  ${varName}: ${c.hex};`
  })
  return `:root {\n${lines.join('\n')}\n}\n`
}

export function generateJSONExport(
  palette: { id: string; name: string; hex: string }[],
  componentColors: Record<string, string>
): string {
  const usageMap: Record<string, string> = {}
  Object.entries(componentColors).forEach(([comp, hex]) => {
    usageMap[hex] = comp
  })

  const exports: ColorExportItem[] = palette.map(c => {
    const usage = usageMap[c.hex] || '未分配'
    let contrastRatio = 0
    let contrastLevel = 'Fail'
    const bgComponents = ['navbar-bg', 'hero-bg', 'card-bg', 'footer-bg', 'button-bg']
    if (bgComponents.some(bg => usage.includes(bg))) {
      const textColor = getReadableTextColor(c.hex)
      const contrast = calculateContrast(c.hex, textColor)
      contrastRatio = contrast.ratio
      contrastLevel = contrast.level
    }
    return {
      name: c.name,
      hex: c.hex,
      usage,
      contrastRatio,
      contrastLevel
    }
  })

  return JSON.stringify({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    colors: exports
  }, null, 2)
}

export function getComponentName(key: string): string {
  const names: Record<string, string> = {
    'navbar-bg': '导航栏背景',
    'navbar-text': '导航栏文字',
    'hero-bg': '英雄区背景',
    'hero-text': '英雄区标题',
    'hero-subtext': '英雄区副标题',
    'button-bg': '按钮背景',
    'button-text': '按钮文字',
    'card-bg': '卡片背景',
    'card-title': '卡片标题',
    'card-text': '卡片正文',
    'card-border': '卡片边框',
    'footer-bg': '页脚背景',
    'footer-text': '页脚文字',
    'accent': '强调色'
  }
  return names[key] || key
}

export function generateRandomColor(): string {
  const hex = Math.floor(Math.random() * 16777215).toString(16)
  return '#' + hex.padStart(6, '0').toUpperCase()
}
