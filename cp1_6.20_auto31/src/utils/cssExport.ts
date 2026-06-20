import type { ColorMap } from '../theme/themeManager'

export function formatToCss(colors: ColorMap): string {
  const declarations = Object.entries(colors)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n')
  return `:root {\n${declarations}\n}`
}

export function formatToScss(colors: ColorMap): string {
  return Object.entries(colors)
    .map(([key, value]) => {
      const scssVarName = key.replace(/^--/, '$').replace(/-/g, '-')
      return `${scssVarName}: ${value};`
    })
    .join('\n')
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadCss(colors: ColorMap) {
  const content = formatToCss(colors)
  downloadFile(content, 'styles.css', 'text/css')
}

export function downloadScss(colors: ColorMap) {
  const content = formatToScss(colors)
  downloadFile(content, 'styles.scss', 'text/x-scss')
}
