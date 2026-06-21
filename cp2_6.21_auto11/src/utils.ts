import * as THREE from 'three';

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomLifecycle(): number {
  return randomRange(3, 6);
}

export interface ColorScheme {
  bottom: THREE.Color;
  middle: THREE.Color;
  top: THREE.Color;
}

export const COLOR_SCHEMES: Record<string, ColorScheme> = {
  '橙黄渐变': {
    bottom: new THREE.Color('#FF6600'),
    middle: new THREE.Color('#FFCC00'),
    top: new THREE.Color('#CC0000'),
  },
  '蓝紫渐变': {
    bottom: new THREE.Color('#0066FF'),
    middle: new THREE.Color('#CC00FF'),
    top: new THREE.Color('#6600CC'),
  },
  '红绿渐变': {
    bottom: new THREE.Color('#FF0000'),
    middle: new THREE.Color('#FFFF00'),
    top: new THREE.Color('#00CC00'),
  },
};

export function getFlameColor(lifeRatio: number, scheme: ColorScheme): THREE.Color {
  const color = new THREE.Color();
  if (lifeRatio < 0.4) {
    color.lerpColors(scheme.bottom, scheme.middle, lifeRatio / 0.4);
  } else {
    color.lerpColors(scheme.middle, scheme.top, (lifeRatio - 0.4) / 0.6);
  }
  return color;
}

export function getFlameRadius(y: number, baseWidth: number): number {
  const flameHeight = 7;
  const t = Math.max(0, Math.min(1, (y + 1) / flameHeight));
  const topRatio = 0.5 / 1.5;
  return baseWidth * (1 - t * (1 - topRatio));
}
