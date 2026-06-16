import * as THREE from 'three';

const DURATION = 800;
const PARTICLE_LIFETIME = 800;
const PARTICLE_COUNT = 30;

export class GiftAnimation {
  private sprite: THREE.Sprite;
  private particles: THREE.Points;
  private particlePositions: Float32Array;
  private particleVelocities: Float32Array;
  private particleAlphas: Float32Array;
  private particleMaterial: THREE.PointsMaterial;
  private startTime: number;
  private startX: number;
  private startY: number;
  private endX: number;
  private endY: number;
  private giftValue: number;
  private alive: boolean = true;

  constructor(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    _giftName: string,
    giftValue: number,
    _iconUrl: string
  ) {
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.giftValue = giftValue;
    this.startTime = performance.now();

    const intensity = Math.min(giftValue / 500, 1);
    const r = 0.3 + intensity * 0.7;
    const g = 0.6 + intensity * 0.4;
    const b = 1.0;

    const spriteMat = new THREE.SpriteMaterial({
      color: new THREE.Color(r, g, b),
      transparent: true,
      opacity: 1,
    });
    this.sprite = new THREE.Sprite(spriteMat);
    this.sprite.scale.set(0.8, 0.8, 0.8);
    this.sprite.position.set(startX, startY, 0);

    this.particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    this.particleVelocities = new Float32Array(PARTICLE_COUNT * 3);
    this.particleAlphas = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particlePositions[i * 3] = startX;
      this.particlePositions[i * 3 + 1] = startY;
      this.particlePositions[i * 3 + 2] = 0;

      this.particleVelocities[i * 3] = (Math.random() - 0.5) * 2;
      this.particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 2;
      this.particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

      this.particleAlphas[i] = 1;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));

    this.particleMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(r, g, b),
      size: 0.12 + intensity * 0.08,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particles = new THREE.Points(particleGeo, this.particleMaterial);
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.sprite);
    scene.add(this.particles);
  }

  remove(scene: THREE.Scene): void {
    scene.remove(this.sprite);
    scene.remove(this.particles);
    this.sprite.material.dispose();
    this.particles.geometry.dispose();
    this.particleMaterial.dispose();
  }

  update(now: number): boolean {
    const elapsed = now - this.startTime;
    const progress = Math.min(elapsed / DURATION, 1);

    const t = this.easeInOutCubic(progress);
    const x = this.startX + (this.endX - this.startX) * t;
    const peakHeight = 3 + this.giftValue * 0.005;
    const y =
      this.startY + (this.endY - this.startY) * t + peakHeight * 4 * t * (1 - t);

    this.sprite.position.set(x, y, 0);

    const rotation = progress * Math.PI * 4;
    this.sprite.material.rotation = rotation;

    if (progress >= 1) {
      const fadeElapsed = elapsed - DURATION;
      const fadeProgress = Math.min(fadeElapsed / 300, 1);
      this.sprite.material.opacity = 1 - fadeProgress;
    }

    const posAttr = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const particleAge = elapsed - (i * 20);
      if (particleAge > 0) {
        const lifeRatio = particleAge / PARTICLE_LIFETIME;
        if (lifeRatio < 1) {
          const drag = 0.96;
          this.particleVelocities[i * 3] *= drag;
          this.particleVelocities[i * 3 + 1] *= drag;
          this.particleVelocities[i * 3 + 2] *= drag;

          this.particlePositions[i * 3] += this.particleVelocities[i * 3] * 0.02;
          this.particlePositions[i * 3 + 1] += this.particleVelocities[i * 3 + 1] * 0.02;
          this.particlePositions[i * 3 + 2] += this.particleVelocities[i * 3 + 2] * 0.02;

          this.particleAlphas[i] = 1 - lifeRatio;
        } else {
          this.particlePositions[i * 3] = x + (Math.random() - 0.5) * 0.5;
          this.particlePositions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.5;
          this.particlePositions[i * 3 + 2] = 0;

          this.particleVelocities[i * 3] = (Math.random() - 0.5) * 2;
          this.particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 2;
          this.particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

          this.particleAlphas[i] = 1;
        }
      }
    }
    posAttr.needsUpdate = true;

    const avgAlpha = this.particleAlphas.reduce((a, b) => a + b, 0) / PARTICLE_COUNT;
    this.particleMaterial.opacity = avgAlpha;

    if (elapsed > DURATION + PARTICLE_LIFETIME + 300) {
      this.alive = false;
    }

    return this.alive;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}
