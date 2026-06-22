import * as THREE from 'three';

export interface GalaxyConfig {
  coreRadius: number;
  coreParticles: number;
  coreColorStart: string;
  coreColorEnd: string;
  armCount: number;
  armParticles: number;
  armColorStart: string;
  armColorEnd: string;
  armStartAngle: number;
  spiralFactor: number;
  particleSizeMin: number;
  particleSizeMax: number;
  rotationSpeed: number;
  dustLayers: number;
  dustParticlesPerLayer: number;
  dustColor: string;
  dustOpacity: number;
  dustSize: number;
  dustMinRadius: number;
  dustMaxRadius: number;
  dustAxialRange: number;
}

export const defaultGalaxyConfig: GalaxyConfig = {
  coreRadius: 0.5,
  coreParticles: 1500,
  coreColorStart: '#FFD700',
  coreColorEnd: '#FF8C00',
  armCount: 4,
  armParticles: 1500,
  armColorStart: '#87CEEB',
  armColorEnd: '#4B0082',
  armStartAngle: 0.8,
  spiralFactor: 2.0,
  particleSizeMin: 0.05,
  particleSizeMax: 0.2,
  rotationSpeed: 0.02,
  dustLayers: 2,
  dustParticlesPerLayer: 2000,
  dustColor: '#2F4F4F',
  dustOpacity: 0.2,
  dustSize: 0.3,
  dustMinRadius: 0.5,
  dustMaxRadius: 1.5,
  dustAxialRange: 0.5
};

function lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  const result = color1.clone();
  result.lerp(color2, t);
  return result;
}

export function generateCoreParticles(
  config: GalaxyConfig,
  positions: Float32Array,
  colors: Float32Array,
  sizes: Float32Array,
  startIndex: number
): number {
  const colorStart = new THREE.Color(config.coreColorStart);
  const colorEnd = new THREE.Color(config.coreColorEnd);

  for (let i = 0; i < config.coreParticles; i++) {
    const idx = startIndex + i;
    const posIdx = idx * 3;
    const colIdx = idx * 3;

    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = config.coreRadius * Math.pow(Math.random(), 1 / 3);

    positions[posIdx] = r * Math.sin(phi) * Math.cos(theta);
    positions[posIdx + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[posIdx + 2] = r * Math.cos(phi);

    const distFactor = r / config.coreRadius;
    const color = lerpColor(colorStart, colorEnd, distFactor);
    colors[colIdx] = color.r;
    colors[colIdx + 1] = color.g;
    colors[colIdx + 2] = color.b;

    sizes[idx] = config.particleSizeMin + Math.random() * (config.particleSizeMax - config.particleSizeMin);
  }

  return startIndex + config.coreParticles;
}

export function generateArmParticles(
  config: GalaxyConfig,
  positions: Float32Array,
  colors: Float32Array,
  sizes: Float32Array,
  startIndex: number,
  performanceScale: number = 1
): number {
  const colorStart = new THREE.Color(config.armColorStart);
  const colorEnd = new THREE.Color(config.armColorEnd);
  const particlesPerArm = Math.floor(config.armParticles * performanceScale);
  const maxRadius = config.armStartAngle + config.spiralFactor * 4;

  for (let arm = 0; arm < config.armCount; arm++) {
    const armAngleOffset = (arm / config.armCount) * Math.PI * 2;

    for (let i = 0; i < particlesPerArm; i++) {
      const idx = startIndex + arm * particlesPerArm + i;
      const posIdx = idx * 3;
      const colIdx = idx * 3;

      const t = i / particlesPerArm;
      const angle = config.armStartAngle + t * config.spiralFactor * Math.PI * 2 + armAngleOffset;
      const radius = config.coreRadius + t * (maxRadius - config.coreRadius);

      const spread = (1 - t * 0.7) * 0.3;
      const offsetX = (Math.random() - 0.5) * spread * radius;
      const offsetY = (Math.random() - 0.5) * spread * 0.2;
      const offsetZ = (Math.random() - 0.5) * spread * radius;

      positions[posIdx] = radius * Math.cos(angle) + offsetX;
      positions[posIdx + 1] = offsetY;
      positions[posIdx + 2] = radius * Math.sin(angle) + offsetZ;

      const color = lerpColor(colorStart, colorEnd, t);
      colors[colIdx] = color.r;
      colors[colIdx + 1] = color.g;
      colors[colIdx + 2] = color.b;

      sizes[idx] = config.particleSizeMin + Math.random() * (config.particleSizeMax - config.particleSizeMin);
    }
  }

  return startIndex + config.armCount * particlesPerArm;
}

export function generateDustParticles(
  config: GalaxyConfig,
  positions: Float32Array,
  colors: Float32Array,
  opacities: Float32Array,
  sizes: Float32Array,
  startIndex: number,
  performanceScale: number = 1
): number {
  const color = new THREE.Color(config.dustColor);
  const totalDust = Math.floor(config.dustLayers * config.dustParticlesPerLayer * performanceScale);
  const dustMaxRadius = 5;

  for (let i = 0; i < totalDust; i++) {
    const idx = startIndex + i;
    const posIdx = idx * 3;
    const colIdx = idx * 3;

    const layer = i < totalDust / 2 ? 1 : -1;
    const angle = Math.random() * Math.PI * 2;
    const radius = config.dustMinRadius + Math.random() * (dustMaxRadius - config.dustMinRadius);

    positions[posIdx] = radius * Math.cos(angle);
    positions[posIdx + 1] = layer * (config.dustAxialRange + Math.random() * config.dustAxialRange);
    positions[posIdx + 2] = radius * Math.sin(angle);

    colors[colIdx] = color.r;
    colors[colIdx + 1] = color.g;
    colors[colIdx + 2] = color.b;

    let opacity = config.dustOpacity;
    if (radius > 2) {
      opacity = config.dustOpacity * (1 - (radius - 2) / (dustMaxRadius - 2));
    }
    if (opacity < 0) opacity = 0;
    opacities[idx] = opacity;

    sizes[idx] = config.dustSize * (0.5 + Math.random() * 0.5);
  }

  return startIndex + totalDust;
}

export function createGalaxy(config: GalaxyConfig = defaultGalaxyConfig, performanceMode: boolean = false): {
  group: THREE.Group;
  stars: THREE.Points;
  dust: THREE.Points;
  update: (delta: number) => void;
  getTotalParticles: () => number;
} {
  const performanceScale = performanceMode ? 0.5 : 1;
  const group = new THREE.Group();

  const totalStarParticles = Math.floor(
    config.coreParticles + config.armCount * config.armParticles * performanceScale
  );
  const totalDustParticles = Math.floor(
    config.dustLayers * config.dustParticlesPerLayer * performanceScale
  );

  const starPositions = new Float32Array(totalStarParticles * 3);
  const starColors = new Float32Array(totalStarParticles * 3);
  const starSizes = new Float32Array(totalStarParticles);

  let currentIndex = 0;
  currentIndex = generateCoreParticles(config, starPositions, starColors, starSizes, currentIndex);
  currentIndex = generateArmParticles(config, starPositions, starColors, starSizes, currentIndex, performanceScale);

  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

  const starMaterial = new THREE.PointsMaterial({
    size: config.particleSizeMax,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const stars = new THREE.Points(starGeometry, starMaterial);
  group.add(stars);

  const dustPositions = new Float32Array(totalDustParticles * 3);
  const dustColors = new Float32Array(totalDustParticles * 3);
  const dustOpacities = new Float32Array(totalDustParticles);
  const dustSizes = new Float32Array(totalDustParticles);

  generateDustParticles(config, dustPositions, dustColors, dustOpacities, dustSizes, 0, performanceScale);

  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));

  const dustMaterial = new THREE.PointsMaterial({
    size: config.dustSize,
    vertexColors: true,
    transparent: true,
    opacity: config.dustOpacity,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const dust = new THREE.Points(dustGeometry, dustMaterial);
  group.add(dust);

  const update = (delta: number): void => {
    group.rotation.y += config.rotationSpeed * delta;
  };

  const getTotalParticles = (): number => {
    return totalStarParticles + totalDustParticles;
  };

  return { group, stars, dust, update, getTotalParticles };
}

export function createStarfield(count: number = 3000, radius: number = 50): {
  points: THREE.Points;
  update: (delta: number) => void;
} {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * (0.5 + Math.random() * 0.5);

    positions[idx] = r * Math.sin(phi) * Math.cos(theta);
    positions[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[idx + 2] = r * Math.cos(phi);

    const brightness = 0.7 + Math.random() * 0.3;
    colors[idx] = brightness;
    colors[idx + 1] = brightness;
    colors[idx + 2] = brightness;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.02,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    sizeAttenuation: true,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, material);

  const rotationSpeed = 0.01;
  const update = (delta: number): void => {
    points.rotation.y += rotationSpeed * delta;
  };

  return { points, update };
}
