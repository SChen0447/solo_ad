import type { ColorPalette } from '../colorEngine/colorTypes'

export function applyTheme(palette: ColorPalette): void {
  const root = document.documentElement

  root.style.setProperty('--color-primary', palette.primary.hex)
  root.style.setProperty('--color-primary-light', palette.primaryLight.hex)
  root.style.setProperty('--color-primary-dark', palette.primaryDark.hex)
  root.style.setProperty('--color-secondary', palette.secondary.hex)
  root.style.setProperty('--color-secondary-light', palette.secondaryLight.hex)
  root.style.setProperty('--color-secondary-dark', palette.secondaryDark.hex)
  root.style.setProperty('--color-success', palette.success.hex)
  root.style.setProperty('--color-warning', palette.warning.hex)
  root.style.setProperty('--color-error', palette.error.hex)
  root.style.setProperty('--color-gray', palette.gray.hex)
}

export function generateCSSVariablesString(palette: ColorPalette): string {
  return `
    --color-primary: ${palette.primary.hex};
    --color-primary-light: ${palette.primaryLight.hex};
    --color-primary-dark: ${palette.primaryDark.hex};
    --color-secondary: ${palette.secondary.hex};
    --color-secondary-light: ${palette.secondaryLight.hex};
    --color-secondary-dark: ${palette.secondaryDark.hex};
    --color-success: ${palette.success.hex};
    --color-warning: ${palette.warning.hex};
    --color-error: ${palette.error.hex};
    --color-gray: ${palette.gray.hex};
  `
}
