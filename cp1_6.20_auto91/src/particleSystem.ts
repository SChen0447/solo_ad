import * as THREE from 'three';

export type WeatherType = 'sunny' | 'rainy' | 'cloudy';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  active: boolean;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private dustParticles: THREE.Points | null = null;
  private rainParticles: THREE.Points | null = null;
  private cloudPlanes: THREE.Mesh[] = [];
  private dustPositions: Float32Array | null = null;
  private rainPositions: Float32Array | null = null;
  private rainVelocities: Float32Array | null = null;
  private rainActive: boolean[] = [];
  private currentWeather: WeatherType = 'sunny';
  private maxRainParticles = 5000;
  private rainSpawnRate = 200;
  private dustCount = 200;
  private bounds: { x: number; z: number; height: number };

  constructor(scene: THREE.Scene, bounds: { x: number; z: number; height: number }) {
    this.scene = scene;
    this.bounds = bounds;
    this.initDustParticles();
    this.initRainParticles();
    this.initCloudPlanes();
    this.setWeather('sunny');
  }

  private initDustParticles(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.dustCount * 3);
    this.dustPositions = positions;

    for (let i = 0; i < this.dustCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * this.bounds.x * 2;
      positions[i * 3 + 1] = Math.random() * this.bounds.height;
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.bounds.z * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.2,
      sizeAttenuation: true,
    });

    this.dustParticles = new THREE.Points(geometry, material);
    this.scene.add(this.dustParticles);
  }

  private initRainParticles(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxRainParticles * 3);
    this.rainPositions = positions;
    this.rainVelocities = new Float32Array(this.maxRainParticles);
    this.rainActive = new Array(this.maxRainParticles).fill(false);

    for (let i = 0; i < this.maxRainParticles; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
      this.rainVelocities[i] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x66aaff,
      size: 0.08,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
    });

    this.rainParticles = new THREE.Points(geometry, material);
    this.scene.add(this.rainParticles);
  }

  private initCloudPlanes(): void {
    const cloudCount = 5;
    for (let i = 0; i < cloudCount; i++) {
      const geometry = new THREE.PlaneGeometry(
        this.bounds.x * 1.5,
        this.bounds.z * 0.6
      );
      const material = new THREE.MeshBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
      const cloud = new THREE.Mesh(geometry, material);
      cloud.rotation.x = -Math.PI / 2;
      cloud.position.set(
        (Math.random() - 0.5) * this.bounds.x,
        this.bounds.height * 0.8 + i * 2,
        (Math.random() - 0.5) * this.bounds.z
      );
      (cloud as any).speedX = (Math.random() * 0.5 + 0.2) * (Math.random() > 0.5 ? 1 : -1);
      (cloud as any).speedZ = (Math.random() * 0.2 + 0.1) * (Math.random() > 0.5 ? 1 : -1);
      this.cloudPlanes.push(cloud);
      this.scene.add(cloud);
    }
  }

  public setWeather(weather: WeatherType): void {
    this.currentWeather = weather;

    if (this.dustParticles) {
      this.dustParticles.visible = weather === 'sunny';
    }

    if (this.rainParticles) {
      this.rainParticles.visible = weather === 'rainy';
    }

    this.cloudPlanes.forEach((cloud) => {
      cloud.visible = weather === 'cloudy';
    });
  }

  public update(deltaTime: number, timeOfDay: number): void {
    if (this.currentWeather === 'sunny') {
      this.updateDust(deltaTime);
    } else if (this.currentWeather === 'rainy') {
      this.updateRain(deltaTime);
    } else if (this.currentWeather === 'cloudy') {
      this.updateClouds(deltaTime, timeOfDay);
    }
  }

  private updateDust(deltaTime: number): void {
    if (!this.dustParticles || !this.dustPositions) return;

    const positions = this.dustPositions;

    for (let i = 0; i < this.dustCount; i++) {
      positions[i * 3] += (Math.random() - 0.5) * 0.05 + 0.1 * deltaTime;
      positions[i * 3 + 1] += (Math.random() - 0.3) * 0.03;
      positions[i * 3 + 2] += (Math.random() - 0.5) * 0.05;

      if (positions[i * 3] > this.bounds.x) {
        positions[i * 3] = -this.bounds.x;
      }
      if (positions[i * 3] < -this.bounds.x) {
        positions[i * 3] = this.bounds.x;
      }
      if (positions[i * 3 + 1] > this.bounds.height) {
        positions[i * 3 + 1] = 0;
      }
      if (positions[i * 3 + 1] < 0) {
        positions[i * 3 + 1] = this.bounds.height;
      }
      if (positions[i * 3 + 2] > this.bounds.z) {
        positions[i * 3 + 2] = -this.bounds.z;
      }
      if (positions[i * 3 + 2] < -this.bounds.z) {
        positions[i * 3 + 2] = this.bounds.z;
      }
    }

    const posAttr = this.dustParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
  }

  private updateRain(deltaTime: number): void {
    if (!this.rainParticles || !this.rainPositions || !this.rainVelocities) return;

    const positions = this.rainPositions;
    const velocities = this.rainVelocities;

    let spawnCount = 0;
    for (let i = 0; i < this.maxRainParticles; i++) {
      if (this.rainActive[i]) {
        positions[i * 3 + 1] -= velocities[i] * deltaTime;

        if (positions[i * 3 + 1] < 0) {
          this.rainActive[i] = false;
          positions[i * 3 + 1] = -100;
        }
      } else if (spawnCount < this.rainSpawnRate * deltaTime) {
        this.rainActive[i] = true;
        positions[i * 3] = (Math.random() - 0.5) * this.bounds.x * 1.5;
        positions[i * 3 + 1] = this.bounds.height + Math.random() * 5;
        positions[i * 3 + 2] = (Math.random() - 0.5) * this.bounds.z * 1.5;
        velocities[i] = 8 + Math.random() * 4;
        spawnCount++;
      }
    }

    const posAttr = this.rainParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
  }

  private updateClouds(deltaTime: number, timeOfDay: number): void {
    const dayFactor = this.getDayFactor(timeOfDay);
    const baseOpacity = 0.3 + dayFactor * 0.3;

    this.cloudPlanes.forEach((cloud) => {
      const speedX = (cloud as any).speedX;
      const speedZ = (cloud as any).speedZ;

      cloud.position.x += speedX * deltaTime;
      cloud.position.z += speedZ * deltaTime;

      if (cloud.position.x > this.bounds.x * 1.2) {
        cloud.position.x = -this.bounds.x * 1.2;
      }
      if (cloud.position.x < -this.bounds.x * 1.2) {
        cloud.position.x = this.bounds.x * 1.2;
      }
      if (cloud.position.z > this.bounds.z * 1.2) {
        cloud.position.z = -this.bounds.z * 1.2;
      }
      if (cloud.position.z < -this.bounds.z * 1.2) {
        cloud.position.z = this.bounds.z * 1.2;
      }

      const mat = cloud.material as THREE.MeshBasicMaterial;
      const targetOpacity = baseOpacity + Math.sin(Date.now() * 0.001 + cloud.position.x * 0.1) * 0.1;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, 0.01);
    });
  }

  private getDayFactor(time: number): number {
    if (time >= 6 && time <= 18) {
      if (time <= 12) {
        return (time - 6) / 6;
      } else {
        return (18 - time) / 6;
      }
    }
    return 0;
  }

  public dispose(): void {
    if (this.dustParticles) {
      this.dustParticles.geometry.dispose();
      (this.dustParticles.material as THREE.Material).dispose();
      this.scene.remove(this.dustParticles);
    }

    if (this.rainParticles) {
      this.rainParticles.geometry.dispose();
      (this.rainParticles.material as THREE.Material).dispose();
      this.scene.remove(this.rainParticles);
    }

    this.cloudPlanes.forEach((cloud) => {
      cloud.geometry.dispose();
      (cloud.material as THREE.Material).dispose();
      this.scene.remove(cloud);
    });
    this.cloudPlanes = [];
  }
}
