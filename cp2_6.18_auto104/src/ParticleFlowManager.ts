import * as THREE from 'three';
import { RoadSegment } from './AppController';

const MAX_PARTICLES = 2000;
const TRAIL_LENGTH = 6;
const PARTICLE_SIZE = 3;
const SPEED_MIN = 0.2;
const SPEED_MAX = 0.8;
const DENSITY_MAX = 200;

interface Particle {
  id: number;
  segmentId: string;
  position: THREE.Vector3;
  direction: number;
  speed: number;
  progress: number;
  trail: THREE.Vector3[];
  active: boolean;
}

export class ParticleFlowManager {
  private scene: THREE.Scene;

  private particleGroup: THREE.Group;
  private trailGroup: THREE.Group;

  private particles: Particle[] = [];
  private particleGeometry!: THREE.BufferGeometry;
  private particleMaterial!: THREE.PointsMaterial;
  private particleSystem!: THREE.Points;

  private trailGeometry!: THREE.BufferGeometry;
  private trailMaterial!: THREE.LineBasicMaterial;

  private roadSegments: RoadSegment[] = [];
  private intersections: THREE.Vector3[] = [];
  private densityMap: Map<string, number> = new Map();

  private lodLevel: 'high' | 'medium' | 'low' = 'high';
  private particleCount: number = MAX_PARTICLES;

  private nextParticleId: number = 0;

  private positions: Float32Array = new Float32Array(0);
  private colors: Float32Array = new Float32Array(0);

  private trailPositions: Float32Array = new Float32Array(0);
  private trailColors: Float32Array = new Float32Array(0);

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.particleGroup = new THREE.Group();
    this.trailGroup = new THREE.Group();

    this.particleGroup.name = 'particles';
    this.trailGroup.name = 'trails';
  }

  init(segments: RoadSegment[], intersections: THREE.Vector3[]): void {
    this.roadSegments = segments;
    this.intersections = intersections;

    this.createParticleSystem();
    this.createTrailSystem();
    this.spawnParticles();

    this.scene.add(this.particleGroup);
    this.scene.add(this.trailGroup);
  }

  private createParticleSystem(): void {
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: PARTICLE_SIZE,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.particleGroup.add(this.particleSystem);
  }

  private createTrailSystem(): void {
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    const trailLines = new THREE.LineSegments(this.trailGeometry, this.trailMaterial);
    this.trailGroup.add(trailLines);
  }

  private spawnParticles(): void {
    const particlesPerSegment = Math.floor(this.particleCount / this.roadSegments.length);

    this.roadSegments.forEach((segment) => {
      for (let i = 0; i < particlesPerSegment; i++) {
        const direction = i % 2 === 0 ? 1 : -1;
        this.createParticle(segment, direction);
      }
    });

    this.updateBuffers();
  }

  private createParticle(segment: RoadSegment, direction: number): Particle {
    const particle: Particle = {
      id: this.nextParticleId++,
      segmentId: segment.id,
      position: new THREE.Vector3(),
      direction,
      speed: SPEED_MAX,
      progress: Math.random(),
      trail: [],
      active: true
    };

    this.updateParticlePosition(particle, segment);

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      particle.trail.push(particle.position.clone());
    }

    this.particles.push(particle);
    return particle;
  }

  private updateParticlePosition(particle: Particle, segment: RoadSegment): void {
    if (segment.direction === 'x') {
      const length = Math.abs(segment.endX - segment.startX);
      const dist = particle.progress * length;
      const startX = particle.direction > 0 ? segment.startX : segment.endX;
      particle.position.set(
        startX + particle.direction * dist,
        0.05,
        segment.startZ
      );
    } else {
      const length = Math.abs(segment.endZ - segment.startZ);
      const dist = particle.progress * length;
      const startZ = particle.direction > 0 ? segment.startZ : segment.endZ;
      particle.position.set(
        segment.startX,
        0.05,
        startZ + particle.direction * dist
      );
    }
  }

  updateFlowDirection(densityMap: Map<string, number>): void {
    this.densityMap = densityMap;

    this.particles.forEach((particle) => {
      const density = densityMap.get(particle.segmentId) || 0;
      const t = density / DENSITY_MAX;
      particle.speed = SPEED_MAX - (SPEED_MAX - SPEED_MIN) * t;
    });
  }

  update(speedMultiplier: number): void {
    if (this.lodLevel === 'low') return;

    const activeParticles = this.particles.slice(0, this.getActiveParticleCount());

    activeParticles.forEach((particle) => {
      if (!particle.active) return;

      for (let i = TRAIL_LENGTH - 1; i > 0; i--) {
        particle.trail[i].copy(particle.trail[i - 1]);
      }
      particle.trail[0].copy(particle.position);

      const segment = this.roadSegments.find(s => s.id === particle.segmentId);
      if (!segment) return;

      const segmentLength = segment.direction === 'x'
        ? Math.abs(segment.endX - segment.startX)
        : Math.abs(segment.endZ - segment.startZ);

      const moveAmount = (particle.speed * speedMultiplier * 0.016) / segmentLength;
      particle.progress += moveAmount;

      if (particle.progress >= 1) {
        particle.progress = 0;

        const nextSegment = this.findNextSegment(segment, particle.direction);
        if (nextSegment) {
          particle.segmentId = nextSegment.id;
        }
      }

      this.updateParticlePosition(particle, segment);
    });

    this.updateBuffers();
  }

  private findNextSegment(currentSegment: RoadSegment, direction: number): RoadSegment | null {
    if (currentSegment.direction === 'x') {
      const z = currentSegment.startZ;
      const endX = direction > 0 ? currentSegment.endX : currentSegment.startX;

      const verticalSeg = this.roadSegments.find(s =>
        s.direction === 'z' &&
        Math.abs(s.startX - endX) < 1 &&
        (
          (direction > 0 && s.startZ < z && s.endZ > z) ||
          (direction < 0 && s.startZ < z && s.endZ > z)
        )
      );

      if (verticalSeg && Math.random() > 0.5) {
        return verticalSeg;
      }
    } else {
      const x = currentSegment.startX;
      const endZ = direction > 0 ? currentSegment.endZ : currentSegment.startZ;

      const horizontalSeg = this.roadSegments.find(s =>
        s.direction === 'x' &&
        Math.abs(s.startZ - endZ) < 1 &&
        (
          (direction > 0 && s.startX < x && s.endX > x) ||
          (direction < 0 && s.startX < x && s.endX > x)
        )
      );

      if (horizontalSeg && Math.random() > 0.5) {
        return horizontalSeg;
      }
    }

    return null;
  }

  private getActiveParticleCount(): number {
    switch (this.lodLevel) {
      case 'high':
        return Math.min(this.particleCount, MAX_PARTICLES);
      case 'medium':
        return Math.min(this.particleCount, MAX_PARTICLES) / 2;
      case 'low':
        return 0;
      default:
        return 0;
    }
  }

  private updateBuffers(): void {
    const activeCount = this.getActiveParticleCount();
    const activeParticles = this.particles.slice(0, activeCount);

    if (this.positions.length !== activeCount * 3) {
      this.positions = new Float32Array(activeCount * 3);
      this.colors = new Float32Array(activeCount * 3);
      this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
      this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    }

    activeParticles.forEach((particle, i) => {
      const idx = i * 3;
      this.positions[idx] = particle.position.x;
      this.positions[idx + 1] = particle.position.y;
      this.positions[idx + 2] = particle.position.z;

      this.colors[idx] = 1;
      this.colors[idx + 1] = 1;
      this.colors[idx + 2] = 1;
    });

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
    this.particleGeometry.setDrawRange(0, activeCount);

    this.updateTrailBuffers(activeParticles);
  }

  private updateTrailBuffers(activeParticles: Particle[]): void {
    const trailSegmentCount = activeParticles.length * (TRAIL_LENGTH - 1);

    if (this.trailPositions.length !== trailSegmentCount * 6) {
      this.trailPositions = new Float32Array(trailSegmentCount * 6);
      this.trailColors = new Float32Array(trailSegmentCount * 6);
      this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
      this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));
    }

    activeParticles.forEach((particle, i) => {
      for (let j = 0; j < TRAIL_LENGTH - 1; j++) {
        const segIdx = (i * (TRAIL_LENGTH - 1) + j) * 6;
        const colorIdx = (i * (TRAIL_LENGTH - 1) + j) * 6;

        const p1 = particle.trail[j];
        const p2 = particle.trail[j + 1];

        this.trailPositions[segIdx] = p1.x;
        this.trailPositions[segIdx + 1] = p1.y;
        this.trailPositions[segIdx + 2] = p1.z;
        this.trailPositions[segIdx + 3] = p2.x;
        this.trailPositions[segIdx + 4] = p2.y;
        this.trailPositions[segIdx + 5] = p2.z;

        const alpha1 = 1 - j / TRAIL_LENGTH;
        const alpha2 = 1 - (j + 1) / TRAIL_LENGTH;

        this.trailColors[colorIdx] = alpha1;
        this.trailColors[colorIdx + 1] = alpha1;
        this.trailColors[colorIdx + 2] = alpha1;
        this.trailColors[colorIdx + 3] = alpha2;
        this.trailColors[colorIdx + 4] = alpha2;
        this.trailColors[colorIdx + 5] = alpha2;
      }
    });

    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.attributes.color.needsUpdate = true;
    this.trailGeometry.setDrawRange(0, trailSegmentCount * 2);
  }

  updateLOD(cameraDistance: number): void {
    let newLevel: 'high' | 'medium' | 'low';

    if (cameraDistance < 40) {
      newLevel = 'high';
    } else if (cameraDistance < 80) {
      newLevel = 'medium';
    } else {
      newLevel = 'low';
    }

    if (newLevel !== this.lodLevel) {
      this.lodLevel = newLevel;
      this.applyLOD();
    }
  }

  private applyLOD(): void {
    switch (this.lodLevel) {
      case 'high':
        this.particleGroup.visible = true;
        this.trailGroup.visible = true;
        break;
      case 'medium':
        this.particleGroup.visible = true;
        this.trailGroup.visible = false;
        break;
      case 'low':
        this.particleGroup.visible = false;
        this.trailGroup.visible = false;
        break;
    }

    this.updateBuffers();
  }

  getParticleCount(): number {
    return this.getActiveParticleCount();
  }
}
