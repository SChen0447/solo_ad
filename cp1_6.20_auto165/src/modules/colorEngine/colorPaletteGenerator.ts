import tinycolor from 'tinycolor2'
import type { ColorPalette, ColorSwatch } from './colorTypes'

function createSwatch(name: string, variableName: string, hex: string, isLight = false): ColorSwatch {
  return { name, variableName, hex: hex.toUpperCase(), isLight }
}

function generateLightVariant(baseHex: string): string {
  const color = tinycolor(baseHex)
  return color.clone().lighten(30).toHexString()
}

function generateDarkVariant(baseHex: string): string {
  const color = tinycolor(baseHex)
  return color.clone().darken(15).toHexString()
}

function generateSuccessColor(): string {
  return '#27ae60'
}

function generateWarningColor(): string {
  return '#f39c12'
}

function generateErrorColor(): string {
  return '#e74c3c'
}

function generateGrayColor(): string {
  return '#6c757d'
}

export function generatePalette(primaryHex: string): ColorPalette {
  const primary = tinycolor(primaryHex).toHexString()
  const secondary = tinycolor(primary).spin(120).toHexString()

  const primaryLight = generateLightVariant(primary)
  const primaryDark = generateDarkVariant(primary)
  const secondaryLight = generateLightVariant(secondary)
  const secondaryDark = generateDarkVariant(secondary)
  const success = generateSuccessColor()
  const warning = generateWarningColor()
  const error = generateErrorColor()
  const gray = generateGrayColor()

  return {
    primary: createSwatch('主色', '--color-primary', primary),
    primaryLight: createSwatch('主色浅色', '--color-primary-light', primaryLight, true),
    primaryDark: createSwatch('主色深色', '--color-primary-dark', primaryDark),
    secondary: createSwatch('辅色', '--color-secondary', secondary),
    secondaryLight: createSwatch('辅色浅色', '--color-secondary-light', secondaryLight, true),
    secondaryDark: createSwatch('辅色深色', '--color-secondary-dark', secondaryDark),
    success: createSwatch('成功色', '--color-success', success),
    warning: createSwatch('警告色', '--color-warning', warning),
    error: createSwatch('错误色', '--color-error', error),
    gray: createSwatch('中性灰', '--color-gray', gray),
  }
}

export function getPaletteArray(palette: ColorPalette): ColorSwatch[] {
  return [
    palette.primary,
    palette.primaryLight,
    palette.primaryDark,
    palette.secondary,
    palette.secondaryLight,
    palette.secondaryDark,
    palette.success,
    palette.warning,
    palette.error,
    palette.gray,
  ]
}
