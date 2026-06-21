import * as THREE from 'three';
import { TreeSpecies, CrownShape, SPECIES_CONFIG, getLeafColor, getLeafDensity, getCrownScale, getGrowthProgress, getCurrentTemperature } from './season';

export class Tree {
  public species: TreeSpecies;
  public group: THREE.Group;
  public trunk: THREE.Mesh;
  public branches: THREE.Group;
  public crownGroup: THREE.Group;
  public crownMeshes: THREE.Mesh[] = [];
  public highlightRing: THREE.Mesh;
  public position: THREE.Vector3;
  public crownRadius: number;
  public treeHeight: number;
  public currentMonth: number = 1;
  private targetLeafColor: THREE.Color;
  private currentLeafColor: THREE.Color;

  constructor(species: TreeSpecies, position: THREE.Vector3) {
    this.species = species;
    this.position = position.clone();
    this.group = new THREE.Group();
    this.branches = new THREE.Group();
    this.crownGroup = new THREE.Group();

    const cfg = SPECIES_CONFIG[species];

    const trunkHeight = this.getTrunkHeight(species);
    const trunkRadius = this.getTrunkRadius(species, trunkHeight);
    this.treeHeight = trunkHeight * 1.7;
    this.crownRadius = trunkHeight * 0.55;

    const trunkGeo = new THREE.CylinderGeometry(trunkRadius * 0.5, trunkRadius, trunkHeight, 8, 1);
    const positions = trunkGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      positions.setX(i, x + (Math.random() - 0.5) * trunkRadius * 0.15);
      positions.setZ(i, z + (Math.random() - 0.5) * trunkRadius * 0.15);
    }
    positions.needsUpdate = true;
    trunkGeo.computeVertexNormals();

    const trunkMat = new THREE.MeshStandardMaterial({
      color: cfg.trunkColor,
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true
    });
    this.trunk = new THREE.Mesh(trunkGeo, trunkMat);
    this.trunk.position.y = trunkHeight / 2;
    this.trunk.castShadow = true;
    this.trunk.receiveShadow = true;

    this.createBranches(species, trunkHeight, trunkRadius);
    this.createCrown(species, trunkHeight);

    this.group.add(this.trunk);
    this.group.add(this.branches);
    this.group.add(this.crownGroup);
    this.group.position.copy(position);
    this.group.userData.tree = this;

    const ringGeo = new THREE.RingGeometry(this.crownRadius * 1.3, this.crownRadius * 1.55, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfff8dc,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.highlightRing = new THREE.Mesh(ringGeo, ringMat);
    this.highlightRing.rotation.x = -Math.PI / 2;
    this.highlightRing.position.y = 0.1;
    this.group.add(this.highlightRing);

    this.currentLeafColor = cfg.leafColors.winter.clone();
    this.targetLeafColor = cfg.leafColors.winter.clone();
  }

  private getTrunkHeight(species: TreeSpecies): number {
    const heights: Record<TreeSpecies, number> = {
      pine: 6.5,
      maple: 4.5,
      birch: 5.5,
      oak: 4.0,
      cherry: 3.8
    };
    return heights[species] * (0.9 + Math.random() * 0.2);
  }

  private getTrunkRadius(species: TreeSpecies, height: number): number {
    return height * 0.08;
  }

  private createBranches(species: TreeSpecies, trunkHeight: number, trunkRadius: number): void {
    const cfg = SPECIES_CONFIG[species];
    const branchCount = species === 'pine' ? 0 : 5 + Math.floor(Math.random() * 4);

    for (let i = 0; i < branchCount; i++) {
      const heightRatio = 0.4 + (i / branchCount) * 0.45;
      const y = trunkHeight * heightRatio;
      const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5;
      const length = (trunkHeight * 0.25) * (1 - heightRatio * 0.4);
      const radius = trunkRadius * 0.35 * (1 - heightRatio * 0.3);

      const branchGeo = new THREE.CylinderGeometry(radius * 0.4, radius, length, 5, 1);
      const branchMat = new THREE.MeshStandardMaterial({
        color: cfg.trunkColor,
        roughness: 0.9,
        flatShading: true
      });
      const branch = new THREE.Mesh(branchGeo, branchMat);

      branch.position.set(
        Math.cos(angle) * trunkRadius * 0.7,
        y + length * 0.3,
        Math.sin(angle) * trunkRadius * 0.7
      );
      branch.rotation.z = Math.cos(angle) * (0.5 + Math.random() * 0.3);
      branch.rotation.x = Math.sin(angle) * (0.5 + Math.random() * 0.3);
      branch.rotation.y = angle + Math.random() * 0.2;
      branch.castShadow = true;
      branch.receiveShadow = true;
      this.branches.add(branch);

      if (Math.random() > 0.4) {
        const subLen = length * 0.5;
        const subGeo = new THREE.CylinderGeometry(radius * 0.25, radius * 0.5, subLen, 4, 1);
        const subBranch = new THREE.Mesh(subGeo, branchMat.clone());
        subBranch.position.set(length * 0.3, length * 0.25, 0);
        subBranch.rotation.z = 0.6 + Math.random() * 0.4;
        subBranch.rotation.y = Math.random() * Math.PI;
        subBranch.castShadow = true;
        branch.add(subBranch);
      }
    }
  }

  private createCrown(species: TreeSpecies, trunkHeight: number): void {
    const cfg = SPECIES_CONFIG[species];
    const shape = cfg.crownShape;
    const crownColor = cfg.leafColors.winter.clone();
    this.currentLeafColor = crownColor.clone();

    const material = new THREE.MeshStandardMaterial({
      color: crownColor,
      roughness: 0.85,
      metalness: 0.02,
      flatShading: true,
      transparent: true,
      opacity: 1
    });

    if (shape === 'conical') {
      const layers = 5;
      const baseY = trunkHeight * 0.55;
      const totalHeight = trunkHeight * 1.1;
      for (let i = 0; i < layers; i++) {
        const layerRatio = i / layers;
        const y = baseY + totalHeight * layerRatio * 0.75;
        const radius = this.crownRadius * (1 - layerRatio * 0.7) * (0.85 + Math.random() * 0.15);
        const height = totalHeight * 0.22;
        const coneGeo = new THREE.ConeGeometry(radius, height, 7 + i, 1);
        const cone = new THREE.Mesh(coneGeo, material.clone());
        cone.position.y = y + height / 2;
        cone.castShadow = true;
        cone.receiveShadow = true;
        this.crownMeshes.push(cone);
        this.crownGroup.add(cone);
      }
    } else if (shape === 'spherical') {
      const baseY = trunkHeight * 0.65;
      const clusterPositions = [
        { x: 0, y: 0, z: 0, s: 1.1 },
        { x: 0.5, y: 0.2, z: 0.3, s: 0.7 },
        { x: -0.4, y: 0.25, z: -0.2, s: 0.65 },
        { x: 0.2, y: 0.55, z: -0.3, s: 0.55 },
        { x: -0.3, y: -0.1, z: 0.4, s: 0.6 },
        { x: 0.45, y: 0.1, z: -0.35, s: 0.55 }
      ];
      for (const cp of clusterPositions) {
        const r = this.crownRadius * cp.s;
        const sphereGeo = new THREE.IcosahedronGeometry(r, 1);
        const sphere = new THREE.Mesh(sphereGeo, material.clone());
        sphere.position.set(
          cp.x * this.crownRadius,
          baseY + cp.y * this.crownRadius,
          cp.z * this.crownRadius
        );
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        this.crownMeshes.push(sphere);
        this.crownGroup.add(sphere);
      }
    } else if (shape === 'umbrella') {
      const baseY = trunkHeight * 0.75;
      const segments = 6;
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const dist = this.crownRadius * 0.55;
        const r = this.crownRadius * 0.45;
        const sphereGeo = new THREE.IcosahedronGeometry(r, 1);
        const sphere = new THREE.Mesh(sphereGeo, material.clone());
        sphere.position.set(
          Math.cos(angle) * dist,
          baseY + this.crownRadius * 0.3 + (Math.random() - 0.5) * 0.5,
          Math.sin(angle) * dist
        );
        sphere.scale.set(1.2, 0.7, 1.2);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        this.crownMeshes.push(sphere);
        this.crownGroup.add(sphere);
      }
      const centerGeo = new THREE.IcosahedronGeometry(this.crownRadius * 0.55, 1);
      const center = new THREE.Mesh(centerGeo, material.clone());
      center.position.y = baseY + this.crownRadius * 0.5;
      center.scale.set(1.4, 0.8, 1.4);
      center.castShadow = true;
      center.receiveShadow = true;
      this.crownMeshes.push(center);
      this.crownGroup.add(center);
    } else if (shape === 'cylindrical') {
      const baseY = trunkHeight * 0.4;
      const layers = 6;
      for (let i = 0; i < layers; i++) {
        const layerRatio = i / (layers - 1);
        const y = baseY + this.crownRadius * 1.6 * layerRatio;
        const r = this.crownRadius * (0.85 - Math.abs(layerRatio - 0.5) * 0.35);
        const sphereGeo = new THREE.IcosahedronGeometry(r, 1);
        const sphere = new THREE.Mesh(sphereGeo, material.clone());
        sphere.position.y = y;
        sphere.position.x = (Math.random() - 0.5) * 0.4;
        sphere.position.z = (Math.random() - 0.5) * 0.4;
        sphere.scale.set(1.0, 0.7, 1.0);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        this.crownMeshes.push(sphere);
        this.crownGroup.add(sphere);
      }
    } else {
      const baseY = trunkHeight * 0.55;
      const count = 8;
      for (let i = 0; i < count; i++) {
        const t = i / count;
        const angle = t * Math.PI * 2 + Math.random() * 0.6;
        const dist = this.crownRadius * (0.3 + Math.random() * 0.55);
        const r = this.crownRadius * (0.3 + Math.random() * 0.35);
        const sphereGeo = new THREE.IcosahedronGeometry(r, 1);
        const sphere = new THREE.Mesh(sphereGeo, material.clone());
        sphere.position.set(
          Math.cos(angle) * dist,
          baseY + this.crownRadius * (0.2 + t * 0.8 + (Math.random() - 0.5) * 0.3),
          Math.sin(angle) * dist
        );
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        this.crownMeshes.push(sphere);
        this.crownGroup.add(sphere);
      }
      const topGeo = new THREE.IcosahedronGeometry(this.crownRadius * 0.4, 1);
      const top = new THREE.Mesh(topGeo, material.clone());
      top.position.y = baseY + this.crownRadius * 1.2;
      top.castShadow = true;
      top.receiveShadow = true;
      this.crownMeshes.push(top);
      this.crownGroup.add(top);
    }

    for (const mesh of this.crownMeshes) {
      mesh.userData.tree = this;
    }
    this.trunk.userData.tree = this;
    this.branches.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.userData.tree = this;
      }
    });
  }

  public update(month: number, deltaFactor: number = 1): void {
    this.currentMonth = month;
    const newColor = getLeafColor(this.species, month);
    this.targetLeafColor.copy(newColor);
    this.currentLeafColor.lerp(this.targetLeafColor, 0.06 * deltaFactor);

    const density = getLeafDensity(this.species, month);
    const scale = getCrownScale(this.species, month);

    for (const mesh of this.crownMeshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.copy(this.currentLeafColor);
      mat.opacity = Math.max(0.08, density * 0.95 + 0.05);
      mesh.scale.setScalar(scale);
    }
  }

  public setHighlight(active: boolean): void {
    const mat = this.highlightRing.material as THREE.MeshBasicMaterial;
    const targetOpacity = active ? 0.55 : 0;
    mat.opacity = targetOpacity;
  }

  public getLeafDensityPercent(): number {
    return Math.round(getLeafDensity(this.species, this.currentMonth) * 100);
  }

  public getOptimalTempRange(): string {
    const cfg = SPECIES_CONFIG[this.species];
    return `${cfg.optimalTempMin}°C ~ ${cfg.optimalTempMax}°C`;
  }

  public getGrowthProgress(): number {
    return getGrowthProgress(this.currentMonth);
  }

  public getDisplayName(): string {
    return SPECIES_CONFIG[this.species].nameCN;
  }

  public getInteractables(): THREE.Object3D[] {
    const result: THREE.Object3D[] = [this.trunk, ...this.crownMeshes];
    this.branches.traverse((obj) => {
      if (obj instanceof THREE.Mesh) result.push(obj);
    });
    return result;
  }

  public getFocusPosition(): THREE.Vector3 {
    const center = this.position.clone();
    center.y += this.treeHeight * 0.45;
    return center;
  }

  public getFocusDistance(): number {
    return this.crownRadius * 3.2;
  }
}
