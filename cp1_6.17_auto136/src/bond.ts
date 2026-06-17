import * as THREE from 'three';

export type BondOrder = 1 | 2 | 3;

export class Bond {
  public mesh: THREE.Group;
  public atom1Id: string;
  public atom2Id: string;
  public order: BondOrder;
  public id: string;
  public position1: THREE.Vector3;
  public position2: THREE.Vector3;

  private cylinders: THREE.Mesh[] = [];
  private static bondIdCounter: number = 0;

  constructor(atom1Id: string, atom2Id: string, position1: THREE.Vector3, position2: THREE.Vector3, order: BondOrder = 1) {
    this.id = `bond_${Bond.bondIdCounter++}`;
    this.atom1Id = atom1Id;
    this.atom2Id = atom2Id;
    this.order = order;
    this.position1 = position1.clone();
    this.position2 = position2.clone();
    this.mesh = new THREE.Group();
    this.createCylinders();
    this.updatePosition(position1, position2);
  }

  private createCylinders(): void {
    this.cylinders.forEach(c => {
      c.geometry.dispose();
      (c.material as THREE.Material).dispose();
    });
    this.cylinders = [];
    while (this.mesh.children.length > 0) {
      this.mesh.remove(this.mesh.children[0]);
    }

    const count = this.order;
    const offset = 0.12;

    for (let i = 0; i < count; i++) {
      const geometry = new THREE.CylinderGeometry(0.08, 0.08, 1, 16);
      const material = new THREE.MeshStandardMaterial({
        color: 0xa0a0a0,
        roughness: 0.5,
        metalness: 0.3,
        emissive: 0x222222
      });
      const cylinder = new THREE.Mesh(geometry, material);
      cylinder.castShadow = true;
      cylinder.receiveShadow = true;

      const offsetAmount = (i - (count - 1) / 2) * offset;
      cylinder.userData.offset = offsetAmount;

      this.cylinders.push(cylinder);
      this.mesh.add(cylinder);
    }
  }

  public updatePosition(pos1: THREE.Vector3, pos2: THREE.Vector3): void {
    this.position1.copy(pos1);
    this.position2.copy(pos2);

    const mid = new THREE.Vector3().addVectors(pos1, pos2).multiplyScalar(0.5);
    const direction = new THREE.Vector3().subVectors(pos2, pos1);
    const length = direction.length();

    direction.normalize();

    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);

    const perp1 = new THREE.Vector3(1, 0, 0);
    if (Math.abs(direction.dot(perp1)) > 0.9) {
      perp1.set(0, 1, 0);
    }
    const perp = new THREE.Vector3().crossVectors(direction, perp1).normalize();

    this.cylinders.forEach(cylinder => {
      const offsetAmount = cylinder.userData.offset as number;
      const offsetVector = perp.clone().multiplyScalar(offsetAmount);
      const cylinderPos = mid.clone().add(offsetVector);

      cylinder.position.copy(cylinderPos);
      cylinder.quaternion.copy(quaternion);
      cylinder.scale.set(1, length, 1);
    });
  }

  public increaseOrder(): boolean {
    if (this.order < 3) {
      this.order = (this.order + 1) as BondOrder;
      this.createCylinders();
      this.updatePosition(this.position1, this.position2);
      return true;
    }
    return false;
  }

  public setOrder(order: BondOrder): void {
    this.order = order;
    this.createCylinders();
    this.updatePosition(this.position1, this.position2);
  }

  public involves(atomId: string): boolean {
    return this.atom1Id === atomId || this.atom2Id === atomId;
  }

  public getOtherAtomId(atomId: string): string {
    if (this.atom1Id === atomId) return this.atom2Id;
    if (this.atom2Id === atomId) return this.atom1Id;
    return '';
  }

  public dispose(): void {
    this.cylinders.forEach(c => {
      c.geometry.dispose();
      (c.material as THREE.Material).dispose();
    });
    this.cylinders = [];
  }
}
