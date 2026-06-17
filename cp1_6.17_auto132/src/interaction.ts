import * as THREE from 'three';
import type { BodyModel, OrganData } from './bodyModel';

export class InteractionManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private bodyModel: BodyModel;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredMesh: THREE.Mesh | null = null;
  private highlightMesh: THREE.Mesh | null = null;
  private selectedMesh: THREE.Mesh | null = null;
  private panelVisible = false;
  private onMouseMoveCallback: ((e: MouseEvent) => void) | null = null;
  private onClickCallback: ((e: MouseEvent) => void) | null = null;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    bodyModel: BodyModel
  ) {
    this.scene = scene;
    this.camera = camera;
    this.bodyModel = bodyModel;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.setupEvents();
  }

  private setupEvents(): void {
    this.onMouseMoveCallback = (e: MouseEvent) => this.handleMouseMove(e);
    this.onClickCallback = (e: MouseEvent) => this.handleClick(e);

    window.addEventListener('mousemove', this.onMouseMoveCallback);
    window.addEventListener('click', this.onClickCallback);
  }

  private updateMouse(e: MouseEvent): void {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  private pickOrgan(): THREE.Mesh | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.bodyModel.getAllMeshes();
    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      return intersects[0]!.object as THREE.Mesh;
    }
    return null;
  }

  private handleMouseMove(e: MouseEvent): void {
    this.updateMouse(e);
    const mesh = this.pickOrgan();

    if (mesh) {
      document.body.style.cursor = 'pointer';
      if (this.hoveredMesh !== mesh) {
        this.clearHighlight();
        this.hoveredMesh = mesh;
        this.createHighlight(mesh);
      }
    } else {
      document.body.style.cursor = 'default';
      this.clearHighlight();
      this.hoveredMesh = null;
    }
  }

  private createHighlight(mesh: THREE.Mesh): void {
    const geometry = mesh.geometry.clone();
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.FrontSide,
      depthTest: true,
      depthWrite: false,
    });

    this.highlightMesh = new THREE.Mesh(geometry, material);
    this.highlightMesh.position.copy(mesh.position);
    this.highlightMesh.rotation.copy(mesh.rotation);
    this.highlightMesh.scale.copy(mesh.scale).multiplyScalar(1.05);
    this.highlightMesh.renderOrder = 999;
    this.scene.add(this.highlightMesh);
  }

  private clearHighlight(): void {
    if (this.highlightMesh) {
      this.scene.remove(this.highlightMesh);
      this.highlightMesh.geometry.dispose();
      (this.highlightMesh.material as THREE.Material).dispose();
      this.highlightMesh = null;
    }
  }

  private handleClick(e: MouseEvent): void {
    this.updateMouse(e);
    const mesh = this.pickOrgan();

    if (mesh && mesh.userData.organData) {
      this.selectedMesh = mesh;
      const data = mesh.userData.organData as OrganData;
      this.showPanel(data);
    }
  }

  private showPanel(data: OrganData): void {
    const panel = document.getElementById('info-panel');
    const nameEl = document.getElementById('organ-name');
    const descEl = document.getElementById('organ-desc');

    if (panel && nameEl && descEl) {
      nameEl.textContent = data.name;
      descEl.textContent = data.description;
      panel.classList.add('visible');
      this.panelVisible = true;
    }
  }

  hidePanel(): void {
    const panel = document.getElementById('info-panel');
    if (panel) {
      panel.classList.remove('visible');
      this.panelVisible = false;
    }
    this.selectedMesh = null;
  }

  isPanelVisible(): boolean {
    return this.panelVisible;
  }

  dispose(): void {
    this.clearHighlight();
    if (this.onMouseMoveCallback) {
      window.removeEventListener('mousemove', this.onMouseMoveCallback);
    }
    if (this.onClickCallback) {
      window.removeEventListener('click', this.onClickCallback);
    }
  }
}
