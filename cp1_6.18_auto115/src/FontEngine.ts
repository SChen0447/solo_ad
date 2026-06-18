export interface TypographyParams {
  tracking: number
  lineHeight: number
  fontWeight: number
  obliqueAngle: number
  horizontalScale: number
  verticalScale: number
}

export interface RenderedStyle {
  fontFamily: string
  letterSpacing: string
  lineHeight: string
  fontWeight: number
  fontStyle: string
  transform: string
  display: string
  cssVariables: Record<string, string>
}

export const DEFAULT_PARAMS: TypographyParams = {
  tracking: 0,
  lineHeight: 1.6,
  fontWeight: 400,
  obliqueAngle: 0,
  horizontalScale: 100,
  verticalScale: 100
}

export class FontEngine {
  static computeStyle(
    fontFamily: string,
    params: TypographyParams,
    baseFontStyle: 'normal' | 'italic' = 'normal'
  ): RenderedStyle {
    const tracking = this.clamp(params.tracking, -0.2, 0.5)
    const lineHeight = this.clamp(params.lineHeight, 1.0, 2.5)
    const fontWeight = this.clampWeight(params.fontWeight)
    const obliqueAngle = this.clamp(params.obliqueAngle, -10, 10)
    const hScale = this.clamp(params.horizontalScale, 50, 200) / 100
    const vScale = this.clamp(params.verticalScale, 50, 200) / 100

    const letterSpacing = `${tracking.toFixed(3)}em`
    const lineHeightStr = lineHeight.toFixed(2)

    let fontStyle: string
    if (Math.abs(obliqueAngle) > 0.01) {
      fontStyle = `oblique ${obliqueAngle > 0 ? '' : '-'}${Math.abs(obliqueAngle).toFixed(1)}deg`
    } else {
      fontStyle = baseFontStyle
    }

    const needsTransform = Math.abs(hScale - 1) > 0.001 || Math.abs(vScale - 1) > 0.001
    const transform = needsTransform ? `scale(${hScale}, ${vScale})` : 'none'
    const display = needsTransform ? 'inline-block' : 'inline'

    return {
      fontFamily: `"${fontFamily}", sans-serif`,
      letterSpacing,
      lineHeight: lineHeightStr,
      fontWeight,
      fontStyle,
      transform,
      display,
      cssVariables: {
        '--font-tracking': letterSpacing,
        '--line-height': lineHeightStr,
        '--font-weight': String(fontWeight),
        '--font-oblique': fontStyle,
        '--font-scale-x': `${hScale.toFixed(3)}`,
        '--font-scale-y': `${vScale.toFixed(3)}`
      }
    }
  }

  static exportCSSVariables(params: TypographyParams): string {
    const style = this.computeStyle('var(--font-family)', params)
    const vars = { ...style.cssVariables }
    return Object.entries(vars)
      .map(([key, value]) => `${key}: ${value};`)
      .join('\n')
  }

  private static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
  }

  private static clampWeight(weight: number): number {
    const valid = [100, 200, 300, 400, 500, 600, 700, 800, 900]
    let closest = 400
    let minDiff = Infinity
    for (const v of valid) {
      const diff = Math.abs(weight - v)
      if (diff < minDiff) {
        minDiff = diff
        closest = v
      }
    }
    return closest
  }
}
