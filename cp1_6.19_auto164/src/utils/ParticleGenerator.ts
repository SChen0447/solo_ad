import type { ParticleData, SandboxConfig } from './types';

const SAND_COLORS = [
  '#E6C88A',
  '#D4B86A',
  '#C9A961',
  '#BE9A58',
  '#DDB88A',
  '#E8D5A3',
  '#C4A35A',
  '#D4B06A',
];

function getRandomSandColor(): string {
  return SAND_COLORS[Math.floor(Math.random() * SAND_COLORS.length)];
}

function getRandomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function generateInitialParticles(
  count: number,
  sandboxConfig: SandboxConfig,
  particleRadius: number,
  particleMass: number
): ParticleData[] {
  const particles: ParticleData[] = [];
  const { width, height, depth } = sandboxConfig;
  const halfW = width / 2 - particleRadius;
  const halfD = depth / 2 - particleRadius;
  const spawnHeight = height / 2 - particleRadius;

  for (let i = 0; i < count; i++) {
    const x = getRandomBetween(-halfW, halfW);
    const z = getRandomBetween(-halfD, halfD);
    const y = spawnHeight + getRandomBetween(0, 2);

    particles.push({
      id: i,
      position: { x, y, z },
      velocity: { x: 0, y: 0, z: 0 },
      color: getRandomSandColor(),
      mass: particleMass,
      radius: particleRadius,
    });
  }

  return particles;
}

export function generateEmitParticle(
  position: { x: number; y: number; z: number },
  direction: { x: number; y: number; z: number },
  speed: number,
  radius: number,
  mass: number,
  spread: number
): ParticleData {
  const randomOffset = {
    x: (Math.random() - 0.5) * spread,
    y: (Math.random() - 0.5) * spread * 0.5,
    z: (Math.random() - 0.5) * spread,
  };

  const velocity = {
    x: direction.x * speed + randomOffset.x,
    y: direction.y * speed + randomOffset.y,
    z: direction.z * speed + randomOffset.z,
  };

  return {
    id: -1,
    position: {
      x: position.x + randomOffset.x,
      y: position.y + randomOffset.y,
      z: position.z + randomOffset.z,
    },
    velocity,
    color: getRandomSandColor(),
    mass,
    radius,
  };
}

export function adjustColorBrightness(color: string, factor: number): string {
  const hex = color.replace('#', '');
  const r = Math.min(255, Math.floor(parseInt(hex.substring(0, 2), 16) * factor));
  const g = Math.min(255, Math.floor(parseInt(hex.substring(2, 4), 16) * factor));
  const b = Math.min(255, Math.floor(parseInt(hex.substring(4, 6), 16) * factor));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
