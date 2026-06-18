import { NebulaParameters, ParticleData, COLOR_SCHEMES } from '../store/useStore';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(
  c1: number[],
  c2: number[],
  t: number
): [number, number, number] {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

function randomInSphereShell(
  innerR: number,
  outerR: number
): [number, number, number] {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = Math.cbrt(Math.random()) * (outerR - innerR) + innerR;
  return [
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
  ];
}

export function generateNebulaData(params: NebulaParameters): ParticleData {
  const { density, colorScheme, particleSize, spread } = params;
  const count = density;
  const baseRadius = 5 * spread;
  const innerRadius = baseRadius * 0.3;
  const outerRadius = baseRadius;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const orbitRadii = new Float32Array(count);
  const orbitSpeeds = new Float32Array(count);
  const orbitPhases = new Float32Array(count);
  const opacityOffsets = new Float32Array(count);

  const scheme = COLOR_SCHEMES[colorScheme];
  const gradientStops = scheme.colors;

  for (let i = 0; i < count; i++) {
    const [x, y, z] = randomInSphereShell(innerRadius, outerRadius);

    const noiseX = (Math.random() - 0.5) * 1.5 * spread;
    const noiseY = (Math.random() - 0.5) * 1.5 * spread;
    const noiseZ = (Math.random() - 0.5) * 1.5 * spread;

    positions[i * 3] = x + noiseX;
    positions[i * 3 + 1] = y + noiseY;
    positions[i * 3 + 2] = z + noiseZ;

    const dist = Math.sqrt(x * x + y * y + z * z);
    const normalizedDist = Math.min(dist / outerRadius, 1.0);

    const gradientT = normalizedDist * (gradientStops.length - 1);
    const segIdx = Math.min(Math.floor(gradientT), gradientStops.length - 2);
    const segT = gradientT - segIdx;

    const color = lerpColor(gradientStops[segIdx], gradientStops[segIdx + 1], segT);

    const colorNoise = 0.1;
    colors[i * 3] = Math.min(1, Math.max(0, color[0] + (Math.random() - 0.5) * colorNoise));
    colors[i * 3 + 1] = Math.min(1, Math.max(0, color[1] + (Math.random() - 0.5) * colorNoise));
    colors[i * 3 + 2] = Math.min(1, Math.max(0, color[2] + (Math.random() - 0.5) * colorNoise));

    sizes[i] = particleSize * (0.5 + Math.random() * 1.0);

    orbitRadii[i] = Math.random() * 0.3 + 0.1;
    orbitSpeeds[i] = (Math.random() * 0.5 + 0.2) * (Math.random() > 0.5 ? 1 : -1);
    orbitPhases[i] = Math.random() * Math.PI * 2;
    opacityOffsets[i] = Math.random() * Math.PI * 2;
  }

  return {
    positions,
    colors,
    sizes,
    orbitRadii,
    orbitSpeeds,
    orbitPhases,
    opacityOffsets,
    count,
  };
}

export function createParticleTexture(): HTMLCanvasElement {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return canvas;
}
