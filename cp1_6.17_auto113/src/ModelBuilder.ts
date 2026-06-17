import * as THREE from 'three';

export interface Atom {
  id: number;
  element: string;
  x: number;
  y: number;
  z: number;
}

export interface Bond {
  id: number;
  atom1: number;
  atom2: number;
  type: 'single' | 'double' | 'triple' | 'aromatic';
  length: number;
}

export interface MoleculeData {
  name: string;
  formula: string;
  molecularWeight: number;
  atoms: Atom[];
  bonds: Bond[];
}

export type RenderMode = 'ball-stick' | 'space-filling' | 'wireframe';
export type ColorTheme = 'cpk' | 'neon' | 'grayscale';

interface ColorMap {
  [element: string]: number;
}

const CPK_COLORS: ColorMap = {
  H: 0xffffff, C: 0x909090, N: 0x3050f8, O: 0xff0d0d,
  F: 0x90e050, Cl: 0x1ff01f, Br: 0xa62929, I: 0x940094,
  S: 0xffff30, P: 0xff8000, B: 0xffb5b5, Li: 0xcc80ff,
  Na: 0xab5cf2, K: 0x8f40d4, Ca: 0x3dff00, Fe: 0xffa500,
  Zn: 0x7d80b0, Cu: 0xc88033, Mg: 0x8aff00, Al: 0xbfa6a6
};

const NEON_COLORS: ColorMap = {
  H: 0x00ffff, C: 0xff00ff, N: 0x00ff00, O: 0xff0066,
  F: 0xffff00, Cl: 0x00ff88, Br: 0xff6600, I: 0x9900ff,
  S: 0xffcc00, P: 0x00ccff, B: 0xff99cc, Li: 0xff66ff,
  Na: 0x66ffcc, K: 0xcc66ff, Ca: 0x66ff66, Fe: 0xff9933,
  Zn: 0x99ccff, Cu: 0xffcc99, Mg: 0xccff66, Al: 0xffcccc
};

const GRAYSCALE_COLORS: ColorMap = {
  H: 0xffffff, C: 0x888888, N: 0xaaaaaa, O: 0x666666,
  F: 0xcccccc, Cl: 0x999999, Br: 0x777777, I: 0x555555,
  S: 0xbbbbbb, P: 0xdddddd, B: 0xeeeeee, Li: 0x444444,
  Na: 0x333333, K: 0x222222, Ca: 0x111111, Fe: 0x777777,
  Zn: 0x888888, Cu: 0x999999, Mg: 0xaaaaaa, Al: 0xbbbbbb
};

const ATOMIC_RADII: { [element: string]: number } = {
  H: 0.31, C: 0.76, N: 0.71, O: 0.66, F: 0.57, Cl: 1.02,
  Br: 1.20, I: 1.39, S: 1.05, P: 1.06, B: 0.85, Li: 1.28,
  Na: 1.66, K: 2.03, Ca: 1.76, Fe: 1.26, Zn: 1.20, Cu: 1.12,
  Mg: 1.41, Al: 1.21
};

const BOND_RADIUS = 0.08;
const TRANSITION_DURATION = 300;

interface TweenState {
  start: number;
  end: number;
  startTime: number;
  duration: number;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}

export class ModelBuilder {
  private scene: THREE.Scene;
  private moleculeGroup: THREE.Group;
  private atomMeshes: Map<number, THREE.Mesh> = new Map();
  private bondMeshes: Map<number, THREE.Mesh> = new Map();
  private atomWireframes: Map<number, THREE.LineSegments> = new Map();
  private bondWireframes: Map<number, THREE.Line> = new Map();
  private highlightMesh: THREE.Mesh | null = null;
  private hoverMesh: THREE.Mesh | null = null;

  private currentData: MoleculeData | null = null;
  private currentRenderMode: RenderMode = 'ball-stick';
  private currentColorTheme: ColorTheme = 'cpk';
  private atomRadiusScale = 0.3;

  private tweens: TweenState[] = [];
  private atomGeometryCache: Map<string, THREE.SphereGeometry> = new Map();
  private bondMaterial: THREE.MeshPhongMaterial;
  private wireframeMaterial: THREE.LineBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.moleculeGroup = new THREE.Group();
    this.scene.add(this.moleculeGroup);

    this.bondMaterial = new THREE.MeshPhongMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.7,
      shininess: 50
    });

    this.wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
  }

  private getColorMap(): ColorMap {
    switch (this.currentColorTheme) {
      case 'neon': return NEON_COLORS;
      case 'grayscale': return GRAYSCALE_COLORS;
      default: return CPK_COLORS;
    }
  }

  private getAtomColor(element: string): number {
    const colorMap = this.getColorMap();
    return colorMap[element] || 0x888888;
  }

  private getAtomRadius(element: string): number {
    const baseRadius = ATOMIC_RADII[element] || 0.5;
    switch (this.currentRenderMode) {
      case 'space-filling':
        return baseRadius * this.atomRadiusScale * 2;
      case 'ball-stick':
        return baseRadius * this.atomRadiusScale;
      default:
        return baseRadius * this.atomRadiusScale;
    }
  }

  private getAtomGeometry(radius: number): THREE.SphereGeometry {
    const key = `${radius}_${this.currentRenderMode === 'wireframe' ? 'low' : 'high'}`;
    if (!this.atomGeometryCache.has(key)) {
      const segments = this.currentRenderMode === 'wireframe' ? 8 : 32;
      const geometry = new THREE.SphereGeometry(radius, segments, segments);
      this.atomGeometryCache.set(key, geometry);
    }
    return this.atomGeometryCache.get(key)!;
  }

  private createAtomMaterial(element: string): THREE.MeshPhongMaterial {
    const color = this.getAtomColor(element);
    return new THREE.MeshPhongMaterial({
      color,
      shininess: 100,
      specular: 0x444444
    });
  }

  private createWireframeGeometry(mesh: THREE.Mesh): THREE.LineSegments {
    const edges = new THREE.EdgesGeometry(mesh.geometry);
    return new THREE.LineSegments(edges, this.wireframeMaterial.clone());
  }

  private createBondMesh(atom1: Atom, atom2: Atom): THREE.Mesh {
    const start = new THREE.Vector3(atom1.x, atom1.y, atom1.z);
    const end = new THREE.Vector3(atom2.x, atom2.y, atom2.z);
    const direction = end.clone().sub(start);
    const length = direction.length();

    const cylinderGeometry = new THREE.CylinderGeometry(
      BOND_RADIUS, BOND_RADIUS, length, 16
    );

    const mesh = new THREE.Mesh(cylinderGeometry, this.bondMaterial.clone());
    
    mesh.position.copy(start.clone().add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    );

    return mesh;
  }

  private createBondLine(atom1: Atom, atom2: Atom): THREE.Line {
    const points = [
      new THREE.Vector3(atom1.x, atom1.y, atom1.z),
      new THREE.Vector3(atom2.x, atom2.y, atom2.z)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return new THREE.Line(geometry, this.wireframeMaterial.clone());
  }

  buildMolecule(data: MoleculeData): void {
    this.clearMolecule();
    this.currentData = data;

    const center = this.calculateCenter(data.atoms);
    const centeredAtoms = data.atoms.map(atom => ({
      ...atom,
      x: atom.x - center.x,
      y: atom.y - center.y,
      z: atom.z - center.z
    }));

    centeredAtoms.forEach(atom => {
      const radius = this.getAtomRadius(atom.element);
      const geometry = this.getAtomGeometry(radius);
      const material = this.createAtomMaterial(atom.element);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(atom.x, atom.y, atom.z);
      mesh.userData = { type: 'atom', id: atom.id, element: atom.element };
      this.atomMeshes.set(atom.id, mesh);

      if (this.currentRenderMode === 'wireframe') {
        const wireframe = this.createWireframeGeometry(mesh);
        wireframe.position.copy(mesh.position);
        wireframe.userData = { type: 'atom', id: atom.id, element: atom.element };
        this.atomWireframes.set(atom.id, wireframe);
      }
    });

    data.bonds.forEach(bond => {
      const atom1 = centeredAtoms.find(a => a.id === bond.atom1)!;
      const atom2 = centeredAtoms.find(a => a.id === bond.atom2)!;

      if (this.currentRenderMode === 'wireframe') {
        const line = this.createBondLine(atom1, atom2);
        line.userData = { type: 'bond', id: bond.id, bondType: bond.type };
        this.bondWireframes.set(bond.id, line);
      } else {
        const mesh = this.createBondMesh(atom1, atom2);
        mesh.userData = { type: 'bond', id: bond.id, bondType: bond.type };
        this.bondMeshes.set(bond.id, mesh);
      }
    });

    this.updateSceneVisibility();
    this.addToScene();
  }

  private calculateCenter(atoms: Atom[]): { x: number; y: number; z: number } {
    let sumX = 0, sumY = 0, sumZ = 0;
    atoms.forEach(atom => {
      sumX += atom.x;
      sumY += atom.y;
      sumZ += atom.z;
    });
    const count = atoms.length;
    return { x: sumX / count, y: sumY / count, z: sumZ / count };
  }

  private addToScene(): void {
    if (this.currentRenderMode === 'wireframe') {
      this.atomWireframes.forEach(w => this.moleculeGroup.add(w));
      this.bondWireframes.forEach(w => this.moleculeGroup.add(w));
    } else {
      this.atomMeshes.forEach(m => this.moleculeGroup.add(m));
      if (this.currentRenderMode === 'ball-stick') {
        this.bondMeshes.forEach(m => this.moleculeGroup.add(m));
      }
    }
  }

  private updateSceneVisibility(): void {
    const isWireframe = this.currentRenderMode === 'wireframe';
    const showBonds = this.currentRenderMode === 'ball-stick';

    this.atomMeshes.forEach(mesh => {
      mesh.visible = !isWireframe;
    });
    this.atomWireframes.forEach(wireframe => {
      wireframe.visible = isWireframe;
    });
    this.bondMeshes.forEach(mesh => {
      mesh.visible = showBonds;
    });
    this.bondWireframes.forEach(line => {
      line.visible = isWireframe;
    });
  }

  setRenderMode(mode: RenderMode): void {
    if (mode === this.currentRenderMode || !this.currentData) return;

    const oldMode = this.currentRenderMode;
    this.currentRenderMode = mode;

    if (oldMode === 'wireframe' || mode === 'wireframe') {
      this.rebuildForModeChange();
      return;
    }

    this.animateRenderModeTransition(oldMode, mode);
  }

  private rebuildForModeChange(): void {
    if (!this.currentData) return;

    const data = { ...this.currentData };
    this.clearMolecule(false);
    this.currentData = data;

    const center = this.calculateCenter(data.atoms);
    const centeredAtoms = data.atoms.map(atom => ({
      ...atom,
      x: atom.x - center.x,
      y: atom.y - center.y,
      z: atom.z - center.z
    }));

    centeredAtoms.forEach(atom => {
      const radius = this.getAtomRadius(atom.element);
      const geometry = this.getAtomGeometry(radius);
      const material = this.createAtomMaterial(atom.element);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(atom.x, atom.y, atom.z);
      mesh.userData = { type: 'atom', id: atom.id, element: atom.element };
      this.atomMeshes.set(atom.id, mesh);

      if (this.currentRenderMode === 'wireframe') {
        const wireframe = this.createWireframeGeometry(mesh);
        wireframe.position.copy(mesh.position);
        wireframe.userData = { type: 'atom', id: atom.id, element: atom.element };
        this.atomWireframes.set(atom.id, wireframe);
      }
    });

    data.bonds.forEach(bond => {
      const atom1 = centeredAtoms.find(a => a.id === bond.atom1)!;
      const atom2 = centeredAtoms.find(a => a.id === bond.atom2)!;

      if (this.currentRenderMode === 'wireframe') {
        const line = this.createBondLine(atom1, atom2);
        line.userData = { type: 'bond', id: bond.id, bondType: bond.type };
        this.bondWireframes.set(bond.id, line);
      } else {
        const mesh = this.createBondMesh(atom1, atom2);
        mesh.userData = { type: 'bond', id: bond.id, bondType: bond.type };
        this.bondMeshes.set(bond.id, mesh);
      }
    });

    this.updateSceneVisibility();
    this.addToScene();
  }

  private animateRenderModeTransition(oldMode: RenderMode, newMode: RenderMode): void {
    const startScale = oldMode === 'space-filling' ? 2 : 1;
    const endScale = newMode === 'space-filling' ? 2 : 1;
    const showBonds = newMode === 'ball-stick';

    const startTime = performance.now();

    this.bondMeshes.forEach(mesh => {
      if (showBonds) {
        mesh.visible = true;
        (mesh.material as THREE.Material).opacity = 0;
        this.addTween(0, 0.7, startTime, TRANSITION_DURATION,
          (value) => { (mesh.material as THREE.MeshPhongMaterial).opacity = value; }
        );
      } else {
        this.addTween(0.7, 0, startTime, TRANSITION_DURATION,
          (value) => { (mesh.material as THREE.MeshPhongMaterial).opacity = value; },
          () => { mesh.visible = false; }
        );
      }
    });

    this.atomMeshes.forEach((mesh, id) => {
      const atom = this.currentData?.atoms.find(a => a.id === id);
      if (!atom) return;

      const baseRadius = ATOMIC_RADII[atom.element] || 0.5;
      const startRadius = baseRadius * this.atomRadiusScale * startScale;
      const endRadius = baseRadius * this.atomRadiusScale * endScale;

      this.addTween(0, 1, startTime, TRANSITION_DURATION, (t) => {
        const currentRadius = startRadius + (endRadius - startRadius) * t;
        mesh.scale.setScalar(currentRadius / startRadius);
      });
    });
  }

  setColorTheme(theme: ColorTheme): void {
    if (theme === this.currentColorTheme) return;
    this.currentColorTheme = theme;

    const colorMap = this.getColorMap();
    this.atomMeshes.forEach((mesh, id) => {
      const atom = this.currentData?.atoms.find(a => a.id === id);
      if (atom) {
        const color = colorMap[atom.element] || 0x888888;
        (mesh.material as THREE.MeshPhongMaterial).color.setHex(color);
      }
    });

    this.atomWireframes.forEach((wireframe, id) => {
      const atom = this.currentData?.atoms.find(a => a.id === id);
      if (atom) {
        const color = colorMap[atom.element] || 0x888888;
        (wireframe.material as THREE.LineBasicMaterial).color.setHex(color);
      }
    });
  }

  highlightElement(elementId: number, type: 'atom' | 'bond'): void {
    this.clearHighlight();

    let targetMesh: THREE.Object3D | undefined;
    let radius: number = 0.1;

    if (type === 'atom') {
      if (this.currentRenderMode === 'wireframe') {
        targetMesh = this.atomWireframes.get(elementId);
      } else {
        targetMesh = this.atomMeshes.get(elementId);
      }
      const atom = this.currentData?.atoms.find(a => a.id === elementId);
      if (atom) {
        radius = this.getAtomRadius(atom.element) + 0.1;
      }
    } else {
      if (this.currentRenderMode === 'wireframe') {
        targetMesh = this.bondWireframes.get(elementId);
      } else {
        targetMesh = this.bondMeshes.get(elementId);
      }
      radius = BOND_RADIUS + 0.05;
    }

    if (targetMesh) {
      const glowGeometry = new THREE.RingGeometry(radius, radius + 0.05, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      this.highlightMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      this.highlightMesh.position.copy(targetMesh.position);
      this.highlightMesh.lookAt(new THREE.Vector3(0, 0, 10));
      this.moleculeGroup.add(this.highlightMesh);
    }
  }

  clearHighlight(): void {
    if (this.highlightMesh) {
      this.moleculeGroup.remove(this.highlightMesh);
      this.highlightMesh.geometry.dispose();
      (this.highlightMesh.material as THREE.Material).dispose();
      this.highlightMesh = null;
    }
  }

  setHoverElement(elementId: number | null, type: 'atom' | 'bond'): void {
    this.clearHover();

    if (elementId === null) return;

    let targetMesh: THREE.Object3D | undefined;
    let radius: number = 0.1;

    if (type === 'atom') {
      if (this.currentRenderMode === 'wireframe') {
        targetMesh = this.atomWireframes.get(elementId);
      } else {
        targetMesh = this.atomMeshes.get(elementId);
      }
      const atom = this.currentData?.atoms.find(a => a.id === elementId);
      if (atom) {
        radius = this.getAtomRadius(atom.element) + 0.08;
      }
    } else {
      if (this.currentRenderMode === 'wireframe') {
        targetMesh = this.bondWireframes.get(elementId);
      } else {
        targetMesh = this.bondMeshes.get(elementId);
      }
      radius = BOND_RADIUS + 0.03;
    }

    if (targetMesh) {
      const glowGeometry = new THREE.RingGeometry(radius, radius + 0.03, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
      });
      this.hoverMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      this.hoverMesh.position.copy(targetMesh.position);
      this.hoverMesh.lookAt(new THREE.Vector3(0, 0, 10));
      this.moleculeGroup.add(this.hoverMesh);
    }
  }

  clearHover(): void {
    if (this.hoverMesh) {
      this.moleculeGroup.remove(this.hoverMesh);
      this.hoverMesh.geometry.dispose();
      (this.hoverMesh.material as THREE.Material).dispose();
      this.hoverMesh = null;
    }
  }

  private addTween(
    start: number,
    end: number,
    startTime: number,
    duration: number,
    onUpdate: (value: number) => void,
    onComplete?: () => void
  ): void {
    this.tweens.push({
      start, end, startTime, duration, onUpdate, onComplete
    });
  }

  update(time: number): void {
    const activeTweens: TweenState[] = [];

    for (const tween of this.tweens) {
      const elapsed = time - tween.startTime;
      if (elapsed >= tween.duration) {
        tween.onUpdate(tween.end);
        if (tween.onComplete) tween.onComplete();
      } else {
        const t = elapsed / tween.duration;
        const eased = 0.5 - 0.5 * Math.cos(t * Math.PI);
        const value = tween.start + (tween.end - tween.start) * eased;
        tween.onUpdate(value);
        activeTweens.push(tween);
      }
    }

    this.tweens = activeTweens;

    if (this.highlightMesh) {
      const pulse = 1 + Math.sin(time * 0.005) * 0.1;
      this.highlightMesh.scale.setScalar(pulse);
    }
  }

  getPickableObjects(): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [];
    if (this.currentRenderMode === 'wireframe') {
      this.atomWireframes.forEach(w => objects.push(w));
      this.bondWireframes.forEach(w => objects.push(w));
    } else {
      this.atomMeshes.forEach(m => objects.push(m));
      if (this.currentRenderMode === 'ball-stick') {
        this.bondMeshes.forEach(m => objects.push(m));
      }
    }
    return objects;
  }

  getMoleculeGroup(): THREE.Group {
    return this.moleculeGroup;
  }

  getCurrentData(): MoleculeData | null {
    return this.currentData;
  }

  getRenderMode(): RenderMode {
    return this.currentRenderMode;
  }

  private clearMolecule(disposeGroup: boolean = true): void {
    if (disposeGroup) {
      while (this.moleculeGroup.children.length > 0) {
        const child = this.moleculeGroup.children[0];
        this.moleculeGroup.remove(child);
      }
    }

    this.atomMeshes.forEach(mesh => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.atomMeshes.clear();

    this.bondMeshes.forEach(mesh => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.bondMeshes.clear();

    this.atomWireframes.forEach(wireframe => {
      wireframe.geometry.dispose();
      (wireframe.material as THREE.Material).dispose();
    });
    this.atomWireframes.clear();

    this.bondWireframes.forEach(line => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
    this.bondWireframes.clear();

    this.clearHighlight();
    this.clearHover();
    this.tweens = [];
    this.currentData = null;
  }

  dispose(): void {
    this.clearMolecule();
    this.atomGeometryCache.forEach(geo => geo.dispose());
    this.atomGeometryCache.clear();
    this.bondMaterial.dispose();
    this.wireframeMaterial.dispose();
    this.scene.remove(this.moleculeGroup);
  }
}
