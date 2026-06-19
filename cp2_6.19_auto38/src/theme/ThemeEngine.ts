import {
  lighten,
  darken,
  ensureContrast,
  getTextColor,
  createGradient,
  hexWithOpacity,
  getContrastRatio,
} from './colorUtils';

export interface Theme {
  primary: string;
  secondary: string;
  background: string;
  primaryLight: string;
  primaryDark: string;
  secondaryLight: string;
  secondaryDark: string;
  textPrimary: string;
  textSecondary: string;
  textOnPrimary: string;
  textOnSecondary: string;
  borderColor: string;
  shadowColor: string;
  gradientPrimary: string;
  gradientSecondary: string;
  borderRadius: string;
  shadow: string;
  hoverShadow: string;
  cssVars: Record<string, string>;
}

export interface PresetTheme {
  name: string;
  primary: string;
  secondary: string;
  background: string;
}

export const presetThemes: PresetTheme[] = [
  { name: '海洋蓝', primary: '#1E88E5', secondary: '#42A5F5', background: '#E3F2FD' },
  { name: '森林绿', primary: '#43A047', secondary: '#66BB6A', background: '#E8F5E9' },
  { name: '日落橙', primary: '#FB8C00', secondary: '#FFA726', background: '#FFF3E0' },
  { name: '暗夜紫', primary: '#7B1FA2', secondary: '#AB47BC', background: '#F3E5F5' },
  { name: '樱花粉', primary: '#EC407A', secondary: '#F06292', background: '#FCE4EC' },
  { name: '极简灰', primary: '#616161', secondary: '#9E9E9E', background: '#FAFAFA' },
];

export function generateTheme(
  primary: string,
  secondary: string,
  background: string,
  brightness: number = 0
): Theme {
  const adjustedPrimary = lighten(primary, brightness);
  const adjustedSecondary = lighten(secondary, brightness);
  const adjustedBackground = lighten(background, brightness);

  const primaryLight = lighten(adjustedPrimary, 20);
  const primaryDark = darken(adjustedPrimary, 15);
  const secondaryLight = lighten(adjustedSecondary, 20);
  const secondaryDark = darken(adjustedSecondary, 15);

  const textPrimary = ensureContrast(getTextColor(adjustedBackground), adjustedBackground);
  const textSecondary = ensureContrast(
    darken(textPrimary, 20),
    adjustedBackground,
    4.5
  );

  const textOnPrimary = ensureContrast(getTextColor(adjustedPrimary), adjustedPrimary);
  const textOnSecondary = ensureContrast(getTextColor(adjustedSecondary), adjustedSecondary);

  const borderColor = hexWithOpacity(textPrimary, 0.12);
  const shadowColor = hexWithOpacity(adjustedPrimary, 0.15);

  const gradientPrimary = createGradient(primaryLight, primaryDark);
  const gradientSecondary = createGradient(secondaryLight, secondaryDark);

  const borderRadius = '8px';
  const shadow = `0 2px 8px ${shadowColor}`;
  const hoverShadow = `0 4px 16px ${shadowColor}`;

  const cssVars: Record<string, string> = {
    '--color-primary': adjustedPrimary,
    '--color-secondary': adjustedSecondary,
    '--color-background': adjustedBackground,
    '--color-primary-light': primaryLight,
    '--color-primary-dark': primaryDark,
    '--color-secondary-light': secondaryLight,
    '--color-secondary-dark': secondaryDark,
    '--color-text-primary': textPrimary,
    '--color-text-secondary': textSecondary,
    '--color-text-on-primary': textOnPrimary,
    '--color-text-on-secondary': textOnSecondary,
    '--color-border': borderColor,
    '--color-shadow': shadowColor,
    '--gradient-primary': gradientPrimary,
    '--gradient-secondary': gradientSecondary,
    '--border-radius': borderRadius,
    '--shadow': shadow,
    '--hover-shadow': hoverShadow,
  };

  return {
    primary: adjustedPrimary,
    secondary: adjustedSecondary,
    background: adjustedBackground,
    primaryLight,
    primaryDark,
    secondaryLight,
    secondaryDark,
    textPrimary,
    textSecondary,
    textOnPrimary,
    textOnSecondary,
    borderColor,
    shadowColor,
    gradientPrimary,
    gradientSecondary,
    borderRadius,
    shadow,
    hoverShadow,
    cssVars,
  };
}

export function checkContrastCompliance(theme: Theme): {
  compliant: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const minRatio = 4.5;

  const ratios: [string, string, string][] = [
    [theme.textPrimary, theme.background, '主文本与背景色'],
    [theme.textSecondary, theme.background, '次要文本与背景色'],
    [theme.textOnPrimary, theme.primary, '主色上的文本与主色'],
    [theme.textOnSecondary, theme.secondary, '辅色上的文本与辅色'],
  ];

  for (const [fg, bg, label] of ratios) {
    const ratio = getContrastRatio(fg, bg);
    if (ratio < minRatio) {
      issues.push(`${label}对比度为 ${ratio.toFixed(2)}:1，低于WCAG AA标准 ${minRatio}:1`);
    }
  }

  return {
    compliant: issues.length === 0,
    issues,
  };
}
