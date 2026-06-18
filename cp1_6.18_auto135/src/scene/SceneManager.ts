import * as THREE from 'three';
import {
  Molecule,
  RenderMode,
  Atom,
  Bond,
  Residue,
  ELEMENT_COLORS,
  SIDE_CHAIN_COLORS,
  ViewPreset,
  MutationResult,
  ResidueType,
} from '@/types';
import { applyMutationToResidue, revertMutation } from '@/data/moleculeData';

const ELEMENT_RADII: Record<string, number> = {
  C: 0.4,
  N: 0.35,
  O: 0.32,
  S: 0.5,
  H: 0.25,
  P: 0.5,
  F: 0.3,
  Cl: 0.4,
  Br: 0.45,
  I: 0.5,
};

interface RenderGroup {
  atomMeshes: Map<string, THREE.Mesh>;
  bondMeshes: Map<string, THREE.Mesh>;
  cartoonMeshes: Map<string, THREE.Mesh>;
  surfaceMesh?: THREE.Mesh;
  residueGroups: Map<string, THREE.Group>;
}

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  container: HTMLElement;

  molecule: Molecule | null = null;
  renderMode: RenderMode = 'cartoon';
  selectedResidueId: string | null = null;
  highlightedMutated: Map<string, number> = new Map();

  private renderGroup: RenderGroup;
  private moleculeRoot: THREE.Group;
  private atomMeshCache: Map<RenderMode, Map<string, THREE.Mesh>> = new Map();
  private bondMeshCache: Map<RenderMode, Map<string, THREE.Mesh>> = new Map();
  private animationFrameId: number | null = null;
  private clock: THREE.Clock;
  private cameraTarget: THREE.Vector3;
  private cameraFrom: THREE.Vector3;
  private cameraAnimStart: number = 0;
  private cameraAnimDuration: number = 0;
  private isCameraAnimating: boolean = false;

  onResidueClick?: (residueId: string) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.renderGroup = {
      atomMeshes: new Map(),
      bondMeshes: new Map(),
      cartoonMeshes: new Map(),
      residueGroups: new Map(),
    };
    this.moleculeRoot = new THREE.Group();
    this.cameraTarget = new THREE.Vector3();
    this.cameraFrom = new THREE.Vector3();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1d23);

    const { clientWidth: w, clientHeight: h } = container;
    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    this.camera.position.set(0, 20, 40);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.scene.add(this.moleculeRoot);
    this.setupEventListeners();
    this.animate();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(10, 20, 15);
    dir.castShadow = true;
    this.scene.add(dir);

    const rim = new THREE.DirectionalLight(0x88ccff, 0.2);
    rim.position.set(-10, 5, -10);
    this.scene.add(rim);

    const fill = new THREE.PointLight(0x00d4aa, 0.3, 100);
    fill.position.set(-15, 10, 10);
    this.scene.add(fill);
  }

  private setupEventListeners(): void {
    const dom = this.renderer.domElement;
    let isDragging = false;
    let isRightDragging = false;
    let lastX = 0;
    let lastY = 0;

    dom.addEventListener('mousedown', (e) => {
      if (e.button === 0) isDragging = true;
      if (e.button === 2) isRightDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    });

    dom.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        const dx = Math.abs(e.clientX - lastX);
        const dy = Math.abs(e.clientY - lastY);
        if (dx < 3 && dy < 3) {
          this.handleClick(e);
        }
        isDragging = false;
      }
      if (e.button === 2) isRightDragging = false;
    });

    dom.addEventListener('mousemove', (e) => {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      if (isDragging) {
        const rotSpeed = 0.005;
        const axisX = new THREE.Vector3(1, 0, 0);
        const axisY = new THREE.Vector3(0, 1, 0);
        this.moleculeRoot.rotateOnWorldAxis(axisX, -dy * rotSpeed);
        this.moleculeRoot.rotateOnWorldAxis(axisY, -dx * rotSpeed);
      }
      if (isRightDragging) {
        const panSpeed = 0.05;
        this.camera.position.x -= dx * panSpeed;
        this.camera.position.y += dy * panSpeed;
      }
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoom = e.deltaY > 0 ? 1.1 : 0.9;
      const dir = this.camera.position.clone().normalize();
      let newPos = this.camera.position.clone().addScaledVector(dir, this.camera.position.length() * (zoom - 1));
      const dist = newPos.length();
      if (dist >= this.molecule.radius * 0.5 && dist <= this.molecule.radius * 5) {
        this.camera.position.copy(newPos);
      }
    });

    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    const { clientWidth: w, clientHeight: h } = this.container;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleClick(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const candidates: THREE.Object3D[] = [];
    this.renderGroup.residueGroups.forEach((g) => candidates.push(g));
    this.renderGroup.atomMeshes.forEach((m) => candidates.push(m));
    this.renderGroup.bondMeshes.forEach((m) => candidates.push(m));
    this.renderGroup.cartoonMeshes.forEach((m) => candidates.push(m));

    const hits = raycaster.intersectObjects(candidates, true);
    if (hits.length > 0) {
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj) {
        if (obj.userData && obj.userData.residueId) {
          this.onResidueClick?.(obj.userData.residueId);
          return;
        }
        obj = obj.parent;
      }
    }
  }

  setMolecule(molecule: Molecule): void {
    this.molecule = molecule;
    this.clearMolecule();
    this.buildMolecule(molecule);
    this.centerCamera(molecule);
  }

  private clearMolecule(): void {
    while (this.moleculeRoot.children.length > 0) {
      const child = this.moleculeRoot.children[0];
      this.moleculeRoot.remove(child);
    }
    this.renderGroup.atomMeshes.clear();
    this.renderGroup.bondMeshes.clear();
    this.renderGroup.cartoonMeshes.clear();
    this.renderGroup.residueGroups.clear();
    this.atomMeshCache.clear();
    this.bondMeshCache.clear();
  }

  private buildMolecule(molecule: Molecule): void {
    for (const chain of molecule.chains) {
      for (const residue of chain.residues) {
        const residueGroup = new THREE.Group();
        residueGroup.userData.residueId = residue.id;
        residueGroup.name = residue.id;
        this.renderGroup.residueGroups.set(residue.id, residueGroup);
        this.moleculeRoot.add(residueGroup);
      }
    }
    this.rebuildForMode(this.renderMode);
  }

  setRenderMode(mode: RenderMode): void {
    if (this.renderMode === mode) return;
    const oldMode = this.renderMode;
    this.renderMode = mode;
    this.rebuildForMode(mode, oldMode);
  }

  private rebuildForMode(newMode: RenderMode, oldMode?: RenderMode): void {
    if (!this.molecule) return;

    this.renderGroup.atomMeshes.forEach((m) => {
      m.visible = newMode === 'ballstick' || newMode === 'backbone';
    });
    this.renderGroup.bondMeshes.forEach((m) => {
      m.visible = newMode === 'ballstick' || newMode === 'backbone';
    });
    this.renderGroup.cartoonMeshes.forEach((m) => {
      m.visible = newMode === 'cartoon';
    });
    if (this.renderGroup.surfaceMesh) {
      this.renderGroup.surfaceMesh.visible = newMode === 'surface';
    }

    if (newMode === 'ballstick' || newMode === 'backbone') {
      if (this.renderGroup.atomMeshes.size === 0) {
        this.buildAtomsAndBonds(newMode);
      } else {
        this.updateAtomBondAppearance(newMode);
      }
    }

    if (newMode === 'cartoon' && this.renderGroup.cartoonMeshes.size === 0) {
      this.buildCartoon();
    }

    if (newMode === 'surface' && !this.renderGroup.surfaceMesh) {
      this.buildSurface();
    }

    if (oldMode) {
      this.animateTransition(oldMode, newMode);
    }
  }

  private buildAtomsAndBonds(mode: RenderMode): void {
    if (!this.molecule) return;
    const useElementColors = mode === 'ballstick' || mode === 'backbone';
    const isBackbone = mode === 'backbone';

    const sphereGeo = new THREE.SphereGeometry(1, 16, 16);
    const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 8);

    for (const atom of this.molecule.allAtoms) {
      if (isBackbone && !atom.isBackbone) continue;

      const color = useElementColors
        ? new THREE.Color(ELEMENT_COLORS[atom.element] || '#ffffff')
        : this.getResidueColor(atom.residueId);

      const radius = mode === 'ballstick' ? ELEMENT_RADII[atom.element] || 0.4 : 0.15;
      const mat = new THREE.MeshStandardMaterial({
        color,
        metalness: mode === 'ballstick' ? 0.3 : 0,
        roughness: mode === 'ballstick' ? 0.4 : 0.8,
        transparent: true,
        opacity: 1,
      });

      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.scale.setScalar(radius);
      mesh.position.set(atom.x, atom.y, atom.z);
      mesh.userData.atomId = atom.id;
      mesh.userData.residueId = atom.residueId;

      const group = this.renderGroup.residueGroups.get(atom.residueId);
      if (group) group.add(mesh);
      this.renderGroup.atomMeshes.set(atom.id, mesh);
    }

    for (const bond of this.molecule.allBonds) {
      const a1 = this.molecule.allAtoms.find((a) => a.id === bond.atom1);
      const a2 = this.molecule.allAtoms.find((a) => a.id === bond.atom2);
      if (!a1 || !a2) continue;
      if (isBackbone && (!a1.isBackbone || !a2.isBackbone)) continue;

      const dir = new THREE.Vector3(a2.x - a1.x, a2.y - a1.y, a2.z - a1.z);
      const len = dir.length();
      const mid = new THREE.Vector3((a1.x + a2.x) / 2, (a1.y + a2.y) / 2, (a1.z + a2.z) / 2);

      const color = useElementColors
        ? new THREE.Color(ELEMENT_COLORS[a1.element])
        : this.getResidueColor(a1.residueId);

      const mat = new THREE.MeshStandardMaterial({
        color,
        metalness: mode === 'ballstick' ? 0.3 : 0,
        roughness: mode === 'ballstick' ? 0.4 : 0.8,
        transparent: true,
        opacity: mode === 'backbone' ? 0.4 : 0.9,
      });

      const mesh = new THREE.Mesh(cylinderGeo, mat);
      mesh.scale.set(0.08, len, 0.08);
      mesh.position.copy(mid);
      mesh.lookAt(new THREE.Vector3(a2.x, a2.y, a2.z));
      mesh.rotateX(Math.PI / 2);
      mesh.userData.bondId = bond.id;
      mesh.userData.residueId = a1.residueId;

      const group = this.renderGroup.residueGroups.get(a1.residueId);
      if (group) group.add(mesh);
      this.renderGroup.bondMeshes.set(bond.id, mesh);
    }

    sphereGeo.dispose();
    cylinderGeo.dispose();
  }

  private updateAtomBondAppearance(mode: RenderMode): void {
    const useElementColors = mode === 'ballstick' || mode === 'backbone';
    const isBackbone = mode === 'backbone';

    this.renderGroup.atomMeshes.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.metalness = mode === 'ballstick' ? 0.3 : 0;
      mat.roughness = mode === 'ballstick' ? 0.4 : 0.8;
      if (useElementColors && mesh.userData.atomId) {
        const atom = this.molecule?.allAtoms.find((a) => a.id === mesh.userData.atomId);
        if (atom) mat.color.set(ELEMENT_COLORS[atom.element]);
      }
    });
  }

  private buildCartoon(): void {
    if (!this.molecule) return;

    const tubeGeo = new THREE.CylinderGeometry(0.15, 0.15, 1, 12);
    const sphereGeo = new THREE.SphereGeometry(0.3, 16, 16);

    for (const chain of this.molecule.chains) {
      for (let i = 0; i < chain.residues.length; i++) {
        const residue = chain.residues[i];
        const color = this.getResidueColor(residue.id);

        if (i < chain.residues.length - 1) {
          const next = chain.residues[i + 1];
          const p1 = new THREE.Vector3(residue.position.x, residue.position.y, residue.position.z);
          const p2 = new THREE.Vector3(next.position.x, next.position.y, next.position.z);
          const dir = p2.clone().sub(p1);
          const len = dir.length();
          const mid = p1.clone().add(p2).multiplyScalar(0.5);

          const mat = new THREE.MeshStandardMaterial({
            color,
            metalness: 0.1,
            roughness: 0.7,
            transparent: true,
            opacity: 1,
          });
          const tube = new THREE.Mesh(tubeGeo, mat);
          tube.scale.set(1, len, 1);
          tube.position.copy(mid);
          tube.lookAt(p2);
          tube.rotateX(Math.PI / 2);
          tube.userData.residueId = residue.id;

          const group = this.renderGroup.residueGroups.get(residue.id);
          if (group) group.add(tube);
          this.renderGroup.cartoonMeshes.set(`tube_${residue.id}`, tube);
        }

        const mat = new THREE.MeshStandardMaterial({
          color,
          metalness: 0.2,
          roughness: 0.6,
          transparent: true,
          opacity: 1,
        });
        const ball = new THREE.Mesh(sphereGeo, mat);
        ball.position.set(residue.position.x, residue.position.y, residue.position.z);
        ball.userData.residueId = residue.id;

        const group = this.renderGroup.residueGroups.get(residue.id);
        if (group) group.add(ball);
        this.renderGroup.cartoonMeshes.set(`ball_${residue.id}`, ball);
      }
    }
    tubeGeo.dispose();
    sphereGeo.dispose();
  }

  private buildSurface(): void {
    if (!this.molecule) return;
    const geo = new THREE.SphereGeometry(this.molecule.radius, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.4,
      metalness: 0.1,
      roughness: 0.9,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(this.molecule.center.x, this.molecule.center.y, this.molecule.center.z);
    this.renderGroup.surfaceMesh = mesh;
    this.moleculeRoot.add(mesh);
  }

  private animateTransition(_oldMode: RenderMode, _newMode: RenderMode): void {
    const startTime = performance.now();
    const duration = 300;

    const tick = () => {
      const t = Math.min((performance.now() - startTime) / duration, 1);
      if (t < 1) requestAnimationFrame(tick);
    };
    tick();
  }

  private getResidueColor(residueId: string): THREE.Color {
    if (!this.molecule) return new THREE.Color(0x888888);
    for (const chain of this.molecule.chains) {
      for (const r of chain.residues) {
        if (r.id === residueId) {
          return new THREE.Color(SIDE_CHAIN_COLORS[r.sideChainType]);
        }
      }
    }
    return new THREE.Color(0x888888);
  }

  highlightResidue(residueId: string | null): void {
    const prev = this.selectedResidueId;
    this.selectedResidueId = residueId;

    if (prev) {
      this.restoreResidueColor(prev);
    }
    if (residueId) {
      this.applyGoldHighlight(residueId);
    }
  }

  private applyGoldHighlight(residueId: string): void {
    const group = this.renderGroup.residueGroups.get(residueId);
    if (!group) return;
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        (mesh.userData as any).originalColor = mat.color.getHex();
        (mesh.userData as any).originalEmissive = mat.emissive?.getHex() ?? 0;
        mat.color.set(0xffd700);
        mat.emissive = new THREE.Color(0x443300);
      }
    });
  }

  private restoreResidueColor(residueId: string): void {
    const group = this.renderGroup.residueGroups.get(residueId);
    if (!group) return;
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const orig = (mesh.userData as any).originalColor;
        if (orig !== undefined) mat.color.setHex(orig);
        const origEm = (mesh.userData as any).originalEmissive;
        if (origEm !== undefined && mat.emissive) mat.emissive.setHex(origEm);
      }
    });
  }

  markMutated(residueId: string): void {
    this.highlightedMutated.set(residueId, Date.now() + 5000);
    const group = this.renderGroup.residueGroups.get(residueId);
    if (!group) return;
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        (mesh.userData as any).preMutateColor = mat.color.getHex();
        mat.color.set(0xaa44ff);
      }
    });
  }

  clearMutatedHighlight(residueId: string): void {
    this.highlightedMutated.delete(residueId);
    const group = this.renderGroup.residueGroups.get(residueId);
    if (!group) return;
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const orig = (mesh.userData as any).preMutateColor;
        if (orig !== undefined) {
          mat.color.setHex(orig);
        } else {
          const color = this.getResidueColor(residueId);
          mat.color.copy(color);
        }
      }
    });
  }

  applyMutation(chainId: string, residueId: string, newResidueType: ResidueType): MutationResult {
    if (!this.molecule) return { success: false, message: '未加载分子' };

    const result = applyMutationToResidue(this.molecule, chainId, residueId, newResidueType);
    if (!result.success || !result.affectedResidueIds) return result;

    for (const rid of result.affectedResidueIds) {
      const group = this.renderGroup.residueGroups.get(rid);
      if (group) {
        while (group.children.length > 0) group.remove(group.children[0]);
      }
    }

    this.renderGroup.atomMeshes.forEach((m, id) => {
      const atom = this.molecule?.allAtoms.find((a) => a.id === id);
      if (atom && result.affectedResidueIds?.includes(atom.residueId)) {
        this.renderGroup.atomMeshes.delete(id);
      }
    });
    this.renderGroup.bondMeshes.forEach((m, id) => {
      const bond = this.molecule?.allBonds.find((b) => b.id === id);
      if (bond) {
        const a1 = this.molecule?.allAtoms.find((a) => a.id === bond.atom1);
        if (a1 && result.affectedResidueIds?.includes(a1.residueId)) {
          this.renderGroup.bondMeshes.delete(id);
        }
      }
    });
    this.renderGroup.cartoonMeshes.forEach((m, id) => {
      if (id.includes(residueId)) {
        this.renderGroup.cartoonMeshes.delete(id);
      }
    });

    this.rebuildForMode(this.renderMode);
    this.markMutated(residueId);

    return result;
  }

  undoMutation(chainId: string, snapshotResidue: Residue): MutationResult {
    if (!this.molecule) return { success: false, message: '未加载分子' };

    const result = revertMutation(this.molecule, chainId, snapshotResidue);
    if (!result.success || !result.affectedResidueIds) return result;

    for (const rid of result.affectedResidueIds) {
      const group = this.renderGroup.residueGroups.get(rid);
      if (group) {
        while (group.children.length > 0) group.remove(group.children[0]);
      }
    }

    this.renderGroup.atomMeshes.forEach((_m, id) => {
      const atom = this.molecule?.allAtoms.find((a) => a.id === id);
      if (atom && result.affectedResidueIds?.includes(atom.residueId)) {
        this.renderGroup.atomMeshes.delete(id);
      }
    });
    this.renderGroup.bondMeshes.forEach((_m, id) => {
      const bond = this.molecule?.allBonds.find((b) => b.id === id);
      if (bond) {
        const a1 = this.molecule?.allAtoms.find((a) => a.id === bond.atom1);
        if (a1 && result.affectedResidueIds?.includes(a1.residueId)) {
          this.renderGroup.bondMeshes.delete(id);
        }
      }
    });
    this.renderGroup.cartoonMeshes.forEach((_m, id) => {
      if (id.includes(snapshotResidue.id)) {
        this.renderGroup.cartoonMeshes.delete(id);
      }
    });

    this.rebuildForMode(this.renderMode);
    this.clearMutatedHighlight(snapshotResidue.id);

    return result;
  }

  setViewPreset(preset: ViewPreset): void {
    if (!this.molecule) return;

    const c = this.molecule.center;
    const r = this.molecule.radius;
    let target = new THREE.Vector3();

    switch (preset) {
      case 'front':
        target = new THREE.Vector3(c.x, c.y, c.z + r * 2.5);
        break;
      case 'side':
        target = new THREE.Vector3(c.x + r * 2.5, c.y, c.z);
        break;
      case 'top':
        target = new THREE.Vector3(c.x, c.y + r * 2.5, c.z);
        break;
      case 'inside':
        target = new THREE.Vector3(c.x, c.y, c.z + r * 0.6);
        this.camera.near = 0.01;
        this.camera.updateProjectionMatrix();
        break;
    }

    if (preset !== 'inside') {
      this.camera.near = 0.1;
      this.camera.updateProjectionMatrix();
    }

    this.startCameraAnimation(target, new THREE.Vector3(c.x, c.y, c.z), 800);
  }

  private startCameraAnimation(to: THREE.Vector3, lookAt: THREE.Vector3, duration: number): void {
    this.cameraFrom.copy(this.camera.position);
    this.cameraTarget.copy(to);
    this.cameraAnimStart = performance.now();
    this.cameraAnimDuration = duration;
    this.isCameraAnimating = true;
    this.camera.lookAt(lookAt);
  }

  private bezier3(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const mt = 1 - t;
    return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
  }

  private centerCamera(molecule: Molecule): void {
    const c = molecule.center;
    const r = molecule.radius;
    this.camera.position.set(c.x, c.y + r * 0.8, c.z + r * 2.5);
    this.camera.lookAt(c.x, c.y, c.z);
    this.moleculeRoot.position.set(-c.x, -c.y, -c.z);
  }

  exportSnapshot(width = 1920, height = 1080): string {
    const prevSize = this.renderer.getSize(new THREE.Vector2());
    const prevPixelRatio = this.renderer.getPixelRatio();

    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');

    this.renderer.setPixelRatio(prevPixelRatio);
    this.renderer.setSize(prevSize.x, prevSize.y, false);

    return dataUrl;
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const t = this.clock.getElapsedTime();

    if (this.isCameraAnimating) {
      const elapsed = performance.now() - this.cameraAnimStart;
      const prog = Math.min(elapsed / this.cameraAnimDuration, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      const midX = (this.cameraFrom.x + this.cameraTarget.x) / 2;
      const midY = (this.cameraFrom.y + this.cameraTarget.y) / 2 + 5;
      const midZ = (this.cameraFrom.z + this.cameraTarget.z) / 2;

      this.camera.position.x = this.bezier3(ease, this.cameraFrom.x, midX, midX, this.cameraTarget.x);
      this.camera.position.y = this.bezier3(ease, this.cameraFrom.y, midY, midY, this.cameraTarget.y);
      this.camera.position.z = this.bezier3(ease, this.cameraFrom.z, midZ, midZ, this.cameraTarget.z);

      if (this.molecule) {
        this.camera.lookAt(this.molecule.center.x, this.molecule.center.y, this.molecule.center.z);
      }
      if (prog >= 1) this.isCameraAnimating = false;
    }

    if (this.selectedResidueId) {
      const pulse = 0.3 + Math.sin(t * 4) * 0.2;
      const group = this.renderGroup.residueGroups.get(this.selectedResidueId);
      if (group) {
        group.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (mat.emissive) mat.emissive.setRGB(pulse, pulse * 0.8, 0);
          }
        });
      }
    }

    const now = Date.now();
    this.highlightedMutated.forEach((endTime, rid) => {
      if (now > endTime) {
        this.clearMutatedHighlight(rid);
      }
    });

    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onResize);
    this.clearMolecule();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
