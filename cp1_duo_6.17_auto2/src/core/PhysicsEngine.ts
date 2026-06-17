import * as THREE from 'three';
import { AstroBody, mergeBodies } from './AstroBody';

export interface CollisionEvent {
  body1: AstroBody;
  body2: AstroBody;
  position: THREE.Vector3;
}

export interface ExplosionParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  damping: number;
  startColor: THREE.Color;
  endColor: THREE.Color;
}

interface SpatialGridConfig {
  cellSize?: number;
  boundaryMin?: THREE.Vector3;
  boundaryMax?: THREE.Vector3;
  autoSize?: boolean;
}

class SpatialGrid {
  private cellSize: number;
  private buckets: Map<string, AstroBody[]>;
  private boundaryMin: THREE.Vector3;
  private boundaryMax: THREE.Vector3;
  private autoSize: boolean;

  constructor(config: SpatialGridConfig = {}) {
    this.cellSize = config.cellSize ?? 20;
    this.boundaryMin = config.boundaryMin ?? new THREE.Vector3(-500, -500, -500);
    this.boundaryMax = config.boundaryMax ?? new THREE.Vector3(500, 500, 500);
    this.autoSize = config.autoSize ?? true;
    this.buckets = new Map();
  }

  public clear(): void {
    this.buckets.clear();
  }

  public setCellSize(size: number): void {
    this.cellSize = Math.max(1, size);
  }

  public getCellSize(): number {
    return this.cellSize;
  }

  public setBoundaries(min: THREE.Vector3, max: THREE.Vector3): void {
    this.boundaryMin.copy(min);
    this.boundaryMax.copy(max);
  }

  public isInsideBounds(position: THREE.Vector3): boolean {
    return (
      position.x >= this.boundaryMin.x && position.x <= this.boundaryMax.x &&
      position.y >= this.boundaryMin.y && position.y <= this.boundaryMax.y &&
      position.z >= this.boundaryMin.z && position.z <= this.boundaryMax.z
    );
  }

  public clampToBounds(position: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(
      Math.max(this.boundaryMin.x, Math.min(this.boundaryMax.x, position.x)),
      Math.max(this.boundaryMin.y, Math.min(this.boundaryMax.y, position.y)),
      Math.max(this.boundaryMin.z, Math.min(this.boundaryMax.z, position.z))
    );
  }

  private getKey(position: THREE.Vector3): string {
    const clamped = this.clampToBounds(position);
    const bx = Math.floor(clamped.x / this.cellSize);
    const by = Math.floor(clamped.y / this.cellSize);
    const bz = Math.floor(clamped.z / this.cellSize);
    return `${bx},${by},${bz}`;
  }

  private getNeighborKeys(position: THREE.Vector3): string[] {
    const keys: string[] = [];
    const clamped = this.clampToBounds(position);
    const bx = Math.floor(clamped.x / this.cellSize);
    const by = Math.floor(clamped.y / this.cellSize);
    const bz = Math.floor(clamped.z / this.cellSize);

    const minX = Math.floor(this.boundaryMin.x / this.cellSize);
    const maxX = Math.floor(this.boundaryMax.x / this.cellSize);
    const minY = Math.floor(this.boundaryMin.y / this.cellSize);
    const maxY = Math.floor(this.boundaryMax.y / this.cellSize);
    const minZ = Math.floor(this.boundaryMin.z / this.cellSize);
    const maxZ = Math.floor(this.boundaryMax.z / this.cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const nx = bx + dx;
          const ny = by + dy;
          const nz = bz + dz;
          if (
            nx >= minX && nx <= maxX &&
            ny >= minY && ny <= maxY &&
            nz >= minZ && nz <= maxZ
          ) {
            keys.push(`${nx},${ny},${nz}`);
          }
        }
      }
    }

    return keys;
  }

  public insert(body: AstroBody): boolean {
    if (!this.isInsideBounds(body.position)) {
      return false;
    }
    const key = this.getKey(body.position);
    if (!this.buckets.has(key)) {
      this.buckets.set(key, []);
    }
    this.buckets.get(key)!.push(body);
    return true;
  }

  public getPotentialCollisions(body: AstroBody): AstroBody[] {
    const candidates: AstroBody[] = [];
    if (!this.isInsideBounds(body.position)) {
      return candidates;
    }
    const neighborKeys = this.getNeighborKeys(body.position);

    for (const key of neighborKeys) {
      const bucket = this.buckets.get(key);
      if (bucket) {
        for (const other of bucket) {
          if (other !== body) {
            candidates.push(other);
          }
        }
      }
    }

    return candidates;
  }
}

export interface PhysicsEngineConfig {
  gravityConstant?: number;
  gridCellSize?: number;
  boundaryMin?: THREE.Vector3;
  boundaryMax?: THREE.Vector3;
}

export class PhysicsEngine {
  public gravityConstant: number = 0.5;
  private bodies: AstroBody[] = [];
  private scene: THREE.Scene;
  private explosions: ExplosionParticle[] = [];
  private spatialGrid: SpatialGrid;
  private boundaryMin: THREE.Vector3;
  private boundaryMax: THREE.Vector3;
  private gridCellSize?: number;

  constructor(scene: THREE.Scene, config: PhysicsEngineConfig = {}) {
    this.scene = scene;
    this.gravityConstant = config.gravityConstant ?? 0.5;
    this.boundaryMin = config.boundaryMin ?? new THREE.Vector3(-500, -500, -500);
    this.boundaryMax = config.boundaryMax ?? new THREE.Vector3(500, 500, 500);
    this.gridCellSize = config.gridCellSize;

    this.spatialGrid = new SpatialGrid({
      cellSize: this.gridCellSize ?? 20,
      boundaryMin: this.boundaryMin,
      boundaryMax: this.boundaryMax,
      autoSize: this.gridCellSize === undefined,
    });
  }

  public setGravityConstant(value: number): void {
    this.gravityConstant = Math.max(0.01, Math.min(10, value));
  }

  public setGridCellSize(size: number): void {
    this.gridCellSize = Math.max(1, size);
    this.spatialGrid.setCellSize(this.gridCellSize);
  }

  private calculateDynamicCellSize(): number {
    if (this.gridCellSize !== undefined) return this.gridCellSize;
    if (this.bodies.length === 0) return 20;

    let minRadius = Infinity;
    let maxRadius = 0;
    let totalRadius = 0;

    for (const body of this.bodies) {
      totalRadius += body.radius;
      minRadius = Math.min(minRadius, body.radius);
      maxRadius = Math.max(maxRadius, body.radius);
    }

    const avgRadius = totalRadius / this.bodies.length;
    const dynamicSize = (minRadius + maxRadius) * 2;
    return Math.max(dynamicSize, avgRadius * 4, maxRadius * 2.5, 5);
  }

  private enforceBoundaries(): AstroBody[] {
    const outOfBounds: AstroBody[] = [];

    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const body = this.bodies[i];
      const pos = body.position;

      let outOfBoundsFlag = false;
      const margin = 5;

      if (pos.x < this.boundaryMin.x - margin || pos.x > this.boundaryMax.x + margin ||
          pos.y < this.boundaryMin.y - margin || pos.y > this.boundaryMax.y + margin ||
          pos.z < this.boundaryMin.z - margin || pos.z > this.boundaryMax.z + margin) {
        outOfBoundsFlag = true;
      }

      if (outOfBoundsFlag) {
        outOfBounds.push(body);
        body.dispose(this.scene);
        this.bodies.splice(i, 1);
        continue;
      }

      const clamped = this.spatialGrid.clampToBounds(pos);
      if (!clamped.equals(pos)) {
        const damping = 0.5;
        if (pos.x < this.boundaryMin.x || pos.x > this.boundaryMax.x) {
          body.velocity.x *= -damping;
        }
        if (pos.y < this.boundaryMin.y || pos.y > this.boundaryMax.y) {
          body.velocity.y *= -damping;
        }
        if (pos.z < this.boundaryMin.z || pos.z > this.boundaryMax.z) {
          body.velocity.z *= -damping;
        }
        body.position.copy(clamped);
      }
    }

    return outOfBounds;
  }

  public addBody(body: AstroBody): void {
    if (this.spatialGrid.isInsideBounds(body.position)) {
      this.bodies.push(body);
    }
  }

  public removeBody(body: AstroBody): void {
    const index = this.bodies.indexOf(body);
    if (index !== -1) {
      body.dispose(this.scene);
      this.bodies.splice(index, 1);
    }
  }

  public clearAll(): void {
    for (const body of this.bodies) {
      body.dispose(this.scene);
    }
    this.bodies = [];
    this.clearExplosions();
  }

  public getBodies(): AstroBody[] {
    return this.bodies;
  }

  public setBodies(bodies: AstroBody[]): void {
    this.clearAll();
    for (const body of bodies) {
      if (this.spatialGrid.isInsideBounds(body.position)) {
        this.bodies.push(body);
      }
    }
  }

  public update(deltaTime: number): CollisionEvent[] {
    const collisions: CollisionEvent[] = [];

    if (deltaTime > 0.05) deltaTime = 0.05;

    this.enforceBoundaries();
    this.calculateGravity();
    this.detectCollisions(collisions);

    for (const body of this.bodies) {
      body.update(deltaTime);
    }

    this.handleCollisions(collisions);
    this.updateExplosions(deltaTime);

    return collisions;
  }

  private calculateGravity(): void {
    const G = this.gravityConstant * 50;
    const n = this.bodies.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const bodyA = this.bodies[i];
        const bodyB = this.bodies[j];

        const direction = new THREE.Vector3()
          .subVectors(bodyB.position, bodyA.position);
        const distanceSq = direction.lengthSq();

        if (distanceSq < 0.1) continue;

        const distance = Math.sqrt(distanceSq);
        const forceMagnitude = (G * bodyA.mass * bodyB.mass) / distanceSq;

        const force = direction.normalize().multiplyScalar(forceMagnitude);

        bodyA.applyForce(force);
        bodyB.applyForce(force.clone().negate());
      }
    }
  }

  private detectCollisions(collisions: CollisionEvent[]): void {
    const cellSize = this.calculateDynamicCellSize();
    this.spatialGrid.setCellSize(cellSize);
    this.spatialGrid.clear();

    for (const body of this.bodies) {
      this.spatialGrid.insert(body);
    }

    const checked = new Set<string>();

    for (const body of this.bodies) {
      const candidates = this.spatialGrid.getPotentialCollisions(body);

      for (const other of candidates) {
        const pairKey = [body.id, other.id].sort().join('|');
        if (checked.has(pairKey)) continue;
        checked.add(pairKey);

        const distance = body.position.distanceTo(other.position);
        const minDistance = body.radius + other.radius;

        if (distance < minDistance) {
          collisions.push({
            body1: body,
            body2: other,
            position: body.position.clone().add(other.position).multiplyScalar(0.5),
          });
        }
      }
    }
  }

  private handleCollisions(collisions: CollisionEvent[]): void {
    const processed = new Set<string>();

    for (const collision of collisions) {
      const key = [collision.body1.id, collision.body2.id].sort().join('|');
      if (processed.has(key)) continue;

      if (!this.bodies.includes(collision.body1) || !this.bodies.includes(collision.body2)) {
        continue;
      }

      processed.add(key);

      this.createExplosion(
        collision.position,
        collision.body1.color,
        collision.body2.color
      );

      const merged = mergeBodies(collision.body1, collision.body2, this.scene);

      this.removeBody(collision.body1);
      this.removeBody(collision.body2);

      this.bodies.push(merged);
    }
  }

  private createExplosion(position: THREE.Vector3, color1: string, color2: string): void {
    const particleCount = 50;
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);

    for (let i = 0; i < particleCount; i++) {
      const size = 0.1 + Math.random() * 0.2;
      const geometry = new THREE.BoxGeometry(size, size, size);

      const mixFactor = Math.random();
      const startColor = c1.clone().lerp(c2, mixFactor);
      const endColor = c1.clone().lerp(c2, 1 - mixFactor).multiplyScalar(0.3);

      const material = new THREE.MeshBasicMaterial({
        color: startColor.clone(),
        transparent: true,
        opacity: 1,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 2 + Math.random() * 8;

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );

      this.scene.add(mesh);
      this.explosions.push({
        mesh,
        velocity,
        life: 0.5,
        maxLife: 0.5,
        damping: 0.92 + Math.random() * 0.05,
        startColor,
        endColor,
      });
    }
  }

  private updateExplosions(deltaTime: number): void {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const particle = this.explosions[i];
      particle.life -= deltaTime;

      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        particle.mesh.geometry.dispose();
        (particle.mesh.material as THREE.Material).dispose();
        this.explosions.splice(i, 1);
        continue;
      }

      const t = 1 - particle.life / particle.maxLife;

      particle.velocity.multiplyScalar(Math.pow(particle.damping, deltaTime * 60));

      particle.mesh.position.add(particle.velocity.clone().multiplyScalar(deltaTime));

      particle.mesh.rotation.x += deltaTime * (3 + Math.random() * 4);
      particle.mesh.rotation.y += deltaTime * (2 + Math.random() * 3);

      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = 1 - t;

      const currentColor = particle.startColor.clone().lerp(particle.endColor, t);
      material.color.copy(currentColor);

      const scale = 1 - t * 0.6;
      particle.mesh.scale.setScalar(scale);
    }
  }

  private clearExplosions(): void {
    for (const particle of this.explosions) {
      this.scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
    }
    this.explosions = [];
  }

  public getBodyCount(): number {
    return this.bodies.length;
  }
}
