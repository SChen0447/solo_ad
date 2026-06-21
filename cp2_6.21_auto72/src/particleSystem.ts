import * as THREE from 'three';
import type { SpectrumData } from './audioAnalyzer';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  angularVelocity: number;
  angle: number;
  radius: number;
  size: number;
  life: number;
  maxLife: number;
  spiralOffset: number;
  verticalSpeed: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private points: THREE.Points | null = null;
  private group: THREE.Group;
  private maxParticles: number = 500;
  private readonly shellRadius: number = 12;
  private readonly lowColor: THREE.Color = new THREE.Color('#00BFFF');
  private readonly highColor: THREE.Color = new THREE.Color('#FF8C00');
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private opacities: Float32Array;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;

  constructor(group: THREE.Group, initialCount: number = 500) {
    this.group = group;
    this.maxParticles = initialCount;
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);
    this.opacities = new Float32Array(this.maxParticles);

    this.initParticles();
    this.createPoints();
  }

  private initParticles(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  private createParticle(initial: boolean = false): Particle {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = this.shellRadius * (0.3 + Math.random() * 0.7);

    const position = new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      (Math.random() - 0.5) * 15,
      radius * Math.sin(phi) * Math.sin(theta)
    );

    return {
      position,
      velocity: new THREE.Vector3(0, 0, 0),
      angularVelocity: 0.002 + Math.random() * 0.005,
      angle: theta,
      radius,
      size: 0.1 + Math.random() * 0.2,
      life: initial ? Math.random() * 2 : 0,
      maxLife: 2,
      spiralOffset: Math.random() * Math.PI * 2,
      verticalSpeed: (Math.random() - 0.5) * 0.02
    };
  }

  private createPoints(): void {
    this.geometry = new THREE.BufferGeometry();

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      this.positions[i * 3] = p.position.x;
      this.positions[i * 3 + 1] = p.position.y;
      this.positions[i * 3 + 2] = p.position.z;

      const color = this.lowColor.clone();
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      this.sizes[i] = p.size;
      this.opacities[i] = 0;
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aOpacity', new THREE.BufferAttribute(this.opacities, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
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
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = (1.0 - dist * 2.0) * vOpacity;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.group.add(this.points);
  }

  setParticleCount(count: number): void {
    if (count === this.maxParticles) return;

    if (this.points) {
      this.group.remove(this.points);
      this.geometry?.dispose();
      this.material?.dispose();
    }

    this.maxParticles = count;
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);
    this.opacities = new Float32Array(this.maxParticles);
    this.particles = [];
    this.initParticles();
    this.createPoints();
  }

  update(spectrumData: SpectrumData): void {
    if (!this.geometry) return;

    const avgAmplitude = spectrumData.reduce((a, b) => a + b, 0) / spectrumData.length;
    const lowFreqAmplitude = spectrumData.slice(0, 20).reduce((a, b) => a + b, 0) / 20;

    const speedMultiplier = 1 + avgAmplitude * 3;
    const currentColor = this.lowColor.clone().lerp(this.highColor, avgAmplitude);

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];

      p.life += 0.016;

      if (p.life >= p.maxLife) {
        Object.assign(p, this.createParticle(false));
        continue;
      }

      p.angle += p.angularVelocity * speedMultiplier;

      const spiralRadius = p.radius + Math.sin(p.life * 2 + p.spiralOffset) * 0.5;
      const targetY = p.position.y + p.verticalSpeed * speedMultiplier * 3;
      const clampedY = Math.max(-8, Math.min(10, targetY));

      p.position.x = Math.cos(p.angle) * spiralRadius + Math.sin(p.life * 3) * 0.1 * lowFreqAmplitude;
      p.position.z = Math.sin(p.angle) * spiralRadius + Math.cos(p.life * 3) * 0.1 * lowFreqAmplitude;
      p.position.y = clampedY;

      this.positions[i * 3] = p.position.x;
      this.positions[i * 3 + 1] = p.position.y;
      this.positions[i * 3 + 2] = p.position.z;

      const lifeRatio = p.life / p.maxLife;
      let opacity: number;
      if (lifeRatio < 0.1) {
        opacity = lifeRatio / 0.1;
      } else if (lifeRatio > 0.8) {
        opacity = (1 - lifeRatio) / 0.2;
      } else {
        opacity = 1;
      }
      opacity *= (0.5 + avgAmplitude * 0.5);

      const freqIndex = Math.floor((i / this.maxParticles) * spectrumData.length);
      const freqAmplitude = spectrumData[freqIndex] || 0;
      const particleColor = this.lowColor.clone().lerp(this.highColor, freqAmplitude);

      this.colors[i * 3] = particleColor.r;
      this.colors[i * 3 + 1] = particleColor.g;
      this.colors[i * 3 + 2] = particleColor.b;

      this.sizes[i] = p.size * (1 + freqAmplitude * 0.5);
      this.opacities[i] = opacity;
    }

    (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('aSize') as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('aOpacity') as THREE.BufferAttribute).needsUpdate = true;

    if (this.material) {
      this.material.uniforms.time.value += 0.016;
    }
  }

  dispose(): void {
    if (this.points) {
      this.group.remove(this.points);
    }
    this.geometry?.dispose();
    this.material?.dispose();
    this.particles = [];
  }
}
