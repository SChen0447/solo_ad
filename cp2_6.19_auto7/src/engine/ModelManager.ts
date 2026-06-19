import * as THREE from 'three';
import { ParsedAtom, ParsedBond } from '../parser/MoleculeLoader';

export type DisplayMode = 'ballstick' | 'wireframe';

const ELEMENT_COLORS: Record<string, number> = {
  C: 0x808080,
  H: 0xffffff,
  O: 0xff4444,
  N: 0x4444ff,
  S: 0xffff44,
  P: 0xff8800
};

const ELEMENT_RADIUS: Record<string, number> = {
  C: 0.35,
  H: 0.20,
  O: 0.32,
  N: 0.33,
  S: 0.40,
  P: 0.38
};

export interface AtomMeshUserData {
  type: 'atom';
  atomIndex: number;
  element: string;
  originalScale: number;
  baseRadius: number;
}

export interface BondMeshUserData {
  type: 'bond';
}

export class ModelManager {
  private atomGeometry: THREE.SphereGeometry;
  private bondGeometry: THREE.CylinderGeometry;
  private wireframeAtomGeometry: THREE.SphereGeometry;
  private wireframeBondGeometry: THREE.CylinderGeometry;

  constructor() {
    this.atomGeometry = new THREE.SphereGeometry(1, 32, 24);
    this.bondGeometry = new THREE.CylinderGeometry(0.12, 0.12, 1, 16, 1);
    this.wireframeAtomGeometry = new THREE.SphereGeometry(1, 12, 8);
    this.wireframeBondGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1, 6, 1);
  }

  private getColor(element: string): number {
    return ELEMENT_COLORS[element] || 0xcccccc;
  }

  private getRadius(element: string): number {
    return ELEMENT_RADIUS[element] || 0.30;
  }

  public createModel(
    atoms: ParsedAtom[],
    bonds: ParsedBond[],
    mode: DisplayMode
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'molecule';

    const atomGroup = new THREE.Group();
    atomGroup.name = 'atoms';
    const bondGroup = new THREE.Group();
    bondGroup.name = 'bonds';

    atoms.forEach((atom) => {
      const mesh = this.createAtomMesh(atom, mode);
      atomGroup.add(mesh);
    });

    bonds.forEach((bond) => {
      const mesh = this.createBondMesh(bond, mode);
      bondGroup.add(mesh);
    });

    group.add(atomGroup);
    group.add(bondGroup);

    return group;
  }

  private createAtomMesh(atom: ParsedAtom, mode: DisplayMode): THREE.Mesh {
    const radius = this.getRadius(atom.element);
    const color = this.getColor(atom.element);
    const geometry = mode === 'ballstick' ? this.atomGeometry : this.wireframeAtomGeometry;

    let material: THREE.Material;
    if (mode === 'ballstick') {
      material = new THREE.MeshPhongMaterial({
        color,
        shininess: 80,
        specular: 0x222222
      });
    } else {
      material = new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: 0.7
      });
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(atom.position);
    mesh.scale.setScalar(radius);

    const userData: AtomMeshUserData = {
      type: 'atom',
      atomIndex: atom.index,
      element: atom.element,
      originalScale: radius,
      baseRadius: radius
    };
    mesh.userData = userData;

    return mesh;
  }

  private createBondMesh(bond: ParsedBond, mode: DisplayMode): THREE.Mesh {
    const geometry = mode === 'ballstick' ? this.bondGeometry : this.wireframeBondGeometry;

    let material: THREE.Material;
    if (mode === 'ballstick') {
      material = new THREE.MeshPhongMaterial({
        color: 0xaaaaaa,
        transparent: true,
        opacity: 0.7,
        shininess: 30
      });
    } else {
      material = new THREE.MeshBasicMaterial({
        color: 0x888888,
        wireframe: true,
        transparent: true,
        opacity: 0.5
      });
    }

    const mesh = new THREE.Mesh(geometry, material);
    this.positionBondMesh(mesh, bond);

    mesh.userData = { type: 'bond' } as BondMeshUserData;

    return mesh;
  }

  private positionBondMesh(mesh: THREE.Mesh, bond: ParsedBond): void {
    const start = bond.atom1Pos;
    const end = bond.atom2Pos;
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    mesh.position.copy(mid);
    mesh.scale.set(1, length, 1);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    );
  }

  public updateMode(group: THREE.Group, mode: DisplayMode): void {
    const atomGroup = group.getObjectByName('atoms');
    const bondGroup = group.getObjectByName('bonds');

    if (!atomGroup || !bondGroup) return;

    atomGroup.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      const userData = mesh.userData as AtomMeshUserData;
      if (userData.type !== 'atom') return;

      const newGeometry = mode === 'ballstick' ? this.atomGeometry : this.wireframeAtomGeometry;
      mesh.geometry = newGeometry;

      const color = this.getColor(userData.element);

      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
      if (mode === 'ballstick') {
        mesh.material = new THREE.MeshPhongMaterial({
          color,
          shininess: 80,
          specular: 0x222222
        });
      } else {
        mesh.material = new THREE.MeshBasicMaterial({
          color,
          wireframe: true,
          transparent: true,
          opacity: 0.7
        });
      }
    });

    bondGroup.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      const userData = mesh.userData as BondMeshUserData;
      if (userData.type !== 'bond') return;

      const newGeometry = mode === 'ballstick' ? this.bondGeometry : this.wireframeBondGeometry;
      mesh.geometry = newGeometry;

      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
      if (mode === 'ballstick') {
        mesh.material = new THREE.MeshPhongMaterial({
          color: 0xaaaaaa,
          transparent: true,
          opacity: 0.7,
          shininess: 30
        });
      } else {
        mesh.material = new THREE.MeshBasicMaterial({
          color: 0x888888,
          wireframe: true,
          transparent: true,
          opacity: 0.5
        });
      }
    });
  }

  public setAtomHighlight(mesh: THREE.Mesh, highlighted: boolean): void {
    const userData = mesh.userData as AtomMeshUserData;
    if (userData.type !== 'atom') return;

    const targetScale = highlighted ? userData.originalScale * 1.2 : userData.originalScale;
    mesh.scale.setScalar(targetScale);

    if (mesh.material instanceof THREE.MeshPhongMaterial) {
      mesh.material.emissive = highlighted
        ? new THREE.Color(0x333333)
        : new THREE.Color(0x000000);
    }
  }

  public setModelScale(group: THREE.Group, scale: number): void {
    group.scale.setScalar(scale);
  }

  public transition(
    oldGroup: THREE.Group | null,
    newGroup: THREE.Group,
    progress: number
  ): void {
    const easedOut = this.easeOutCubic(progress);
    const easedIn = this.easeInCubic(progress);

    if (oldGroup) {
      const oldScale = 1 - easedIn;
      this.setModelScale(oldGroup, Math.max(0.001, oldScale));
      this.setGroupOpacity(oldGroup, 1 - easedIn);
    }

    const newScale = easedOut;
    this.setModelScale(newGroup, newScale);
    this.setGroupOpacity(newGroup, easedOut);
  }

  private setGroupOpacity(group: THREE.Group, opacity: number): void {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => {
            if (m instanceof THREE.MeshPhongMaterial || m instanceof THREE.MeshBasicMaterial) {
              m.opacity = opacity;
              m.transparent = true;
            }
          });
        } else if (
          obj.material instanceof THREE.MeshPhongMaterial ||
          obj.material instanceof THREE.MeshBasicMaterial
        ) {
          obj.material.opacity = opacity;
          obj.material.transparent = true;
        }
      }
    });
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeInCubic(t: number): number {
    return t * t * t;
  }
}
