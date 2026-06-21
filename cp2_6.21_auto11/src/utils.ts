import * as THREE from 'three';

export const MIN_LIFETIME = 3;
export const MAX_LIFETIME = 6;
export const BASE_RADIUS = 1.5;
export const TOP_RADIUS = 0.5;
export const FLAME_HEIGHT = 7;

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomLifecycle(): number {
  return randomRange(MIN_LIFETIME, MAX_LIFETIME);
}

export function averageLifetime(): number {
  return (MIN_LIFETIME + MAX_LIFETIME) / 2;
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

export function getFlameRadius(y: number, flameWidth: number): number {
  const safeWidth = Math.max(0.01, flameWidth);
  const t = Math.max(0, Math.min(1, (y + 1) / FLAME_HEIGHT));
  const r = BASE_RADIUS + (TOP_RADIUS - BASE_RADIUS) * t;
  return r * safeWidth;
}
