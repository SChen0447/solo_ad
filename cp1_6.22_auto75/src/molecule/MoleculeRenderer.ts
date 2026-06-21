import * as THREE from 'three';
import type { AtomData, BondData, MoleculeData } from './MoleculeData';

export type DisplayMode = 'ball-stick' | 'space-filling' | 'wireframe';

export interface AtomInfo {
  name: string;
  element: string;
  x: number;
  y: number;
  z: number;
}

export interface HighlightCallback {
  (info: AtomInfo | null): void;
}

export interface HoverCallback {
  (name: string | null, event?: MouseEvent): void;
}

const BOND_RADIUS = 0.08;
const SPACE_FILLING_SCALE = 1.6;

export class MoleculeRenderer {
  private scene: THREE.Scene;
  private moleculeGroup: THREE.Group;
  private atoms: AtomData[];
  private bonds: BondData[];
  private atomMeshes: Map<number, THREE.Mesh> = new Map();
  private bondMeshes: THREE.Mesh[] = [];
  private highlightGlow: THREE.Mesh | null = null;
  private displayMode: DisplayMode = 'ball-stick';
  private onHighlight: HighlightCallback | null = null;
  private onHover: HoverCallback | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.Camera;
  private container: HTMLElement;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    container: HTMLElement,
    moleculeData: MoleculeData
  ) {
    this.scene = scene;
    this.camera = camera;
    this.container = container;
    this.atoms = moleculeData.atoms;
    this.bonds = moleculeData.bonds;
    this.moleculeGroup = new THREE.Group();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.scene.add(this.moleculeGroup);
    this.buildMolecule();
    this.bindEvents();
  }

  getGroup(): THREE.Group {
    return this.moleculeGroup;
  }

  setHighlightCallback(callback: HighlightCallback): void {
    this.onHighlight = callback;
  }

  setHoverCallback(callback: HoverCallback): void {
    this.onHover = callback;
  }

  setDisplayMode(mode: DisplayMode): void {
    if (this.displayMode === mode) return;
    this.displayMode = mode;
    this.clearMolecule();
    this.buildMolecule();
  }

  getDisplayMode(): DisplayMode {
    return this.displayMode;
  }

  clearHighlight(): void {
    if (this.highlightGlow) {
      this.moleculeGroup.remove(this.highlightGlow);
      this.highlightGlow.geometry.dispose();
      (this.highlightGlow.material as THREE.Material).dispose();
      this.highlightGlow = null;
    }
    if (this.onHighlight) {
      this.onHighlight(null);
    }
  }

  private clearMolecule(): void {
    this.clearHighlight();
    this.atomMeshes.forEach((mesh) => {
      this.moleculeGroup.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.atomMeshes.clear();
    this.bondMeshes.forEach((mesh) => {
      this.moleculeGroup.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.bondMeshes = [];
  }

  private buildMolecule(): void {
    if (this.displayMode === 'wireframe') {
      this.buildWireframe();
    } else {
      this.buildAtoms();
      this.buildBonds();
    }
  }

  private buildAtoms(): void {
    const scale = this.displayMode === 'space-filling' ? SPACE_FILLING_SCALE : 1;
    this.atoms.forEach((atom, index) => {
      const radius = atom.radius * scale;
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(atom.color),
        roughness: 0.3,
        metalness: 0.1
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(atom.x, atom.y, atom.z);
      mesh.userData.atomIndex = index;
      this.moleculeGroup.add(mesh);
      this.atomMeshes.set(index, mesh);
    });
  }

  private buildBonds(): void {
    if (this.displayMode === 'space-filling') return;
    this.bonds.forEach((bond) => {
      const atom1 = this.atoms[bond.atom1];
      const atom2 = this.atoms[bond.atom2];
      if (!atom1 || !atom2) return;
      const start = new THREE.Vector3(atom1.x, atom1.y, atom1.z);
      const end = new THREE.Vector3(atom2.x, atom2.y, atom2.z);
      const direction = new THREE.Vector3().subVectors(end, start);
      const length = direction.length();
      const halfLength = length / 2;
      const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

      const createHalfBond = (pos: THREE.Vector3, len: number, color: string) => {
        const geometry = new THREE.CylinderGeometry(BOND_RADIUS, BOND_RADIUS, len, 16);
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color),
          roughness: 0.3,
          metalness: 0.1,
          transparent: true,
          opacity: 0.85
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(pos);
        const axis = new THREE.Vector3(0, 1, 0);
        mesh.quaternion.setFromUnitVectors(axis, direction.clone().normalize());
        return mesh;
      };

      const startPos = new THREE.Vector3().lerpVectors(start, midPoint, 0.5);
      const endPos = new THREE.Vector3().lerpVectors(midPoint, end, 0.5);
      const bond1 = createHalfBond(startPos, halfLength, atom1.color);
      const bond2 = createHalfBond(endPos, halfLength, atom2.color);
      this.moleculeGroup.add(bond1);
      this.moleculeGroup.add(bond2);
      this.bondMeshes.push(bond1, bond2);
    });
  }

  private buildWireframe(): void {
    this.bonds.forEach((bond) => {
      const atom1 = this.atoms[bond.atom1];
      const atom2 = this.atoms[bond.atom2];
      if (!atom1 || !atom2) return;
      const points = [
        new THREE.Vector3(atom1.x, atom1.y, atom1.z),
        new THREE.Vector3(atom2.x, atom2.y, atom2.z)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x88aaff,
        transparent: true,
        opacity: 0.9
      });
      const line = new THREE.Line(geometry, material);
      this.moleculeGroup.add(line);
      this.bondMeshes.push(line as unknown as THREE.Mesh);
    });

    this.atoms.forEach((atom, index) => {
      const geometry = new THREE.SphereGeometry(0.05, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(atom.color)
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(atom.x, atom.y, atom.z);
      mesh.userData.atomIndex = index;
      this.moleculeGroup.add(mesh);
      this.atomMeshes.set(index, mesh);
    });
  }

  private lightenColor(hexColor: string, amount: number = 0.4): string {
    const color = new THREE.Color(hexColor);
    const r = Math.min(1, color.r + amount * (1 - color.r));
    const g = Math.min(1, color.g + amount * (1 - color.g));
    const b = Math.min(1, color.b + amount * (1 - color.b));
    return new THREE.Color(r, g, b).getStyle();
  }

  private highlightAtom(index: number): void {
    this.clearHighlight();
    const atom = this.atoms[index];
    const mesh = this.atomMeshes.get(index);
    if (!atom || !mesh) return;
    const glowRadius = atom.radius * (this.displayMode === 'space-filling' ? SPACE_FILLING_SCALE : 1) * 1.2;
    const glowGeometry = new THREE.SphereGeometry(glowRadius, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.lightenColor(atom.color)),
      transparent: true,
      opacity: 0.4,
      side: THREE.BackSide
    });
    this.highlightGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.highlightGlow.position.copy(mesh.position);
    this.moleculeGroup.add(this.highlightGlow);
    if (this.onHighlight) {
      this.onHighlight({
        name: atom.name,
        element: atom.element,
        x: atom.x,
        y: atom.y,
        z: atom.z
      });
    }
  }

  private updateMouse(event: MouseEvent): void {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getIntersectedAtom(event: MouseEvent): number | null {
    if (this.displayMode === 'wireframe') {
      this.updateMouse(event);
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const atomMeshes = Array.from(this.atomMeshes.values());
      const intersects = this.raycaster.intersectObjects(atomMeshes, false);
      if (intersects.length > 0) {
        return intersects[0].object.userData.atomIndex as number;
      }
      return null;
    }
    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const atomMeshes = Array.from(this.atomMeshes.values());
    const intersects = this.raycaster.intersectObjects(atomMeshes, false);
    if (intersects.length > 0) {
      return intersects[0].object.userData.atomIndex as number;
    }
    return null;
  }

  private bindEvents(): void {
    let hasDragged = false;
    let startX = 0;
    let startY = 0;

    this.container.addEventListener('pointerdown', (e) => {
      hasDragged = false;
      startX = e.clientX;
      startY = e.clientY;
    });

    this.container.addEventListener('pointermove', (e) => {
      if (Math.abs(e.clientX - startX) > 3 || Math.abs(e.clientY - startY) > 3) {
        hasDragged = true;
      }
      const index = this.getIntersectedAtom(e);
      if (index !== null) {
        this.container.style.cursor = 'pointer';
        const atom = this.atoms[index];
        if (this.onHover && atom) {
          this.onHover(atom.name, e);
        }
      } else {
        this.container.style.cursor = 'grab';
        if (this.onHover) {
          this.onHover(null);
        }
      }
    });

    this.container.addEventListener('pointerup', (e) => {
      if (!hasDragged) {
        const index = this.getIntersectedAtom(e);
        if (index !== null) {
          this.highlightAtom(index);
        } else {
          this.clearHighlight();
        }
      }
    });
  }

  dispose(): void {
    this.clearMolecule();
    this.scene.remove(this.moleculeGroup);
  }
}
