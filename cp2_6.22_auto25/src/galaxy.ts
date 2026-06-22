import * as THREE from 'three';

export interface GalaxyConfig {
  coreRadius: number;
  coreParticleCount: number;
  armCount: number;
  armParticleCount: number;
  armOffsetAngle: number;
  spiralFactor: number;
  armLength: number;
  dustParticleCountPerSide: number;
  dustOpacity: number;
  dustSize: number;
  dustMinAxial: number;
  dustMaxAxial: number;
  dustFadeMin: number;
  dustFadeMax: number;
  bgStarCount: number;
  bgStarRadius: number;
  rotationSpeed: number;
  bgStarRotationSpeed: number;
}

export const DEFAULT_CONFIG: GalaxyConfig = {
  coreRadius: 0.5,
  coreParticleCount: 1000,
  armCount: 4,
  armParticleCount: 1500,
  armOffsetAngle: 0.8,
  spiralFactor: 2.0,
  armLength: 6.0,
  dustParticleCountPerSide: 1000,
  dustOpacity: 0.2,
  dustSize: 0.3,
  dustMinAxial: 0.5,
  dustMaxAxial: 1.5,
  dustFadeMin: 2.0,
  dustFadeMax: 5.0,
  bgStarCount: 3000,
  bgStarRadius: 50,
  rotationSpeed: 0.02,
  bgStarRotationSpeed: 0.01,
};

const COLOR_CORE_START = new THREE.Color(0xffd700);
const COLOR_CORE_END = new THREE.Color(0xff8c00);
const COLOR_ARM_START = new THREE.Color(0xff69b4);
const COLOR_ARM_MID = new THREE.Color(0x87ceeb);
const COLOR_ARM_END = new THREE.Color(0x4b0082);
const COLOR_DUST = new THREE.Color(0x2f4f4f);

const coreVertexShader = `
  attribute float size;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const coreFragmentShader = `
  varying vec3 vColor;
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    gl_FragColor = vec4(vColor, alpha);
  }
`;

function computeCorePositions(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = radius * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.3;
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  return positions;
}

function computeCoreColors(count: number, radius: number, positions: Float32Array): Float32Array {
  const colors = new Float32Array(count * 3);
  const tmpStart = new THREE.Color();
  const tmpEnd = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    const dist = Math.sqrt(x * x + y * y + z * z);
    const t = Math.min(dist / radius, 1.0);
    tmpStart.copy(COLOR_CORE_START);
    tmpEnd.copy(COLOR_CORE_END);
    tmpStart.lerp(tmpEnd, t);
    colors[i * 3] = tmpStart.r;
    colors[i * 3 + 1] = tmpStart.g;
    colors[i * 3 + 2] = tmpStart.b;
  }
  return colors;
}

function computeArmPositions(
  armCount: number,
  particlesPerArm: number,
  coreRadius: number,
  armLength: number,
  armOffsetAngle: number,
  spiralFactor: number
): Float32Array {
  const total = armCount * particlesPerArm;
  const positions = new Float32Array(total * 3);
  let idx = 0;
  for (let arm = 0; arm < armCount; arm++) {
    const baseAngle = arm * armOffsetAngle;
    for (let i = 0; i < particlesPerArm; i++) {
      const t = Math.random();
      const distance = coreRadius + t * armLength;
      const angle = baseAngle + spiralFactor * Math.log(distance / coreRadius);
      const scatter = (Math.random() - 0.5) * 0.4 * (0.3 + t * 0.7);
      const heightScatter = (Math.random() - 0.5) * 0.15 * (0.5 + t * 0.5);
      positions[idx++] = distance * Math.cos(angle) + scatter * Math.cos(angle + Math.PI / 2);
      positions[idx++] = heightScatter;
      positions[idx++] = distance * Math.sin(angle) + scatter * Math.sin(angle + Math.PI / 2);
    }
  }
  return positions;
}

function computeArmColors(
  armCount: number,
  particlesPerArm: number,
  coreRadius: number,
  armLength: number
): Float32Array {
  const total = armCount * particlesPerArm;
  const colors = new Float32Array(total * 3);
  const tmp = new THREE.Color();
  let idx = 0;
  for (let arm = 0; arm < armCount; arm++) {
    for (let i = 0; i < particlesPerArm; i++) {
      const t = Math.random();
      if (t < 0.5) {
        const localT = t / 0.5;
        tmp.copy(COLOR_ARM_START);
        tmp.lerp(COLOR_ARM_MID, localT);
      } else {
        const localT = (t - 0.5) / 0.5;
        tmp.copy(COLOR_ARM_MID);
        tmp.lerp(COLOR_ARM_END, localT);
      }
      colors[idx++] = tmp.r;
      colors[idx++] = tmp.g;
      colors[idx++] = tmp.b;
    }
  }
  return colors;
}

function computeArmSizes(
  armCount: number,
  particlesPerArm: number
): Float32Array {
  const total = armCount * particlesPerArm;
  const sizes = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    sizes[i] = 0.05 + Math.random() * 0.15;
  }
  return sizes;
}

function computeDustPositions(
  count: number,
  side: number,
  minAxial: number,
  maxAxial: number,
  fadeMin: number,
  fadeMax: number
): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = fadeMin + Math.random() * (fadeMax - fadeMin);
    const theta = Math.random() * Math.PI * 2;
    const axial = minAxial + Math.random() * (maxAxial - minAxial);
    positions[i * 3] = r * Math.cos(theta);
    positions[i * 3 + 1] = side * axial;
    positions[i * 3 + 2] = r * Math.sin(theta);
  }
  return positions;
}

function computeDustColors(
  count: number,
  baseColor: THREE.Color,
  opacity: number,
  fadeMin: number,
  fadeMax: number,
  positions: Float32Array
): Float32Array {
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3];
    const z = positions[i * 3 + 2];
    const dist = Math.sqrt(x * x + z * z);
    let fade = 1.0;
    if (dist > fadeMin) {
      fade = 1.0 - (dist - fadeMin) / (fadeMax - fadeMin);
      fade = Math.max(0, fade);
    }
    colors[i * 3] = baseColor.r * opacity * fade;
    colors[i * 3 + 1] = baseColor.g * opacity * fade;
    colors[i * 3 + 2] = baseColor.b * opacity * fade;
  }
  return colors;
}

function computeBgStarPositions(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }
  return positions;
}

function computeBgStarColors(count: number): Float32Array {
  const colors = new Float32Array(count * 3);
  const tmp = new THREE.Color(0xffffff);
  for (let i = 0; i < count; i++) {
    tmp.setHex(0xffffff);
    const hueShift = (Math.random() - 0.5) * 0.1;
    const hsl = { h: 0, s: 0, l: 1.0 };
    tmp.getHSL(hsl);
    hsl.h = (hsl.h + hueShift + 1.0) % 1.0;
    hsl.s = 0.15 + Math.random() * 0.1;
    tmp.setHSL(hsl.h, hsl.s, hsl.l);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  return colors;
}

export interface GalaxyGroup {
  group: THREE.Group;
  galaxyGroup: THREE.Group;
  bgStars: THREE.Points;
  corePoints: THREE.Points;
  armPoints: THREE.Points;
  coreSizePulse: {
    baseSizes: Float32Array;
    phases: Float32Array;
    frequencies: Float32Array;
    amplitudes: Float32Array;
  };
  coreTwinkle: {
    baseSizes: Float32Array;
    phases: Float32Array;
    frequencies: Float32Array;
    amplitudes: Float32Array;
    baseColors: Float32Array;
  };
  armTwinkle: {
    baseSizes: Float32Array;
    phases: Float32Array;
    frequencies: Float32Array;
    amplitudes: Float32Array;
    baseColors: Float32Array;
    mask: Uint8Array;
  };
  update: (delta: number) => void;
}

export function createGalaxy(config: GalaxyConfig = DEFAULT_CONFIG): GalaxyGroup {
  const group = new THREE.Group();
  const galaxyGroup = new THREE.Group();

  const corePositions = computeCorePositions(config.coreParticleCount, config.coreRadius);
  const coreColors = computeCoreColors(config.coreParticleCount, config.coreRadius, corePositions);
  const coreBaseSizes = new Float32Array(config.coreParticleCount);
  const coreSizePhases = new Float32Array(config.coreParticleCount);
  const coreSizeFreqs = new Float32Array(config.coreParticleCount);
  const coreSizeAmps = new Float32Array(config.coreParticleCount);
  const coreTwinklePhases = new Float32Array(config.coreParticleCount);
  const coreTwinkleFreqs = new Float32Array(config.coreParticleCount);
  const coreTwinkleAmps = new Float32Array(config.coreParticleCount);
  for (let i = 0; i < config.coreParticleCount; i++) {
    coreBaseSizes[i] = 0.08;
    coreSizePhases[i] = Math.random() * Math.PI * 2;
    coreSizeFreqs[i] = 0.5;
    coreSizeAmps[i] = 0.02;
    coreTwinklePhases[i] = Math.random() * Math.PI * 2;
    coreTwinkleFreqs[i] = 0.5 + Math.random() * 1.5;
    coreTwinkleAmps[i] = 0.3 + Math.random() * 0.2;
  }
  const coreGeom = new THREE.BufferGeometry();
  coreGeom.setAttribute('position', new THREE.BufferAttribute(corePositions, 3));
  coreGeom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(coreColors), 3));
  coreGeom.setAttribute('size', new THREE.BufferAttribute(new Float32Array(coreBaseSizes), 1));
  const coreMat = new THREE.ShaderMaterial({
    uniforms: {},
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: coreVertexShader,
    fragmentShader: coreFragmentShader,
  });
  const corePoints = new THREE.Points(coreGeom, coreMat);
  galaxyGroup.add(corePoints);

  const armPositions = computeArmPositions(
    config.armCount,
    config.armParticleCount,
    config.coreRadius,
    config.armLength,
    config.armOffsetAngle,
    config.spiralFactor
  );
  const armColors = computeArmColors(
    config.armCount,
    config.armParticleCount,
    config.coreRadius,
    config.armLength
  );
  const armSizes = computeArmSizes(config.armCount, config.armParticleCount);
  const armTotal = config.armCount * config.armParticleCount;
  const armTwinklePhases = new Float32Array(armTotal);
  const armTwinkleFreqs = new Float32Array(armTotal);
  const armTwinkleAmps = new Float32Array(armTotal);
  const armTwinkleMask = new Uint8Array(armTotal);
  for (let i = 0; i < armTotal; i++) {
    const colorT = Math.random();
    const twinkleChance = (1.0 - colorT) * 0.6;
    if (Math.random() < twinkleChance) {
      armTwinkleMask[i] = 1;
      armTwinklePhases[i] = Math.random() * Math.PI * 2;
      armTwinkleFreqs[i] = 0.3 + Math.random() * 0.7;
      armTwinkleAmps[i] = 0.2;
    } else {
      armTwinkleMask[i] = 0;
      armTwinklePhases[i] = 0;
      armTwinkleFreqs[i] = 0;
      armTwinkleAmps[i] = 0;
    }
  }
  const armGeom = new THREE.BufferGeometry();
  armGeom.setAttribute('position', new THREE.BufferAttribute(armPositions, 3));
  armGeom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(armColors), 3));
  armGeom.setAttribute('size', new THREE.BufferAttribute(armSizes, 1));
  const armMat = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const armPoints = new THREE.Points(armGeom, armMat);
  galaxyGroup.add(armPoints);

  for (const side of [1, -1]) {
    const dustPositions = computeDustPositions(
      config.dustParticleCountPerSide,
      side,
      config.dustMinAxial,
      config.dustMaxAxial,
      config.dustFadeMin,
      config.dustFadeMax
    );
    const dustColors = computeDustColors(
      config.dustParticleCountPerSide,
      COLOR_DUST,
      config.dustOpacity,
      config.dustFadeMin,
      config.dustFadeMax,
      dustPositions
    );
    const dustGeom = new THREE.BufferGeometry();
    dustGeom.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeom.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
    const dustMat = new THREE.PointsMaterial({
      size: config.dustSize,
      vertexColors: true,
      transparent: true,
      opacity: config.dustOpacity,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const dustPoints = new THREE.Points(dustGeom, dustMat);
    galaxyGroup.add(dustPoints);
  }

  group.add(galaxyGroup);

  const bgPositions = computeBgStarPositions(config.bgStarCount, config.bgStarRadius);
  const bgColors = computeBgStarColors(config.bgStarCount);
  const bgGeom = new THREE.BufferGeometry();
  bgGeom.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
  bgGeom.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));
  const bgMat = new THREE.PointsMaterial({
    size: 0.02,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
    depthWrite: false,
  });
  const bgStars = new THREE.Points(bgGeom, bgMat);
  group.add(bgStars);

  return {
    group,
    galaxyGroup,
    bgStars,
    corePoints,
    armPoints,
    coreSizePulse: {
      baseSizes: coreBaseSizes,
      phases: coreSizePhases,
      frequencies: coreSizeFreqs,
      amplitudes: coreSizeAmps,
    },
    coreTwinkle: {
      baseSizes: new Float32Array(config.coreParticleCount).fill(0.08),
      phases: coreTwinklePhases,
      frequencies: coreTwinkleFreqs,
      amplitudes: coreTwinkleAmps,
      baseColors: coreColors,
    },
    armTwinkle: {
      baseSizes: armSizes,
      phases: armTwinklePhases,
      frequencies: armTwinkleFreqs,
      amplitudes: armTwinkleAmps,
      baseColors: armColors,
      mask: armTwinkleMask,
    },
    update(delta: number) {
      galaxyGroup.rotation.y += config.rotationSpeed * delta;
      bgStars.rotation.y += config.bgStarRotationSpeed * delta;
    },
  };
}
