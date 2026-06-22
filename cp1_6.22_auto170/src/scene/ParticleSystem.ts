import * as THREE from 'three';

const TRAIL_LENGTH = 20;
const BULGE_COUNT = 2000;
const ARM_COUNT = 8000;
const ARM_COUNT_NUM = 4;

interface ParticleData {
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  lifetimes: Float32Array;
  originalPositions: Float32Array;
  positionHistory: Float32Array[];
}

export class ParticleSystem {
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  points: THREE.Points;
  data: ParticleData;
  particleCount: number;
  galaxyCenter: THREE.Vector3;
  galaxyVelocity: THREE.Vector3;
  rotationSpeed: number;
  isColliding: boolean;
  isBurst: boolean;
  burstLife: number;

  private trailGeometry: THREE.BufferGeometry;
  private trailMaterial: THREE.LineBasicMaterial;
  private trailLines: THREE.LineSegments;

  constructor(center: THREE.Vector3, particleCount: number, isBurst = false) {
    this.galaxyCenter = center.clone();
    this.galaxyVelocity = new THREE.Vector3();
    this.particleCount = particleCount;
    this.rotationSpeed = 0.1;
    this.isColliding = false;
    this.isBurst = isBurst;
    this.burstLife = 2.0;

    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    const originalPositions = new Float32Array(particleCount * 3);

    const positionHistory: Float32Array[] = [];
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      positionHistory.push(new Float32Array(particleCount * 3));
    }

    this.data = {
      positions,
      velocities,
      colors,
      lifetimes,
      originalPositions,
      positionHistory,
    };

    if (!isBurst) {
      this.createBulge(BULGE_COUNT);
      this.createArms(ARM_COUNT);
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.trailLines = new THREE.LineSegments(this.trailGeometry, this.trailMaterial);
    this.trailLines.visible = false;
  }

  private createBulge(count: number): void {
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const r = Math.random() * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta) * 0.3;
      const z = r * Math.cos(phi);

      this.data.positions[idx] = x + this.galaxyCenter.x;
      this.data.positions[idx + 1] = y + this.galaxyCenter.y;
      this.data.positions[idx + 2] = z + this.galaxyCenter.z;

      this.data.originalPositions[idx] = x;
      this.data.originalPositions[idx + 1] = y;
      this.data.originalPositions[idx + 2] = z;

      const dist = Math.sqrt(x * x + y * y + z * z);
      const color = this.getColorByDistance(dist, 3);
      this.data.colors[idx] = color.r;
      this.data.colors[idx + 1] = color.g;
      this.data.colors[idx + 2] = color.b;

      this.data.velocities[idx] = 0;
      this.data.velocities[idx + 1] = 0;
      this.data.velocities[idx + 2] = 0;
      this.data.lifetimes[i] = 1.0;
    }
  }

  private createArms(count: number): void {
    const perArm = Math.floor(count / ARM_COUNT_NUM);
    let particleIdx = BULGE_COUNT;

    for (let arm = 0; arm < ARM_COUNT_NUM; arm++) {
      const armAngle = (arm / ARM_COUNT_NUM) * Math.PI * 2;

      for (let i = 0; i < perArm; i++) {
        if (particleIdx >= this.particleCount) break;
        const idx = particleIdx * 3;

        const t = Math.random();
        const r = 3 + t * 20;
        const spiralAngle = armAngle + t * 4;
        const spread = (0.5 + t * 1.5) * (Math.random() - 0.5);

        const x = r * Math.cos(spiralAngle) + spread * Math.cos(spiralAngle + Math.PI / 2);
        const y = (Math.random() - 0.5) * (0.5 + t * 0.3);
        const z = r * Math.sin(spiralAngle) + spread * Math.sin(spiralAngle + Math.PI / 2);

        this.data.positions[idx] = x + this.galaxyCenter.x;
        this.data.positions[idx + 1] = y + this.galaxyCenter.y;
        this.data.positions[idx + 2] = z + this.galaxyCenter.z;

        this.data.originalPositions[idx] = x;
        this.data.originalPositions[idx + 1] = y;
        this.data.originalPositions[idx + 2] = z;

        const dist = Math.sqrt(x * x + z * z);
        const color = this.getColorByDistance(dist, 23);
        this.data.colors[idx] = color.r;
        this.data.colors[idx + 1] = color.g;
        this.data.colors[idx + 2] = color.b;

        this.data.velocities[idx] = 0;
        this.data.velocities[idx + 1] = 0;
        this.data.velocities[idx + 2] = 0;
        this.data.lifetimes[particleIdx] = 1.0;

        particleIdx++;
      }
    }

    for (let i = particleIdx; i < this.particleCount; i++) {
      const idx = i * 3;
      this.data.positions[idx] = this.galaxyCenter.x;
      this.data.positions[idx + 1] = this.galaxyCenter.y;
      this.data.positions[idx + 2] = this.galaxyCenter.z;
      this.data.originalPositions[idx] = 0;
      this.data.originalPositions[idx + 1] = 0;
      this.data.originalPositions[idx + 2] = 0;
      this.data.colors[idx] = 0.5;
      this.data.colors[idx + 1] = 0.5;
      this.data.colors[idx + 2] = 0.5;
      this.data.velocities[idx] = 0;
      this.data.velocities[idx + 1] = 0;
      this.data.velocities[idx + 2] = 0;
      this.data.lifetimes[i] = 1.0;
    }
  }

  createBurstParticles(center: THREE.Vector3, count: number): void {
    this.galaxyCenter.copy(center);
    this.particleCount = count;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);
    const originalPositions = new Float32Array(count * 3);

    const positionHistory: Float32Array[] = [];
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      positionHistory.push(new Float32Array(count * 3));
    }

    this.data = { positions, velocities, colors, lifetimes, originalPositions, positionHistory };

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      positions[idx] = center.x;
      positions[idx + 1] = center.y;
      positions[idx + 2] = center.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 5 + Math.random() * 15;

      velocities[idx] = speed * Math.sin(phi) * Math.cos(theta);
      velocities[idx + 1] = speed * Math.sin(phi) * Math.sin(theta);
      velocities[idx + 2] = speed * Math.cos(phi);

      colors[idx] = 1.0;
      colors[idx + 1] = 0.4;
      colors[idx + 2] = 0.2;

      lifetimes[i] = 1.0;
    }

    this.geometry.dispose();
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.points.geometry = this.geometry;
  }

  getColorByDistance(distance: number, maxDist: number): THREE.Color {
    const t = Math.min(distance / maxDist, 1.0);
    const white = new THREE.Color(0.53, 0.8, 1.0);
    const blue = new THREE.Color(0.15, 0.35, 0.9);
    return white.clone().lerp(blue, t);
  }

  startCollision(direction: THREE.Vector3, speed: number): void {
    this.isColliding = true;
    this.galaxyVelocity.copy(direction).multiplyScalar(speed);
  }

  applyGravity(otherCenter: THREE.Vector3, strength: number, delta: number): void {
    const dir = new THREE.Vector3().subVectors(otherCenter, this.galaxyCenter);
    const dist = Math.max(dir.length(), 1);
    dir.normalize().multiplyScalar(strength * 50 / (dist * dist) * delta);

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      this.data.velocities[idx] += dir.x;
      this.data.velocities[idx + 1] += dir.y;
      this.data.velocities[idx + 2] += dir.z;
    }
  }

  update(delta: number, particleSize: number): void {
    if (this.isBurst) {
      this.updateBurst(delta);
      return;
    }

    this.material.size = particleSize;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;

      if (!this.isColliding) {
        const ox = this.data.originalPositions[idx];
        const oz = this.data.originalPositions[idx + 2];
        const angle = this.rotationSpeed * delta;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        this.data.originalPositions[idx] = ox * cos - oz * sin;
        this.data.originalPositions[idx + 2] = ox * sin + oz * cos;
      }

      this.data.positions[idx] = this.data.originalPositions[idx] + this.galaxyCenter.x + this.data.velocities[idx];
      this.data.positions[idx + 1] = this.data.originalPositions[idx + 1] + this.galaxyCenter.y + this.data.velocities[idx + 1];
      this.data.positions[idx + 2] = this.data.originalPositions[idx + 2] + this.galaxyCenter.z + this.data.velocities[idx + 2];
    }

    this.shiftPositionHistory();
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  private updateBurst(delta: number): void {
    this.burstLife -= delta;
    if (this.burstLife <= 0) {
      this.points.visible = false;
      this.trailLines.visible = false;
      return;
    }

    const alpha = this.burstLife / 2.0;
    this.material.opacity = alpha;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      this.data.positions[idx] += this.data.velocities[idx] * delta;
      this.data.positions[idx + 1] += this.data.velocities[idx + 1] * delta;
      this.data.positions[idx + 2] += this.data.velocities[idx + 2] * delta;

      this.data.velocities[idx] *= 0.98;
      this.data.velocities[idx + 1] *= 0.98;
      this.data.velocities[idx + 2] *= 0.98;

      this.data.colors[idx] = 1.0;
      this.data.colors[idx + 1] = 0.4 * alpha;
      this.data.colors[idx + 2] = 0.2 * alpha;
    }

    this.shiftPositionHistory();
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  private shiftPositionHistory(): void {
    for (let h = TRAIL_LENGTH - 1; h > 0; h--) {
      this.data.positionHistory[h].set(this.data.positionHistory[h - 1]);
    }
    this.data.positionHistory[0].set(this.data.positions);
  }

  updateTrails(): void {
    if (!this.isColliding && !this.isBurst) {
      this.trailLines.visible = false;
      return;
    }

    this.trailLines.visible = true;
    const trailStep = Math.max(1, Math.floor(TRAIL_LENGTH / 6));
    const segmentsPerParticle = Math.floor(TRAIL_LENGTH / trailStep) - 1;
    const totalSegments = this.particleCount * segmentsPerParticle;
    const trailPositions = new Float32Array(totalSegments * 6);
    const trailColors = new Float32Array(totalSegments * 6);

    let segIdx = 0;
    for (let i = 0; i < this.particleCount; i += 3) {
      for (let h = 0; h < TRAIL_LENGTH - trailStep; h += trailStep) {
        const fromIdx = i * 3;
        const toIdx = i * 3;

        const sIdx = segIdx * 6;

        trailPositions[sIdx] = this.data.positionHistory[h][fromIdx];
        trailPositions[sIdx + 1] = this.data.positionHistory[h][fromIdx + 1];
        trailPositions[sIdx + 2] = this.data.positionHistory[h][fromIdx + 2];

        trailPositions[sIdx + 3] = this.data.positionHistory[h + trailStep][toIdx];
        trailPositions[sIdx + 4] = this.data.positionHistory[h + trailStep][toIdx + 1];
        trailPositions[sIdx + 5] = this.data.positionHistory[h + trailStep][toIdx + 2];

        const fade = 1.0 - h / TRAIL_LENGTH;
        const c = this.data.colors;
        trailColors[sIdx] = c[fromIdx] * fade;
        trailColors[sIdx + 1] = c[fromIdx + 1] * fade;
        trailColors[sIdx + 2] = c[fromIdx + 2] * fade;
        trailColors[sIdx + 3] = c[toIdx] * fade * 0.5;
        trailColors[sIdx + 4] = c[toIdx + 1] * fade * 0.5;
        trailColors[sIdx + 5] = c[toIdx + 2] * fade * 0.5;

        segIdx++;
      }
    }

    this.trailGeometry.dispose();
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions.slice(0, segIdx * 6), 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors.slice(0, segIdx * 6), 3));
    this.trailLines.geometry = this.trailGeometry;
  }

  applyCollisionEffect(otherCenter: THREE.Vector3): void {
    const overlapDist = 10;
    const orange = new THREE.Color(1.0, 0.4, 0.2);

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      const px = this.data.positions[idx];
      const py = this.data.positions[idx + 1];
      const pz = this.data.positions[idx + 2];

      const dx = px - otherCenter.x;
      const dy = py - otherCenter.y;
      const dz = pz - otherCenter.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < overlapDist) {
        if (Math.random() < 0.3) {
          this.data.colors[idx] = orange.r * 1.5;
          this.data.colors[idx + 1] = orange.g * 1.5;
          this.data.colors[idx + 2] = orange.b * 1.5;
        } else {
          this.data.colors[idx] = Math.min(this.data.colors[idx] * 1.5, 1.0);
          this.data.colors[idx + 1] = Math.min(this.data.colors[idx + 1] * 1.5, 1.0);
          this.data.colors[idx + 2] = Math.min(this.data.colors[idx + 2] * 1.5, 1.0);
        }
      }
    }
    this.geometry.attributes.color.needsUpdate = true;
  }

  getTrailLines(): THREE.LineSegments {
    return this.trailLines;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
  }
}

export function createBackgroundStars(count: number): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const r = 200 + Math.random() * 300;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[idx] = r * Math.sin(phi) * Math.cos(theta);
    positions[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[idx + 2] = r * Math.cos(phi);

    const brightness = 0.5 + Math.random() * 0.5;
    colors[idx] = brightness;
    colors[idx + 1] = brightness;
    colors[idx + 2] = brightness + Math.random() * 0.2;

    sizes[i] = 0.5 + Math.random() * 1.0;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  return new THREE.Points(geometry, material);
}
