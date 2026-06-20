import * as THREE from 'three';

export interface FishState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
}

export interface EcosystemParams {
  fishCount: number;
  currentSpeed: number;
  bounds: THREE.Vector3;
}

const SEPARATION_DIST = 2.5;
const ALIGNMENT_DIST = 5.0;
const COHESION_DIST = 6.0;
const SEPARATION_WEIGHT = 2.0;
const ALIGNMENT_WEIGHT = 1.0;
const COHESION_WEIGHT = 1.2;
const CURRENT_INFLUENCE = 0.3;
const MAX_SPEED = 4.0;
const MAX_FORCE = 0.15;
const BOUND_MARGIN = 3.0;
const BOUND_FORCE = 0.5;

export class Ecosystem {
  fishes: FishState[] = [];
  params: EcosystemParams;
  temperature = 25.0;
  salinity = 32.5;
  private tempTarget = 25.0;
  private salinityTarget = 32.5;
  private envTimer = 0;
  private currentForce: THREE.Vector3;
  private tempVec = new THREE.Vector3();
  private sepVec = new THREE.Vector3();
  private aliVec = new THREE.Vector3();
  private cohVec = new THREE.Vector3();

  constructor(params: EcosystemParams) {
    this.params = { ...params };
    this.currentForce = new THREE.Vector3(1, 0, 0.5).normalize().multiplyScalar(this.params.currentSpeed);
    this.initFishes();
  }

  private initFishes() {
    this.fishes = [];
    const half = this.params.bounds.clone().multiplyScalar(0.4);
    for (let i = 0; i < this.params.fishCount; i++) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * half.x * 2,
        (Math.random() - 0.5) * half.y * 2,
        (Math.random() - 0.5) * half.z * 2
      );
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(MAX_SPEED * 0.5);
      this.fishes.push({
        position: pos,
        velocity: vel,
        acceleration: new THREE.Vector3(),
      });
    }
  }

  setFishCount(count: number) {
    this.params.fishCount = count;
    while (this.fishes.length < count) {
      const half = this.params.bounds.clone().multiplyScalar(0.4);
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * half.x * 2,
        (Math.random() - 0.5) * half.y * 2,
        (Math.random() - 0.5) * half.z * 2
      );
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(MAX_SPEED * 0.5);
      this.fishes.push({ position: pos, velocity: vel, acceleration: new THREE.Vector3() });
    }
    if (this.fishes.length > count) {
      this.fishes.length = count;
    }
  }

  setCurrentSpeed(speed: number) {
    this.params.currentSpeed = speed;
    this.currentForce.set(1, 0, 0.5).normalize().multiplyScalar(speed);
  }

  getCurrentForce(): THREE.Vector3 {
    return this.currentForce;
  }

  update(dt: number) {
    const clampedDt = Math.min(dt, 0.05);
    this.envTimer += clampedDt;
    if (this.envTimer >= 2.0) {
      this.envTimer -= 2.0;
      this.tempTarget = 20 + Math.random() * 10;
      this.salinityTarget = 30 + Math.random() * 5;
    }
    this.temperature += (this.tempTarget - this.temperature) * 0.02;
    this.salinity += (this.salinityTarget - this.salinity) * 0.02;

    for (let i = 0; i < this.fishes.length; i++) {
      const fish = this.fishes[i];
      fish.acceleration.set(0, 0, 0);

      this.sepVec.set(0, 0, 0);
      this.aliVec.set(0, 0, 0);
      this.cohVec.set(0, 0, 0);
      let sepCount = 0;
      let aliCount = 0;
      let cohCount = 0;

      for (let j = 0; j < this.fishes.length; j++) {
        if (i === j) continue;
        const other = this.fishes[j];
        const dist = fish.position.distanceTo(other.position);

        if (dist < SEPARATION_DIST && dist > 0) {
          this.tempVec.copy(fish.position).sub(other.position).normalize().divideScalar(dist);
          this.sepVec.add(this.tempVec);
          sepCount++;
        }
        if (dist < ALIGNMENT_DIST) {
          this.aliVec.add(other.velocity);
          aliCount++;
        }
        if (dist < COHESION_DIST) {
          this.cohVec.add(other.position);
          cohCount++;
        }
      }

      if (sepCount > 0) {
        this.sepVec.divideScalar(sepCount).normalize().multiplyScalar(MAX_SPEED).sub(fish.velocity);
        if (this.sepVec.length() > MAX_FORCE) this.sepVec.normalize().multiplyScalar(MAX_FORCE);
        fish.acceleration.add(this.sepVec.multiplyScalar(SEPARATION_WEIGHT));
      }
      if (aliCount > 0) {
        this.aliVec.divideScalar(aliCount).normalize().multiplyScalar(MAX_SPEED).sub(fish.velocity);
        if (this.aliVec.length() > MAX_FORCE) this.aliVec.normalize().multiplyScalar(MAX_FORCE);
        fish.acceleration.add(this.aliVec.multiplyScalar(ALIGNMENT_WEIGHT));
      }
      if (cohCount > 0) {
        this.cohVec.divideScalar(cohCount).sub(fish.position).normalize().multiplyScalar(MAX_SPEED).sub(fish.velocity);
        if (this.cohVec.length() > MAX_FORCE) this.cohVec.normalize().multiplyScalar(MAX_FORCE);
        fish.acceleration.add(this.cohVec.multiplyScalar(COHESION_WEIGHT));
      }

      this.tempVec.copy(this.currentForce).multiplyScalar(CURRENT_INFLUENCE);
      fish.acceleration.add(this.tempVec);

      const bx = this.params.bounds.x * 0.5;
      const by = this.params.bounds.y * 0.5;
      const bz = this.params.bounds.z * 0.5;
      if (fish.position.x > bx - BOUND_MARGIN) fish.acceleration.x -= BOUND_FORCE * ((fish.position.x - (bx - BOUND_MARGIN)) / BOUND_MARGIN);
      if (fish.position.x < -bx + BOUND_MARGIN) fish.acceleration.x += BOUND_FORCE * ((-bx + BOUND_MARGIN - fish.position.x) / BOUND_MARGIN);
      if (fish.position.y > by - BOUND_MARGIN) fish.acceleration.y -= BOUND_FORCE * ((fish.position.y - (by - BOUND_MARGIN)) / BOUND_MARGIN);
      if (fish.position.y < -by + BOUND_MARGIN) fish.acceleration.y += BOUND_FORCE * ((-by + BOUND_MARGIN - fish.position.y) / BOUND_MARGIN);
      if (fish.position.z > bz - BOUND_MARGIN) fish.acceleration.z -= BOUND_FORCE * ((fish.position.z - (bz - BOUND_MARGIN)) / BOUND_MARGIN);
      if (fish.position.z < -bz + BOUND_MARGIN) fish.acceleration.z += BOUND_FORCE * ((-bz + BOUND_MARGIN - fish.position.z) / BOUND_MARGIN);

      fish.velocity.add(fish.acceleration.clone().multiplyScalar(clampedDt));
      if (fish.velocity.length() > MAX_SPEED) {
        fish.velocity.normalize().multiplyScalar(MAX_SPEED);
      }
      if (fish.velocity.length() < MAX_SPEED * 0.2) {
        fish.velocity.normalize().multiplyScalar(MAX_SPEED * 0.2);
      }
      fish.position.add(fish.velocity.clone().multiplyScalar(clampedDt));
    }
  }

  reset() {
    this.params.fishCount = 80;
    this.params.currentSpeed = 1.0;
    this.currentForce.set(1, 0, 0.5).normalize().multiplyScalar(1.0);
    this.temperature = 25.0;
    this.salinity = 32.5;
    this.tempTarget = 25.0;
    this.salinityTarget = 32.5;
    this.envTimer = 0;
    this.initFishes();
  }
}
