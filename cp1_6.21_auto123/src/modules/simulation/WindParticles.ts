import * as THREE from 'three';
import { scaleLinear } from 'd3-scale';

export interface WindConfig {
  particleCount: number;
  windDirection: number;
  windSpeed: number;
  sceneSize: number;
  buildings: THREE.Box3[];
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  speed: number;
  age: number;
  life: number;
  trail: THREE.Vector3[];
}

export class WindParticles {
  public points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;

  private particles: Particle[];
  private particleCount: number;
  private windDirection: number;
  private windSpeed: number;
  private sceneSize: number;
  private buildings: THREE.Box3[];
  private maxHeight: number = 80;
  private baseSpeed: number = 15;

  private colorScale = scaleLinear<string>()
    .domain([0, 2.5, 5, 7.5, 10])
    .range(['#1e90ff', '#00ced1', '#32cd32', '#ffd700', '#ff4500'])
    .clamp(true);

  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

  constructor(config: WindConfig) {
    this.particleCount = config.particleCount;
    this.windDirection = config.windDirection;
    this.windSpeed = config.windSpeed;
    this.sceneSize = config.sceneSize;
    this.buildings = config.buildings;

    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(this.createParticle(true));
    }

    this.positions = new Float32Array(this.particleCount * 3);
    this.colors = new Float32Array(this.particleCount * 3);
    this.sizes = new Float32Array(this.particleCount);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;

    this.updateBuffers();
  }

  private createParticle(randomStart: boolean = false): Particle {
    const half = this.sceneSize / 2 + 20;
    const rad = (this.windDirection * Math.PI) / 180;
    const dirX = -Math.cos(rad);
    const dirZ = -Math.sin(rad);

    let x: number, y: number, z: number;
    if (randomStart) {
      x = (Math.random() - 0.5) * this.sceneSize * 1.2;
      z = (Math.random() - 0.5) * this.sceneSize * 1.2;
      y = Math.random() * this.maxHeight + 1;
    } else {
      const offsetX = -dirX * half + (Math.random() - 0.5) * this.sceneSize * 0.6;
      const offsetZ = -dirZ * half + (Math.random() - 0.5) * this.sceneSize * 0.6;
      x = offsetX;
      z = offsetZ;
      y = Math.random() * this.maxHeight + 1;
    }

    const life = 3 + Math.random() * 5;
    return {
      position: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(dirX, 0, dirZ),
      speed: 0,
      age: randomStart ? Math.random() * life : 0,
      life: life,
      trail: [],
    };
  }

  private resetParticle(p: Particle): void {
    const half = this.sceneSize / 2 + 20;
    const rad = (this.windDirection * Math.PI) / 180;
    const dirX = -Math.cos(rad);
    const dirZ = -Math.sin(rad);

    p.position.set(
      -dirX * half + (Math.random() - 0.5) * this.sceneSize * 0.6,
      Math.random() * this.maxHeight + 1,
      -dirZ * half + (Math.random() - 0.5) * this.sceneSize * 0.6
    );
    p.velocity.set(dirX, 0, dirZ);
    p.speed = 0;
    p.age = 0;
    p.life = 3 + Math.random() * 5;
    p.trail.length = 0;
  }

  private collidesWithBuilding(pos: THREE.Vector3): boolean {
    for (const box of this.buildings) {
      if (
        pos.x > box.min.x - 0.5 &&
        pos.x < box.max.x + 0.5 &&
        pos.y > box.min.y - 0.5 &&
        pos.y < box.max.y + 0.5 &&
        pos.z > box.min.z - 0.5 &&
        pos.z < box.max.z + 0.5
      ) {
        return true;
      }
    }
    return false;
  }

  private computeWindVelocity(pos: THREE.Vector3): THREE.Vector3 {
    const rad = (this.windDirection * Math.PI) / 180;
    const baseDirX = Math.cos(rad);
    const baseDirZ = Math.sin(rad);
    const speedScale = this.windSpeed / 5;

    let dirX = baseDirX;
    let dirZ = baseDirZ;
    let speed = this.baseSpeed * speedScale;

    let nearestDist = Infinity;
    let nearestBox: THREE.Box3 | null = null;
    for (const box of this.buildings) {
      const cx = (box.min.x + box.max.x) / 2;
      const cz = (box.min.z + box.max.z) / 2;
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < nearestDist && pos.y < box.max.y + 5) {
        nearestDist = dist;
        nearestBox = box;
      }
    }

    if (nearestBox && nearestDist < 25) {
      const influence = 1 - nearestDist / 25;
      const cx = (nearestBox.min.x + nearestBox.max.x) / 2;
      const cz = (nearestBox.min.z + nearestBox.max.z) / 2;
      const toPX = pos.x - cx;
      const toPZ = pos.z - cz;
      const tangentX = -toPZ;
      const tangentZ = toPX;
      const tLen = Math.sqrt(tangentX * tangentX + tangentZ * tangentZ) || 1;

      let dot = (tangentX / tLen) * baseDirX + (tangentZ / tLen) * baseDirZ;
      if (Math.abs(dot) < 0.2) {
        dot = dot >= 0 ? 0.2 : -0.2;
      }

      const mix = influence * 0.7;
      dirX = baseDirX * (1 - mix) + (tangentX / tLen) * dot * mix;
      dirZ = baseDirZ * (1 - mix) + (tangentZ / tLen) * dot * mix;

      const wakeFactor = 0.55 + 0.45 * Math.pow(nearestDist / 25, 1.5);
      speed *= wakeFactor;
    }

    if (pos.y < 15) {
      speed *= 0.5 + 0.5 * (pos.y / 15);
    }

    const len = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
    return new THREE.Vector3((dirX / len) * speed, 0, (dirZ / len) * speed);
  }

  public update(delta: number): void {
    const half = this.sceneSize / 2 + 30;

    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];
      p.age += delta;

      if (p.age > p.life ||
          Math.abs(p.position.x) > half ||
          Math.abs(p.position.z) > half ||
          p.position.y > this.maxHeight + 10) {
        this.resetParticle(p);
        continue;
      }

      const wind = this.computeWindVelocity(p.position);
      p.velocity.lerp(wind, 0.15);

      const lift = (wind.length() / 30) * delta * 0.3;
      p.position.x += p.velocity.x * delta;
      p.position.y += p.velocity.y * delta + lift;
      p.position.z += p.velocity.z * delta;
      p.position.y = Math.max(0.5, p.position.y);

      if (this.collidesWithBuilding(p.position)) {
        p.position.x -= p.velocity.x * delta * 1.5;
        p.position.z -= p.velocity.z * delta * 1.5;
        const perturb = 1 + Math.random() * 2;
        p.velocity.x += (Math.random() - 0.5) * perturb;
        p.velocity.z += (Math.random() - 0.5) * perturb;
      }

      p.speed = p.velocity.length();
    }

    this.updateBuffers();
  }

  private updateBuffers(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];
      this.positions[i * 3] = p.position.x;
      this.positions[i * 3 + 1] = p.position.y;
      this.positions[i * 3 + 2] = p.position.z;

      const displaySpeed = Math.min(10, (p.speed / this.baseSpeed) * (this.windSpeed / 5) * 6);
      const colorStr = this.colorScale(displaySpeed);
      const color = new THREE.Color(colorStr);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      this.sizes[i] = 1.2 + (displaySpeed / 10) * 1.8;
    }

    (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('size') as THREE.BufferAttribute).needsUpdate = true;
  }

  public getWindSpeedAt(x: number, z: number): number {
    const probe = new THREE.Vector3(x, 2, z);
    const v = this.computeWindVelocity(probe);
    const raw = v.length();
    return Math.min(10, (raw / this.baseSpeed) * (this.windSpeed / 5) * 6);
  }

  public getSpeedGrid(resolution: number): number[][] {
    const grid: number[][] = [];
    const half = this.sceneSize / 2;
    const step = this.sceneSize / resolution;

    for (let i = 0; i < resolution; i++) {
      grid[i] = [];
      for (let j = 0; j < resolution; j++) {
        const x = -half + (i + 0.5) * step;
        const z = -half + (j + 0.5) * step;
        grid[i][j] = this.getWindSpeedAt(x, z);
      }
    }
    return grid;
  }

  public setBuildings(buildings: THREE.Box3[]): void {
    this.buildings = buildings;
  }

  public setWindDirection(angle: number): void {
    this.windDirection = angle;
  }

  public setWindSpeed(speed: number): void {
    this.windSpeed = speed;
  }

  public getWindDirection(): number {
    return this.windDirection;
  }

  public getWindSpeed(): number {
    return this.windSpeed;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
