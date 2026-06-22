import * as THREE from 'three';
import { MoleculeBuilder } from './MoleculeBuilder';
import { MoleculeData, DisplayMode, MoleculeGroup, AlignmentResult } from '@/types';

export interface HoverInfo {
  atomType: string;
  x: number;
  y: number;
  z: number;
  moleculeName: string;
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private moleculeBuilder: MoleculeBuilder;
  private molecules: Map<string, { current: MoleculeGroup; wireframe?: MoleculeGroup; stick?: MoleculeGroup }>;
  private diffMarkers: THREE.Group | null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredAtom: THREE.Mesh | null;
  private isRotating: boolean;
  private isZooming: boolean;
  private lastMouseX: number;
  private lastMouseY: number;
  private targetCameraDistance: number;
  private targetRotationX: number;
  private targetRotationY: number;
  private currentRotationX: number;
  private currentRotationY: number;
  private readonly ROTATION_SPEED = 0.005;
  private readonly MIN_DISTANCE = 2;
  private readonly MAX_DISTANCE = 30;
  private readonly ZOOM_SPEED = 0.001;
  private readonly SMOOTHING = 0.1;
  private moleculeCounter: number;
  private animationFrameId: number | null;
  private onHoverCallback: ((info: HoverInfo | null) => void) | null;
  private fastBlinkIndices: Set<number>;
  private fastBlinkTimers: Map<number, ReturnType<typeof setTimeout>>;
  private diffHighlightVisible: boolean;

  constructor(container: HTMLElement) {
    this.molecules = new Map();
    this.diffMarkers = null;
    this.hoveredAtom = null;
    this.isRotating = false;
    this.isZooming = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.moleculeCounter = 0;
    this.animationFrameId = null;
    this.onHoverCallback = null;
    this.fastBlinkIndices = new Set();
    this.fastBlinkTimers = new Map();
    this.diffHighlightVisible = true;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0F172A);

    const rect = container.getBoundingClientRect();
    const aspect = rect.width / rect.height;
    
    this.targetCameraDistance = 8;
    this.targetRotationX = 0;
    this.targetRotationY = 0;
    this.currentRotationX = 0;
    this.currentRotationY = 0;

    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(rect.width, rect.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.moleculeBuilder = new MoleculeBuilder();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupLighting();
    this.setupEventListeners(container);
    this.animate();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(5, 5, 5);
    dirLight1.castShadow = true;
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight2.position.set(-5, -5, 5);
    this.scene.add(dirLight2);
  }

  private setupEventListeners(container: HTMLElement): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isRotating = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    document.addEventListener('mouseup', () => {
      this.isRotating = false;
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isRotating) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        this.targetRotationY += deltaX * this.ROTATION_SPEED;
        this.targetRotationX += deltaY * this.ROTATION_SPEED;
        this.targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.targetRotationX));
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }

      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.checkHover();
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetCameraDistance += e.deltaY * this.ZOOM_SPEED;
      this.targetCameraDistance = Math.max(this.MIN_DISTANCE, Math.min(this.MAX_DISTANCE, this.targetCameraDistance));
    }, { passive: false });

    canvas.addEventListener('mouseleave', () => {
      this.isRotating = false;
      if (this.hoveredAtom) {
        MoleculeBuilder.unhighlightAtom(this.hoveredAtom);
        this.hoveredAtom = null;
        if (this.onHoverCallback) {
          this.onHoverCallback(null);
        }
      }
    });
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const atomMeshes: THREE.Mesh[] = [];
    this.molecules.forEach((mol) => {
      if (mol.current.visible) {
        mol.current.userData.atomMeshes.forEach((mesh) => {
          atomMeshes.push(mesh);
        });
      }
    });

    const intersects = this.raycaster.intersectObjects(atomMeshes);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      if (this.hoveredAtom !== mesh) {
        if (this.hoveredAtom) {
          MoleculeBuilder.unhighlightAtom(this.hoveredAtom);
        }
        this.hoveredAtom = mesh;
        MoleculeBuilder.highlightAtom(mesh);
        
        if (this.onHoverCallback) {
          const userData = mesh.userData;
          this.onHoverCallback({
            atomType: userData.atomType,
            x: parseFloat(mesh.position.x.toFixed(3)),
            y: parseFloat(mesh.position.y.toFixed(3)),
            z: parseFloat(mesh.position.z.toFixed(3)),
            moleculeName: userData.moleculeName,
          });
        }
      }
    } else {
      if (this.hoveredAtom) {
        MoleculeBuilder.unhighlightAtom(this.hoveredAtom);
        this.hoveredAtom = null;
        if (this.onHoverCallback) {
          this.onHoverCallback(null);
        }
      }
    }
  }

  setOnHoverCallback(callback: (info: HoverInfo | null) => void): void {
    this.onHoverCallback = callback;
  }

  addMolecule(data: MoleculeData, initialMode: DisplayMode = 'stick'): string {
    const moleculeId = `mol_${++this.moleculeCounter}`;
    
    const wireframe = this.moleculeBuilder.build(
      data.atoms,
      data.bonds,
      'wireframe',
      moleculeId,
      data.name
    );
    wireframe.visible = false;
    this.scene.add(wireframe);

    const stick = this.moleculeBuilder.build(
      data.atoms,
      data.bonds,
      'stick',
      moleculeId,
      data.name
    );
    stick.visible = initialMode === 'stick';
    this.scene.add(stick);

    const current = initialMode === 'stick' ? stick : wireframe;
    wireframe.visible = initialMode === 'wireframe';

    this.molecules.set(moleculeId, { current, wireframe, stick });

    if (this.molecules.size === 2) {
      this.centerMolecules();
    }

    return moleculeId;
  }

  removeMolecule(moleculeId: string): boolean {
    const mol = this.molecules.get(moleculeId);
    if (!mol) return false;

    this.scene.remove(mol.wireframe!);
    this.scene.remove(mol.stick!);
    this.molecules.delete(moleculeId);
    this.clearDiffMarkers();
    return true;
  }

  private centerMolecules(): void {
    const mols = Array.from(this.molecules.values());
    if (mols.length < 2) return;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    mols.forEach((mol) => {
      mol.current.userData.atoms.forEach((atom) => {
        minX = Math.min(minX, atom.x);
        maxX = Math.max(maxX, atom.x);
        minY = Math.min(minY, atom.y);
        maxY = Math.max(maxY, atom.y);
        minZ = Math.min(minZ, atom.z);
        maxZ = Math.max(maxZ, atom.z);
      });
    });

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    mols.forEach((mol) => {
      mol.wireframe?.position.set(-centerX, -centerY, -centerZ);
      mol.stick?.position.set(-centerX, -centerY, -centerZ);
    });
  }

  async switchDisplayMode(moleculeId: string, mode: DisplayMode): Promise<boolean> {
    const mol = this.molecules.get(moleculeId);
    if (!mol) return false;

    const oldGroup = mol.current;
    const newGroup = mode === 'stick' ? mol.stick! : mol.wireframe!;

    if (oldGroup === newGroup) return false;

    newGroup.visible = true;
    newGroup.position.copy(oldGroup.position);
    newGroup.rotation.copy(oldGroup.rotation);

    await MoleculeBuilder.transitionMode(oldGroup, newGroup);
    
    mol.current = newGroup;
    mol.current.userData.mode = mode;

    return true;
  }

  updateDiffMarkers(alignment: AlignmentResult, moleculeId: string): void {
    this.clearDiffMarkers();

    if (!this.diffHighlightVisible || alignment.diffIndices.length === 0) return;

    const mol = this.molecules.get(moleculeId);
    if (!mol) return;

    this.diffMarkers = new THREE.Group();
    this.diffMarkers.userData.isDiffGroup = true;

    const positionOffset = mol.current.position;
    
    alignment.diffIndices.forEach((atomIndex) => {
      const atom = mol.current.userData.atoms[atomIndex];
      if (atom) {
        const position = new THREE.Vector3(
          atom.x + positionOffset.x,
          atom.y + positionOffset.y,
          atom.z + positionOffset.z
        );
        const marker = this.moleculeBuilder.buildDiffMarker(position);
        marker.userData.atomIndex = atomIndex;
        this.diffMarkers!.add(marker);
      }
    });

    this.scene.add(this.diffMarkers);
  }

  clearDiffMarkers(): void {
    if (this.diffMarkers) {
      this.scene.remove(this.diffMarkers);
      this.diffMarkers = null;
    }
  }

  setDiffHighlightVisible(visible: boolean): void {
    this.diffHighlightVisible = visible;
    if (this.diffMarkers) {
      this.diffMarkers.visible = visible;
    }
  }

  triggerFastBlink(atomIndex: number, duration: number = 2000): void {
    if (this.fastBlinkTimers.has(atomIndex)) {
      clearTimeout(this.fastBlinkTimers.get(atomIndex)!);
    }

    this.fastBlinkIndices.add(atomIndex);

    const timer = setTimeout(() => {
      this.fastBlinkIndices.delete(atomIndex);
      this.fastBlinkTimers.delete(atomIndex);
    }, duration);

    this.fastBlinkTimers.set(atomIndex, timer);
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * this.SMOOTHING;
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * this.SMOOTHING;
    const currentDistance = this.camera.position.length();
    const newDistance = currentDistance + (this.targetCameraDistance - currentDistance) * this.SMOOTHING;

    this.camera.position.x = newDistance * Math.sin(this.currentRotationY) * Math.cos(this.currentRotationX);
    this.camera.position.y = newDistance * Math.sin(this.currentRotationX);
    this.camera.position.z = newDistance * Math.cos(this.currentRotationY) * Math.cos(this.currentRotationX);
    this.camera.lookAt(0, 0, 0);

    const time = performance.now() / 1000;
    if (this.diffMarkers) {
      this.diffMarkers.children.forEach((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.userData.isDiffMarker) {
          const atomIndex = mesh.userData.atomIndex;
          const isFast = this.fastBlinkIndices.has(atomIndex);
          const speedMultiplier = isFast ? 0.15 / 0.5 : 1;
          
          const blinkSpeed = isFast ? 0.15 : 0.5;
          const phase = time * (2 * Math.PI / blinkSpeed) + (mesh.userData.blinkPhase || 0);
          const opacity = isFast 
            ? 0.2 + 0.6 * Math.abs(Math.sin(phase * speedMultiplier * 3))
            : 0.3 + 0.3 * (1 + Math.sin(phase * speedMultiplier)) / 2;
          
          const material = mesh.material as THREE.MeshPhongMaterial;
          material.opacity = opacity;
        }
      });
    }

    this.renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number): void {
    const aspect = width / height;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  getMoleculeIds(): string[] {
    return Array.from(this.molecules.keys());
  }

  getMoleculeData(moleculeId: string): MoleculeData | null {
    const mol = this.molecules.get(moleculeId);
    if (!mol) return null;
    return {
      name: mol.current.userData.moleculeName,
      atoms: mol.current.userData.atoms,
      bonds: mol.current.userData.bonds,
    };
  }

  dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    this.fastBlinkTimers.forEach((timer) => clearTimeout(timer));
    this.fastBlinkTimers.clear();
    
    this.molecules.forEach((mol) => {
      mol.wireframe?.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      mol.stick?.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    });

    this.clearDiffMarkers();
    this.renderer.dispose();
  }
}
