import * as THREE from 'three';
import {
  MoleculeData,
  AtomData,
  BondData,
  ELEMENT_COLORS,
  ELEMENT_RADII,
} from './MoleculeData';

export interface AtomMesh extends THREE.Mesh {
  userData: {
    atomIndex: number;
    element: string;
    originalColor: number;
    originalScale: number;
  };
}

export interface BondMesh extends THREE.Mesh {
  userData: {
    bondIndex: number;
    from: number;
    to: number;
    order: number;
    originalColor: number;
    bondLength: number;
  };
}

export interface MoleculeModel {
  group: THREE.Group;
  atomMeshes: AtomMesh[];
  bondMeshes: BondMesh[];
  moleculeData: MoleculeData;
}

function createAtomMesh(atom: AtomData, index: number): AtomMesh {
  const radius = ELEMENT_RADII[atom.element] ?? 0.3;
  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const color = ELEMENT_COLORS[atom.element] ?? 0x808080;
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.1,
  });
  const mesh = new THREE.Mesh(geometry, material) as unknown as AtomMesh;
  mesh.position.set(atom.x, atom.y, atom.z);
  mesh.userData = {
    atomIndex: index,
    element: atom.element,
    originalColor: color,
    originalScale: 1,
  };
  return mesh;
}

function createBondCylinder(
  start: THREE.Vector3,
  end: THREE.Vector3,
  color: number,
  offset: THREE.Vector3,
  opacity: number
): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const bondRadius = 0.06;

  const geometry = new THREE.CylinderGeometry(bondRadius, bondRadius, length, 8);
  const material = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity,
    roughness: 0.3,
    metalness: 0.1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5).add(offset);
  mesh.position.copy(mid);

  const axis = new THREE.Vector3(0, 1, 0);
  const dir = direction.clone().normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, dir);
  mesh.quaternion.copy(quaternion);

  return mesh;
}

function computeOffsetVector(start: THREE.Vector3, end: THREE.Vector3): THREE.Vector3 {
  const direction = new THREE.Vector3().subVectors(end, start).normalize();
  let perpendicular = new THREE.Vector3(0, 1, 0);
  if (Math.abs(direction.dot(perpendicular)) > 0.9) {
    perpendicular = new THREE.Vector3(1, 0, 0);
  }
  perpendicular.cross(direction).normalize();
  return perpendicular;
}

function createBondMeshes(
  bond: BondData,
  atoms: AtomData[],
  bondIndex: number
): BondMesh[] {
  const atomA = atoms[bond.from];
  const atomB = atoms[bond.to];
  const start = new THREE.Vector3(atomA.x, atomA.y, atomA.z);
  const end = new THREE.Vector3(atomB.x, atomB.y, atomB.z);
  const distance = start.distanceTo(end);
  const perp = computeOffsetVector(start, end);

  const meshes: BondMesh[] = [];

  let color: number;
  let opacity: number;
  let offsets: THREE.Vector3[];

  switch (bond.order) {
    case 2:
      color = 0x00BFFF;
      opacity = 1.0;
      offsets = [
        perp.clone().multiplyScalar(0.025),
        perp.clone().multiplyScalar(-0.025),
      ];
      break;
    case 3:
      color = 0xFF6B6B;
      opacity = 1.0;
      offsets = [
        new THREE.Vector3(0, 0, 0),
        perp.clone().multiplyScalar(0.05),
        perp.clone().multiplyScalar(-0.05),
      ];
      break;
    default:
      color = 0xFFFFFF;
      opacity = 0.8;
      offsets = [new THREE.Vector3(0, 0, 0)];
      break;
  }

  for (const offset of offsets) {
    const cyl = createBondCylinder(start, end, color, offset, opacity);
    const mesh = cyl as BondMesh;
    mesh.userData = {
      bondIndex,
      from: bond.from,
      to: bond.to,
      order: bond.order,
      originalColor: color,
      bondLength: distance,
    };
    meshes.push(mesh);
  }

  return meshes;
}

export function loadMolecule(data: MoleculeData): MoleculeModel {
  const group = new THREE.Group();
  const atomMeshes: AtomMesh[] = [];
  const bondMeshes: BondMesh[] = [];

  data.bonds.forEach((bond, i) => {
    const bMeshes = createBondMeshes(bond, data.atoms, i);
    bMeshes.forEach((m) => {
      group.add(m);
      bondMeshes.push(m);
    });
  });

  data.atoms.forEach((atom, i) => {
    const mesh = createAtomMesh(atom, i);
    group.add(mesh);
    atomMeshes.push(mesh);
  });

  const center = new THREE.Vector3();
  atomMeshes.forEach((m) => center.add(m.position));
  center.divideScalar(atomMeshes.length);
  group.position.sub(center);

  return { group, atomMeshes, bondMeshes, moleculeData: data };
}

export function getBondTypeLabel(order: number): string {
  switch (order) {
    case 2: return 'Double Bond';
    case 3: return 'Triple Bond';
    default: return 'Single Bond';
  }
}
