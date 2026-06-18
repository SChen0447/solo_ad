import * as THREE from 'three';
import {
  Particle,
  RoadSegment,
  TOTAL_PARTICLES,
  PARTICLE_SIZE,
  TRAIL_LENGTH,
  DENSITY_RANGE,
  LODLevel,
  ROAD_WIDTH
} from './types';

export class ParticleFlowManager {
  private scene: THREE.Scene;
  private roads: Map<string, RoadSegment>;
  private particles: Particle[] = [];
  private particlePool: Particle[] = [];
  private points: THREE.Points | null = null;
  private trailLines: THREE.LineSegments | null = null;
  private positions: Float32Array;
  private colors: Float32Array;
  private trailPositions: Float32Array;
  private trailColors: Float32Array;
  private flowDirections: Map<string, 1 | -1> = new Map();
  private roadDensities: Map<string, number> = new Map();
  private currentLOD: LODLevel = 'near';
  private particleIdCounter = 0;

  constructor(scene: THREE.Scene, roads: Map<string, RoadSegment>) {
    this.scene = scene;
    this.roads = roads;

    const maxParticles = TOTAL_PARTICLES;
    this.positions = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    this.trailPositions = new Float32Array(maxParticles * TRAIL_LENGTH * 2 * 3);
    this.trailColors = new Float32Array(maxParticles * TRAIL_LENGTH * 2 * 3);

    this.initializeParticlePool(maxParticles);
    this.createParticleSystem();
    this.distributeParticles();
  }

  private initializeParticlePool(count: number): void {
    for (let i = 0; i < count; i++) {
      this.particlePool.push({
        id: i,
        roadId: '',
        position: new THREE.Vector3(),
        direction: 1,
        speed: 0.5,
        progress: 0,
        trail: [],
        active: false
      });
    }
  }

  private createParticleSystem(): void {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const material = new THREE.PointsMaterial({
      size: PARTICLE_SIZE,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: false,
      depthWrite: false
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);

    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    trailGeometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));

    const trailMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      depthWrite: false
    });

    this.trailLines = new THREE.LineSegments(trailGeometry, trailMaterial);
    this.trailLines.frustumCulled = false;
    this.scene.add(this.trailLines);
  }

  private distributeParticles(): void {
    const roadIds = Array.from(this.roads.keys());
    if (roadIds.length === 0) return;

    const particlesPerRoad = Math.floor(TOTAL_PARTICLES / roadIds.length);
    let remaining = TOTAL_PARTICLES % roadIds.length;

    for (const roadId of roadIds) {
      const count = particlesPerRoad + (remaining > 0 ? 1 : 0);
      remaining--;

      for (let i = 0; i < count; i++) {
        this.spawnParticle(roadId, Math.random());
      }
    }
  }

  private spawnParticle(roadId: string, startProgress: number = 0): Particle | null {
    const particle = this.particlePool.find(p => !p.active);
    if (!particle) return null;

    const road = this.roads.get(roadId);
    if (!road) return null;

    particle.id = this.particleIdCounter++;
    particle.roadId = roadId;
    particle.progress = startProgress;
    particle.direction = this.flowDirections.get(roadId) || (Math.random() > 0.5 ? 1 : -1);
    particle.speed = this.calculateSpeed(roadId);
    particle.active = true;
    particle.trail = [];

    this.updateParticlePosition(particle);

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      particle.trail.push(particle.position.clone());
    }

    this.particles.push(particle);
    return particle;
  }

  private calculateSpeed(roadId: string): number {
    const density = this.roadDensities.get(roadId) || 0;
    const normalized = density / DENSITY_RANGE.MAX;
    const minSpeed = 0.2;
    const maxSpeed = 0.8;
    return maxSpeed - normalized * (maxSpeed - minSpeed);
  }

  private updateParticlePosition(particle: Particle): void {
    const road = this.roads.get(particle.roadId);
    if (!road) return;

    const { start, end, type } = road;
    const laneOffset = (particle.id % 2 === 0 ? 1 : -1) * (ROAD_WIDTH / 4);
    const progress = particle.direction === 1 ? particle.progress : 1 - particle.progress;

    let x: number, z: number;

    if (type === 'horizontal') {
      x = start.x + (end.x - start.x) * progress;
      z = start.y + laneOffset;
    } else {
      x = start.x + laneOffset;
      z = start.y + (end.y - start.y) * progress;
    }

    particle.position.set(x, 0.05, z);
  }

  public updateFlowDirection(flowDirections: Map<string, 1 | -1>): void {
    this.flowDirections = new Map(flowDirections);
    
    for (const particle of this.particles) {
      const direction = flowDirections.get(particle.roadId);
      if (direction !== undefined) {
        particle.direction = direction;
      }
    }
  }

  public updateRoadDensities(roadDensities: Map<string, number>): void {
    this.roadDensities = new Map(roadDensities);
    
    for (const particle of this.particles) {
      particle.speed = this.calculateSpeed(particle.roadId);
    }
  }

  public update(deltaTime: number = 1): void {
    if (this.currentLOD === 'far') {
      this.setVisible(false);
      return;
    }

    this.setVisible(true);

    const activeParticles = this.currentLOD === 'mid' 
      ? Math.floor(this.particles.length * 0.5) 
      : this.particles.length;

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      
      if (!particle.active || i >= activeParticles) {
        this.positions[i * 3] = 0;
        this.positions[i * 3 + 1] = -1000;
        this.positions[i * 3 + 2] = 0;
        continue;
      }

      particle.progress += particle.speed * 0.01 * deltaTime;

      if (particle.progress >= 1 || particle.progress <= 0) {
        particle.progress = particle.progress >= 1 ? 0 : 1;
        particle.trail = [];
        for (let j = 0; j < TRAIL_LENGTH; j++) {
          this.updateParticlePosition(particle);
          particle.trail.push(particle.position.clone());
        }
      }

      for (let t = TRAIL_LENGTH - 1; t > 0; t--) {
        particle.trail[t].copy(particle.trail[t - 1]);
      }

      this.updateParticlePosition(particle);
      particle.trail[0].copy(particle.position);

      this.positions[i * 3] = particle.position.x;
      this.positions[i * 3 + 1] = particle.position.y;
      this.positions[i * 3 + 2] = particle.position.z;

      this.colors[i * 3] = 1;
      this.colors[i * 3 + 1] = 1;
      this.colors[i * 3 + 2] = 1;

      for (let t = 0; t < TRAIL_LENGTH - 1; t++) {
        const trailIndex = (i * (TRAIL_LENGTH - 1) + t) * 2 * 3;
        
        const currentTrail = particle.trail[t];
        const nextTrail = particle.trail[t + 1];
        
        this.trailPositions[trailIndex] = currentTrail.x;
        this.trailPositions[trailIndex + 1] = currentTrail.y;
        this.trailPositions[trailIndex + 2] = currentTrail.z;
        
        this.trailPositions[trailIndex + 3] = nextTrail.x;
        this.trailPositions[trailIndex + 4] = nextTrail.y;
        this.trailPositions[trailIndex + 5] = nextTrail.z;

        const alpha = 1 - (t / TRAIL_LENGTH);
        this.trailColors[trailIndex] = 1 * alpha;
        this.trailColors[trailIndex + 1] = 1 * alpha;
        this.trailColors[trailIndex + 2] = 1 * alpha;
        this.trailColors[trailIndex + 3] = 1 * alpha * 0.8;
        this.trailColors[trailIndex + 4] = 1 * alpha * 0.8;
        this.trailColors[trailIndex + 5] = 1 * alpha * 0.8;
      }
    }

    if (this.points) {
      (this.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (this.points.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    }

    if (this.trailLines) {
      (this.trailLines.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (this.trailLines.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  public updateLOD(level: LODLevel): void {
    this.currentLOD = level;
  }

  private setVisible(visible: boolean): void {
    if (this.points) this.points.visible = visible;
    if (this.trailLines) this.trailLines.visible = visible;
  }

  public getParticleCount(): number {
    return this.particles.filter(p => p.active).length;
  }

  public dispose(): void {
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
    }

    if (this.trailLines) {
      this.scene.remove(this.trailLines);
      this.trailLines.geometry.dispose();
      (this.trailLines.material as THREE.Material).dispose();
    }

    this.particles = [];
    this.particlePool = [];
  }
}
