import * as THREE from 'three';
import {
  ParticleData,
  WaterPoolData,
  TerrainParams,
  GRID_SIZE,
  CELL_SIZE,
  TERRAIN_EXTENT,
  DEFAULT_PARTICLE_COUNT,
  MAX_PARTICLES,
  PARTICLE_SIZE,
  WATERFALL_ANGLE_THRESHOLD,
  WATERFALL_SPEED_MULTIPLIER,
  COLOR_PARTICLE,
  COLOR_SKY,
} from '../types';
import { TerrainGenerator } from '../terrain/TerrainGenerator';

export class WaterSimulator {
  private particles: ParticleData[];
  private particleCount: number;
  private terrainGenerator: TerrainGenerator;
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;
  private particleMesh: THREE.Points;
  private pools: WaterPoolData[];
  private poolMeshes: THREE.Mesh[];
  private poolGroup: THREE.Group;
  private accumulationMap: Float32Array;
  private halfExtent: number;

  constructor(terrainGenerator: TerrainGenerator) {
    this.terrainGenerator = terrainGenerator;
    this.particles = [];
    this.particleCount = DEFAULT_PARTICLE_COUNT;
    this.pools = [];
    this.poolMeshes = [];
    this.poolGroup = new THREE.Group();
    this.halfExtent = TERRAIN_EXTENT / 2;
    this.accumulationMap = new Float32Array(GRID_SIZE * GRID_SIZE);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push(this.createParticle());
    }

    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_PARTICLES * 3);
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.particleMaterial = new THREE.PointsMaterial({
      color: COLOR_PARTICLE,
      size: PARTICLE_SIZE,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particleMesh = new THREE.Points(this.particleGeometry, this.particleMaterial);
  }

  private createParticle(): ParticleData {
    const halfExtent = TERRAIN_EXTENT / 2;
    const x = (Math.random() - 0.5) * TERRAIN_EXTENT;
    const z = (Math.random() - 0.5) * TERRAIN_EXTENT;
    const y = this.terrainGenerator.getHeightAt(x, z) + 0.1;

    return {
      position: [x, y, z],
      velocity: [0, 0, 0],
      active: true,
      lifetime: 0,
    };
  }

  private respawnParticle(particle: ParticleData): void {
    const edge = Math.floor(Math.random() * 4);
    let x: number, z: number;

    switch (edge) {
      case 0:
        x = -this.halfExtent + Math.random() * TERRAIN_EXTENT;
        z = -this.halfExtent;
        break;
      case 1:
        x = -this.halfExtent + Math.random() * TERRAIN_EXTENT;
        z = this.halfExtent;
        break;
      case 2:
        x = -this.halfExtent;
        z = -this.halfExtent + Math.random() * TERRAIN_EXTENT;
        break;
      default:
        x = this.halfExtent;
        z = -this.halfExtent + Math.random() * TERRAIN_EXTENT;
        break;
    }

    const y = this.terrainGenerator.getHeightAt(x, z) + 0.15;
    particle.position[0] = x;
    particle.position[1] = y;
    particle.position[2] = z;
    particle.velocity[0] = 0;
    particle.velocity[1] = 0;
    particle.velocity[2] = 0;
    particle.active = true;
    particle.lifetime = 0;
  }

  setParticleCount(count: number): void {
    this.particleCount = Math.min(count, MAX_PARTICLES);
  }

  getParticleCount(): number {
    return this.particleCount;
  }

  getMesh(): THREE.Points {
    return this.particleMesh;
  }

  getPoolGroup(): THREE.Group {
    return this.poolGroup;
  }

  update(dt: number): void {
    const positions = this.particleGeometry.attributes.position as THREE.BufferAttribute;
    const posArray = positions.array as Float32Array;

    this.accumulationMap.fill(0);

    let activeCount = 0;

    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];

      if (!p.active) {
        this.respawnParticle(p);
      }

      const slope = this.terrainGenerator.getSlopeAt(p.position[0], p.position[2]);
      const gradient = this.terrainGenerator.getGradientAt(p.position[0], p.position[2]);

      let speed = 0.5 + slope * 0.02;

      if (slope > WATERFALL_ANGLE_THRESHOLD) {
        speed *= WATERFALL_SPEED_MULTIPLIER;
      }

      const gx = gradient.dx * speed;
      const gz = gradient.dz * speed;

      p.velocity[0] = p.velocity[0] * 0.8 + gx * 0.2;
      p.velocity[2] = p.velocity[2] * 0.8 + gz * 0.2;

      const newX = p.position[0] + p.velocity[0] * dt;
      const newZ = p.position[2] + p.velocity[2] * dt;

      const terrainH = this.terrainGenerator.getHeightAt(newX, newZ);

      if (newX < -this.halfExtent || newX > this.halfExtent ||
          newZ < -this.halfExtent || newZ > this.halfExtent) {
        p.active = false;
        posArray[i * 3] = p.position[0];
        posArray[i * 3 + 1] = p.position[1];
        posArray[i * 3 + 2] = p.position[2];
        activeCount++;
        continue;
      }

      const currentH = this.terrainGenerator.getHeightAt(p.position[0], p.position[2]);
      const heightDiff = terrainH - currentH;

      if (heightDiff > 0.5) {
        p.velocity[1] = Math.min(p.velocity[1] + 9.8 * dt, 5);
      } else {
        p.velocity[1] *= 0.5;
      }

      p.position[0] = newX;
      p.position[2] = newZ;
      p.position[1] = terrainH + 0.1 + Math.abs(p.velocity[1]) * dt * 0.1;

      p.lifetime += dt;

      if (slope < 2 && p.lifetime > 3) {
        const gx0 = Math.floor((p.position[0] + this.halfExtent) / CELL_SIZE);
        const gz0 = Math.floor((p.position[2] + this.halfExtent) / CELL_SIZE);
        if (gx0 >= 0 && gx0 < GRID_SIZE && gz0 >= 0 && gz0 < GRID_SIZE) {
          this.accumulationMap[gz0 * GRID_SIZE + gx0] += 1;
        }
      }

      if (p.lifetime > 30) {
        p.active = false;
      }

      posArray[i * 3] = p.position[0];
      posArray[i * 3 + 1] = p.position[1];
      posArray[i * 3 + 2] = p.position[2];
    }

    positions.needsUpdate = true;
    this.updatePools();
  }

  private updatePools(): void {
    const threshold = 5;
    const visited = new Uint8Array(GRID_SIZE * GRID_SIZE);

    this.pools = [];

    for (let z = 0; z < GRID_SIZE; z++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const idx = z * GRID_SIZE + x;
        if (visited[idx] || this.accumulationMap[idx] < threshold) continue;

        let sumX = 0;
        let sumZ = 0;
        let count = 0;
        const stack: number[] = [idx];
        visited[idx] = 1;

        while (stack.length > 0) {
          const ci = stack.pop()!;
          const cx = ci % GRID_SIZE;
          const cz = Math.floor(ci / GRID_SIZE);

          sumX += cx;
          sumZ += cz;
          count++;

          const neighbors = [
            ci - 1, ci + 1, ci - GRID_SIZE, ci + GRID_SIZE,
          ];

          for (const ni of neighbors) {
            const nx = ni % GRID_SIZE;
            const nz = Math.floor(ni / GRID_SIZE);
            if (nx < 0 || nx >= GRID_SIZE || nz < 0 || nz >= GRID_SIZE) continue;
            if (visited[ni] || this.accumulationMap[ni] < threshold) continue;
            visited[ni] = 1;
            stack.push(ni);
          }
        }

        if (count > 3) {
          const avgX = (sumX / count) * CELL_SIZE - this.halfExtent;
          const avgZ = (sumZ / count) * CELL_SIZE - this.halfExtent;
          const radius = Math.sqrt(count * CELL_SIZE * CELL_SIZE) * 0.5;
          const height = this.terrainGenerator.getHeightAt(avgX, avgZ);

          this.pools.push({
            centerX: avgX,
            centerZ: avgZ,
            radius: Math.min(radius, 3),
            depth: height,
          });
        }
      }
    }

    this.rebuildPoolMeshes();
  }

  private rebuildPoolMeshes(): void {
    for (const mesh of this.poolMeshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.poolGroup.remove(mesh);
    }
    this.poolMeshes = [];

    for (const pool of this.pools) {
      const geo = new THREE.CircleGeometry(pool.radius, 32);
      geo.rotateX(-Math.PI / 2);

      const mat = new THREE.MeshPhongMaterial({
        color: COLOR_SKY,
        transparent: true,
        opacity: 0.3,
        shininess: 100,
        specular: 0xffffff,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pool.centerX, pool.depth + 0.05, pool.centerZ);
      this.poolGroup.add(mesh);
      this.poolMeshes.push(mesh);
    }
  }

  reset(terrainGenerator: TerrainGenerator): void {
    this.terrainGenerator = terrainGenerator;
    this.accumulationMap.fill(0);
    this.pools = [];

    for (const mesh of this.poolMeshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.poolGroup.remove(mesh);
    }
    this.poolMeshes = [];

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles[i] = this.createParticle();
    }
  }

  dispose(): void {
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    for (const mesh of this.poolMeshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  }
}
