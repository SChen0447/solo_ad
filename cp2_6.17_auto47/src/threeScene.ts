import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Atom, Bond, Molecule, ELEMENT_INFO, BondType, ElementSymbol } from './types';

interface AtomMesh {
  mesh: THREE.Mesh;
  atomId: number;
  highlightMesh?: THREE.Mesh;
}

interface BondMesh {
  mesh: THREE.Mesh;
  bondId: number;
  atom1: number;
  atom2: number;
}

type OnAtomClick = (atomId: number, event: MouseEvent) => void;
type OnAtomContextMenu = (atomId: number, event: MouseEvent) => void;

export class MoleculeScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private atomMeshes: Map<number, AtomMesh> = new Map();
  private bondMeshes: Map<number, BondMesh> = new Map();
  private moleculeGroup: THREE.Group;
  private animationId: number = 0;
  private autoRotate: boolean = true;
  private autoRotateSpeed: number = (2 * Math.PI) / 5;
  private selectedAtomId: number | null = null;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private onAtomClick: OnAtomClick;
  private onAtomContextMenu: OnAtomContextMenu;
  private highlightTime: number = 0;
  private highlightDuration: number = 0.2;
  private newAtoms: Set<number> = new Set();
  private newAtomTime: Map<number, number> = new Map();
  private deletingAtoms: Set<number> = new Set();
  private deleteAtomTime: Map<number, number> = new Map();
  private clock: THREE.Clock;
  private isRunning: boolean = false;

  static getElementColor(element: ElementSymbol): string {
    return ELEMENT_INFO[element]?.color || '#888888';
  }

  static getElementRadius(element: ElementSymbol): number {
    return ELEMENT_INFO[element]?.radius || 0.6;
  }

  constructor(
    container: HTMLElement,
    onAtomClick: OnAtomClick,
    onAtomContextMenu: OnAtomContextMenu
  ) {
    this.container = container;
    this.onAtomClick = onAtomClick;
    this.onAtomContextMenu = onAtomContextMenu;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.setupBackground();

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, 10);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 50;

    this.moleculeGroup = new THREE.Group();
    this.scene.add(this.moleculeGroup);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.setupLights();
    this.addEventListeners();
  }

  private setupBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    this.scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x4a90d9, 0.5, 50);
    pointLight.position.set(-5, 3, 5);
    this.scene.add(pointLight);
  }

  private addEventListeners() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('click', this.handleClick);
    canvas.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('resize', this.handleResize);
    this.controls.addEventListener('start', () => {
      this.autoRotate = false;
    });
  }

  private handleClick = (event: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = Array.from(this.atomMeshes.values()).map(am => am.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const atomMesh = this.findAtomMeshByMesh(mesh);
      if (atomMesh) {
        this.autoRotate = false;
        this.highlightAtom(atomMesh.atomId);
        this.onAtomClick(atomMesh.atomId, event);
      }
    }
  };

  private handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = Array.from(this.atomMeshes.values()).map(am => am.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const atomMesh = this.findAtomMeshByMesh(mesh);
      if (atomMesh) {
        this.autoRotate = false;
        this.highlightAtom(atomMesh.atomId);
        this.onAtomContextMenu(atomMesh.atomId, event);
      }
    }
  };

  private findAtomMeshByMesh(mesh: THREE.Mesh): AtomMesh | undefined {
    for (const [, atomMesh] of this.atomMeshes) {
      if (atomMesh.mesh === mesh || atomMesh.highlightMesh === mesh) {
        return atomMesh;
      }
    }
    return undefined;
  }

  private handleResize = () => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public highlightAtom(atomId: number) {
    this.selectedAtomId = atomId;
    this.highlightTime = this.highlightDuration;

    const atomMesh = this.atomMeshes.get(atomId);
    if (atomMesh && !atomMesh.highlightMesh) {
      const radius = MoleculeScene.getElementRadius(this.getElementSymbolById(atomId));
      const highlightGeo = new THREE.SphereGeometry(radius * 1.25, 32, 32);
      const highlightMat = new THREE.MeshBasicMaterial({
        color: 0x4a90d9,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide,
      });
      const highlightMesh = new THREE.Mesh(highlightGeo, highlightMat);
      highlightMesh.position.copy(atomMesh.mesh.position);
      this.moleculeGroup.add(highlightMesh);
      atomMesh.highlightMesh = highlightMesh;
    }
  }

  private getElementSymbolById(atomId: number): ElementSymbol {
    for (const [id, atomMesh] of this.atomMeshes) {
      if (id === atomId) {
        const mat = atomMesh.mesh.material as THREE.MeshStandardMaterial;
        const colorHex = '#' + mat.color.getHexString().toUpperCase();
        for (const [sym, info] of Object.entries(ELEMENT_INFO)) {
          if (info.color.toUpperCase() === colorHex) {
            return sym as ElementSymbol;
          }
        }
      }
    }
    return 'C';
  }

  public clearMolecule() {
    this.atomMeshes.forEach((am) => {
      this.moleculeGroup.remove(am.mesh);
      am.mesh.geometry.dispose();
      (am.mesh.material as THREE.Material).dispose();
      if (am.highlightMesh) {
        this.moleculeGroup.remove(am.highlightMesh);
        am.highlightMesh.geometry.dispose();
        (am.highlightMesh.material as THREE.Material).dispose();
      }
    });

    this.bondMeshes.forEach((bm) => {
      this.moleculeGroup.remove(bm.mesh);
      bm.mesh.geometry.dispose();
      (bm.mesh.material as THREE.Material).dispose();
    });

    this.atomMeshes.clear();
    this.bondMeshes.clear();
    this.selectedAtomId = null;
    this.newAtoms.clear();
    this.newAtomTime.clear();
    this.deletingAtoms.clear();
    this.deleteAtomTime.clear();
  }

  public loadMolecule(molecule: Molecule, animate: boolean = true) {
    this.clearMolecule();

    molecule.atoms.forEach((atom) => {
      this.createAtomMesh(atom, animate);
    });

    molecule.bonds.forEach((bond) => {
      this.createBondMesh(bond, molecule.atoms);
    });

    this.fitCamera();

    if (animate) {
      this.autoRotate = true;
    }
  }

  private createAtomMesh(atom: Atom, animate: boolean = true) {
    const color = MoleculeScene.getElementColor(atom.element);
    const radius = MoleculeScene.getElementRadius(atom.element);

    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness: 0.35,
      roughness: 0.45,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(atom.x, atom.y, atom.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (animate) {
      mesh.scale.setScalar(0);
      this.newAtoms.add(atom.id);
      this.newAtomTime.set(atom.id, 0);
    } else {
      mesh.scale.setScalar(1);
    }

    this.moleculeGroup.add(mesh);
    this.atomMeshes.set(atom.id, { mesh, atomId: atom.id });
  }

  private createBondMesh(bond: Bond, atoms: Atom[]) {
    const atom1 = atoms.find(a => a.id === bond.atom1);
    const atom2 = atoms.find(a => a.id === bond.atom2);

    if (!atom1 || !atom2) return;

    const start = new THREE.Vector3(atom1.x, atom1.y, atom1.z);
    const end = new THREE.Vector3(atom2.x, atom2.y, atom2.z);

    this.createBondCylinder(bond.id, bond.type, start, end, bond.atom1, bond.atom2);
  }

  private createBondCylinder(
    bondId: number,
    bondType: BondType,
    start: THREE.Vector3,
    end: THREE.Vector3,
    atom1: number,
    atom2: number
  ) {
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    if (length < 0.001) return;

    const bondRadius = 0.15;
    let color = 0x888888;
    if (bondType === 'double') color = 0xaaaaaa;
    if (bondType === 'aromatic') color = 0x999999;

    const geometry = new THREE.CylinderGeometry(bondRadius, bondRadius, length, 16, 1, false);
    const material = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.25,
      roughness: 0.55,
    });

    const mesh = new THREE.Mesh(geometry, material);

    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mesh.position.copy(mid);

    const up = new THREE.Vector3(0, 1, 0);
    const dirNorm = direction.clone().normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dirNorm);
    mesh.quaternion.copy(quaternion);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.moleculeGroup.add(mesh);
    this.bondMeshes.set(bondId, { mesh, bondId, atom1, atom2 });
  }

  public updateAtomElement(atomId: number, element: ElementSymbol) {
    const atomMesh = this.atomMeshes.get(atomId);
    if (!atomMesh) return;

    const color = MoleculeScene.getElementColor(element);
    const radius = MoleculeScene.getElementRadius(element);

    atomMesh.mesh.geometry.dispose();
    atomMesh.mesh.geometry = new THREE.SphereGeometry(radius, 32, 32);
    (atomMesh.mesh.material as THREE.MeshStandardMaterial).color.set(color);

    if (atomMesh.highlightMesh) {
      atomMesh.highlightMesh.geometry.dispose();
      atomMesh.highlightMesh.geometry = new THREE.SphereGeometry(radius * 1.25, 32, 32);
    }
  }

  public updateAtomPosition(atomId: number, x: number, y: number, z: number) {
    const atomMesh = this.atomMeshes.get(atomId);
    if (!atomMesh) return;

    atomMesh.mesh.position.set(x, y, z);
    if (atomMesh.highlightMesh) {
      atomMesh.highlightMesh.position.set(x, y, z);
    }

    const atomPos = new THREE.Vector3(x, y, z);

    this.bondMeshes.forEach((bm) => {
      if (bm.atom1 === atomId || bm.atom2 === atomId) {
        const otherAtomId = bm.atom1 === atomId ? bm.atom2 : bm.atom1;
        const otherAtomMesh = this.atomMeshes.get(otherAtomId);
        if (otherAtomMesh) {
          const start = bm.atom1 === atomId ? atomPos : otherAtomMesh.mesh.position;
          const end = bm.atom2 === atomId ? atomPos : otherAtomMesh.mesh.position;
          this.recreateBondCylinder(bm, start, end);
        }
      }
    });
  }

  private recreateBondCylinder(
    bondMesh: BondMesh,
    start: THREE.Vector3,
    end: THREE.Vector3
  ) {
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    if (length < 0.001) return;

    const geom = bondMesh.mesh.geometry as THREE.CylinderGeometry;
    const oldRadiusTop = geom.parameters.radiusTop;
    const oldRadiusBottom = geom.parameters.radiusBottom;

    bondMesh.mesh.geometry.dispose();
    bondMesh.mesh.geometry = new THREE.CylinderGeometry(
      oldRadiusTop,
      oldRadiusBottom,
      length,
      16,
      1,
      false
    );

    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    bondMesh.mesh.position.copy(mid);

    const up = new THREE.Vector3(0, 1, 0);
    const dirNorm = direction.clone().normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dirNorm);
    bondMesh.mesh.quaternion.copy(quaternion);
  }

  public addAtom(atom: Atom, bondType: BondType = 'single', connectedToAtomId?: number) {
    this.createAtomMesh(atom, true);

    if (connectedToAtomId !== undefined) {
      const otherAtomMesh = this.atomMeshes.get(connectedToAtomId);
      if (otherAtomMesh) {
        const start = otherAtomMesh.mesh.position.clone();
        const end = new THREE.Vector3(atom.x, atom.y, atom.z);
        const bondId = Date.now() + Math.random();
        this.createBondCylinder(bondId, bondType, start, end, connectedToAtomId, atom.id);
      }
    }
  }

  public removeAtom(atomId: number) {
    const bondsToRemove: number[] = [];
    this.bondMeshes.forEach((bm, bondId) => {
      if (bm.atom1 === atomId || bm.atom2 === atomId) {
        bondsToRemove.push(bondId);
      }
    });

    bondsToRemove.forEach(bondId => {
      const bm = this.bondMeshes.get(bondId);
      if (bm) {
        this.moleculeGroup.remove(bm.mesh);
        bm.mesh.geometry.dispose();
        (bm.mesh.material as THREE.Material).dispose();
        this.bondMeshes.delete(bondId);
      }
    });

    const atomMesh = this.atomMeshes.get(atomId);
    if (atomMesh) {
      this.deletingAtoms.add(atomId);
      this.deleteAtomTime.set(atomId, 0);
    }
  }

  public setAutoRotate(rotate: boolean) {
    this.autoRotate = rotate;
  }

  public fitCamera() {
    if (this.atomMeshes.size === 0) return;

    const box = new THREE.Box3();
    this.atomMeshes.forEach(am => {
      box.expandByObject(am.mesh);
    });

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 3);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 2.0;

    this.camera.position.set(center.x, center.y + 1, center.z + cameraZ);
    this.controls.target.copy(center);
    this.controls.update();
  }

  public resetCamera() {
    this.fitCamera();
    this.autoRotate = true;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.animate();
  }

  public stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  private animate = () => {
    if (!this.isRunning) return;

    this.animationId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (this.autoRotate) {
      this.moleculeGroup.rotation.y += this.autoRotateSpeed * delta;
    }

    this.updateHighlight(delta);
    this.updateNewAtoms(delta);
    this.updateDeletingAtoms(delta);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private updateHighlight(delta: number) {
    if (this.highlightTime > 0) {
      this.highlightTime -= delta;
      const progress = 1 - this.highlightTime / this.highlightDuration;
      const pulse = Math.sin(progress * Math.PI) * 0.6 + 0.2;

      if (this.selectedAtomId !== null) {
        const atomMesh = this.atomMeshes.get(this.selectedAtomId);
        if (atomMesh?.highlightMesh) {
          const mat = atomMesh.highlightMesh.material as THREE.MeshBasicMaterial;
          mat.opacity = pulse;
        }
      }
    } else if (this.selectedAtomId !== null) {
      const atomMesh = this.atomMeshes.get(this.selectedAtomId);
      if (atomMesh?.highlightMesh) {
        const mat = atomMesh.highlightMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.25;
      }
    }
  }

  private updateNewAtoms(delta: number) {
    const animDuration = 0.4;

    const done: number[] = [];

    this.newAtoms.forEach(atomId => {
      const time = (this.newAtomTime.get(atomId) ?? 0) + delta;
      this.newAtomTime.set(atomId, time);

      const progress = Math.min(time / animDuration, 1);
      const scale = this.easeOutBack(progress);

      const atomMesh = this.atomMeshes.get(atomId);
      if (atomMesh) {
        atomMesh.mesh.scale.setScalar(scale);
        if (atomMesh.highlightMesh) {
          atomMesh.highlightMesh.scale.setScalar(scale);
        }
      }

      if (progress >= 1) {
        done.push(atomId);
      }
    });

    done.forEach(atomId => {
      this.newAtoms.delete(atomId);
      this.newAtomTime.delete(atomId);
    });
  }

  private updateDeletingAtoms(delta: number) {
    const animDuration = 0.3;
    const toRemove: number[] = [];

    this.deletingAtoms.forEach(atomId => {
      const time = (this.deleteAtomTime.get(atomId) ?? 0) + delta;
      this.deleteAtomTime.set(atomId, time);

      const progress = Math.min(time / animDuration, 1);
      const scale = 1 - this.easeInCubic(progress);

      const atomMesh = this.atomMeshes.get(atomId);
      if (atomMesh) {
        atomMesh.mesh.scale.setScalar(Math.max(scale, 0));
        if (atomMesh.highlightMesh) {
          atomMesh.highlightMesh.scale.setScalar(Math.max(scale, 0));
        }
      }

      if (progress >= 1) {
        toRemove.push(atomId);
      }
    });

    toRemove.forEach(atomId => {
      this.removeAtomMeshes(atomId);
      this.deletingAtoms.delete(atomId);
      this.deleteAtomTime.delete(atomId);
    });
  }

  private removeAtomMeshes(atomId: number) {
    const atomMesh = this.atomMeshes.get(atomId);
    if (!atomMesh) return;

    this.moleculeGroup.remove(atomMesh.mesh);
    atomMesh.mesh.geometry.dispose();
    (atomMesh.mesh.material as THREE.Material).dispose();

    if (atomMesh.highlightMesh) {
      this.moleculeGroup.remove(atomMesh.highlightMesh);
      atomMesh.highlightMesh.geometry.dispose();
      (atomMesh.highlightMesh.material as THREE.Material).dispose();
    }

    this.atomMeshes.delete(atomId);
  }

  private easeOutBack(x: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  private easeInCubic(x: number): number {
    return x * x * x;
  }

  public dispose() {
    this.stop();
    this.clearMolecule();
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('click', this.handleClick);
    this.renderer.domElement.removeEventListener('contextmenu', this.handleContextMenu);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
