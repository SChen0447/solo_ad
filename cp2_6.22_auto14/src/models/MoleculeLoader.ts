import * as THREE from 'three';
import {
  MoleculeData,
  AtomData,
  BondData,
  ELEMENT_PROPERTIES,
  getBondLength
} from './MoleculeData';

export interface MoleculeMesh {
  group: THREE.Group;
  atoms: Array<{
    mesh: THREE.Mesh;
    data: AtomData;
    originalColor: THREE.Color;
    originalScale: number;
  }>;
  bonds: Array<{
    meshes: THREE.Mesh[];
    data: BondData;
    atom1: AtomData;
    atom2: AtomData;
    length: number;
    originalColors: THREE.Color[];
  }>;
}

const BOND_RADIUS = 0.08;
const BOND_COLORS = {
  1: 0xFFFFFF,
  2: 0x00BFFF,
  3: 0xFF6B6B
};
const BOND_OPACITY = {
  1: 0.8,
  2: 0.9,
  3: 0.95
};

function createAtomMesh(atom: AtomData): THREE.Mesh {
  const props = ELEMENT_PROPERTIES[atom.element];
  const geometry = new THREE.SphereGeometry(props.radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color: props.color,
    roughness: 0.3,
    metalness: 0.1
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(atom.x, atom.y, atom.z);
  mesh.userData = { type: 'atom', atom };
  return mesh;
}

function createBondMeshes(
  bond: BondData,
  atom1: AtomData,
  atom2: AtomData
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  const start = new THREE.Vector3(atom1.x, atom1.y, atom1.z);
  const end = new THREE.Vector3(atom2.x, atom2.y, atom2.z);
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

  const color = BOND_COLORS[bond.order];
  const opacity = BOND_OPACITY[bond.order];

  const offset = 0.05;
  const perp1 = new THREE.Vector3();
  const perp2 = new THREE.Vector3();

  if (Math.abs(direction.x) < 0.9) {
    perp1.set(1, 0, 0);
  } else {
    perp1.set(0, 1, 0);
  }
  perp1.cross(direction).normalize();
  perp2.crossVectors(direction, perp1).normalize();

  for (let i = 0; i < bond.order; i++) {
    const geometry = new THREE.CylinderGeometry(BOND_RADIUS, BOND_RADIUS, length, 16);
    const material = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity,
      roughness: 0.4,
      metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);

    let offsetVec = new THREE.Vector3(0, 0, 0);
    if (bond.order === 2) {
      const sign = i === 0 ? -1 : 1;
      offsetVec = perp1.clone().multiplyScalar(offset * sign);
    } else if (bond.order === 3) {
      if (i === 0) {
        offsetVec = perp1.clone().multiplyScalar(-offset);
      } else if (i === 2) {
        offsetVec = perp1.clone().multiplyScalar(offset);
      }
    }

    mesh.position.copy(mid).add(offsetVec);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    );
    mesh.userData = { type: 'bond', bond, atom1, atom2 };
    meshes.push(mesh);
  }

  return meshes;
}

export function buildMoleculeMesh(data: MoleculeData): MoleculeMesh {
  const group = new THREE.Group();
  const atoms: MoleculeMesh['atoms'] = [];
  const bonds: MoleculeMesh['bonds'] = [];

  const atomMap = new Map<number, AtomData>();
  data.atoms.forEach(a => atomMap.set(a.id, a));

  data.atoms.forEach(atom => {
    const mesh = createAtomMesh(atom);
    const props = ELEMENT_PROPERTIES[atom.element];
    group.add(mesh);
    atoms.push({
      mesh,
      data: atom,
      originalColor: new THREE.Color(props.color),
      originalScale: 1
    });
  });

  data.bonds.forEach(bond => {
    const a1 = atomMap.get(bond.atom1)!;
    const a2 = atomMap.get(bond.atom2)!;
    const meshes = createBondMeshes(bond, a1, a2);
    const originalColors = meshes.map(m =>
      new THREE.Color((m.material as THREE.MeshStandardMaterial).color)
    );
    meshes.forEach(m => group.add(m));
    bonds.push({
      meshes,
      data: bond,
      atom1: a1,
      atom2: a2,
      length: getBondLength(a1, a2),
      originalColors
    });
  });

  return { group, atoms, bonds };
}

export function animateTransition(
  group: THREE.Group,
  direction: 'in' | 'out',
  duration: number = 600
): Promise<void> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const startOpacity = direction === 'in' ? 0 : 1;
    const endOpacity = direction === 'in' ? 1 : 0;
    const startScale = direction === 'in' ? 0.3 : 1;
    const endScale = direction === 'in' ? 1 : 0.3;
    const startRotation = direction === 'in' ? Math.PI * 0.5 : 0;
    const endRotation = direction === 'in' ? 0 : -Math.PI * 0.5;

    function easeInOut(t: number): number {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function animate() {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOut(progress);

      const opacity = startOpacity + (endOpacity - startOpacity) * eased;
      const scale = startScale + (endScale - startScale) * eased;
      const rotation = startRotation + (endRotation - startRotation) * eased;

      group.scale.setScalar(scale);
      group.rotation.y = rotation;
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material) {
          const mat = obj.material as THREE.MeshStandardMaterial;
          mat.transparent = true;
          mat.opacity = opacity;
        }
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }

    animate();
  });
}

export function highlightAtom(
  atom: MoleculeMesh['atoms'][0],
  on: boolean
) {
  const material = atom.mesh.material as THREE.MeshStandardMaterial;
  if (on) {
    material.color.set(0xFFD700);
    atom.mesh.scale.setScalar(1.2);
  } else {
    material.color.copy(atom.originalColor);
    atom.mesh.scale.setScalar(atom.originalScale);
  }
}

export function flashAtom(
  atom: MoleculeMesh['atoms'][0]
): Promise<void> {
  return new Promise((resolve) => {
    let flashes = 0;
    const totalFlashes = 4;
    const flashDuration = 300;

    function doFlash() {
      highlightAtom(atom, true);
      setTimeout(() => {
        highlightAtom(atom, false);
        flashes++;
        if (flashes < totalFlashes) {
          setTimeout(doFlash, 100);
        } else {
          resolve();
        }
      }, flashDuration);
    }

    doFlash();
  });
}

export function highlightBond(
  bond: MoleculeMesh['bonds'][0],
  on: boolean
) {
  bond.meshes.forEach((mesh, i) => {
    const material = mesh.material as THREE.MeshStandardMaterial;
    if (on) {
      material.color.set(0xFFD700);
    } else {
      material.color.copy(bond.originalColors[i]);
    }
  });
}
