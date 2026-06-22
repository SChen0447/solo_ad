import * as THREE from 'three';

export interface PhysicsParams {
  gravity: number;
  vortexStrength: number;
  repulsionRadius: number;
}

const VERTEX_SHADER = /* glsl */`
  attribute float size;
  attribute float alpha;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = color;
    vAlpha = alpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = /* glsl */`
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;

    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    glow = pow(glow, 1.5);

    float alpha = glow * vAlpha;
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(vColor * (0.5 + glow * 0.8), alpha);
  }
`;

export class ParticleEngine {
  public particles: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.ShaderMaterial;

  public maxParticles: number;
  public activeCount: number;
  private pendingReductionFactor: number = 0;
  private pendingReductionFlag: boolean = false;

  private positions!: Float32Array;
  private velocities!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;
  private alphas!: Float32Array;
  private maxLifetimes!: Float32Array;
  private birthTimes!: Float32Array;

  private positionAttribute!: THREE.BufferAttribute;
  private colorAttribute!: THREE.BufferAttribute;
  private sizeAttribute!: THREE.BufferAttribute;
  private alphaAttribute!: THREE.BufferAttribute;

  private readonly SPAWN_RANGE = 50;
  private readonly FADE_OUT_DURATION = 0.5;
  private readonly FADE_IN_DURATION = 0.5;
  private readonly MIN_LIFETIME = 3;
  private readonly MAX_LIFETIME = 8;

  private readonly COLOR_STOPS = [
    { t: 0.0, color: new THREE.Color(0x3366ff) },
    { t: 0.35, color: new THREE.Color(0x6644ff) },
    { t: 0.5, color: new THREE.Color(0x9933ff) },
    { t: 0.65, color: new THREE.Color(0xcc2299) },
    { t: 1.0, color: new THREE.Color(0xff3366) }
  ];
  private readonly MAX_DIST = 50 * Math.sqrt(3);

  constructor(count: number = 5000) {
    this.maxParticles = count;
    this.activeCount = count;

    this.geometry = new THREE.BufferGeometry();
    this.initBuffers();
    this.initAttributes();

    this.material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.particles.frustumCulled = false;
  }

  private initBuffers(): void {
    this.positions = new Float32Array(this.maxParticles * 3);
    this.velocities = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);
    this.alphas = new Float32Array(this.maxParticles);
    this.maxLifetimes = new Float32Array(this.maxParticles);
    this.birthTimes = new Float32Array(this.maxParticles);
  }

  private initAttributes(): void {
    this.positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    this.colorAttribute = new THREE.BufferAttribute(this.colors, 3);
    this.sizeAttribute = new THREE.BufferAttribute(this.sizes, 1);
    this.alphaAttribute = new THREE.BufferAttribute(this.alphas, 1);

    this.geometry.setAttribute('position', this.positionAttribute);
    this.geometry.setAttribute('color', this.colorAttribute);
    this.geometry.setAttribute('size', this.sizeAttribute);
    this.geometry.setAttribute('alpha', this.alphaAttribute);

    this.geometry.setDrawRange(0, this.activeCount);
  }

  public initParticles(): void {
    const now = performance.now() / 1000;
    for (let i = 0; i < this.activeCount; i++) {
      this.spawnParticle(i, now);
    }
    this.updateAttributes();
  }

  private spawnParticle(index: number, currentTime: number): void {
    const i3 = index * 3;

    this.positions[i3] = (Math.random() * 2 - 1) * this.SPAWN_RANGE;
    this.positions[i3 + 1] = (Math.random() * 2 - 1) * this.SPAWN_RANGE;
    this.positions[i3 + 2] = (Math.random() * 2 - 1) * this.SPAWN_RANGE;

    this.velocities[i3] = (Math.random() * 2 - 1) * 0.5;
    this.velocities[i3 + 1] = (Math.random() * 2 - 1) * 0.5;
    this.velocities[i3 + 2] = (Math.random() * 2 - 1) * 0.5;

    this.updateParticleColor(index);

    this.sizes[index] = 0.3 + Math.random() * 0.9;
    this.alphas[index] = 0.0;

    this.maxLifetimes[index] = this.MIN_LIFETIME + Math.random() * (this.MAX_LIFETIME - this.MIN_LIFETIME);
    this.birthTimes[index] = currentTime;
  }

  private updateParticleColor(index: number): void {
    const i3 = index * 3;
    const x = this.positions[i3];
    const y = this.positions[i3 + 1];
    const z = this.positions[i3 + 2];
    const dist = Math.sqrt(x * x + y * y + z * z);
    let t = Math.min(dist / this.MAX_DIST, 1);
    t = Math.pow(t, 0.6);

    const stops = this.COLOR_STOPS;
    let segIdx = 0;
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s].t && t <= stops[s + 1].t) {
        segIdx = s;
        break;
      }
      if (s === stops.length - 2) {
        segIdx = s;
      }
    }

    const from = stops[segIdx];
    const to = stops[segIdx + 1];
    const segT = (to.t - from.t) > 0 ? (t - from.t) / (to.t - from.t) : 0;

    this.colors[i3] = from.color.r + (to.color.r - from.color.r) * segT;
    this.colors[i3 + 1] = from.color.g + (to.color.g - from.color.g) * segT;
    this.colors[i3 + 2] = from.color.b + (to.color.b - from.color.b) * segT;
  }

  public update(deltaTime: number, params: PhysicsParams): void {
    this.applyPendingReduction();

    const now = performance.now() / 1000;
    const { gravity, vortexStrength, repulsionRadius } = params;
    const dt = deltaTime * 60;

    const pos = this.positions;
    const vel = this.velocities;
    const alphas = this.alphas;
    const birth = this.birthTimes;
    const maxLife = this.maxLifetimes;
    const count = this.activeCount;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const age = now - birth[i];
      const remaining = maxLife[i] - age;

      if (remaining <= 0) {
        this.spawnParticle(i, now);
        continue;
      }

      if (age < this.FADE_IN_DURATION) {
        alphas[i] = age / this.FADE_IN_DURATION;
      } else if (remaining < this.FADE_OUT_DURATION) {
        alphas[i] = remaining / this.FADE_OUT_DURATION;
      } else {
        alphas[i] = 1.0;
      }

      const px = pos[i3];
      const py = pos[i3 + 1];
      const pz = pos[i3 + 2];

      const distSq = px * px + py * py + pz * pz;
      const distFromCenter = Math.sqrt(distSq);

      let ax = 0;
      let ay = -gravity * 0.1;
      let az = 0;

      if (vortexStrength > 0 && distSq > 0.0001) {
        const invDist = 1.0 / distFromCenter;
        const nx = px * invDist;
        const ny = py * invDist;
        const nz = pz * invDist;

        const tx = ny * 0 - nz * 1;
        const ty = nz * 0 - nx * 0;
        const tz = nx * 1 - ny * 0;

        const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz);
        if (tLen > 0.01) {
          const invTLen = 1.0 / tLen;
          const vortexFactor = vortexStrength * 0.01 / (1 + distFromCenter * 0.05);
          ax += tx * invTLen * vortexFactor;
          ay += ty * invTLen * vortexFactor * 0.3;
          az += tz * invTLen * vortexFactor;
        }

        const inwardFactor = vortexStrength * 0.003 / (1 + distFromCenter * 0.02);
        ax -= nx * inwardFactor;
        az -= nz * inwardFactor;
      }

      if (repulsionRadius > 0 && distFromCenter < repulsionRadius) {
        const normalizedDist = distFromCenter / repulsionRadius;
        const attenuation = (1 - normalizedDist);
        const repulseStrength = attenuation * attenuation * 0.08;
        if (distSq > 0.0001) {
          const invDist = 1.0 / distFromCenter;
          ax += px * invDist * repulseStrength * distFromCenter;
          ay += py * invDist * repulseStrength * distFromCenter;
          az += pz * invDist * repulseStrength * distFromCenter;
        }
      }

      vel[i3] = (vel[i3] + ax * dt) * 0.995;
      vel[i3 + 1] = (vel[i3 + 1] + ay * dt) * 0.995;
      vel[i3 + 2] = (vel[i3 + 2] + az * dt) * 0.995;

      const vx = vel[i3];
      const vy = vel[i3 + 1];
      const vz = vel[i3 + 2];
      const speedSq = vx * vx + vy * vy + vz * vz;
      const MAX_SPEED_SQ = 4.0;
      if (speedSq > MAX_SPEED_SQ) {
        const scale = 2.0 / Math.sqrt(speedSq);
        vel[i3] = vx * scale;
        vel[i3 + 1] = vy * scale;
        vel[i3 + 2] = vz * scale;
      }

      pos[i3] += vel[i3] * dt;
      pos[i3 + 1] += vel[i3 + 1] * dt;
      pos[i3 + 2] += vel[i3 + 2] * dt;

      this.updateParticleColor(i);
    }

    this.updateAttributes();
  }

  private updateAttributes(): void {
    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    this.sizeAttribute.needsUpdate = true;
    this.alphaAttribute.needsUpdate = true;
  }

  public reduceParticleCount(factor: number = 0.8): void {
    this.pendingReductionFactor = factor;
    this.pendingReductionFlag = true;
  }

  private applyPendingReduction(): void {
    if (!this.pendingReductionFlag) return;
    this.pendingReductionFlag = false;

    const newCount = Math.max(2000, Math.floor(this.activeCount * this.pendingReductionFactor));
    if (newCount >= this.activeCount) return;
    this.activeCount = newCount;
    this.geometry.setDrawRange(0, this.activeCount);
    console.warn(`[ParticleEngine] 粒子数量已减少至 ${this.activeCount}（FPS过低保护）`);
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
