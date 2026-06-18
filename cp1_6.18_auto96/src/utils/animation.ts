export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec3(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface Particle {
  id: number;
  position: [number, number, number];
  velocity: [number, number, number];
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private nextId: number = 0;
  private maxParticles: number;

  constructor(maxParticles: number = 200) {
    this.maxParticles = maxParticles;
  }

  emit(
    position: [number, number, number],
    color: string,
    count: number = 3,
    speed: number = 0.02
  ): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI * 2;
      const vel: [number, number, number] = [
        Math.cos(angle1) * Math.sin(angle2) * speed,
        Math.sin(angle1) * Math.sin(angle2) * speed,
        Math.cos(angle2) * speed,
      ];

      this.particles.push({
        id: this.nextId++,
        position: [...position] as [number, number, number],
        velocity: vel,
        color,
        life: 1,
        maxLife: 0.8 + Math.random() * 0.4,
        size: 0.08 + Math.random() * 0.04,
      });
    }
  }

  update(deltaTime: number): void {
    this.particles = this.particles.filter(p => {
      p.life -= deltaTime / p.maxLife;
      if (p.life <= 0) return false;

      p.position[0] += p.velocity[0];
      p.position[1] += p.velocity[1];
      p.position[2] += p.velocity[2];

      p.velocity[0] *= 0.96;
      p.velocity[1] *= 0.96;
      p.velocity[2] *= 0.96;

      return true;
    });
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  clear(): void {
    this.particles = [];
  }
}

export function calculatePeelPosition(
  originalPosition: [number, number, number],
  center: [number, number, number],
  peelRadius: number,
  peelAngle: [number, number],
  progress: number,
  atomIndex: number,
  totalAtoms: number
): [number, number, number] {
  const easedProgress = easeInOutCubic(progress);

  const dir: [number, number, number] = [
    originalPosition[0] - center[0],
    originalPosition[1] - center[1],
    originalPosition[2] - center[2],
  ];

  const originalDist = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]);
  
  if (originalDist < 0.001) {
    const targetPos: [number, number, number] = [
      center[0] + Math.cos(peelAngle[0]) * Math.cos(peelAngle[1]) * peelRadius,
      center[1] + Math.sin(peelAngle[1]) * peelRadius,
      center[2] + Math.sin(peelAngle[0]) * Math.cos(peelAngle[1]) * peelRadius,
    ];
    return lerpVec3(originalPosition, targetPos, easedProgress);
  }

  const normalizedDir: [number, number, number] = [
    dir[0] / originalDist,
    dir[1] / originalDist,
    dir[2] / originalDist,
  ];

  const angleOffset = (atomIndex / Math.max(totalAtoms, 1)) * Math.PI * 2;
  const orbitRadius = peelRadius + Math.sin(angleOffset * 2) * 0.3;

  const radialTarget: [number, number, number] = [
    center[0] + normalizedDir[0] * orbitRadius,
    center[1] + normalizedDir[1] * orbitRadius * 0.8,
    center[2] + normalizedDir[2] * orbitRadius,
  ];

  const angleProgress = easedProgress;
  const swirlAngle = angleProgress * Math.PI * 0.5 * (atomIndex % 2 === 0 ? 1 : -1);
  
  const cosA = Math.cos(swirlAngle);
  const sinA = Math.sin(swirlAngle);
  const swirledTarget: [number, number, number] = [
    center[0] + (radialTarget[0] - center[0]) * cosA - (radialTarget[2] - center[2]) * sinA,
    radialTarget[1],
    center[2] + (radialTarget[0] - center[0]) * sinA + (radialTarget[2] - center[2]) * cosA,
  ];

  const liftAmount = Math.sin(easedProgress * Math.PI) * 0.5;
  swirledTarget[1] += liftAmount;

  return lerpVec3(originalPosition, swirledTarget, easedProgress);
}

export function calculateBondPosition(
  atom1Pos: [number, number, number],
  atom2Pos: [number, number, number]
): { position: [number, number, number]; rotation: [number, number, number]; length: number } {
  const mid: [number, number, number] = [
    (atom1Pos[0] + atom2Pos[0]) / 2,
    (atom1Pos[1] + atom2Pos[1]) / 2,
    (atom1Pos[2] + atom2Pos[2]) / 2,
  ];

  const dx = atom2Pos[0] - atom1Pos[0];
  const dy = atom2Pos[1] - atom1Pos[1];
  const dz = atom2Pos[2] - atom1Pos[2];
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const yaw = Math.atan2(dx, dz);
  const pitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));

  return {
    position: mid,
    rotation: [pitch, yaw, 0],
    length,
  };
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 1, g: 1, b: 1 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
