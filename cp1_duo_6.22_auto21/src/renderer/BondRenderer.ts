import * as THREE from 'three';
import type { BondData, MoleculeData } from '../parser/MoleculeParser';
import type { AtomMesh } from './AtomRenderer';

export interface BondMeshInfo {
  mesh: THREE.Mesh;
  bond: BondData;
  atom1Mesh: AtomMesh;
  atom2Mesh: AtomMesh;
}

export class BondRenderer {
  private scene: THREE.Scene;
  public group: THREE.Group;
  public bondMeshes: BondMeshInfo[] = [];
  private static cylinderGeometry: THREE.CylinderGeometry | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'molecule-bonds';
    this.scene.add(this.group);
  }

  private static getGeometry(): THREE.CylinderGeometry {
    if (!BondRenderer.cylinderGeometry) {
      BondRenderer.cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 12, 1);
    }
    return BondRenderer.cylinderGeometry;
  }

  public render(moleculeData: MoleculeData, atomMeshes: AtomMesh[]): BondMeshInfo[] {
    this.clear();

    const atomMap = new Map<number, AtomMesh>();
    for (const mesh of atomMeshes) {
      atomMap.set(mesh.userData.atomData.id, mesh);
    }

    const geometry = BondRenderer.getGeometry();

    for (const bond of moleculeData.bonds) {
      const atom1Mesh = atomMap.get(bond.atom1);
      const atom2Mesh = atomMap.get(bond.atom2);

      if (!atom1Mesh || !atom2Mesh) continue;

      const pos1 = new THREE.Vector3();
      const pos2 = new THREE.Vector3();
      atom1Mesh.getWorldPosition(pos1);
      atom2Mesh.getWorldPosition(pos2);

      const direction = new THREE.Vector3().subVectors(pos2, pos1);
      const length = direction.length();

      if (length < 0.001) continue;

      const radius = 0.08 * (bond.bondType ?? 1);

      const color1 = atom1Mesh.userData.originalColor.clone();
      const color2 = atom2Mesh.userData.originalColor.clone();

      const midpoint = new THREE.Vector3().addVectors(pos1, pos2).multiplyScalar(0.5);
      const halfLength = length / 2;

      const material1 = new THREE.MeshPhysicalMaterial({
        color: color1,
        transparent: true,
        opacity: 0.75,
        metalness: 0.1,
        roughness: 0.3,
        clearcoat: 0.5,
        depthWrite: false
      });

      const material2 = new THREE.MeshPhysicalMaterial({
        color: color2,
        transparent: true,
        opacity: 0.75,
        metalness: 0.1,
        roughness: 0.3,
        clearcoat: 0.5,
        depthWrite: false
      });

      const cylinder1 = new THREE.Mesh(geometry, material1);
      const cylinder2 = new THREE.Mesh(geometry, material2);

      cylinder1.scale.set(radius, halfLength, radius);
      cylinder2.scale.set(radius, halfLength, radius);

      const quarter1 = new THREE.Vector3().addVectors(pos1, midpoint).multiplyScalar(1).add(pos1).multiplyScalar(0.3333);
      const quarter2 = new THREE.Vector3().addVectors(pos2, midpoint).multiplyScalar(1).add(pos2).multiplyScalar(0.3333);
      quarter1.lerpVectors(pos1, midpoint, 0.5);
      quarter2.lerpVectors(pos2, midpoint, 0.5);

      cylinder1.position.copy(quarter1);
      cylinder2.position.copy(quarter2);

      const axis = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, direction.clone().normalize());
      cylinder1.quaternion.copy(quaternion);
      cylinder2.quaternion.copy(quaternion);

      this.group.add(cylinder1);
      this.group.add(cylinder2);

      this.bondMeshes.push({
        mesh: cylinder1,
        bond,
        atom1Mesh,
        atom2Mesh
      });
      this.bondMeshes.push({
        mesh: cylinder2,
        bond,
        atom1Mesh,
        atom2Mesh
      });
    }

    return this.bondMeshes;
  }

  public updatePositions(): void {
    for (const bondInfo of this.bondMeshes) {
      const { atom1Mesh, atom2Mesh } = bondInfo;
      const pos1 = new THREE.Vector3();
      const pos2 = new THREE.Vector3();
      atom1Mesh.getWorldPosition(pos1);
      atom2Mesh.getWorldPosition(pos2);

      const direction = new THREE.Vector3().subVectors(pos2, pos1);
      const length = direction.length();
      const halfLength = length / 2;

      const isFirst = bondInfo.mesh === this.bondMeshes[this.bondMeshes.indexOf(bondInfo) & ~1].mesh;

      if (isFirst) {
        const quarter = new THREE.Vector3().lerpVectors(pos1, pos2, 0.25);
        bondInfo.mesh.position.copy(quarter);
        bondInfo.mesh.scale.y = halfLength;
      } else {
        const quarter = new THREE.Vector3().lerpVectors(pos1, pos2, 0.75);
        bondInfo.mesh.position.copy(quarter);
        bondInfo.mesh.scale.y = halfLength;
      }

      const axis = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, direction.clone().normalize());
      bondInfo.mesh.quaternion.copy(quaternion);
    }
  }

  public getBondLengthsByAtomId(atomId: number): Map<number, number> {
    const result = new Map<number, number>();
    const processedBonds = new Set<string>();

    for (const bondInfo of this.bondMeshes) {
      const { bond } = bondInfo;
      const bondKey = `${Math.min(bond.atom1, bond.atom2)}-${Math.max(bond.atom1, bond.atom2)}`;
      if (processedBonds.has(bondKey)) continue;
      processedBonds.add(bondKey);

      if (bond.atom1 === atomId || bond.atom2 === atomId) {
        const otherId = bond.atom1 === atomId ? bond.atom2 : bond.atom1;
        const pos1 = new THREE.Vector3();
        const pos2 = new THREE.Vector3();
        bondInfo.atom1Mesh.getWorldPosition(pos1);
        bondInfo.atom2Mesh.getWorldPosition(pos2);
        result.set(otherId, pos1.distanceTo(pos2));
      }
    }
    return result;
  }

  public getConnectedAtomIds(atomId: number): number[] {
    const result: number[] = [];
    const processed = new Set<string>();

    for (const bondInfo of this.bondMeshes) {
      const { bond } = bondInfo;
      const key = `${Math.min(bond.atom1, bond.atom2)}-${Math.max(bond.atom1, bond.atom2)}`;
      if (processed.has(key)) continue;
      processed.add(key);

      if (bond.atom1 === atomId) result.push(bond.atom2);
      else if (bond.atom2 === atomId) result.push(bond.atom1);
    }
    return result;
  }

  public clear(): void {
    const disposedMaterials = new Set<THREE.Material>();
    for (const bondInfo of this.bondMeshes) {
      if (!disposedMaterials.has(bondInfo.mesh.material as THREE.Material)) {
        (bondInfo.mesh.material as THREE.Material).dispose();
        disposedMaterials.add(bondInfo.mesh.material as THREE.Material);
      }
    }
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.bondMeshes = [];
  }
}
