import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';

interface LeafData {
  mesh: THREE.Mesh;
  pivot: THREE.Group;
  baseNormal: THREE.Vector3;
  targetRotationX: number;
  targetRotationZ: number;
  currentRotationX: number;
  currentRotationZ: number;
  tween: TWEEN.Tween<{ rx: number; rz: number }> | null;
}

export class PlantModel {
  public scene: THREE.Scene;
  public plantGroup: THREE.Group;
  public pot: THREE.Mesh;
  public stem: THREE.Group;
  public leaves: LeafData[] = [];
  public baseHeight: number = 1;
  public currentHeightScale: number = 1;
  public heightTween: TWEEN.Tween<{ scale: number }> | null = null;
  public consecutiveGoodDays: number = 0;
  private readonly MAX_HEIGHT_SCALE: number = 1.5;
  private readonly LEAF_COUNT: number = 16;

  private baseLeafHSL: { h: number; s: number; l: number } = { h: 0.33, s: 0.75, l: 0.45 };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.plantGroup = new THREE.Group();
    this.pot = new THREE.Mesh();
    this.stem = new THREE.Group();
  }

  public init(): void {
    this.buildPot();
    this.buildStem();
    this.buildLeaves();
    this.plantGroup.position.y = -1.5;
    this.scene.add(this.plantGroup);
  }

  private buildPot(): void {
    const potGroup = new THREE.Group();
    const potGeo = new THREE.CylinderGeometry(0.5, 0.4, 0.6, 32);
    const potMat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.7,
      metalness: 0.1
    });
    this.pot = new THREE.Mesh(potGeo, potMat);
    this.pot.position.y = 0.3;
    potGroup.add(this.pot);

    const rimGeo = new THREE.TorusGeometry(0.5, 0.04, 16, 32);
    const rim = new THREE.Mesh(rimGeo, potMat);
    rim.position.y = 0.6;
    rim.rotation.x = Math.PI / 2;
    potGroup.add(rim);

    const soilGeo = new THREE.CylinderGeometry(0.46, 0.44, 0.08, 32);
    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x3d2817,
      roughness: 0.95
    });
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = 0.56;
    potGroup.add(soil);

    this.plantGroup.add(potGroup);
  }

  private buildStem(): void {
    this.stem = new THREE.Group();
    const mainStemGeo = new THREE.CylinderGeometry(0.04, 0.06, 1.2, 12);
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x6b4423,
      roughness: 0.85
    });
    const mainStem = new THREE.Mesh(mainStemGeo, stemMat);
    mainStem.position.y = 1.2;
    this.stem.add(mainStem);

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 6;
      const branchHeight = 0.6 + i * 0.18;
      const branchGeo = new THREE.CylinderGeometry(0.015, 0.025, 0.35, 8);
      const branch = new THREE.Mesh(branchGeo, stemMat);
      branch.position.set(
        Math.cos(angle) * 0.08,
        branchHeight,
        Math.sin(angle) * 0.08
      );
      branch.rotation.z = Math.cos(angle) * 0.3;
      branch.rotation.x = -Math.sin(angle) * 0.3;
      this.stem.add(branch);
    }

    this.stem.position.y = 0.6;
    this.plantGroup.add(this.stem);
  }

  private buildLeaves(): void {
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x3a8c3a,
      roughness: 0.2,
      metalness: 0.0,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < this.LEAF_COUNT; i++) {
      const pivot = new THREE.Group();

      const heightRatio = i / this.LEAF_COUNT;
      const leafHeight = 0.55 + heightRatio * 1.1;
      const angleAround = (i / this.LEAF_COUNT) * Math.PI * 4 + (heightRatio * 0.5);
      const leafSize = 0.15 + (1 - heightRatio) * 0.15;

      const leafGeo = new THREE.SphereGeometry(leafSize, 16, 16);
      leafGeo.scale(1, 0.15, 0.6);
      const leaf = new THREE.Mesh(leafGeo, leafMat.clone());

      leaf.position.set(0.12 + heightRatio * 0.08, 0, 0);
      leaf.rotation.y = Math.PI / 2;

      pivot.add(leaf);

      pivot.position.set(
        Math.cos(angleAround) * (0.05 + heightRatio * 0.05),
        leafHeight,
        Math.sin(angleAround) * (0.05 + heightRatio * 0.05)
      );
      pivot.rotation.y = angleAround;
      const tiltAngle = 0.2 + (1 - heightRatio) * 0.5;
      pivot.rotation.z = tiltAngle;

      const baseNormal = new THREE.Vector3(1, 0, 0);
      baseNormal.applyEuler(new THREE.Euler(tiltAngle, 0, 0, 'ZXY'));
      baseNormal.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleAround);
      baseNormal.normalize();

      this.stem.add(pivot);

      this.leaves.push({
        mesh: leaf,
        pivot,
        baseNormal: baseNormal.clone(),
        targetRotationX: 0,
        targetRotationZ: tiltAngle,
        currentRotationX: 0,
        currentRotationZ: tiltAngle,
        tween: null
      });
    }
  }

  public updateLightResponse(lightDirection: THREE.Vector3, intensity: number): void {
    this.updateLeafOrientations(lightDirection);
    this.updateLeafColors(intensity);
  }

  private updateLeafOrientations(lightDirection: THREE.Vector3): void {
    const lightDir = lightDirection.clone().normalize();

    this.leaves.forEach((leaf) => {
      const leafWorldNormal = leaf.baseNormal.clone();
      const leafWorldPos = new THREE.Vector3();
      leaf.pivot.getWorldPosition(leafWorldPos);

      const toLight = lightDir.clone();
      const dot = leafWorldNormal.dot(toLight);
      const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
      const maxRotAngle = Math.min(angle, Math.PI / 3);

      const rotationAxis = new THREE.Vector3().crossVectors(leafWorldNormal, toLight).normalize();
      if (rotationAxis.lengthSq() < 0.001) {
        rotationAxis.set(0, 1, 0);
      }

      const targetRotQuat = new THREE.Quaternion().setFromAxisAngle(rotationAxis, maxRotAngle * 0.6);
      const baseQuat = new THREE.Quaternion().setFromEuler(leaf.pivot.rotation);
      const finalQuat = baseQuat.clone().premultiply(targetRotQuat);
      const targetEuler = new THREE.Euler().setFromQuaternion(finalQuat, 'ZXY');

      if (leaf.tween) {
        leaf.tween.stop();
      }

      const duration = 500 + Math.random() * 700;
      const startState = { rx: leaf.currentRotationX, rz: leaf.currentRotationZ };
      const endState = { rx: targetEuler.x, rz: targetEuler.z };

      leaf.tween = new TWEEN.Tween(startState)
        .to(endState, duration)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => {
          leaf.currentRotationX = startState.rx;
          leaf.currentRotationZ = startState.rz;
          leaf.pivot.rotation.x = startState.rx;
          leaf.pivot.rotation.z = startState.rz;
        })
        .onComplete(() => {
          leaf.tween = null;
        })
        .start();
    });
  }

  private updateLeafColors(intensity: number): void {
    const targetHSL = { ...this.baseLeafHSL };

    if (intensity < 0.3) {
      const t = intensity / 0.3;
      targetHSL.s = this.baseLeafHSL.s * (0.7 + 0.3 * t);
      targetHSL.h = this.baseLeafHSL.h + 0.03 * (1 - t);
    } else if (intensity >= 0.3 && intensity <= 0.7) {
      const t = (intensity - 0.3) / 0.4;
      targetHSL.s = this.baseLeafHSL.s * (0.7 + 0.3 * t);
      targetHSL.h = this.baseLeafHSL.h;
    } else {
      const t = Math.min((intensity - 0.7) / 0.3, 1);
      targetHSL.s = this.baseLeafHSL.s;
      targetHSL.h = this.baseLeafHSL.h - 0.02 * t;
      targetHSL.l = this.baseLeafHSL.l + 0.05 * t;
    }

    this.leaves.forEach((leaf) => {
      const mat = leaf.mesh.material as THREE.MeshStandardMaterial;
      mat.color.setHSL(targetHSL.h, targetHSL.s, targetHSL.l);
    });
  }

  public growIfNeeded(dailyIntegral: number): boolean {
    const threshold = 350;
    if (dailyIntegral > threshold) {
      this.consecutiveGoodDays++;
    } else {
      this.consecutiveGoodDays = 0;
    }

    if (this.consecutiveGoodDays >= 3 && this.currentHeightScale < this.MAX_HEIGHT_SCALE) {
      this.triggerGrowth();
      this.consecutiveGoodDays = 0;
      return true;
    }
    return false;
  }

  private triggerGrowth(): void {
    if (this.heightTween) {
      this.heightTween.stop();
    }

    const targetScale = Math.min(this.currentHeightScale * 1.1, this.MAX_HEIGHT_SCALE);
    const startScale = this.currentHeightScale;

    this.heightTween = new TWEEN.Tween({ scale: startScale })
      .to({ scale: targetScale }, 800)
      .easing((t: number) => {
        const overshoot = 1.70158;
        return t * t * ((overshoot + 1) * t - overshoot) * 0.5 + 
               Math.sin(t * Math.PI * 2) * 0.05 * (1 - t);
      })
      .onUpdate((obj: { scale: number }) => {
        this.currentHeightScale = obj.scale;
        this.stem.scale.y = obj.scale;
        this.leaves.forEach((leaf) => {
          leaf.mesh.position.y = obj.scale;
        });
      })
      .onComplete(() => {
        this.heightTween = null;
      })
      .start();
  }

  public getHeightPercentage(): number {
    return Math.round(this.currentHeightScale * 100);
  }
}
