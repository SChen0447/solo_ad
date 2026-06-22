import * as THREE from 'three';
import type { AtomData, MoleculeData } from '../parser/MoleculeParser';

export interface AtomMesh extends THREE.Mesh {
  userData: {
    atomData: AtomData;
    originalColor: THREE.Color;
    glowMesh: THREE.Mesh | null;
    label: HTMLDivElement | null;
    isHighlighted: boolean;
  };
}

const CPK_COLORS: Record<string, number> = {
  'H': 0xffffff,
  'He': 0xd9ffff,
  'Li': 0xcc80ff,
  'Be': 0xc2ff00,
  'B': 0xffb5b5,
  'C': 0x333333,
  'N': 0x3050f8,
  'O': 0xff0d0d,
  'F': 0x90e050,
  'Ne': 0xb3e3f5,
  'Na': 0xab5cf2,
  'Mg': 0x8aff00,
  'Al': 0xbfa6a6,
  'Si': 0xf0c8a0,
  'P': 0xff8000,
  'S': 0xffff30,
  'Cl': 0x1ff01f,
  'Ar': 0x80d1e3,
  'K': 0x8f40d4,
  'Ca': 0x3dff00,
  'Fe': 0xe06633,
  'Cu': 0xc88033,
  'Zn': 0x7d80b0,
  'Br': 0xa62929,
  'I': 0x940094
};

const ATOM_RADII: Record<string, number> = {
  'H': 0.32, 'He': 0.46, 'Li': 1.33, 'Be': 1.02, 'B': 0.85,
  'C': 0.75, 'N': 0.71, 'O': 0.66, 'F': 0.57, 'Ne': 0.58,
  'Na': 1.55, 'Mg': 1.39, 'Al': 1.26, 'Si': 1.16, 'P': 1.11,
  'S': 1.05, 'Cl': 1.02, 'Ar': 1.06, 'K': 1.96, 'Ca': 1.71,
  'Fe': 1.32, 'Cu': 1.32, 'Zn': 1.22, 'Br': 1.20, 'I': 1.39
};

const DEFAULT_COLOR = 0xff1493;
const DEFAULT_RADIUS = 1.0;

export class AtomRenderer {
  private scene: THREE.Scene;
  private container: HTMLElement;
  public atomMeshes: AtomMesh[] = [];
  public group: THREE.Group;
  private labelContainer: HTMLDivElement | null = null;

  constructor(scene: THREE.Scene, container: HTMLElement) {
    this.scene = scene;
    this.container = container;
    this.group = new THREE.Group();
    this.group.name = 'molecule-atoms';
    this.scene.add(this.group);
    this.createLabelContainer();
  }

  private createLabelContainer(): void {
    this.labelContainer = document.createElement('div');
    this.labelContainer.style.position = 'absolute';
    this.labelContainer.style.top = '0';
    this.labelContainer.style.left = '0';
    this.labelContainer.style.width = '100%';
    this.labelContainer.style.height = '100%';
    this.labelContainer.style.pointerEvents = 'none';
    this.labelContainer.style.zIndex = '10';
    this.container.appendChild(this.labelContainer);
  }

  public getElementColor(element: string): number {
    return CPK_COLORS[element] ?? DEFAULT_COLOR;
  }

  public getElementRadius(element: string): number {
    return ATOM_RADII[element] ?? DEFAULT_RADIUS;
  }

  public render(moleculeData: MoleculeData): AtomMesh[] {
    this.clear();

    const geometryCache = new Map<number, THREE.SphereGeometry>();

    for (const atom of moleculeData.atoms) {
      const radius = this.getElementRadius(atom.element);
      const segments = atom.element === 'H' ? 16 : 24;

      let geometry = geometryCache.get(segments);
      if (!geometry) {
        geometry = new THREE.SphereGeometry(1, segments, segments);
        geometryCache.set(segments, geometry);
      }

      const colorHex = this.getElementColor(atom.element);
      const color = new THREE.Color(colorHex);

      const material = new THREE.MeshPhysicalMaterial({
        color: color,
        metalness: 0.1,
        roughness: 0.25,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2,
        emissive: color.clone().multiplyScalar(0.15),
        emissiveIntensity: 0.6
      });

      const mesh = new THREE.Mesh(geometry, material) as unknown as AtomMesh;
      mesh.scale.setScalar(radius);
      mesh.position.set(atom.x, atom.y, atom.z);

      const glowColor = color.clone().multiplyScalar(1.5);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: glowColor,
        transparent: true,
        opacity: 0.0,
        side: THREE.BackSide,
        depthWrite: false
      });
      const glowMesh = new THREE.Mesh(geometry, glowMaterial);
      glowMesh.scale.setScalar(radius * 1.4);
      mesh.add(glowMesh);

      const label = this.createLabel(atom.element, atom.id);

      mesh.userData = {
        atomData: atom,
        originalColor: color.clone(),
        glowMesh: glowMesh,
        label: label,
        isHighlighted: false
      };

      this.group.add(mesh);
      this.atomMeshes.push(mesh);
    }

    this.centerMolecule();
    return this.atomMeshes;
  }

  private createLabel(element: string, id: number): HTMLDivElement {
    const label = document.createElement('div');
    label.textContent = `${element} ${id}`;
    label.style.cssText = `
      position: absolute;
      padding: 4px 10px;
      background: rgba(255, 255, 255, 0.92);
      color: #1a1a2e;
      border-radius: 6px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 12px;
      font-weight: 600;
      pointer-events: none;
      transform: translate(-50%, -120%);
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.15s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.5);
    `;
    label.dataset.labelType = 'atom';
    this.labelContainer?.appendChild(label);
    return label;
  }

  public updateLabels(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer): void {
    const rect = renderer.domElement.getBoundingClientRect();

    for (const atomMesh of this.atomMeshes) {
      if (!atomMesh.userData.label) continue;

      const worldPos = new THREE.Vector3();
      atomMesh.getWorldPosition(worldPos);
      const screenPos = worldPos.project(camera);

      const x = (screenPos.x * 0.5 + 0.5) * rect.width;
      const y = (-screenPos.y * 0.5 + 0.5) * rect.height;

      atomMesh.userData.label.style.left = `${x}px`;
      atomMesh.userData.label.style.top = `${y}px`;

      if (screenPos.z > 1 || screenPos.z < -1) {
        atomMesh.userData.label.style.opacity = '0';
      }
    }
  }

  public highlightAtom(atomMesh: AtomMesh): void {
    if (atomMesh.userData.isHighlighted) return;
    atomMesh.userData.isHighlighted = true;

    const material = atomMesh.material as THREE.MeshPhysicalMaterial;
    material.emissiveIntensity = 1.5;
    material.emissive = atomMesh.userData.originalColor.clone().multiplyScalar(0.8);

    if (atomMesh.userData.glowMesh) {
      const glowMat = atomMesh.userData.glowMesh.material as THREE.MeshBasicMaterial;
      glowMat.opacity = 0.35;
    }

    if (atomMesh.userData.label) {
      atomMesh.userData.label.style.opacity = '1';
    }
  }

  public unhighlightAtom(atomMesh: AtomMesh): void {
    if (!atomMesh.userData.isHighlighted) return;
    atomMesh.userData.isHighlighted = false;

    const material = atomMesh.material as THREE.MeshPhysicalMaterial;
    material.emissiveIntensity = 0.6;
    material.emissive = atomMesh.userData.originalColor.clone().multiplyScalar(0.15);

    if (atomMesh.userData.glowMesh) {
      const glowMat = atomMesh.userData.glowMesh.material as THREE.MeshBasicMaterial;
      glowMat.opacity = 0.0;
    }

    if (atomMesh.userData.label) {
      atomMesh.userData.label.style.opacity = '0';
    }
  }

  private centerMolecule(): void {
    if (this.atomMeshes.length === 0) return;

    const box = new THREE.Box3();
    this.atomMeshes.forEach(mesh => box.expandByObject(mesh));
    const center = new THREE.Vector3();
    box.getCenter(center);
    this.group.position.sub(center);
  }

  public getCenter(): THREE.Vector3 {
    const box = new THREE.Box3();
    this.atomMeshes.forEach(mesh => box.expandByObject(mesh));
    const center = new THREE.Vector3();
    box.getCenter(center);
    return center;
  }

  public getBoundingRadius(): number {
    if (this.atomMeshes.length === 0) return 10;
    const box = new THREE.Box3();
    this.atomMeshes.forEach(mesh => box.expandByObject(mesh));
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    return sphere.radius;
  }

  public clear(): void {
    for (const mesh of this.atomMeshes) {
      if (mesh.userData.label) {
        mesh.userData.label.remove();
      }
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      if (mesh.userData.glowMesh) {
        mesh.userData.glowMesh.geometry.dispose();
        (mesh.userData.glowMesh.material as THREE.Material).dispose();
      }
    }
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.atomMeshes = [];
  }
}
