import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { artifactData, ArtifactData } from '../data/artifactData';
import { ParticleEffects } from '../effects/ParticleEffects';

export type ArtifactType = 'jadeDisk' | 'pottery' | 'bronzeDing' | 'gold' | 'crystal';

export class ArtifactController {
  private scene: THREE.Scene;
  private particleEffects: ParticleEffects;
  private currentArtifact: THREE.Group | null = null;
  private artifacts: Map<string, THREE.Group> = new Map();
  private currentIndex: number = 0;
  private isAnimating: boolean = false;
  private rotationSpeed: number = 0.2;

  constructor(scene: THREE.Scene, particleEffects: ParticleEffects) {
    this.scene = scene;
    this.particleEffects = particleEffects;
    this.preloadAllArtifacts();
  }

  private createArtifactMaterial(color: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3,
      metalness: 0.2
    });
  }

  private createJadeDisk(color: number): THREE.Group {
    const group = new THREE.Group();

    const torusGeometry = new THREE.TorusGeometry(1, 0.3, 16, 48);
    const material = this.createArtifactMaterial(color);
    const torus = new THREE.Mesh(torusGeometry, material);
    torus.castShadow = true;
    torus.receiveShadow = true;
    group.add(torus);

    const innerRingGeometry = new THREE.TorusGeometry(0.5, 0.05, 8, 32);
    const innerRing = new THREE.Mesh(innerRingGeometry, material);
    innerRing.castShadow = true;
    group.add(innerRing);

    return group;
  }

  private createPottery(color: number): THREE.Group {
    const group = new THREE.Group();

    const bodyGeometry = new THREE.SphereGeometry(0.7, 32, 24);
    bodyGeometry.scale(1, 0.9, 1);
    const material = this.createArtifactMaterial(color);
    const body = new THREE.Mesh(bodyGeometry, material);
    body.castShadow = true;
    body.receiveShadow = true;
    body.position.y = 0.1;
    group.add(body);

    const neckGeometry = new THREE.CylinderGeometry(0.25, 0.35, 0.4, 24);
    const neck = new THREE.Mesh(neckGeometry, material);
    neck.castShadow = true;
    neck.position.y = 0.8;
    group.add(neck);

    const rimGeometry = new THREE.TorusGeometry(0.25, 0.05, 8, 24);
    const rim = new THREE.Mesh(rimGeometry, material);
    rim.castShadow = true;
    rim.position.y = 1;
    rim.rotation.x = Math.PI / 2;
    group.add(rim);

    return group;
  }

  private createBronzeDing(color: number): THREE.Group {
    const group = new THREE.Group();

    const bodyGeometry = new THREE.CylinderGeometry(0.8, 0.6, 1.2, 8);
    const material = this.createArtifactMaterial(color);
    const body = new THREE.Mesh(bodyGeometry, material);
    body.castShadow = true;
    body.receiveShadow = true;
    body.position.y = 0.2;
    group.add(body);

    const lidGeometry = new THREE.ConeGeometry(0.9, 0.3, 8);
    const lid = new THREE.Mesh(lidGeometry, material);
    lid.castShadow = true;
    lid.position.y = 0.95;
    group.add(lid);

    const legGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.8, 8);
    const legPositions = [
      { x: 0.5, z: 0.3 },
      { x: -0.5, z: 0.3 },
      { x: 0, z: -0.5 }
    ];

    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, material);
      leg.castShadow = true;
      leg.position.set(pos.x, -0.6, pos.z);
      group.add(leg);
    });

    return group;
  }

  private createGold(color: number): THREE.Group {
    const group = new THREE.Group();

    const knotGeometry = new THREE.TorusKnotGeometry(0.5, 0.12, 64, 12, 2, 3);
    const material = this.createArtifactMaterial(color);
    const knot = new THREE.Mesh(knotGeometry, material);
    knot.castShadow = true;
    knot.receiveShadow = true;
    group.add(knot);

    return group;
  }

  private createCrystal(color: number): THREE.Group {
    const group = new THREE.Group();

    const crystalGeometry = new THREE.IcosahedronGeometry(0.7, 0);
    const material = new THREE.MeshPhysicalMaterial({
      color: color,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.3,
      transparent: true,
      opacity: 0.8,
      clearcoat: 1,
      clearcoatRoughness: 0.1
    });
    const crystal = new THREE.Mesh(crystalGeometry, material);
    crystal.castShadow = true;
    crystal.receiveShadow = true;
    group.add(crystal);

    const innerGeometry = new THREE.OctahedronGeometry(0.35, 0);
    const innerMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: color,
      emissiveIntensity: 0.2,
      roughness: 0.2,
      metalness: 0.3
    });
    const inner = new THREE.Mesh(innerGeometry, innerMaterial);
    inner.castShadow = true;
    group.add(inner);

    return group;
  }

  private createArtifact(type: ArtifactType, color: number): THREE.Group {
    switch (type) {
      case 'jadeDisk':
        return this.createJadeDisk(color);
      case 'pottery':
        return this.createPottery(color);
      case 'bronzeDing':
        return this.createBronzeDing(color);
      case 'gold':
        return this.createGold(color);
      case 'crystal':
        return this.createCrystal(color);
      default:
        return new THREE.Group();
    }
  }

  private preloadAllArtifacts(): void {
    artifactData.forEach(data => {
      const artifact = this.createArtifact(data.modelType, data.mainColor);
      artifact.visible = false;
      artifact.scale.set(0, 0, 0);
      this.artifacts.set(data.id, artifact);
      this.scene.add(artifact);
    });
  }

  public getCurrentArtifactData(): ArtifactData {
    return artifactData[this.currentIndex];
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public getArtifactCount(): number {
    return artifactData.length;
  }

  public switchToArtifact(index: number, onComplete?: () => void): void {
    if (this.isAnimating || index === this.currentIndex) return;
    if (index < 0 || index >= artifactData.length) return;

    this.isAnimating = true;

    const currentData = artifactData[this.currentIndex];
    const nextData = artifactData[index];

    const currentArtifact = this.artifacts.get(currentData.id);
    const nextArtifact = this.artifacts.get(nextData.id);

    if (currentArtifact && currentArtifact.visible) {
      const meshes: THREE.Mesh[] = [];
      currentArtifact.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          meshes.push(child);
        }
      });

      if (meshes.length > 0) {
        this.particleEffects.createDissolveEffect(meshes[0], currentData.mainColor);
      }

      new TWEEN.Tween(currentArtifact.scale)
        .to({ x: 0, y: 0, z: 0 }, 500)
        .easing(TWEEN.Easing.Cubic.In)
        .onComplete(() => {
          if (currentArtifact) {
            currentArtifact.visible = false;
          }
        })
        .start();
    }

    setTimeout(() => {
      if (nextArtifact) {
        nextArtifact.visible = true;
        nextArtifact.scale.set(0, 0, 0);
        nextArtifact.position.y = -0.2;

        new TWEEN.Tween(nextArtifact.scale)
          .to({ x: 1, y: 1, z: 1 }, 500)
          .easing(TWEEN.Easing.Back.Out)
          .start();

        new TWEEN.Tween(nextArtifact.position)
          .to({ y: 0 }, 500)
          .easing(TWEEN.Easing.Cubic.Out)
          .start();
      }

      setTimeout(() => {
        this.currentIndex = index;
        this.currentArtifact = nextArtifact || null;
        this.isAnimating = false;
        if (onComplete) onComplete();
      }, 500);
    }, 250);
  }

  public showFirstArtifact(): void {
    const firstData = artifactData[0];
    const artifact = this.artifacts.get(firstData.id);
    if (artifact) {
      artifact.visible = true;
      artifact.scale.set(1, 1, 1);
      artifact.position.y = 0;
      this.currentArtifact = artifact;
    }
  }

  public getCurrentArtifactPosition(): THREE.Vector3 {
    if (this.currentArtifact) {
      return this.currentArtifact.position.clone();
    }
    return new THREE.Vector3(0, 0, 0);
  }

  public update(delta: number): void {
    if (this.currentArtifact && !this.isAnimating) {
      this.currentArtifact.rotation.y += this.rotationSpeed * delta;
    }
  }

  public dispose(): void {
    this.artifacts.forEach(artifact => {
      this.scene.remove(artifact);
      artifact.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    this.artifacts.clear();
  }
}
