import * as THREE from 'three';
import { PresetConfig, PresetMode, EmitterConfig, PresetBehavior, SizeCurve } from '@/types';

export const DEFAULT_EMITTER_CONFIG: EmitterConfig = {
  position: new THREE.Vector3(0, 0, 0),
  emissionRate: 50,
  initialSpeed: 2,
  lifetime: 3,
  startColor: '#FF6B35',
  endColor: '#FFD700',
  sizeCurve: 'linear' as SizeCurve,
  trailLength: 5,
  particleRadius: 0.05,
};

export const PRESET_CONFIGS: Record<PresetMode, PresetConfig> = {
  default: {
    name: '默认模式',
    icon: '✨',
    config: {},
    behavior: {},
  },
  fire: {
    name: '火焰模式',
    icon: '🔥',
    config: {
      emissionRate: 100,
      initialSpeed: 1.5,
      lifetime: 2,
      startColor: '#FF4500',
      endColor: '#FF0000',
      sizeCurve: 'growShrink' as SizeCurve,
    },
    behavior: {
      upwardForce: 2.0,
      colorStops: [
        { position: 0, color: '#FF4500' },
        { position: 0.5, color: '#FFD700' },
        { position: 1, color: '#FF0000' },
      ],
    },
  },
  smoke: {
    name: '烟雾模式',
    icon: '💨',
    config: {
      emissionRate: 30,
      initialSpeed: 0.8,
      lifetime: 5,
      startColor: '#555555',
      endColor: '#999999',
      sizeCurve: 'growShrink' as SizeCurve,
    },
    behavior: {
      gravity: -0.1,
      spin: true,
    },
  },
  dust: {
    name: '粉尘爆炸',
    icon: '💥',
    config: {
      emissionRate: 200,
      initialSpeed: 4.0,
      lifetime: 1.5,
      startColor: '#E8E8E8',
      endColor: '#FFD700',
      sizeCurve: 'linear' as SizeCurve,
    },
    behavior: {
      gravity: 0.5,
    },
  },
};

export function calculateSize(
  normalizedAge: number,
  curve: SizeCurve,
  startSize: number,
  endSize: number
): number {
  switch (curve) {
    case 'linear':
      return startSize + (endSize - startSize) * normalizedAge;
    case 'growShrink': {
      const peak = 0.3;
      if (normalizedAge < peak) {
        const t = normalizedAge / peak;
        return startSize + (endSize * 1.5 - startSize) * t;
      } else {
        const t = (normalizedAge - peak) / (1 - peak);
        return endSize * 1.5 * (1 - t) + endSize * t;
      }
    }
    case 'shrinkGrow': {
      const valley = 0.5;
      if (normalizedAge < valley) {
        const t = normalizedAge / valley;
        return startSize * (1 - t * 0.5);
      } else {
        const t = (normalizedAge - valley) / (1 - valley);
        return startSize * 0.5 + (endSize - startSize * 0.5) * t;
      }
    }
  }
}

export function interpolateColor(
  normalizedAge: number,
  startColor: THREE.Color,
  endColor: THREE.Color,
  colorStops?: { position: number; color: string }[]
): THREE.Color {
  if (colorStops && colorStops.length >= 2) {
    for (let i = 0; i < colorStops.length - 1; i++) {
      const current = colorStops[i];
      const next = colorStops[i + 1];
      if (normalizedAge >= current.position && normalizedAge <= next.position) {
        const segmentT = (normalizedAge - current.position) / (next.position - current.position);
        const c1 = new THREE.Color(current.color);
        const c2 = new THREE.Color(next.color);
        return c1.clone().lerp(c2, segmentT);
      }
    }
    const last = colorStops[colorStops.length - 1];
    return new THREE.Color(last.color);
  }
  return startColor.clone().lerp(endColor, normalizedAge);
}

export function getRandomSphericalDirection(): THREE.Vector3 {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.sin(phi) * Math.sin(theta),
    Math.cos(phi)
  );
}
