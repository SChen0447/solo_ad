import * as THREE from 'three';
import type { Molecule, Atom, DisplayMode } from './eventBus';

const SPHERE_GEOMETRY = new THREE.SphereGeometry(1, 32, 32);
const BOND_GEOMETRY = new THREE.CylinderGeometry(1, 1, 1, 8, 1, false);

interface RenderData {
  baseRadius: number;
  mesh: THREE.Mesh;
}

function createAtomMaterial(color: string, mode: DisplayMode): THREE.MeshPhongMaterial {
  return new THREE.MeshPhongMaterial({
    color: new THREE.Color(color),
    transparent: mode === 'wireframe',
    opacity: mode === 'wireframe' ? 0.3 : 1,
    shininess: 100,
    specular: new THREE.Color(0x333333)
  });
}

function createBondMaterial(mode: DisplayMode): THREE.MeshPhongMaterial {
  return new THREE.MeshPhongMaterial({
    color: new THREE.Color('#cccccc'),
    transparent: mode === 'wireframe',
    opacity: mode === 'wireframe' ? 0.3 : 1,
    shininess: 50,
    wireframe: mode === 'wireframe'
  });
}

function createAtomMesh(
  atom: Atom,
  atomScale: number,
  mode: DisplayMode
): THREE.Mesh {
  const material = createAtomMaterial(atom.color, mode);
  const mesh = new THREE.Mesh(SPHERE_GEOMETRY, material);
  mesh.position.set(atom.position[0], atom.position[1], atom.position[2]);
  const scaledRadius = atom.radius * atomScale;
  mesh.scale.set(scaledRadius, scaledRadius, scaledRadius);
  (mesh.userData as RenderData) = {
    baseRadius: atom.radius,
    mesh: mesh
  };
  mesh.name = 'atom';
  return mesh;
}

function createBondMesh(
  atom1: Atom,
  atom2: Atom,
  atomScale: number,
  mode: DisplayMode
): THREE.Mesh {
  const material = createBondMaterial(mode);
  const mesh = new THREE.Mesh(BOND_GEOMETRY, material);

  const p1 = new THREE.Vector3(atom1.position[0], atom1.position[1], atom1.position[2]);
  const p2 = new THREE.Vector3(atom2.position[0], atom2.position[1], atom2.position[2]);

  const direction = new THREE.Vector3().subVectors(p2, p1);
  const length = direction.length();
  const r1 = atom1.radius * atomScale;
  const r2 = atom2.radius * atomScale;
  const bondLength = length - r1 - r2;
  const bondRadius = 0.15;

  mesh.scale.set(bondRadius, bondLength, bondRadius);

  const midpoint = new THREE.Vector3().addVectors(
    p1.clone().add(direction.clone().normalize().multiplyScalar(r1)),
    p2.clone().add(direction.clone().normalize().negate().multiplyScalar(r2))
  ).multiplyScalar(0.5);

  mesh.position.copy(midpoint);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize()
  );

  mesh.name = 'bond';
  return mesh;
}

export function createMoleculeGroup(
  molecule: Molecule,
  atomScale: number,
  displayMode: DisplayMode
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'molecule';

  const atomsGroup = new THREE.Group();
  atomsGroup.name = 'atoms';

  const bondsGroup = new THREE.Group();
  bondsGroup.name = 'bonds';

  molecule.atoms.forEach((atom, index) => {
    const mesh = createAtomMesh(atom, atomScale, displayMode);
    (mesh.userData as { atomIndex: number; atom: Atom }).atomIndex = index;
    (mesh.userData as { atomIndex: number; atom: Atom }).atom = atom;
    atomsGroup.add(mesh);
  });

  molecule.bonds.forEach((bond) => {
    const atom1 = molecule.atoms[bond.atomIndex1];
    const atom2 = molecule.atoms[bond.atomIndex2];
    const mesh = createBondMesh(atom1, atom2, atomScale, displayMode);
    bondsGroup.add(mesh);
  });

  group.add(atomsGroup);
  group.add(bondsGroup);
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.matrixAutoUpdate = true;
    }
  });

  return group;
}

export function updateAtomScale(group: THREE.Group, scale: number): void {
  const atomsGroup = group.getObjectByName('atoms') as THREE.Group;
  const bondsGroup = group.getObjectByName('bonds') as THREE.Group;
  const molecule = (group.userData as { molecule?: Molecule }).molecule;

  if (!atomsGroup || !bondsGroup || !molecule) return;

  atomsGroup.children.forEach((child) => {
    if (child instanceof THREE.Mesh && child.name === 'atom') {
      const renderData = child.userData as RenderData;
      const scaledRadius = renderData.baseRadius * scale;
      child.scale.set(scaledRadius, scaledRadius, scaledRadius);
    }
  });

  const bondMeshes = bondsGroup.children.filter(
    (c) => c instanceof THREE.Mesh && c.name === 'bond'
  ) as THREE.Mesh[];

  molecule.bonds.forEach((bond, index) => {
    if (index >= bondMeshes.length) return;

    const atom1 = molecule.atoms[bond.atomIndex1];
    const atom2 = molecule.atoms[bond.atomIndex2];
    const mesh = bondMeshes[index];

    const p1 = new THREE.Vector3(atom1.position[0], atom1.position[1], atom1.position[2]);
    const p2 = new THREE.Vector3(atom2.position[0], atom2.position[1], atom2.position[2]);
    const direction = new THREE.Vector3().subVectors(p2, p1);
    const length = direction.length();
    const r1 = atom1.radius * scale;
    const r2 = atom2.radius * scale;
    const bondLength = length - r1 - r2;
    const bondRadius = 0.15;

    mesh.scale.set(bondRadius, bondLength, bondRadius);

    const midpoint = new THREE.Vector3().addVectors(
      p1.clone().add(direction.clone().normalize().multiplyScalar(r1)),
      p2.clone().add(direction.clone().normalize().negate().multiplyScalar(r2))
    ).multiplyScalar(0.5);

    mesh.position.copy(midpoint);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    );
  });
}

export function updateDisplayMode(group: THREE.Group, mode: DisplayMode): void {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshPhongMaterial) {
      if (obj.name === 'atom') {
        const renderData = obj.userData as { atom: Atom };
        const atom = renderData.atom;
        if (atom) {
          obj.material.color.set(atom.color);
          obj.material.transparent = mode === 'wireframe';
          obj.material.opacity = mode === 'wireframe' ? 0.3 : 1;
          obj.material.wireframe = false;
        }
      } else if (obj.name === 'bond') {
        obj.material.color.set('#cccccc');
        obj.material.transparent = mode === 'wireframe';
        obj.material.opacity = mode === 'wireframe' ? 0.3 : 1;
        obj.material.wireframe = mode === 'wireframe';
      }
      obj.material.needsUpdate = true;
    }
  });
}

export function fadeInGroup(group: THREE.Group, duration: number): Promise<void> {
  return new Promise((resolve) => {
    const startTime = performance.now();

    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.Material) {
        obj.material.transparent = true;
        if ('opacity' in obj.material) {
          (obj.material as { opacity: number }).opacity = 0;
        }
      }
    });

    function animate() {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh && 'opacity' in obj.material) {
          (obj.material as { opacity: number }).opacity = easeProgress;
        }
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshPhongMaterial) {
            if (obj.name === 'atom') {
              obj.material.transparent = false;
            }
          }
        });
        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}
