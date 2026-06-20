export interface ForceParams {
  x: number;
  y: number;
  z: number;
  turbulence: number;
}

export interface Preset {
  id: string;
  name: string;
  forces: ForceParams;
}

export const presets: Preset[] = [
  {
    id: 'turbulence',
    name: '湍流',
    forces: { x: 0.8, y: 0.5, z: 0.6, turbulence: 1.2 }
  },
  {
    id: 'spiral',
    name: '螺旋',
    forces: { x: 1.0, y: 1.5, z: -0.8, turbulence: 0.3 }
  },
  {
    id: 'vortex',
    name: '涡流',
    forces: { x: 1.5, y: 0.2, z: 1.5, turbulence: 0.5 }
  },
  {
    id: 'gravity',
    name: '引力场',
    forces: { x: 0.0, y: -1.8, z: 0.0, turbulence: 0.2 }
  },
  {
    id: 'brownian',
    name: '布朗运动',
    forces: { x: 0.0, y: 0.0, z: 0.0, turbulence: 2.0 }
  }
];

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpForceParams(a: ForceParams, b: ForceParams, t: number): ForceParams {
  const easedT = easeInOutCubic(t);
  return {
    x: lerp(a.x, b.x, easedT),
    y: lerp(a.y, b.y, easedT),
    z: lerp(a.z, b.z, easedT),
    turbulence: lerp(a.turbulence, b.turbulence, easedT)
  };
}

export function calculateVectorForce(
  position: { x: number; y: number; z: number },
  forces: ForceParams,
  time: number
): { x: number; y: number; z: number } {
  const baseForce = {
    x: forces.x,
    y: forces.y,
    z: forces.z
  };

  const distance = Math.sqrt(
    position.x * position.x +
    position.y * position.y +
    position.z * position.z
  );

  const vortexFactor = distance > 0.01 ? 1 / (distance + 0.5) : 2;
  const swirlX = -position.z * vortexFactor * 0.3;
  const swirlZ = position.x * vortexFactor * 0.3;

  const noiseX = (Math.sin(position.y * 2.1 + time * 0.7) + Math.cos(position.z * 1.8 + time * 0.5)) * 0.3;
  const noiseY = (Math.sin(position.x * 2.3 + time * 0.6) + Math.cos(position.z * 2.0 + time * 0.8)) * 0.3;
  const noiseZ = (Math.sin(position.x * 1.9 + time * 0.4) + Math.cos(position.y * 2.2 + time * 0.7)) * 0.3;

  const turbulenceMultiplier = forces.turbulence;

  return {
    x: baseForce.x + swirlX + noiseX * turbulenceMultiplier,
    y: baseForce.y + noiseY * turbulenceMultiplier,
    z: baseForce.z + swirlZ + noiseZ * turbulenceMultiplier
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export const PARTICLE_COUNT = 2000;
export const PARTICLE_RADIUS = 0.08;
export const TRAIL_LENGTH = 30;
export const TRAIL_WIDTH = 0.02;
export const TRAIL_FADE_START = 0.8;
export const TRAIL_FADE_END = 0.0;
export const BOUNDARY = 8;

export const COLOR_START = { r: 0, g: 0.83, b: 1 };
export const COLOR_END = { r: 1, g: 0.42, b: 0.21 };

export function getParticleColor(index: number, total: number): { r: number; g: number; b: number } {
  const t = index / total;
  return {
    r: lerp(COLOR_START.r, COLOR_END.r, t),
    g: lerp(COLOR_START.g, COLOR_END.g, t),
    b: lerp(COLOR_START.b, COLOR_END.b, t)
  };
}
