import { v4 as uuidv4 } from 'uuid';
import type { ParticleData, CloudParams, AnimationFrame } from '../types';

export function normalizeCoefficients(coef: { s: number; p: number; d: number }): { s: number; p: number; d: number } {
  const sumSq = coef.s * coef.s + coef.p * coef.p + coef.d * coef.d;
  if (sumSq === 0) return { s: 1, p: 0, d: 0 };
  const norm = Math.sqrt(sumSq);
  return {
    s: coef.s / norm,
    p: coef.p / norm,
    d: coef.d / norm,
  };
}

export function probabilityDensityToColor(density: number): string {
  const t = Math.min(1, Math.max(0, density));
  let r: number, g: number, b: number;
  if (t < 0.5) {
    const k = t * 2;
    r = Math.round(k * 128);
    g = Math.round(k * 0);
    b = Math.round(255 - k * 128);
  } else {
    const k = (t - 0.5) * 2;
    r = Math.round(128 + k * 127);
    g = Math.round(k * 64);
    b = Math.round(127 - k * 127);
  }
  return `rgb(${r},${g},${b})`;
}

function sOrbital(x: number, y: number, z: number, n: number): number {
  const r = Math.sqrt(x * x + y * y + z * z);
  const scale = n * 0.8;
  const normalized = r / scale;
  return Math.exp(-normalized) * (1 + (n > 1 ? Math.cos(normalized * n) * 0.3 : 0));
}

function pOrbital(x: number, y: number, z: number, n: number): number {
  const r = Math.sqrt(x * x + y * y + z * z);
  const scale = n * 0.8;
  const normalized = r / scale;
  const theta = r > 0 ? Math.acos(z / r) : 0;
  const angular = Math.cos(theta);
  return Math.exp(-normalized) * Math.abs(angular) * (1 + (n > 2 ? Math.sin(normalized * (n - 1)) * 0.2 : 0));
}

function dOrbital(x: number, y: number, z: number, n: number): number {
  const r = Math.sqrt(x * x + y * y + z * z);
  const scale = n * 0.8;
  const normalized = r / scale;
  const theta = r > 0 ? Math.acos(z / r) : 0;
  const phi = Math.atan2(y, x);
  const angular = Math.sin(theta) * Math.sin(theta) * Math.cos(2 * phi);
  return Math.exp(-normalized) * Math.abs(angular) * (1 + (n > 3 ? Math.cos(normalized * (n - 2)) * 0.2 : 0));
}

export function superpositionWavefunction(
  n: number,
  pos: [number, number, number],
  coef: { s: number; p: number; d: number }
): number {
  const normalized = normalizeCoefficients(coef);
  const [x, y, z] = pos;
  const s = normalized.s * sOrbital(x, y, z, n);
  const p = normalized.p * pOrbital(x, y, z, n);
  const d = normalized.d * dOrbital(x, y, z, n);
  const psi = s + p + d;
  return psi * psi;
}

function getParticleCount(nLevel: number): number {
  const minCount = 500;
  const maxCount = 5000;
  const t = (nLevel - 1) / 9;
  return Math.round(minCount + (maxCount - minCount) * Math.pow(t, 1.5));
}

export function generateProbabilityCloud(params: CloudParams): ParticleData[] {
  const { nLevel, coefficient } = params;
  const count = getParticleCount(nLevel);
  const particles: ParticleData[] = [];
  const radius = 2 + nLevel * 0.6;

  let maxDensity = 0;
  const tempPositions: Array<{ pos: [number, number, number]; density: number }> = [];

  for (let i = 0; i < count * 3; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = Math.pow(Math.random(), 1 / 3) * radius;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    const density = superpositionWavefunction(nLevel, [x, y, z], coefficient);
    if (density > maxDensity) maxDensity = density;
    tempPositions.push({ pos: [x, y, z], density });
  }

  const threshold = maxDensity * 0.02;
  const filtered = tempPositions.filter((p) => p.density > threshold);
  const selected = filtered.length > count ? filtered.slice(0, count) : filtered;

  for (let i = 0; i < selected.length; i++) {
    const { pos, density } = selected[i];
    const normalizedDensity = maxDensity > 0 ? density / maxDensity : 0;
    particles.push({
      id: uuidv4(),
      position: pos,
      probability: normalizedDensity,
      color: probabilityDensityToColor(normalizedDensity),
    });
  }

  return particles;
}

export function getCollapseAnimation(
  targetPos: [number, number, number],
  particles: ParticleData[],
  progress: number
): AnimationFrame[] {
  const frames: AnimationFrame[] = [];
  const batchSize = Math.min(500, particles.length);

  for (let i = 0; i < batchSize; i++) {
    const p = particles[i];
    if (!p) continue;

    let newPos: [number, number, number];
    let opacity: number;

    if (progress < 0.5) {
      const t = progress / 0.5;
      const easeT = t * t * (3 - 2 * t);
      newPos = [
        p.position[0] + (targetPos[0] - p.position[0]) * easeT,
        p.position[1] + (targetPos[1] - p.position[1]) * easeT,
        p.position[2] + (targetPos[2] - p.position[2]) * easeT,
      ];
      opacity = 0.5 + easeT * 0.5;
    } else {
      const t = (progress - 0.5) / 0.5;
      const easeT = t * t;
      const explosionRadius = easeT * 6;
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.acos(2 * Math.random() - 1);
      const ex = explosionRadius * Math.sin(angle2) * Math.cos(angle1);
      const ey = explosionRadius * Math.sin(angle2) * Math.sin(angle1);
      const ez = explosionRadius * Math.cos(angle2);
      newPos = [targetPos[0] + ex, targetPos[1] + ey, targetPos[2] + ez];
      opacity = 1 - easeT;
    }

    frames.push({
      particleId: p.id,
      position: newPos,
      opacity,
    });
  }

  return frames;
}
