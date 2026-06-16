import * as THREE from 'three';

export interface GalaxyParameters {
  particleCount: number;
  rotationSpeed: number;
  armCount: number;
  particleSize: number;
  innerColor: string;
  outerColor: string;
}

export const DEFAULT_PARAMETERS: GalaxyParameters = {
  particleCount: 2000,
  rotationSpeed: 1.0,
  armCount: 2,
  particleSize: 1.5,
  innerColor: '#FDB813',
  outerColor: '#4A90E2',
};

const GALAXY_RADIUS = 5;
const SPIN_FACTOR = 1.5;
const RANDOMNESS_POWER = 3;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uRotationSpeed;
  uniform float uSizeScale;
  uniform vec3 uInnerColor;
  uniform vec3 uOuterColor;

  attribute float aSize;
  attribute float aColorMix;
  attribute float aRandomOffset;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float angle = uTime * uRotationSpeed * 0.15;
    float cosA = cos(angle + aRandomOffset);
    float sinA = sin(angle + aRandomOffset);

    vec3 rotated = vec3(
      position.x * cosA - position.z * sinA,
      position.y,
      position.x * sinA + position.z * cosA
    );

    vec4 mvPosition = modelViewMatrix * vec4(rotated, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float sizeAttenuation = (300.0 / -mvPosition.z);
    gl_PointSize = aSize * uSizeScale * sizeAttenuation;
    gl_PointSize = max(gl_PointSize, 1.0);

    vColor = mix(uInnerColor, uOuterColor, aColorMix);
    vAlpha = smoothstep(0.0, 0.15, 1.0 - aColorMix * 0.4);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    float alpha = 1.0 - smoothstep(0.0, 0.5, d);
    alpha *= alpha;
    alpha *= vAlpha;

    vec3 glow = vColor * (1.0 + 0.5 * (1.0 - smoothstep(0.0, 0.3, d)));

    gl_FragColor = vec4(glow, alpha);
  }
`;

export class GalaxyGenerator {
  private points: THREE.Points | null = null;
  private material: THREE.ShaderMaterial;
  private scene: THREE.Scene;
  private currentParams: GalaxyParameters;
  private targetParams: GalaxyParameters;

  private lerpUniforms = {
    rotationSpeed: 1.0,
    sizeScale: 1.5,
    innerColor: new THREE.Color('#FDB813'),
    outerColor: new THREE.Color('#4A90E2'),
  };

  private targetUniforms = {
    rotationSpeed: 1.0,
    sizeScale: 1.5,
    innerColor: new THREE.Color('#FDB813'),
    outerColor: new THREE.Color('#4A90E2'),
  };

  private needsRebuild = false;
  private rebuildTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(scene: THREE.Scene, params: GalaxyParameters = DEFAULT_PARAMETERS) {
    this.scene = scene;
    this.currentParams = { ...params };
    this.targetParams = { ...params };

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uRotationSpeed: { value: params.rotationSpeed },
        uSizeScale: { value: params.particleSize },
        uInnerColor: { value: new THREE.Color(params.innerColor) },
        uOuterColor: { value: new THREE.Color(params.outerColor) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.lerpUniforms.innerColor = new THREE.Color(params.innerColor);
    this.lerpUniforms.outerColor = new THREE.Color(params.outerColor);
    this.targetUniforms.innerColor = new THREE.Color(params.innerColor);
    this.targetUniforms.outerColor = new THREE.Color(params.outerColor);

    this.buildGeometry();
  }

  private buildGeometry(): void {
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
    }

    const { particleCount, armCount } = this.currentParams;
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const colorMixes = new Float32Array(particleCount);
    const randomOffsets = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      const armIndex = i % armCount;
      const armAngle = (armIndex / armCount) * Math.PI * 2;

      const radius = Math.random() * GALAXY_RADIUS;
      const spinAngle = radius * SPIN_FACTOR;

      const randomX = Math.pow(Math.random(), RANDOMNESS_POWER) * (Math.random() < 0.5 ? 1 : -1) * 0.5;
      const randomY = Math.pow(Math.random(), RANDOMNESS_POWER) * (Math.random() < 0.5 ? 1 : -1) * 0.15;
      const randomZ = Math.pow(Math.random(), RANDOMNESS_POWER) * (Math.random() < 0.5 ? 1 : -1) * 0.5;

      positions[i3] = Math.cos(armAngle + spinAngle) * radius + randomX;
      positions[i3 + 1] = randomY;
      positions[i3 + 2] = Math.sin(armAngle + spinAngle) * radius + randomZ;

      const t = radius / GALAXY_RADIUS;
      sizes[i] = Math.max(0.3, 1.0 - t * 0.7);

      colorMixes[i] = t;

      randomOffsets[i] = t * 0.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColorMix', new THREE.BufferAttribute(colorMixes, 1));
    geometry.setAttribute('aRandomOffset', new THREE.BufferAttribute(randomOffsets, 1));

    this.points = new THREE.Points(geometry, this.material);
    this.scene.add(this.points);
  }

  updateParams(params: Partial<GalaxyParameters>): void {
    const needsGeomRebuild =
      (params.particleCount !== undefined && params.particleCount !== this.targetParams.particleCount) ||
      (params.armCount !== undefined && params.armCount !== this.targetParams.armCount);

    Object.assign(this.targetParams, params);

    if (params.rotationSpeed !== undefined) {
      this.targetUniforms.rotationSpeed = params.rotationSpeed;
    }
    if (params.particleSize !== undefined) {
      this.targetUniforms.sizeScale = params.particleSize;
    }
    if (params.innerColor !== undefined) {
      this.targetUniforms.innerColor.set(params.innerColor);
    }
    if (params.outerColor !== undefined) {
      this.targetUniforms.outerColor.set(params.outerColor);
    }

    if (needsGeomRebuild) {
      this.needsRebuild = true;
      if (this.rebuildTimer) clearTimeout(this.rebuildTimer);
      this.rebuildTimer = setTimeout(() => {
        this.currentParams.particleCount = this.targetParams.particleCount;
        this.currentParams.armCount = this.targetParams.armCount;
        this.buildGeometry();
        this.needsRebuild = false;
        this.rebuildTimer = null;
      }, 200);
    }
  }

  update(deltaTime: number): void {
    if (!this.points) return;

    this.material.uniforms.uTime.value += deltaTime;

    const lerpFactor = 1 - Math.pow(0.05, deltaTime);

    this.lerpUniforms.rotationSpeed += (this.targetUniforms.rotationSpeed - this.lerpUniforms.rotationSpeed) * lerpFactor;
    this.lerpUniforms.sizeScale += (this.targetUniforms.sizeScale - this.lerpUniforms.sizeScale) * lerpFactor;
    this.lerpUniforms.innerColor.lerp(this.targetUniforms.innerColor, lerpFactor);
    this.lerpUniforms.outerColor.lerp(this.targetUniforms.outerColor, lerpFactor);

    this.material.uniforms.uRotationSpeed.value = this.lerpUniforms.rotationSpeed;
    this.material.uniforms.uSizeScale.value = this.lerpUniforms.sizeScale;
    this.material.uniforms.uInnerColor.value.copy(this.lerpUniforms.innerColor);
    this.material.uniforms.uOuterColor.value.copy(this.lerpUniforms.outerColor);
  }

  getPoints(): THREE.Points | null {
    return this.points;
  }

  getCurrentParams(): GalaxyParameters {
    return { ...this.targetParams };
  }

  dispose(): void {
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
    }
    this.material.dispose();
    if (this.rebuildTimer) clearTimeout(this.rebuildTimer);
  }
}
