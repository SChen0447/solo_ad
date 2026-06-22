import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { AtomData, MoleculeData } from '../parser/MoleculeParser';

export interface AtomMesh extends THREE.Mesh {
  userData: {
    atomData: AtomData;
    originalColor: THREE.Color;
    originalScale: number;
    glowMesh: THREE.Mesh | null;
    labelObject: CSS2DObject | null;
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
const HIGHLIGHT_SCALE_FACTOR = 1.35;

export class AtomRenderer {
  private scene: THREE.Scene;
  private container: HTMLElement;
  public atomMeshes: AtomMesh[] = [];
  public group: THREE.Group;
  public css2dRenderer: CSS2DRenderer;

  constructor(scene: THREE.Scene, container: HTMLElement) {
    this.scene = scene;
    this.container = container;
    this.group = new THREE.Group();
    this.group.name = 'molecule-atoms';
    this.scene.add(this.group);

    this.css2dRenderer = new CSS2DRenderer();
    this.css2dRenderer.setSize(window.innerWidth, window.innerHeight);
    this.css2dRenderer.domElement.style.position = 'absolute';
    this.css2dRenderer.domElement.style.top = '0';
    this.css2dRenderer.domElement.style.left = '0';
    this.css2dRenderer.domElement.style.pointerEvents = 'none';
    this.container.appendChild(this.css2dRenderer.domElement);
  }

  public getElementColor(element: string): number {
    return CPK_COLORS[element] ?? DEFAULT_COLOR;
  }

  public getElementRadius(element: string): number {
    return ATOM_RADII[element] ?? DEFAULT_RADIUS;
  }

  public render(moleculeData: MoleculeData, atomScale: number = 1.0): AtomMesh[] {
    this.clear();

    const geometryCache = new Map<number, THREE.SphereGeometry>();

    for (const atom of moleculeData.atoms) {
      const radius = this.getElementRadius(atom.element) * atomScale;
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
      glowMesh.scale.setScalar(1.5);
      mesh.add(glowMesh);

      const labelObject = this.createLabel(atom.element, atom.id);
      mesh.add(labelObject);
      labelObject.visible = false;

      mesh.userData = {
        atomData: atom,
        originalColor: color.clone(),
        originalScale: radius,
        glowMesh: glowMesh,
        labelObject: labelObject,
        isHighlighted: false
      };

      this.group.add(mesh);
      this.atomMeshes.push(mesh);
    }

    this.centerMolecule();
    return this.atomMeshes;
  }

  private createLabel(element: string, id: number): CSS2DObject {
    const div = document.createElement('div');
    div.textContent = `${element} ${id}`;
    div.style.cssText = `
      padding: 4px 10px;
      background: rgba(255, 255, 255, 0.92);
      color: #1a1a2e;
      border-radius: 6px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.5);
      pointer-events: none;
      transform: translateY(-140%);
    `;

    const labelObject = new CSS2DObject(div);
    labelObject.position.set(0, 0, 0);
    return labelObject;
  }

  public updateLabels(camera: THREE.PerspectiveCamera): void {
    this.css2dRenderer.render(this.scene, camera);
  }

  public highlightAtom(atomMesh: AtomMesh): void {
    if (atomMesh.userData.isHighlighted) return;
    atomMesh.userData.isHighlighted = true;

    const material = atomMesh.material as THREE.MeshPhysicalMaterial;
    material.emissiveIntensity = 2.0;
    material.emissive = atomMesh.userData.originalColor.clone();

    const targetScale = atomMesh.userData.originalScale * HIGHLIGHT_SCALE_FACTOR;
    atomMesh.scale.setScalar(targetScale);

    if (atomMesh.userData.glowMesh) {
      const glowMat = atomMesh.userData.glowMesh.material as THREE.MeshBasicMaterial;
      glowMat.opacity = 0.45;
      atomMesh.userData.glowMesh.scale.setScalar(1.6);
    }

    if (atomMesh.userData.labelObject) {
      atomMesh.userData.labelObject.visible = true;
    }
  }

  public unhighlightAtom(atomMesh: AtomMesh): void {
    if (!atomMesh.userData.isHighlighted) return;
    atomMesh.userData.isHighlighted = false;

    const material = atomMesh.material as THREE.MeshPhysicalMaterial;
    material.emissiveIntensity = 0.6;
    material.emissive = atomMesh.userData.originalColor.clone().multiplyScalar(0.15);

    atomMesh.scale.setScalar(atomMesh.userData.originalScale);

    if (atomMesh.userData.glowMesh) {
      const glowMat = atomMesh.userData.glowMesh.material as THREE.MeshBasicMaterial;
      glowMat.opacity = 0.0;
      atomMesh.userData.glowMesh.scale.setScalar(1.5);
    }

    if (atomMesh.userData.labelObject) {
      atomMesh.userData.labelObject.visible = false;
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
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      if (mesh.userData.glowMesh) {
        mesh.userData.glowMesh.geometry.dispose();
        (mesh.userData.glowMesh.material as THREE.Material).dispose();
      }
      if (mesh.userData.labelObject) {
        mesh.remove(mesh.userData.labelObject);
      }
    }
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.atomMeshes = [];
  }

  public onResize(width: number, height: number): void {
    this.css2dRenderer.setSize(width, height);
  }
}
