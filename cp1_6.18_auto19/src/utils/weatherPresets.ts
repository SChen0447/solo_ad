import { WeatherPreset } from '../types';
import * as THREE from 'three';

export const weatherPresets: Record<string, WeatherPreset> = {
  sunny: {
    name: '晴天',
    ambientColor: '#ffffff',
    ambientIntensity: 0.6,
    directionalColor: '#fff5e6',
    directionalIntensity: 1.2,
    skyColor: '#87ceeb',
    fogColor: '#c9e8f5',
    fogDensity: 0.008,
    shadowSoftness: 0.5,
    sunPosition: [50, 80, 30]
  },
  cloudy: {
    name: '阴天',
    ambientColor: '#d0d8e0',
    ambientIntensity: 0.9,
    directionalColor: '#c0c8d0',
    directionalIntensity: 0.4,
    skyColor: '#9aa8b8',
    fogColor: '#a8b4c0',
    fogDensity: 0.02,
    shadowSoftness: 0.9,
    sunPosition: [30, 50, 20]
  },
  dusk: {
    name: '黄昏',
    ambientColor: '#ff6b35',
    ambientIntensity: 0.5,
    directionalColor: '#ff8c42',
    directionalIntensity: 0.8,
    skyColor: '#ff6b35',
    fogColor: '#ff9966',
    fogDensity: 0.012,
    shadowSoftness: 0.7,
    sunPosition: [-60, 25, 10]
  }
};

export function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  const result = c1.clone().lerp(c2, t);
  return `#${result.getHexString()}`;
}

export function lerpNumber(n1: number, n2: number, t: number): number {
  return n1 + (n2 - n1) * t;
}

export function lerpWeather(
  from: WeatherPreset,
  to: WeatherPreset,
  t: number
): WeatherPreset {
  return {
    name: to.name,
    ambientColor: lerpColor(from.ambientColor, to.ambientColor, t),
    ambientIntensity: lerpNumber(from.ambientIntensity, to.ambientIntensity, t),
    directionalColor: lerpColor(from.directionalColor, to.directionalColor, t),
    directionalIntensity: lerpNumber(from.directionalIntensity, to.directionalIntensity, t),
    skyColor: lerpColor(from.skyColor, to.skyColor, t),
    fogColor: lerpColor(from.fogColor, to.fogColor, t),
    fogDensity: lerpNumber(from.fogDensity, to.fogDensity, t),
    shadowSoftness: lerpNumber(from.shadowSoftness, to.shadowSoftness, t),
    sunPosition: [
      lerpNumber(from.sunPosition[0], to.sunPosition[0], t),
      lerpNumber(from.sunPosition[1], to.sunPosition[1], t),
      lerpNumber(from.sunPosition[2], to.sunPosition[2], t)
    ] as [number, number, number]
  };
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
