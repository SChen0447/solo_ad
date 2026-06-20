import tinycolor from 'tinycolor2'
import type { ContrastResult } from './colorTypes'

export function checkContrast(foreground: string, background: string): ContrastResult {
  const ratio = tinycolor.readability(foreground, background)
  const passAA = ratio >= 4.5
  const passAAA = ratio >= 7

  return {
    ratio: Math.round(ratio * 100) / 100,
    passAA,
    passAAA,
  }
}

export function checkPaletteContrasts(paletteHex: string, bgColor: string): ContrastResult {
  return checkContrast(paletteHex, bgColor)
}

interface ContrastCheckItem {
  name: string
  foreground: string
  background: string
  result: ContrastResult
}

export function getStandardContrastChecks(
  primary: string,
  primaryDark: string,
  primaryLight: string,
  secondary: string,
  bgLight: string = '#ffffff',
  bgDark: string = '#1a1a2e',
): ContrastCheckItem[] {
  return [
    {
      name: '主色 on 白色背景',
      foreground: primary,
      background: bgLight,
      result: checkContrast(primary, bgLight),
    },
    {
      name: '主色深色 on 白色文字',
      foreground: '#ffffff',
      background: primaryDark,
      result: checkContrast('#ffffff', primaryDark),
    },
    {
      name: '辅色 on 浅色背景',
      foreground: secondary,
      background: primaryLight,
      result: checkContrast(secondary, primaryLight),
    },
    {
      name: '主色 on 深色背景',
      foreground: primary,
      background: bgDark,
      result: checkContrast(primary, bgDark),
    },
    {
      name: '白色文字 on 主色',
      foreground: '#ffffff',
      background: primary,
      result: checkContrast('#ffffff', primary),
    },
    {
      name: '深色文字 on 浅色背景',
      foreground: '#1a1a2e',
      background: primaryLight,
      result: checkContrast('#1a1a2e', primaryLight),
    },
  ]
}
