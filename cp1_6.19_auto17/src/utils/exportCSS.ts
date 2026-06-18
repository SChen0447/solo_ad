import type { TypographyLevel, TypographyStyle } from '../store/useStore'

const levelNames: Record<TypographyLevel, string> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  body: 'body',
  small: 'small',
}

export function generateCSSVariables(styles: Record<TypographyLevel, TypographyStyle>): string {
  const lines: string[] = [':root {']

  const levels: TypographyLevel[] = ['h1', 'h2', 'h3', 'body', 'small']

  levels.forEach((level) => {
    const style = styles[level]
    const name = levelNames[level]

    lines.push(`  --${name}-font-size: ${style.fontSize}px;`)
    lines.push(`  --${name}-line-height: ${style.lineHeight};`)
    lines.push(`  --${name}-letter-spacing: ${style.letterSpacing}px;`)
    lines.push(`  --${name}-color: ${style.color};`)
    lines.push(`  --${name}-font-weight: ${style.fontWeight};`)
    lines.push(`  --${name}-font-family: ${style.fontFamily};`)
  })

  lines.push('}')

  return lines.join('\n')
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      document.body.removeChild(textarea)
      return true
    } catch {
      document.body.removeChild(textarea)
      return false
    }
  }
}

export async function exportCSS(styles: Record<TypographyLevel, TypographyStyle>): Promise<boolean> {
  const css = generateCSSVariables(styles)
  return await copyToClipboard(css)
}
