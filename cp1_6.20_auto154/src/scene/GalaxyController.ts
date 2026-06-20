export type GalaxyType = 'spiral' | 'elliptical' | 'irregular';

function perlin3D(x: number, y: number, z: number): number {
  const p = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
    140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
    247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
    57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
    74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
    60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
    65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
    200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
    52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
    207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
    119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
    129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
    218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
    81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
    184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
    222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180];
  const perm = new Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + t * (b - a);
  const grad = (hash: number, x: number, y: number, z: number) => {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : (h === 12 || h === 14) ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };

  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);

  const u = fade(x);
  const v = fade(y);
  const w = fade(z);

  const A = perm[X] + Y;
  const AA = perm[A] + Z;
  const AB = perm[A + 1] + Z;
  const B = perm[X + 1] + Y;
  const BA = perm[B] + Z;
  const BB = perm[B + 1] + Z;

  return lerp(
    lerp(
      lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
      lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u),
      v
    ),
    lerp(
      lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
      lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u),
      v
    ),
    w
  );
}

function generateSpiral(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const arms = 4;
  const alpha = 0.5;

  for (let i = 0; i < count; i++) {
    const t = i / count;
    const arm = i % arms;
    const armOffset = (arm / arms) * Math.PI * 2;

    const r = Math.pow(t, 0.5) * radius;
    const theta = t * 4 * Math.PI + armOffset + (Math.random() - 0.5) * 0.3;

    const x = r * Math.cos(theta) * (1 + (Math.random() - 0.5) * 0.2);
    const z = r * Math.sin(theta) * (1 + (Math.random() - 0.5) * 0.2);
    const y = (Math.random() - 0.5) * 2 * (1 - t * 0.8);

    positions[i * 3] = x * alpha + x * (1 - alpha);
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z * alpha + z * (1 - alpha);
  }

  return positions;
}

function generateElliptical(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const xRadius = radius;
  const zRadius = radius / 1.5;

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.pow(Math.random(), 0.5);

    const x = r * xRadius * Math.sin(phi) * Math.cos(theta);
    const z = r * zRadius * Math.sin(phi) * Math.sin(theta);
    const y = (Math.random() - 0.5) * 6;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  return positions;
}

function generateIrregular(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const noiseFreq = 0.1;
  const noiseAmp = 20;

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.pow(Math.random(), 1 / 3) * radius;

    let x = r * Math.sin(phi) * Math.cos(theta);
    let y = r * Math.sin(phi) * Math.sin(theta);
    let z = r * Math.cos(phi);

    const nx = perlin3D(x * noiseFreq, y * noiseFreq, z * noiseFreq);
    const ny = perlin3D(x * noiseFreq + 100, y * noiseFreq + 100, z * noiseFreq + 100);
    const nz = perlin3D(x * noiseFreq + 200, y * noiseFreq + 200, z * noiseFreq + 200);

    x += nx * noiseAmp * 0.3;
    y += ny * noiseAmp * 0.3;
    z += nz * noiseAmp * 0.3;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  return positions;
}

export function generateGalaxyPositions(
  type: GalaxyType,
  count: number,
  radius: number
): Float32Array {
  switch (type) {
    case 'spiral':
      return generateSpiral(count, radius);
    case 'elliptical':
      return generateElliptical(count, radius);
    case 'irregular':
      return generateIrregular(count, radius);
    default:
      return generateSpiral(count, radius);
  }
}

export const GALAXY_RADIUS = 20;
export const PARTICLE_COUNT = 10000;
