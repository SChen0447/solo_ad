import * as THREE from 'three';

export type ColorTheme = 'sunset' | 'aurora' | 'neon';

export interface ThemeColors {
  primary: THREE.Color;
  secondary: THREE.Color;
  tertiary: THREE.Color;
  glow: THREE.Color;
}

const sunset: ThemeColors = {
  primary: new THREE.Color(0xff6b35),
  secondary: new THREE.Color(0xffd93d),
  tertiary: new THREE.Color(0xff4757),
  glow: new THREE.Color(0xff8c42),
};

const aurora: ThemeColors = {
  primary: new THREE.Color(0x00d2d3),
  secondary: new THREE.Color(0x54a0ff),
  tertiary: new THREE.Color(0x5f27cd),
  glow: new THREE.Color(0x48dbfb),
};

const neon: ThemeColors = {
  primary: new THREE.Color(0xff00ff),
  secondary: new THREE.Color(0x00ffff),
  tertiary: new THREE.Color(0xffff00),
  glow: new THREE.Color(0xff00ff),
};

export const colorThemes: Record<ColorTheme, ThemeColors> = {
  sunset,
  aurora,
  neon,
};

export function lerpThemeColors(
  from: ThemeColors,
  to: ThemeColors,
  t: number
): ThemeColors {
  return {
    primary: from.primary.clone().lerp(to.primary, t),
    secondary: from.secondary.clone().lerp(to.secondary, t),
    tertiary: from.tertiary.clone().lerp(to.tertiary, t),
    glow: from.glow.clone().lerp(to.glow, t),
  };
}

export function getGradientColor(
  theme: ThemeColors,
  position: number,
  time: number
): THREE.Color {
  const t = (position + time * 0.1) % 1;
  
  if (t < 0.33) {
    const localT = t / 0.33;
    return theme.primary.clone().lerp(theme.secondary, localT);
  } else if (t < 0.66) {
    const localT = (t - 0.33) / 0.33;
    return theme.secondary.clone().lerp(theme.tertiary, localT);
  } else {
    const localT = (t - 0.66) / 0.34;
    return theme.tertiary.clone().lerp(theme.primary, localT);
  }
}

export function adjustSaturation(color: THREE.Color, saturation: number): THREE.Color {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  hsl.s = Math.min(1, Math.max(0, hsl.s * saturation));
  const result = color.clone();
  result.setHSL(hsl.h, hsl.s, hsl.l);
  return result;
}
