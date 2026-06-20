import * as THREE from 'three';
import type { Exhibit } from './sceneBuilder';

export class InteractionManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private exhibits: Exhibit[] = [];
  private container: HTMLElement;
  private labels: Map<string, HTMLElement> = new Map();
  private hoveredExhibit: string | null = null;
  private outlineMeshes: Map<string, THREE.Mesh[]> = new Map();
  private glowIntensity: number = 0;
  private glowDirection: number = 1;
  private onHoverChange: ((exhibit: Exhibit | null) => void) | null = null;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    container: HTMLElement
  ) {
    this.scene = scene;
    this.camera = camera;
    this.container = container;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  setOnHoverChange(callback: (exhibit: Exhibit | null) => void): void {
    this.onHoverChange = callback;
  }

  setExhibits(exhibits: Exhibit[]): void {
    this.exhibits = exhibits;
    this.createLabels();
    this.createOutlineMeshes();
  }

  private createLabels(): void {
    this.labels.forEach(label => label.remove());
    this.labels.clear();

    this.exhibits.forEach(exhibit => {
      const label = document.createElement('div');
      label.className = 'exhibit-label';
      label.innerHTML = `
        <div class="exhibit-name">${exhibit.name}</div>
        <div class="exhibit-details">
          作者：${exhibit.author}<br>
          ${exhibit.description}
        </div>
      `;
      label.style.display = 'block';
      this.container.appendChild(label);
      this.labels.set(exhibit.mesh.name, label);
    });
  }

  private createOutlineMeshes(): void {
    this.outlineMeshes.forEach(meshes => {
      meshes.forEach(m => {
        if (m.parent) m.parent.remove(m);
      });
    });
    this.outlineMeshes.clear();

    this.exhibits.forEach(exhibit => {
      const outlineGroup: THREE.Mesh[] = [];
      const meshes: THREE.Mesh[] = [];

      exhibit.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          meshes.push(child);
        }
      });

      meshes.forEach(mesh => {
        const outlineMaterial = new THREE.MeshBasicMaterial({
          color: 0xffaa00,
          side: THREE.BackSide,
          transparent: true,
          opacity: 0
        });
        const outlineMesh = new THREE.Mesh(mesh.geometry.clone(), outlineMaterial);
        outlineMesh.scale.setScalar(1.05);
        mesh.add(outlineMesh);
        outlineGroup.push(outlineMesh);
      });

      this.outlineMeshes.set(exhibit.mesh.name, outlineGroup);
    });
  }

  updateLabelPositions(): void {
    this.exhibits.forEach(exhibit => {
      const label = this.labels.get(exhibit.mesh.name);
      if (!label) return;

      const position = new THREE.Vector3();
      const box = new THREE.Box3().setFromObject(exhibit.mesh);
      box.getCenter(position);
      position.y = box.max.y + 0.3;

      const screenPos = position.clone().project(this.camera);
      const x = (screenPos.x + 1) / 2 * this.container.clientWidth;
      const y = -(screenPos.y - 1) / 2 * this.container.clientHeight;

      label.style.left = `${x}px`;
      label.style.top = `${y}px`;

      const isBehindCamera = position.clone().project(this.camera).z > 1;
      label.style.display = isBehindCamera ? 'none' : 'block';
    });
  }

  handleMouseMove(event: MouseEvent): void {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.checkHover();
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes: THREE.Object3D[] = [];
    this.exhibits.forEach(exhibit => {
      meshes.push(exhibit.mesh);
    });

    const intersects = this.raycaster.intersectObjects(meshes, true);

    let newHovered: string | null = null;

    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && obj.parent) {
        const exhibit = this.exhibits.find(e => e.mesh.name === obj!.name);
        if (exhibit) {
          newHovered = exhibit.mesh.name;
          break;
        }
        obj = obj.parent;
      }
    }

    if (newHovered !== this.hoveredExhibit) {
      if (this.hoveredExhibit) {
        this.setHoverState(this.hoveredExhibit, false);
      }
      if (newHovered) {
        this.setHoverState(newHovered, true);
      }
      this.hoveredExhibit = newHovered;

      if (this.onHoverChange) {
        const exhibit = newHovered
          ? this.exhibits.find(e => e.mesh.name === newHovered) || null
          : null;
        this.onHoverChange(exhibit);
      }
    }
  }

  private setHoverState(exhibitName: string, hovered: boolean): void {
    const label = this.labels.get(exhibitName);
    if (label) {
      if (hovered) {
        label.classList.add('hovered');
      } else {
        label.classList.remove('hovered');
      }
    }
  }

  updateGlow(deltaTime: number): void {
    const cyclePeriod = 2;
    this.glowIntensity += this.glowDirection * deltaTime * (1 / cyclePeriod);

    if (this.glowIntensity >= 1) {
      this.glowIntensity = 1;
      this.glowDirection = -1;
    } else if (this.glowIntensity <= 0.3) {
      this.glowIntensity = 0.3;
      this.glowDirection = 1;
    }

    if (this.hoveredExhibit) {
      const meshes = this.outlineMeshes.get(this.hoveredExhibit);
      if (meshes) {
        meshes.forEach(mesh => {
          const material = mesh.material as THREE.MeshBasicMaterial;
          material.opacity = this.glowIntensity * 0.8;
        });
      }
    } else {
      this.outlineMeshes.forEach(meshes => {
        meshes.forEach(mesh => {
          const material = mesh.material as THREE.MeshBasicMaterial;
          material.opacity = 0;
        });
      });
    }
  }

  getHoveredExhibit(): Exhibit | null {
    if (!this.hoveredExhibit) return null;
    return this.exhibits.find(e => e.mesh.name === this.hoveredExhibit) || null;
  }

  dispose(): void {
    this.labels.forEach(label => label.remove());
    this.labels.clear();

    this.outlineMeshes.forEach(meshes => {
      meshes.forEach(m => {
        if (m.parent) m.parent.remove(m);
        if (Array.isArray(m.material)) {
          m.material.forEach(mat => mat.dispose());
        } else {
          m.material.dispose();
        }
        m.geometry.dispose();
      });
    });
    this.outlineMeshes.clear();
  }
}
