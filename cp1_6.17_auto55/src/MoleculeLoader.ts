import * as THREE from 'three';

export interface AtomData {
  element: string;
  position: [number, number, number];
}

export interface MoleculeData {
  name: string;
  formula: string;
  atoms: AtomData[];
  bonds: [number, number][];
}

export const ELEMENT_PROPERTIES: Record<string, { color: number; radius: number; name: string }> = {
  H: { color: 0xffffff, radius: 0.35, name: '氢 (Hydrogen)' },
  C: { color: 0x808080, radius: 0.5, name: '碳 (Carbon)' },
  O: { color: 0xff3333, radius: 0.45, name: '氧 (Oxygen)' },
  N: { color: 0x3333ff, radius: 0.42, name: '氮 (Nitrogen)' },
  S: { color: 0xffff33, radius: 0.55, name: '硫 (Sulfur)' },
  P: { color: 0xff8833, radius: 0.5, name: '磷 (Phosphorus)' },
};

export const MOLECULES: Record<string, MoleculeData> = {
  water: {
    name: '水分子',
    formula: 'H₂O',
    atoms: [
      { element: 'O', position: [0, 0, 0] },
      { element: 'H', position: [0.76, 0.59, 0] },
      { element: 'H', position: [-0.76, 0.59, 0] },
    ],
    bonds: [[0, 1], [0, 2]],
  },
  co2: {
    name: '二氧化碳',
    formula: 'CO₂',
    atoms: [
      { element: 'C', position: [0, 0, 0] },
      { element: 'O', position: [1.16, 0, 0] },
      { element: 'O', position: [-1.16, 0, 0] },
    ],
    bonds: [[0, 1], [0, 2]],
  },
  benzene: {
    name: '苯环',
    formula: 'C₆H₆',
    atoms: [
      { element: 'C', position: [1.4, 0, 0] },
      { element: 'C', position: [0.7, 1.21, 0] },
      { element: 'C', position: [-0.7, 1.21, 0] },
      { element: 'C', position: [-1.4, 0, 0] },
      { element: 'C', position: [-0.7, -1.21, 0] },
      { element: 'C', position: [0.7, -1.21, 0] },
      { element: 'H', position: [2.48, 0, 0] },
      { element: 'H', position: [1.24, 2.15, 0] },
      { element: 'H', position: [-1.24, 2.15, 0] },
      { element: 'H', position: [-2.48, 0, 0] },
      { element: 'H', position: [-1.24, -2.15, 0] },
      { element: 'H', position: [1.24, -2.15, 0] },
    ],
    bonds: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0],
      [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11],
    ],
  },
};

export interface AtomMeshData {
  mesh: THREE.Mesh;
  element: string;
  index: number;
  originalColor: THREE.Color;
}

export class MoleculeLoader {
  private atomMeshDataList: AtomMeshData[] = [];

  loadMolecule(moleculeKey: string): THREE.Group {
    const moleculeData = MOLECULES[moleculeKey];
    if (!moleculeData) {
      throw new Error(`Molecule not found: ${moleculeKey}`);
    }

    this.atomMeshDataList = [];
    const group = new THREE.Group();
    group.name = 'molecule';

    const atomsGroup = new THREE.Group();
    atomsGroup.name = 'atoms';

    const bondsGroup = new THREE.Group();
    bondsGroup.name = 'bonds';

    moleculeData.atoms.forEach((atom, index) => {
      const props = ELEMENT_PROPERTIES[atom.element];
      const geometry = new THREE.SphereGeometry(props.radius, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: props.color,
        metalness: 0.3,
        roughness: 0.4,
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(...atom.position);
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      sphere.userData = { atomIndex: index, element: atom.element };
      atomsGroup.add(sphere);

      this.atomMeshDataList.push({
        mesh: sphere,
        element: atom.element,
        index,
        originalColor: new THREE.Color(props.color),
      });
    });

    moleculeData.bonds.forEach(([from, to]) => {
      const fromAtom = moleculeData.atoms[from];
      const toAtom = moleculeData.atoms[to];
      const bond = this.createBond(
        new THREE.Vector3(...fromAtom.position),
        new THREE.Vector3(...toAtom.position)
      );
      bondsGroup.add(bond);
    });

    group.add(atomsGroup);
    group.add(bondsGroup);
    return group;
  }

  private createBond(start: THREE.Vector3, end: THREE.Vector3): THREE.Mesh {
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    const geometry = new THREE.CylinderGeometry(0.12, 0.12, length, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.7,
      metalness: 0.2,
      roughness: 0.6,
    });

    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.position.copy(midpoint);
    cylinder.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    );
    cylinder.receiveShadow = true;

    return cylinder;
  }

  getAtomMeshDataList(): AtomMeshData[] {
    return this.atomMeshDataList;
  }
}
