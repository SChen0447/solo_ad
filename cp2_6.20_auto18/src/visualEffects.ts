import * as THREE from 'three';
import type { EnvironmentParams } from './plantSystem';

interface PetalParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotationSpeed: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  baseScale: number;
}

const MAX_PETALS = 150;
const SPAWN_INTERVAL = 1.5;

export class VisualEffects {
  public group: THREE.Group;
  public ground: THREE.Mesh;
  public ambientLight: THREE.AmbientLight;
  public directionalLight: THREE.DirectionalLight;
  private petals: PetalParticle[] = [];
  private petalGeometry: THREE.BufferGeometry;
  private lastSpawnTime = 0;
  private currentLightLevel = 60;
  private targetLightLevel = 60;
  private lightTransitionProgress = 1;
  private readonly warmColor = new THREE.Color(0xffcc80);
  private readonly coolColor = new THREE.Color(0xe0f7ff);
  private backgroundMesh: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();

    this.createGradientBackground(scene);
    this.ground = this.createGround();
    scene.add(this.ground);

    this.ambientLight = new THREE.AmbientLight(0xffcc80, 0.5);
    scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(5, 8, 5);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -10;
    this.directionalLight.shadow.camera.right = 10;
    this.directionalLight.shadow.camera.top = 10;
    this.directionalLight.shadow.camera.bottom = -10;
    scene.add(this.directionalLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.3);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    this.petalGeometry = this.createPetalGeometry();
    scene.add(this.group);
  }

  private createGradientBackground(scene: THREE.Scene): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(
      256, 150, 50,
      256, 256, 400
    );
    gradient.addColorStop(0, '#4a6fa5');
    gradient.addColorStop(0.4, '#2d4a6f');
    gradient.addColorStop(1, '#0f1e3d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const bgGeo = new THREE.SphereGeometry(100, 32, 32);
    const bgMat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.backgroundMesh = new THREE.Mesh(bgGeo, bgMat);
    this.backgroundMesh.name = 'gradientBackground';
    scene.add(this.backgroundMesh);
  }

  private createGround(): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(6, 64);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      transparent: true,
      opacity: 0.3,
      roughness: 0.9,
      metalness: 0
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = -0.01;
    mesh.receiveShadow = true;

    const innerGeometry = new THREE.CircleGeometry(1.5, 32);
    innerGeometry.rotateX(-Math.PI / 2);
    const innerMaterial = new THREE.MeshStandardMaterial({
      color: 0x5d4037,
      transparent: true,
      opacity: 0.4,
      roughness: 1
    });
    const innerSoil = new THREE.Mesh(innerGeometry, innerMaterial);
    innerSoil.position.y = 0.001;
    mesh.add(innerSoil);

    return mesh;
  }

  private createPetalGeometry(): THREE.BufferGeometry {
    const curve = new THREE.EllipseCurve(0, 0, 0.035, 0.02, 0, 2 * Math.PI, false, 0);
    const points = curve.getPoints(12);
    const shape = new THREE.Shape(points.map(p => new THREE.Vector2(p.x, p.y)));
    const geo = new THREE.ShapeGeometry(shape);
    return geo;
  }

  private spawnPetalGroup(): void {
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      if (this.petals.length >= MAX_PETALS) {
        this.removeOldestPetal();
      }

      const size = 0.02 + Math.random() * 0.03;
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.92 + Math.random() * 0.05, 0.7, 0.75 + Math.random() * 0.1),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        roughness: 0.5,
        metalness: 0
      });

      const mesh = new THREE.Mesh(this.petalGeometry, material);
      const x = (Math.random() - 0.5) * 3;
      const y = 4 + Math.random() * 1.5;
      const z = (Math.random() - 0.5) * 3;
      mesh.position.set(x, y, z);

      const baseScale = size / 0.035;
      mesh.scale.set(baseScale, baseScale, baseScale);
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      mesh.castShadow = false;

      this.group.add(mesh);

      this.petals.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          -0.05 - Math.random() * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2
        ),
        lifetime: 0,
        maxLifetime: 4,
        baseScale
      });
    }
  }

  private removeOldestPetal(): void {
    if (this.petals.length === 0) return;
    const oldest = this.petals.shift()!;
    this.group.remove(oldest.mesh);
    (oldest.mesh.material as THREE.Material).dispose();
  }

  public updateLightParams(params: EnvironmentParams): void {
    this.targetLightLevel = params.light;
    this.lightTransitionProgress = 0;
  }

  private updateLightTransition(delta: number): void {
    if (this.lightTransitionProgress < 1) {
      this.lightTransitionProgress = Math.min(1, this.lightTransitionProgress + delta / 1.5);
      const t = this.easeInOutCubic(this.lightTransitionProgress);
      this.currentLightLevel = this.lerp(this.currentLightLevel, this.targetLightLevel, t);
      this.ambientLight.color.lerpColors(this.warmColor, this.coolColor, this.currentLightLevel / 100);
      const intensity = 0.35 + (this.currentLightLevel / 100) * 0.45;
      this.ambientLight.intensity = intensity;
      this.directionalLight.intensity = 0.5 + (this.currentLightLevel / 100) * 0.6;
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public update(delta: number, actualTime: number): void {
    this.updateLightTransition(delta);

    if (this.backgroundMesh) {
      this.backgroundMesh.rotation.y += delta * 0.005;
    }

    if (actualTime - this.lastSpawnTime >= SPAWN_INTERVAL) {
      this.lastSpawnTime = actualTime;
      this.spawnPetalGroup();
    }

    for (let i = this.petals.length - 1; i >= 0; i--) {
      const petal = this.petals[i];
      petal.lifetime += delta;

      if (petal.lifetime >= petal.maxLifetime) {
        this.group.remove(petal.mesh);
        (petal.mesh.material as THREE.Material).dispose();
        this.petals.splice(i, 1);
        continue;
      }

      petal.mesh.position.add(petal.velocity.clone().multiplyScalar(delta * 60));
      petal.mesh.position.x += Math.sin(actualTime * 2 + i) * 0.002;

      petal.mesh.rotation.x += petal.rotationSpeed.x * delta * 60;
      petal.mesh.rotation.y += petal.rotationSpeed.y * delta * 60;
      petal.mesh.rotation.z += petal.rotationSpeed.z * delta * 60;

      const lifeRatio = petal.lifetime / petal.maxLifetime;
      const fadeStart = 0.7;
      if (lifeRatio > fadeStart) {
        const opacity = 1 - ((lifeRatio - fadeStart) / (1 - fadeStart));
        (petal.mesh.material as THREE.MeshStandardMaterial).opacity = opacity * 0.9;
      }

      if (petal.mesh.position.y < -0.1) {
        petal.velocity.y *= 0.1;
        petal.velocity.x *= 0.95;
        petal.velocity.z *= 0.95;
      }
    }
  }

  public dispose(): void {
    this.petals.forEach(p => {
      (p.mesh.material as THREE.Material).dispose();
    });
    this.petalGeometry.dispose();
    (this.ground.material as THREE.Material).dispose();
    this.ground.geometry.dispose();
    if (this.backgroundMesh) {
      this.backgroundMesh.geometry.dispose();
      const mat = this.backgroundMesh.material as THREE.MeshBasicMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
  }
}
