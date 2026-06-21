import * as THREE from 'three';
import type { MoleculeData, AtomData } from './moleculeData';

export type DisplayMode = 'ballstick' | 'wireframe' | 'spacefill';

interface AtomMeshGroup {
  ballStick: THREE.Mesh;
  wireframe: THREE.Mesh;
  spaceFill: THREE.Mesh;
  highlight: THREE.Mesh;
  originalPosition: THREE.Vector3;
  data: AtomData;
}

interface BondMeshGroup {
  ballStick: THREE.Mesh;
  wireframe: THREE.Line;
  spaceFill: THREE.Mesh;
  from: number;
  to: number;
}

export class ModelBuilder {
  public moleculeGroup: THREE.Group;
  public atomsGroup: THREE.Group;
  public bondsGroup: THREE.Group;
  public highlightsGroup: THREE.Group;

  private atomMeshes: Map<number, AtomMeshGroup> = new Map();
  private bondMeshes: BondMeshGroup[] = [];
  private moleculeData: MoleculeData;
  private currentMode: DisplayMode = 'ballstick';
  private explodeValue: number = 0;
  private targetExplodeValue: number = 0;
  private centerOfMass: THREE.Vector3 = new THREE.Vector3();

  constructor(moleculeData: MoleculeData) {
    this.moleculeData = moleculeData;
    this.moleculeGroup = new THREE.Group();
    this.atomsGroup = new THREE.Group();
    this.bondsGroup = new THREE.Group();
    this.highlightsGroup = new THREE.Group();

    this.moleculeGroup.add(this.bondsGroup);
    this.moleculeGroup.add(this.atomsGroup);
    this.moleculeGroup.add(this.highlightsGroup);

    this.calculateCenterOfMass();
    this.createAtoms();
    this.createBonds();
    this.updateModeVisibility();
  }

  private calculateCenterOfMass(): void {
    const totalMass = this.moleculeData.atoms.reduce((sum, atom) => sum + atom.atomicNumber, 0);
    let x = 0, y = 0, z = 0;

    for (const atom of this.moleculeData.atoms) {
      x += atom.position.x * atom.atomicNumber;
      y += atom.position.y * atom.atomicNumber;
      z += atom.position.z * atom.atomicNumber;
    }

    this.centerOfMass.set(x / totalMass, y / totalMass, z / totalMass);
  }

  private createAtoms(): void {
    for (const atomData of this.moleculeData.atoms) {
      const pos = new THREE.Vector3(atomData.position.x, atomData.position.y, atomData.position.z);

      const ballStickGeo = new THREE.SphereGeometry(atomData.radius * 0.4, 32, 32);
      const ballStickMat = new THREE.MeshPhongMaterial({
        color: atomData.color,
        transparent: true,
        opacity: 0.9,
        shininess: 100,
        specular: 0x333333,
      });
      const ballStickMesh = new THREE.Mesh(ballStickGeo, ballStickMat);
      ballStickMesh.position.copy(pos);
      ballStickMesh.userData.atomId = atomData.id;
      ballStickMesh.visible = true;

      const wireframeGeo = new THREE.SphereGeometry(atomData.radius * 0.15, 16, 16);
      const wireframeMat = new THREE.MeshBasicMaterial({ color: atomData.color });
      const wireframeMesh = new THREE.Mesh(wireframeGeo, wireframeMat);
      wireframeMesh.position.copy(pos);
      wireframeMesh.userData.atomId = atomData.id;
      wireframeMesh.visible = false;

      const spaceFillGeo = new THREE.SphereGeometry(atomData.radius, 32, 32);
      const spaceFillMat = new THREE.MeshPhongMaterial({
        color: atomData.color,
        transparent: true,
        opacity: 0.7,
        shininess: 50,
        specular: 0x222222,
        side: THREE.DoubleSide,
      });
      const spaceFillMesh = new THREE.Mesh(spaceFillGeo, spaceFillMat);
      spaceFillMesh.position.copy(pos);
      spaceFillMesh.userData.atomId = atomData.id;
      spaceFillMesh.visible = false;

      const highlightGeo = new THREE.RingGeometry(atomData.radius * 0.5, atomData.radius * 0.65, 32);
      const highlightMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      });
      const highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
      highlightMesh.position.copy(pos);
      highlightMesh.visible = false;

      this.atomsGroup.add(ballStickMesh);
      this.atomsGroup.add(wireframeMesh);
      this.atomsGroup.add(spaceFillMesh);
      this.highlightsGroup.add(highlightMesh);

      this.atomMeshes.set(atomData.id, {
        ballStick: ballStickMesh,
        wireframe: wireframeMesh,
        spaceFill: spaceFillMesh,
        highlight: highlightMesh,
        originalPosition: pos.clone(),
        data: atomData,
      });
    }
  }

  private createBonds(): void {
    for (const bondData of this.moleculeData.bonds) {
      const fromAtom = this.atomMeshes.get(bondData.from);
      const toAtom = this.atomMeshes.get(bondData.to);
      if (!fromAtom || !toAtom) continue;

      const fromPos = fromAtom.originalPosition;
      const toPos = toAtom.originalPosition;
      const distance = fromPos.distanceTo(toPos);
      const midPoint = fromPos.clone().add(toPos).multiplyScalar(0.5);

      const bondColor = this.getBondColor(bondData.type);
      const bondRadius = 0.12 * bondData.type;

      const ballStickGeo = new THREE.CylinderGeometry(bondRadius, bondRadius, distance, 16);
      const ballStickMat = new THREE.MeshPhongMaterial({
        color: bondColor,
        shininess: 80,
        specular: 0x333333,
      });
      const ballStickMesh = new THREE.Mesh(ballStickGeo, ballStickMat);
      ballStickMesh.position.copy(midPoint);
      ballStickMesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        toPos.clone().sub(fromPos).normalize()
      );
      ballStickMesh.visible = true;

      const wireframePoints = [fromPos.clone(), toPos.clone()];
      const wireframeGeo = new THREE.BufferGeometry().setFromPoints(wireframePoints);
      const wireframeMat = new THREE.LineBasicMaterial({ color: bondColor, linewidth: 1 });
      const wireframeLine = new THREE.Line(wireframeGeo, wireframeMat);
      wireframeLine.visible = false;

      const spaceFillGeo = new THREE.CylinderGeometry(bondRadius * 0.5, bondRadius * 0.5, distance, 12);
      const spaceFillMat = new THREE.MeshPhongMaterial({
        color: bondColor,
        transparent: true,
        opacity: 0.3,
      });
      const spaceFillMesh = new THREE.Mesh(spaceFillGeo, spaceFillMat);
      spaceFillMesh.position.copy(midPoint);
      spaceFillMesh.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        toPos.clone().sub(fromPos).normalize()
      );
      spaceFillMesh.visible = false;

      this.bondsGroup.add(ballStickMesh);
      this.bondsGroup.add(wireframeLine);
      this.bondsGroup.add(spaceFillMesh);

      this.bondMeshes.push({
        ballStick: ballStickMesh,
        wireframe: wireframeLine,
        spaceFill: spaceFillMesh,
        from: bondData.from,
        to: bondData.to,
      });
    }
  }

  private getBondColor(type: number): number {
    switch (type) {
      case 1: return 0xcccccc;
      case 2: return 0xf0e68c;
      case 3: return 0xffa07a;
      default: return 0xcccccc;
    }
  }

  public switchMode(mode: DisplayMode): void {
    this.currentMode = mode;

    const fadeDuration = 500;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / fadeDuration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      for (const [, atom] of this.atomMeshes) {
        (atom.ballStick.material as THREE.MeshPhongMaterial).opacity = mode === 'ballstick' ? 0.9 * easeProgress : 0.9 * (1 - easeProgress);
        (atom.wireframe.material as THREE.MeshBasicMaterial).opacity = mode === 'wireframe' ? 1 * easeProgress : 1 * (1 - easeProgress);
        (atom.spaceFill.material as THREE.MeshPhongMaterial).opacity = mode === 'spacefill' ? 0.7 * easeProgress : 0.7 * (1 - easeProgress);

        atom.ballStick.visible = mode === 'ballstick' || progress < 1;
        atom.wireframe.visible = mode === 'wireframe' || progress < 1;
        atom.spaceFill.visible = mode === 'spacefill' || progress < 1;
      }

      for (const bond of this.bondMeshes) {
        const bsMat = bond.ballStick.material as THREE.MeshPhongMaterial;
        const wfMat = bond.wireframe.material as THREE.LineBasicMaterial;
        const sfMat = bond.spaceFill.material as THREE.MeshPhongMaterial;

        bsMat.opacity = mode === 'ballstick' ? 1 * easeProgress : 1 * (1 - easeProgress);
        wfMat.opacity = mode === 'wireframe' ? 1 * easeProgress : 1 * (1 - easeProgress);
        sfMat.opacity = mode === 'spacefill' ? 0.3 * easeProgress : 0.3 * (1 - easeProgress);

        bond.ballStick.visible = mode === 'ballstick' || progress < 1;
        bond.wireframe.visible = mode === 'wireframe' || progress < 1;
        bond.spaceFill.visible = mode === 'spacefill' || progress < 1;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.updateModeVisibility();
      }
    };

    animate();
  }

  private updateModeVisibility(): void {
    for (const [, atom] of this.atomMeshes) {
      atom.ballStick.visible = this.currentMode === 'ballstick';
      atom.wireframe.visible = this.currentMode === 'wireframe';
      atom.spaceFill.visible = this.currentMode === 'spacefill';

      (atom.ballStick.material as THREE.MeshPhongMaterial).opacity = 0.9;
      (atom.wireframe.material as THREE.MeshBasicMaterial).opacity = 1;
      (atom.spaceFill.material as THREE.MeshPhongMaterial).opacity = 0.7;
    }

    for (const bond of this.bondMeshes) {
      bond.ballStick.visible = this.currentMode === 'ballstick';
      bond.wireframe.visible = this.currentMode === 'wireframe';
      bond.spaceFill.visible = this.currentMode === 'spacefill';

      (bond.ballStick.material as THREE.MeshPhongMaterial).opacity = 1;
      (bond.wireframe.material as THREE.LineBasicMaterial).opacity = 1;
      (bond.spaceFill.material as THREE.MeshPhongMaterial).opacity = 0.3;
    }
  }

  public highlightAtom(atomId: number | null): void {
    for (const [id, atom] of this.atomMeshes) {
      const highlight = atom.highlight;
      const mat = highlight.material as THREE.MeshBasicMaterial;

      if (id === atomId) {
        highlight.visible = true;
        mat.opacity = 0.8;
      } else {
        highlight.visible = false;
        mat.opacity = 0;
      }
    }
  }

  public setExplodeValue(value: number): void {
    this.targetExplodeValue = value;
  }

  public update(deltaTime: number, isExploding: boolean): void {
    if (isExploding) {
      this.explodeValue += (this.targetExplodeValue - this.explodeValue) * 0.15;
    } else {
      this.explodeValue += (0 - this.explodeValue) * 0.08;
    }

    const maxDistance = 4.0;
    const explodeFactor = this.explodeValue * maxDistance;
    const bondFadeStart = 0;
    const bondFadeEnd = 0.5;

    for (const [, atom] of this.atomMeshes) {
      const direction = atom.originalPosition.clone().sub(this.centerOfMass).normalize();
      const offset = direction.multiplyScalar(explodeFactor);
      const newPos = atom.originalPosition.clone().add(offset);

      atom.ballStick.position.copy(newPos);
      atom.wireframe.position.copy(newPos);
      atom.spaceFill.position.copy(newPos);
      atom.highlight.position.copy(newPos);
    }

    for (const bond of this.bondMeshes) {
      const fromAtom = this.atomMeshes.get(bond.from);
      const toAtom = this.atomMeshes.get(bond.to);
      if (!fromAtom || !toAtom) continue;

      const fromPos = fromAtom.ballStick.position;
      const toPos = toAtom.ballStick.position;
      const distance = fromPos.distanceTo(toPos);
      const midPoint = fromPos.clone().add(toPos).multiplyScalar(0.5);

      if (bond.ballStick.visible) {
        bond.ballStick.position.copy(midPoint);
        bond.ballStick.scale.y = distance / (fromAtom.originalPosition.distanceTo(toAtom.originalPosition));
        bond.ballStick.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          toPos.clone().sub(fromPos).normalize()
        );
      }

      if (bond.spaceFill.visible) {
        bond.spaceFill.position.copy(midPoint);
        bond.spaceFill.scale.y = distance / (fromAtom.originalPosition.distanceTo(toAtom.originalPosition));
        bond.spaceFill.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          toPos.clone().sub(fromPos).normalize()
        );
      }

      if (bond.wireframe.visible) {
        const positions = bond.wireframe.geometry.attributes.position;
        positions.setXYZ(0, fromPos.x, fromPos.y, fromPos.z);
        positions.setXYZ(1, toPos.x, toPos.y, toPos.z);
        positions.needsUpdate = true;
      }

      const opacity = this.explodeValue < bondFadeStart
        ? 1
        : this.explodeValue > bondFadeEnd
          ? 0
          : 1 - (this.explodeValue - bondFadeStart) / (bondFadeEnd - bondFadeStart);

      if (this.currentMode === 'ballstick') {
        (bond.ballStick.material as THREE.MeshPhongMaterial).opacity = opacity;
      } else if (this.currentMode === 'wireframe') {
        (bond.wireframe.material as THREE.LineBasicMaterial).opacity = opacity;
      } else if (this.currentMode === 'spacefill') {
        (bond.spaceFill.material as THREE.MeshPhongMaterial).opacity = opacity * 0.3;
      }
    }

    this.updateHighlights(deltaTime);
  }

  private updateHighlights(_deltaTime: number): void {
    const time = performance.now() * 0.001;
    const breathePeriod = 1.5;

    for (const [, atom] of this.atomMeshes) {
      if (!atom.highlight.visible) continue;

      const breathePhase = (time % breathePeriod) / breathePeriod;
      const breatheScale = 1 + 0.15 * Math.sin(breathePhase * Math.PI * 2);
      atom.highlight.scale.setScalar(breatheScale);

      const mat = atom.highlight.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.6 + 0.2 * Math.sin(breathePhase * Math.PI * 2);
    }
  }

  public getAtomMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    for (const [, atom] of this.atomMeshes) {
      if (this.currentMode === 'ballstick') {
        meshes.push(atom.ballStick);
      } else if (this.currentMode === 'wireframe') {
        meshes.push(atom.wireframe);
      } else {
        meshes.push(atom.spaceFill);
      }
    }
    return meshes;
  }

  public getAtomData(atomId: number): AtomData | undefined {
    return this.atomMeshes.get(atomId)?.data;
  }

  public getCenterOfMass(): THREE.Vector3 {
    return this.centerOfMass.clone();
  }

  public getCurrentMode(): DisplayMode {
    return this.currentMode;
  }
}
