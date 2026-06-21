import * as THREE from 'three';
import { randomRange, randomLifecycle, getFlameColor, getFlameRadius, COLOR_SCHEMES, ColorScheme } from './utils';

export interface FlameParams {
  particleCount: number;
  particleSize: number;
  riseSpeed: number;
  driftAmplitude: number;
  colorScheme: string;
  emitInterval: number;
  flameWidth: number;
}

export const DEFAULT_PARAMS: FlameParams = {
  particleCount: 1500,
  particleSize: 0.15,
  riseSpeed: 1.0,
  driftAmplitude: 0.3,
  colorScheme: '橙黄渐变',
  emitInterval: 0.3,
  flameWidth: 1.5,
};

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  age: number;
  size: number;
  opacity: number;
  active: boolean;
}

const vertexShader = `
attribute float aSize;
attribute float aOpacity;
varying vec3 vColor;
varying float vOpacity;
void main() {
  vColor = color;
  vOpacity = aOpacity;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
uniform sampler2D uTexture;
varying vec3 vColor;
varying float vOpacity;
void main() {
  vec4 texColor = texture2D(uTexture, gl_PointCoord);
  gl_FragColor = vec4(vColor * texColor.rgb, texColor.a * vOpacity);
}
`;

export class Flame {
  private params: FlameParams;
  private particles: Particle[];
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private opacities: Float32Array;
  private emitTimer: number = 0;
  private mouseWorld: THREE.Vector3 | null = null;
  private isHovering: boolean = false;
  private glowMesh: THREE.Mesh;
  private defaultTexture: THREE.Texture;
  private circleTexture: THREE.Texture;
  private usingCircleTexture: boolean = false;
  private nextEmitIndex: number = 0;

  constructor(scene: THREE.Scene) {
    this.params = { ...DEFAULT_PARAMS };
    this.particles = [];

    this.positions = new Float32Array(this.params.particleCount * 3);
    this.colors = new Float32Array(this.params.particleCount * 3);
    this.sizes = new Float32Array(this.params.particleCount);
    this.opacities = new Float32Array(this.params.particleCount);

    this.defaultTexture = this.createDefaultTexture();
    this.circleTexture = this.createCircleTexture();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aOpacity', new THREE.BufferAttribute(this.opacities, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTexture: { value: this.defaultTexture },
      },
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);

    const glowGeo = new THREE.CircleGeometry(2, 64);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.glowMesh = new THREE.Mesh(glowGeo, glowMat);
    this.glowMesh.rotation.x = -Math.PI / 2;
    this.glowMesh.position.y = -0.99;
    scene.add(this.glowMesh);

    this.initializeParticles();
    this.updateTextureForCount();
  }

  private initializeParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.params.particleCount; i++) {
      const p = this.createParticle();
      p.age = Math.random() * p.maxLife;
      p.life = p.age / p.maxLife;
      const yAtAge = p.position.y + p.velocity.y * p.age;
      const r = getFlameRadius(yAtAge, this.params.flameWidth) * Math.sqrt(Math.random());
      const angle = Math.random() * Math.PI * 2;
      p.position.set(Math.cos(angle) * r, yAtAge, Math.sin(angle) * r);
      this.particles.push(p);
    }
    this.nextEmitIndex = 0;
  }

  private createDefaultTexture(): THREE.Texture {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.85)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.4)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createCircleTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.7)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createParticle(): Particle {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * this.params.flameWidth;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = randomRange(-1, 0);

    const speed = randomRange(0.5, 2.0) * this.params.riseSpeed;
    const driftX = randomRange(-0.5, 0.5) * this.params.driftAmplitude;
    const driftZ = randomRange(-0.5, 0.5) * this.params.driftAmplitude;

    const maxLife = randomLifecycle();

    return {
      position: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(driftX, speed, driftZ),
      life: 0,
      maxLife,
      age: 0,
      size: 0.08,
      opacity: 1.0,
      active: true,
    };
  }

  private resetParticle(p: Particle): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * this.params.flameWidth;
    p.position.set(
      Math.cos(angle) * radius,
      randomRange(-1, 0),
      Math.sin(angle) * radius
    );

    const speed = randomRange(0.5, 2.0) * this.params.riseSpeed;
    p.velocity.set(
      randomRange(-0.5, 0.5) * this.params.driftAmplitude,
      speed,
      randomRange(-0.5, 0.5) * this.params.driftAmplitude
    );

    p.life = 0;
    p.maxLife = randomLifecycle();
    p.age = 0;
    p.opacity = 1.0;
    p.active = true;
  }

  private emitBatch(count: number): void {
    let emitted = 0;
    const total = this.particles.length;
    for (let tries = 0; tries < total * 2 && emitted < count; tries++) {
      const idx = this.nextEmitIndex % total;
      this.nextEmitIndex = (this.nextEmitIndex + 1) % total;
      if (!this.particles[idx].active) {
        this.resetParticle(this.particles[idx]);
        emitted++;
      }
    }
  }

  private getBatchSize(): number {
    const avgLifetime = 4.5;
    return Math.max(1, Math.ceil(this.params.particleCount * this.params.emitInterval / avgLifetime));
  }

  update(delta: number): void {
    this.emitTimer += delta;

    while (this.emitTimer >= this.params.emitInterval) {
      this.emitTimer -= this.params.emitInterval;
      this.emitBatch(this.getBatchSize());
    }

    const scheme: ColorScheme = COLOR_SCHEMES[this.params.colorScheme] || COLOR_SCHEMES['橙黄渐变'];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      if (!p.active) {
        this.positions[i * 3] = 0;
        this.positions[i * 3 + 1] = -100;
        this.positions[i * 3 + 2] = 0;
        this.sizes[i] = 0;
        this.opacities[i] = 0;
        this.colors[i * 3] = 0;
        this.colors[i * 3 + 1] = 0;
        this.colors[i * 3 + 2] = 0;
        continue;
      }

      p.age += delta;
      p.life = p.age / p.maxLife;

      if (p.life >= 1.0) {
        p.active = false;
        this.positions[i * 3] = 0;
        this.positions[i * 3 + 1] = -100;
        this.positions[i * 3 + 2] = 0;
        this.sizes[i] = 0;
        this.opacities[i] = 0;
        this.colors[i * 3] = 0;
        this.colors[i * 3 + 1] = 0;
        this.colors[i * 3 + 2] = 0;
        continue;
      }

      p.position.x += p.velocity.x * delta;
      p.position.y += p.velocity.y * delta;
      p.position.z += p.velocity.z * delta;

      const maxR = getFlameRadius(p.position.y, this.params.flameWidth);
      const dist = Math.sqrt(p.position.x * p.position.x + p.position.z * p.position.z);
      if (dist > maxR && dist > 0.0001) {
        const pull = (dist - maxR) * 3.0;
        p.position.x -= (p.position.x / dist) * pull * delta;
        p.position.z -= (p.position.z / dist) * pull * delta;
      }

      if (this.isHovering && this.mouseWorld) {
        const dx = p.position.x - this.mouseWorld.x;
        const dy = p.position.y - this.mouseWorld.y;
        const dz = p.position.z - this.mouseWorld.z;
        const distToMouse = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distToMouse < 1.5 && distToMouse > 0.0001) {
          p.position.x += (dx / distToMouse) * 0.02;
          p.position.y += (dy / distToMouse) * 0.02;
          p.position.z += (dz / distToMouse) * 0.02;
        }
      }

      if (p.life < 0.3) {
        p.size = 0.08 + (this.params.particleSize - 0.08) * (p.life / 0.3);
      } else {
        p.size = this.params.particleSize * (1 - (p.life - 0.3) / 0.7);
      }
      p.size = Math.max(0, p.size);

      const remainingLife = p.maxLife - p.age;
      if (remainingLife < 1.0) {
        p.opacity = Math.max(0, remainingLife);
      } else {
        p.opacity = 1.0;
      }

      const color = getFlameColor(p.life, scheme);
      this.positions[i * 3] = p.position.x;
      this.positions[i * 3 + 1] = p.position.y;
      this.positions[i * 3 + 2] = p.position.z;
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
      this.sizes[i] = p.size;
      this.opacities[i] = p.opacity;
    }

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    const colAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    colAttr.needsUpdate = true;
    const sizeAttr = this.geometry.getAttribute('aSize') as THREE.BufferAttribute;
    sizeAttr.needsUpdate = true;
    const opaAttr = this.geometry.getAttribute('aOpacity') as THREE.BufferAttribute;
    opaAttr.needsUpdate = true;

    this.updateTextureForCount();
  }

  private updateTextureForCount(): void {
    if (this.params.particleCount > 2000 && !this.usingCircleTexture) {
      this.material.uniforms.uTexture.value = this.circleTexture;
      this.usingCircleTexture = true;
    } else if (this.params.particleCount <= 2000 && this.usingCircleTexture) {
      this.material.uniforms.uTexture.value = this.defaultTexture;
      this.usingCircleTexture = false;
    }
  }

  setMouseWorld(pos: THREE.Vector3 | null): void {
    this.mouseWorld = pos;
    this.isHovering = pos !== null;
  }

  setParams(params: Partial<FlameParams>): void {
    const oldCount = this.params.particleCount;
    Object.assign(this.params, params);

    if (params.particleCount !== undefined && params.particleCount !== oldCount) {
      this.rebuildParticles(params.particleCount);
    }

    if (params.colorScheme !== undefined) {
      const scheme = COLOR_SCHEMES[params.colorScheme];
      if (scheme) {
        (this.glowMesh.material as THREE.MeshBasicMaterial).color = scheme.bottom.clone();
      }
    }

    if (params.flameWidth !== undefined) {
      this.glowMesh.geometry.dispose();
      this.glowMesh.geometry = new THREE.CircleGeometry(params.flameWidth * 1.33, 64);
    }

    this.updateTextureForCount();
  }

  private rebuildParticles(count: number): void {
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.opacities = new Float32Array(count);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aOpacity', new THREE.BufferAttribute(this.opacities, 1));

    const oldParticles = this.particles;
    this.particles = [];
    for (let i = 0; i < count; i++) {
      if (i < oldParticles.length) {
        this.particles.push(oldParticles[i]);
      } else {
        const p = this.createParticle();
        p.active = false;
        p.age = 0;
        p.life = 0;
        this.particles.push(p);
      }
    }
    this.nextEmitIndex = 0;
    this.updateTextureForCount();
  }

  getParams(): FlameParams {
    return { ...this.params };
  }

  resetParams(): void {
    this.setParams({ ...DEFAULT_PARAMS });
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.defaultTexture.dispose();
    this.circleTexture.dispose();
    this.glowMesh.geometry.dispose();
    (this.glowMesh.material as THREE.Material).dispose();
  }
}
