import * as THREE from 'three';
import type { EnvironmentParams } from './environmentPanel';

interface PetalParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotationSpeed: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class VisualEffects {
  private scene: THREE.Scene;
  private petalGroup: THREE.Group;
  private particles: PetalParticle[] = [];
  private maxParticles = 150;
  private petalSpawnTimer = 0;
  private petalSpawnInterval = 1500;
  private petalGeometry: THREE.CircleGeometry;
  private petalMaterial: THREE.MeshStandardMaterial;

  public ambientLight: THREE.AmbientLight;
  private targetAmbientColor = new THREE.Color(0xffdcb0);
  private currentAmbientColor = new THREE.Color(0xffdcb0);
  private colorTransitionProgress = 1;
  private colorTransitionDuration = 1500;

  private ground: THREE.Mesh;
  private backgroundShaderMat: THREE.ShaderMaterial | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.petalGroup = new THREE.Group();
    this.petalGroup.name = 'PetalParticles';
    scene.add(this.petalGroup);

    this.petalGeometry = new THREE.CircleGeometry(1, 12);
    this.petalGeometry.scale(1, 0.55, 1);
    this.petalMaterial = new THREE.MeshStandardMaterial({
      color: 0xffa6c5,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      roughness: 0.6,
      metalness: 0.05,
      emissive: new THREE.Color(0xff4488),
      emissiveIntensity: 0.08,
    });

    this.ambientLight = new THREE.AmbientLight(0xffdcb0, 0.5);
    scene.add(this.ambientLight);

    const hemi = new THREE.HemisphereLight(0xa0d8ff, 0x3a5f2a, 0.45);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffeecd, 0.9);
    dir.position.set(4, 6, 3);
    scene.add(dir);

    this.ground = this.createGround();
    scene.add(this.ground);

    this.setupBackground();
  }

  private createGround(): THREE.Mesh {
    const geo = new THREE.CircleGeometry(6, 48);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x3d8b3d,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      roughness: 0.9,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.005;
    mesh.receiveShadow = false;
    return mesh;
  }

  private setupBackground(): void {
    const bgGeo = new THREE.SphereGeometry(100, 32, 32);
    this.backgroundShaderMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x0a1628) },
        bottomColor: { value: new THREE.Color(0x3a6ea5) },
        center: { value: new THREE.Vector3(0, 0, 0) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          float t = clamp((h + 0.3) / 1.3, 0.0, 1.0);
          vec3 col = mix(bottomColor, topColor, t);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const bg = new THREE.Mesh(bgGeo, this.backgroundShaderMat);
    this.scene.add(bg);
  }

  public updateEnvironmentColor(params: EnvironmentParams): void {
    const light = params.light / 100;
    const warm = new THREE.Color(0xffc48c);
    const cold = new THREE.Color(0xe8f4ff);
    this.targetAmbientColor.copy(warm).lerp(cold, light);
    const warmAmbient = 0.4;
    const coldAmbient = 0.7;
    this.ambientLight.intensity = warmAmbient + (coldAmbient - warmAmbient) * light;
    this.colorTransitionProgress = 0;
  }

  public update(dtMs: number, plantGroup: THREE.Group): void {
    this.updateAmbientColor(dtMs);
    this.updatePetalParticles(dtMs, plantGroup);
  }

  private updateAmbientColor(dtMs: number): void {
    if (this.colorTransitionProgress < 1) {
      this.colorTransitionProgress = Math.min(
        1,
        this.colorTransitionProgress + dtMs / this.colorTransitionDuration
      );
      const t = this.easeInOutCubic(this.colorTransitionProgress);
      this.currentAmbientColor.lerpColors(
        this.ambientLight.color,
        this.targetAmbientColor,
        t
      );
      this.ambientLight.color.copy(this.currentAmbientColor);
    }
  }

  private updatePetalParticles(dtMs: number, plantGroup: THREE.Group): void {
    this.petalSpawnTimer += dtMs;
    if (this.petalSpawnTimer >= this.petalSpawnInterval) {
      this.petalSpawnTimer = 0;
      this.spawnPetalBurst(plantGroup);
    }
    const dtSec = dtMs / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dtMs;
      if (p.life >= p.maxLife) {
        this.petalGroup.remove(p.mesh);
        p.mesh.geometry.dispose = () => {};
        this.particles.splice(i, 1);
        continue;
      }
      p.mesh.position.addScaledVector(p.velocity, dtSec);
      p.mesh.rotation.x += p.rotationSpeed.x * dtSec;
      p.mesh.rotation.y += p.rotationSpeed.y * dtSec;
      p.mesh.rotation.z += p.rotationSpeed.z * dtSec;
      const lifeRatio = p.life / p.maxLife;
      const alpha = lifeRatio < 0.8
        ? 0.85
        : 0.85 * (1 - (lifeRatio - 0.8) / 0.2);
      (p.mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0, alpha);
      if (p.mesh.position.y < -0.2) {
        this.petalGroup.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  private spawnPetalBurst(plantGroup: THREE.Group): void {
    const count = 5 + Math.floor(Math.random() * 4);
    const plantHeight = 3;
    const baseY = plantGroup.position.y + plantHeight + 1.5;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.recycleOldestPetal();
      }
      const offsetX = (Math.random() - 0.5) * 2.5;
      const offsetZ = (Math.random() - 0.5) * 2.5;
      const y = baseY + Math.random() * 0.8;
      const position = new THREE.Vector3(offsetX, y, offsetZ);
      const size = 0.02 + Math.random() * 0.03;
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        -0.05 - Math.random() * 0.02,
        (Math.random() - 0.5) * 0.02
      );
      const rotSpeed = new THREE.Vector3(
        0.2 + Math.random() * 0.3,
        0.2 + Math.random() * 0.4,
        (Math.random() - 0.5) * 0.2
      );
      const mesh = new THREE.Mesh(this.petalGeometry, this.petalMaterial.clone());
      mesh.scale.set(size * 1.5, size, size);
      mesh.position.copy(position);
      mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI
      );
      this.petalGroup.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        rotationSpeed: rotSpeed,
        life: 0,
        maxLife: 4000,
      });
    }
  }

  private recycleOldestPetal(): void {
    if (this.particles.length === 0) return;
    const p = this.particles.shift()!;
    p.mesh.position.set(10000, 10000, 10000);
    this.petalGroup.remove(p.mesh);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public dispose(): void {
    this.petalGeometry.dispose();
    this.petalMaterial.dispose();
    this.particles.forEach(p => {
      (p.mesh.material as THREE.Material).dispose();
    });
  }
}
