import * as THREE from 'three';
import { Particle, ParticleParams } from './particle';

export interface FluidSourceConfig {
  velocity: number;
  maxParticles: number;
  gravity: number;
  turbulence: number;
}

export type PresetType = 'waterfall' | 'fountain' | 'vortex';

export class FluidSourceManager {
  private scene: THREE.Scene;
  private sources: Array<{ position: THREE.Vector3; mesh: THREE.Mesh; particles: Particle[]; emitAccumulator: number }>;
  private particleGroup: THREE.Group;
  private particlesGeometry: THREE.BufferGeometry;
  private particlesMaterial: THREE.PointsMaterial;
  private particlesPoints: THREE.Points;
  private config: FluidSourceConfig;
  private targetConfig: FluidSourceConfig;
  private transitionProgress: number;
  private transitionDuration: number;
  private isTransitioning: boolean;
  private selectedParticle: Particle | null;
  private velocityArrows: Map<Particle, THREE.ArrowHelper>;
  public onParticleSelected: ((particle: Particle | null) => void) | null = null;

  private static readonly EMIT_RATE = 60;
  private static readonly INITIAL_PARTICLES = 200;
  private static readonly SOURCE_RADIUS = 0.3;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.sources = [];
    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);
    this.velocityArrows = new Map();
    this.selectedParticle = null;

    this.config = {
      velocity: 2.0,
      maxParticles: 200,
      gravity: 0.5,
      turbulence: 0.2
    };

    this.targetConfig = { ...this.config };
    this.transitionProgress = 1;
    this.transitionDuration = 0.5;
    this.isTransitioning = false;

    this.particlesGeometry = new THREE.BufferGeometry();
    this.particlesMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.particlesPoints = new THREE.Points(this.particlesGeometry, this.particlesMaterial);
    this.particleGroup.add(this.particlesPoints);
  }

  public addSource(position: THREE.Vector3): void {
    const sourceMesh = this.createSourceMesh(position);
    this.scene.add(sourceMesh);

    const source = {
      position: position.clone(),
      mesh: sourceMesh,
      particles: [] as Particle[],
      emitAccumulator: 0
    };

    for (let i = 0; i < FluidSourceManager.INITIAL_PARTICLES; i++) {
      const particle = this.createParticle(position);
      particle.age = Math.random() * particle.lifeTime;
      source.particles.push(particle);
    }

    this.sources.push(source);
  }

  public clearSources(): void {
    for (const source of this.sources) {
      this.scene.remove(source.mesh);
      source.mesh.geometry.dispose();
      (source.mesh.material as THREE.Material).dispose();
    }

    for (const arrow of this.velocityArrows.values()) {
      this.scene.remove(arrow);
    }
    this.velocityArrows.clear();

    this.sources = [];
    this.selectedParticle = null;
  }

  public loadPreset(preset: PresetType): void {
    this.clearSources();

    const positions: THREE.Vector3[] = [];

    switch (preset) {
      case 'waterfall':
        for (let i = 0; i < 5; i++) {
          positions.push(new THREE.Vector3((i - 2) * 0.8, 4, 0));
        }
        this.setConfig({ velocity: 1.5, gravity: 1.2, turbulence: 0.15, maxParticles: this.config.maxParticles });
        break;
      case 'fountain':
        for (let i = 0; i < 3; i++) {
          positions.push(new THREE.Vector3(0, 0.5 + i * 0.3, 0));
        }
        this.setConfig({ velocity: 3.5, gravity: 0.8, turbulence: 0.3, maxParticles: this.config.maxParticles });
        break;
      case 'vortex':
        const radius = 2;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          positions.push(new THREE.Vector3(
            Math.cos(angle) * radius,
            2 + Math.sin(angle * 2) * 0.3,
            Math.sin(angle) * radius
          ));
        }
        this.setConfig({ velocity: 2.5, gravity: 0.4, turbulence: 0.8, maxParticles: this.config.maxParticles });
        break;
    }

    for (const pos of positions) {
      this.addSource(pos);
    }
  }

  public setConfig(newConfig: Partial<FluidSourceConfig>): void {
    this.targetConfig = { ...this.config, ...newConfig };
    this.isTransitioning = true;
    this.transitionProgress = 0;
  }

  public getConfig(): FluidSourceConfig {
    return { ...this.config };
  }

  public update(deltaTime: number): void {
    if (this.isTransitioning) {
      this.transitionProgress = Math.min(1, this.transitionProgress + deltaTime / this.transitionDuration);
      const t = this.easeInOut(this.transitionProgress);

      this.config.velocity = THREE.MathUtils.lerp(this.config.velocity, this.targetConfig.velocity, t);
      this.config.gravity = THREE.MathUtils.lerp(this.config.gravity, this.targetConfig.gravity, t);
      this.config.turbulence = THREE.MathUtils.lerp(this.config.turbulence, this.targetConfig.turbulence, t);
      this.config.maxParticles = Math.round(THREE.MathUtils.lerp(this.config.maxParticles, this.targetConfig.maxParticles, t));

      if (this.transitionProgress >= 1) {
        this.isTransitioning = false;
        this.config = { ...this.targetConfig };
      }
    }

    const particleParams: ParticleParams = {
      velocity: this.config.velocity,
      gravity: this.config.gravity,
      turbulence: this.config.turbulence
    };

    const totalParticlesPerSource = Math.floor(this.config.maxParticles / Math.max(1, this.sources.length));

    for (const source of this.sources) {
      source.emitAccumulator += deltaTime * FluidSourceManager.EMIT_RATE;

      while (source.emitAccumulator >= 1 && source.particles.length < totalParticlesPerSource) {
        source.particles.push(this.createParticle(source.position));
        source.emitAccumulator -= 1;
      }

      for (let i = source.particles.length - 1; i >= 0; i--) {
        const particle = source.particles[i];
        particle.update(deltaTime, particleParams);

        if (!particle.isAlive) {
          if (this.selectedParticle === particle) {
            this.selectedParticle = null;
            this.onParticleSelected?.(null);
          }
          const arrow = this.velocityArrows.get(particle);
          if (arrow) {
            this.scene.remove(arrow);
            this.velocityArrows.delete(particle);
          }
          source.particles.splice(i, 1);
        }
      }

      if (source.particles.length > totalParticlesPerSource) {
        const extra = source.particles.length - totalParticlesPerSource;
        for (let i = 0; i < extra; i++) {
          const removed = source.particles.shift();
          if (removed) {
            if (this.selectedParticle === removed) {
              this.selectedParticle = null;
              this.onParticleSelected?.(null);
            }
            const arrow = this.velocityArrows.get(removed);
            if (arrow) {
              this.scene.remove(arrow);
              this.velocityArrows.delete(removed);
            }
          }
        }
      }
    }

    this.updateParticleVisuals();
    this.updateVelocityArrows();
  }

  public handleClick(intersectPoint: THREE.Vector3): Particle | null {
    let closestParticle: Particle | null = null;
    let closestDistance = 0.5;

    for (const source of this.sources) {
      for (const particle of source.particles) {
        const distance = particle.position.distanceTo(intersectPoint);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestParticle = particle;
        }
      }
    }

    if (this.selectedParticle && this.selectedParticle !== closestParticle) {
      const oldArrow = this.velocityArrows.get(this.selectedParticle);
      if (oldArrow) {
        oldArrow.setColor(new THREE.Color(0x666666));
      }
    }

    this.selectedParticle = closestParticle;

    if (closestParticle) {
      let arrow = this.velocityArrows.get(closestParticle);
      if (!arrow) {
        arrow = new THREE.ArrowHelper(
          closestParticle.velocity.clone().normalize(),
          closestParticle.position,
          0.5,
          0xffff00,
          0.15,
          0.08
        );
        this.scene.add(arrow);
        this.velocityArrows.set(closestParticle, arrow);
      } else {
        arrow.setColor(new THREE.Color(0xffff00));
      }
    }

    this.onParticleSelected?.(closestParticle);
    return closestParticle;
  }

  public getAllParticles(): Particle[] {
    const all: Particle[] = [];
    for (const source of this.sources) {
      all.push(...source.particles);
    }
    return all;
  }

  public getSelectedParticle(): Particle | null {
    return this.selectedParticle;
  }

  private createSourceMesh(position: THREE.Vector3): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(FluidSourceManager.SOURCE_RADIUS, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: 0x00aaff,
      emissive: 0x004466,
      transparent: true,
      opacity: 0.85,
      shininess: 100
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);

    const innerGeometry = new THREE.SphereGeometry(FluidSourceManager.SOURCE_RADIUS * 0.6, 32, 32);
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6
    });
    const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
    mesh.add(innerMesh);

    return mesh;
  }

  private createParticle(position: THREE.Vector3): Particle {
    const direction = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      Math.random() * 0.5 + 0.5,
      (Math.random() - 0.5) * 2
    ).normalize();

    return new Particle(position, direction, {
      velocity: this.config.velocity,
      gravity: this.config.gravity,
      turbulence: this.config.turbulence
    });
  }

  private updateParticleVisuals(): void {
    const allParticles = this.getAllParticles();
    const positions = new Float32Array(allParticles.length * 3);
    const colors = new Float32Array(allParticles.length * 3);
    const sizes = new Float32Array(allParticles.length);

    for (let i = 0; i < allParticles.length; i++) {
      const p = allParticles[i];
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;

      colors[i * 3] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;

      sizes[i] = p.size;
    }

    this.particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particlesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.particlesGeometry.attributes.position.needsUpdate = true;
    this.particlesGeometry.attributes.color.needsUpdate = true;
  }

  private updateVelocityArrows(): void {
    for (const [particle, arrow] of this.velocityArrows.entries()) {
      if (!particle.isAlive) continue;

      arrow.position.copy(particle.position);

      const velocity = particle.velocity.clone();
      const length = velocity.length();
      if (length > 0.001) {
        arrow.setDirection(velocity.normalize());
        arrow.setLength(Math.min(0.8, length * 0.2), 0.15, 0.08);
      }

      if (particle !== this.selectedParticle) {
        arrow.setColor(new THREE.Color(0x666666));
      }
    }
