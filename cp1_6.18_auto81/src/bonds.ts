import * as THREE from 'three';
import { eventBus, ATOM_CONFIGS, type Atom } from './atoms';

export interface Bond {
  id: string;
  atomId1: string;
  atomId2: string;
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  electronParticles: THREE.Points;
  thickness: number;
  targetOpacity: number;
}

export class BondManager {
  private bonds: Bond[] = [];
  private container: THREE.Object3D;
  private idCounter = 0;
  private atoms: Map<string, Atom> = new Map();

  constructor(container: THREE.Object3D) {
    this.container = container;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on('bond:create', (atomId1: string, atomId2: string) => {
      this.createBond(atomId1, atomId2);
    });

    eventBus.on('bond:remove', (atomId1: string, atomId2: string) => {
      this.removeBond(atomId1, atomId2);
    });

    eventBus.on('atom:moved', () => {
      this.updateAllBonds();
    });

    eventBus.on('atom:removed', (atomId: string) => {
      this.removeBondsWithAtom(atomId);
    });

    eventBus.on('atoms:registered', (atomList: Atom[]) => {
      atomList.forEach(atom => this.atoms.set(atom.id, atom));
    });
  }

  registerAtom(atom: Atom): void {
    this.atoms.set(atom.id, atom);
  }

  createBond(atomId1: string, atomId2: string): Bond | null {
    if (atomId1 === atomId2) return null;
    if (this.bondExists(atomId1, atomId2)) return null;

    const atom1 = this.atoms.get(atomId1);
    const atom2 = this.atoms.get(atomId2);
    if (!atom1 || !atom2) return null;

    const id = `bond_${++this.idCounter}`;

    const radius1 = ATOM_CONFIGS[atom1.type].radius;
    const radius2 = ATOM_CONFIGS[atom2.type].radius;
    const thickness = Math.min(radius1, radius2) * 0.25 + 0.04;

    const direction = new THREE.Vector3()
      .subVectors(atom2.mesh.position, atom1.mesh.position);
    const distance = direction.length();
    const center = new THREE.Vector3()
      .addVectors(atom1.mesh.position, atom2.mesh.position)
      .multiplyScalar(0.5);

    const geometry = new THREE.CylinderGeometry(thickness, thickness, distance, 16);
    const material = new THREE.MeshPhongMaterial({
      color: 0x64e0ff,
      emissive: 0x104060,
      transparent: true,
      opacity: 0.6,
      shininess: 100
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(center);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    );
    mesh.userData = { bondId: id };

    const glowGeometry = new THREE.CylinderGeometry(thickness * 2, thickness * 2, distance, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x64e0ff,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.copy(center);
    glowMesh.quaternion.copy(mesh.quaternion);

    const electronCount = 4;
    const electronGeometry = new THREE.BufferGeometry();
    const electronPositions = new Float32Array(electronCount * 3);
    const electronSizes = new Float32Array(electronCount);
    for (let i = 0; i < electronCount; i++) {
      electronSizes[i] = 0.08;
    }
    electronGeometry.setAttribute('position', new THREE.BufferAttribute(electronPositions, 3));

    const electronMaterial = new THREE.PointsMaterial({
      color: 0xffaa40,
      size: 0.1,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });
    const electronParticles = new THREE.Points(electronGeometry, electronMaterial);

    const bond: Bond = {
      id,
      atomId1,
      atomId2,
      mesh,
      glowMesh,
      electronParticles,
      thickness,
      targetOpacity: 0.6
    };

    this.bonds.push(bond);
    this.container.add(mesh);
    this.container.add(glowMesh);
    this.container.add(electronParticles);

    eventBus.emit('bonds:changed', this.bonds.length);

    return bond;
  }

  bondExists(atomId1: string, atomId2: string): boolean {
    return this.bonds.some(b =>
      (b.atomId1 === atomId1 && b.atomId2 === atomId2) ||
      (b.atomId1 === atomId2 && b.atomId2 === atomId1)
    );
  }

  removeBond(atomId1: string, atomId2: string): void {
    const index = this.bonds.findIndex(b =>
      (b.atomId1 === atomId1 && b.atomId2 === atomId2) ||
      (b.atomId1 === atomId2 && b.atomId2 === atomId1)
    );
    if (index === -1) return;

    const bond = this.bonds[index];
    this.container.remove(bond.mesh);
    this.container.remove(bond.glowMesh);
    this.container.remove(bond.electronParticles);
    bond.mesh.geometry.dispose();
    (bond.mesh.material as THREE.Material).dispose();
    bond.glowMesh.geometry.dispose();
    (bond.glowMesh.material as THREE.Material).dispose();
    bond.electronParticles.geometry.dispose();
    (bond.electronParticles.material as THREE.Material).dispose();

    this.bonds.splice(index, 1);
    eventBus.emit('bonds:changed', this.bonds.length);
  }

  removeBondsWithAtom(atomId: string): void {
    const bondsToRemove = this.bonds.filter(b =>
      b.atomId1 === atomId || b.atomId2 === atomId
    );
    bondsToRemove.forEach(b => {
      this.removeBond(b.atomId1, b.atomId2);
    });
  }

  getAllBonds(): Bond[] {
    return this.bonds;
  }

  private updateAllBonds(): void {
    this.bonds.forEach(bond => {
      this.updateBondGeometry(bond);
    });
  }

  private updateBondGeometry(bond: Bond): void {
    const atom1 = this.atoms.get(bond.atomId1);
    const atom2 = this.atoms.get(bond.atomId2);
    if (!atom1 || !atom2) return;

    const direction = new THREE.Vector3()
      .subVectors(atom2.mesh.position, atom1.mesh.position);
    const distance = direction.length();
    const center = new THREE.Vector3()
      .addVectors(atom1.mesh.position, atom2.mesh.position)
      .multiplyScalar(0.5);

    bond.mesh.position.copy(center);
    bond.glowMesh.position.copy(center);

    bond.mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    );
    bond.glowMesh.quaternion.copy(bond.mesh.quaternion);

    bond.mesh.scale.y = distance / (bond.thickness * 2 * Math.PI); 
    bond.glowMesh.scale.y = bond.mesh.scale.y;
  }

  update(_delta: number, vibrationAmount: number): void {
    const time = Date.now() * 0.001;

    this.bonds.forEach(bond => {
      const atom1 = this.atoms.get(bond.atomId1);
      const atom2 = this.atoms.get(bond.atomId2);
      if (!atom1 || !atom2) return;

      const direction = new THREE.Vector3()
        .subVectors(atom2.mesh.position, atom1.mesh.position);
      const distance = direction.length();
      const center = new THREE.Vector3()
        .addVectors(atom1.mesh.position, atom2.mesh.position)
        .multiplyScalar(0.5);

      bond.mesh.position.copy(center);
      bond.glowMesh.position.copy(center);

      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize()
      );
      bond.mesh.quaternion.copy(quat);
      bond.glowMesh.quaternion.copy(quat);

      const baseHeight = 1; 
      bond.mesh.scale.y = distance / baseHeight;
      bond.glowMesh.scale.y = distance / baseHeight;

      const positions = bond.electronParticles.geometry.attributes.position.array as Float32Array;
      const particleCount = positions.length / 3;
      const dirNorm = direction.clone().normalize();

      for (let i = 0; i < particleCount; i++) {
        const t = ((time * 0.5 + i / particleCount) % 1);
        const offset = (t - 0.5) * distance * 0.9;
        const pos = center.clone().add(dirNorm.clone().multiplyScalar(offset));

        const wobble = Math.sin(time * 3 + i * 2) * 0.02;
        const perp = new THREE.Vector3(
          dirNorm.z * wobble,
          0,
          -dirNorm.x * wobble
        );
        pos.add(perp);

        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
      }
      bond.electronParticles.geometry.attributes.position.needsUpdate = true;

      const pulse = 0.8 + Math.sin(time * 2 + bond.id.length) * 0.2;
      const mat = bond.mesh.material as THREE.MeshPhongMaterial;
      mat.opacity = bond.targetOpacity * pulse * (0.7 + vibrationAmount / 300);

      const glowMat = bond.glowMesh.material as THREE.MeshBasicMaterial;
      glowMat.opacity = 0.1 + vibrationAmount / 500;
    });
  }

  dispose(): void {
    this.bonds.forEach(bond => {
      this.container.remove(bond.mesh);
      this.container.remove(bond.glowMesh);
      this.container.remove(bond.electronParticles);
      bond.mesh.geometry.dispose();
      (bond.mesh.material as THREE.Material).dispose();
      bond.glowMesh.geometry.dispose();
      (bond.glowMesh.material as THREE.Material).dispose();
      bond.electronParticles.geometry.dispose();
      (bond.electronParticles.material as THREE.Material).dispose();
    });
    this.bonds = [];
  }
}
