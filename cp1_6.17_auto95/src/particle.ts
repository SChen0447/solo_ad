import * as THREE from 'three';

export interface ParticleParams {
  velocity: number;
  gravity: number;
  turbulence: number;
}

export class Particle {
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public birthPosition: THREE.Vector3;
  public age: number;
  public lifeTime: number;
  public isAlive: boolean;
  public baseSize: number;
  public size: number;
  public color: THREE.Color;
  public turbulenceOffset: THREE.Vector3;

  private static readonly COLOR_START = new THREE.Color(0x003366);
  private static readonly COLOR_END = new THREE.Color(0x66ccff);
  private static readonly SIZE_START = 0.08;
  private static readonly SIZE_END = 0.02;

  constructor(
    position: THREE.Vector3,
    initialVelocity: THREE.Vector3,
    params: ParticleParams
  ) {
    this.position = position.clone();
    this.birthPosition = position.clone();
    this.velocity = initialVelocity.clone().multiplyScalar(params.velocity);
    this.age = 0;
    this.lifeTime = 5.0;
    this.isAlive = true;
    this.baseSize = Particle.SIZE_START;
    this.size = Particle.SIZE_START;
    this.color = Particle.COLOR_START.clone();
    this.turbulenceOffset = new THREE.Vector3(
      Math.random() * 100,
      Math.random() * 100,
      Math.random() * 100
    );
  }

  public update(deltaTime: number, params: ParticleParams): void {
    if (!this.isAlive) return;

    this.age += deltaTime;

    if (this.age >= this.lifeTime) {
      this.isAlive = false;
      return;
    }

    const turbulenceForce = new THREE.Vector3(
      Math.sin(this.age * 2.0 + this.turbulenceOffset.x) * params.turbulence,
      Math.cos(this.age * 1.5 + this.turbulenceOffset.y) * params.turbulence * 0.5,
      Math.sin(this.age * 1.8 + this.turbulenceOffset.z) * params.turbulence
    );

    this.velocity.y -= params.gravity * deltaTime;
    this.velocity.add(turbulenceForce.multiplyScalar(deltaTime));

    this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

    const lifeRatio = this.age / this.lifeTime;

    this.color = Particle.COLOR_START.clone().lerp(Particle.COLOR_END, lifeRatio);

    this.size = THREE.MathUtils.lerp(Particle.SIZE_START, Particle.SIZE_END, lifeRatio);
  }

  public getOpacity(): number {
    const lifeRatio = this.age / this.lifeTime;
    if (lifeRatio < 0.1) {
      return lifeRatio / 0.1;
    }
    if (lifeRatio > 0.8) {
      return (1.0 - lifeRatio) / 0.2;
    }
    return 1.0;
  }

  public getDistanceFromBirth(): number {
    return this.position.distanceTo(this.birthPosition);
  }
}
