import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { Character } from './character';
import { Shelf } from './shelf';

export interface InteractionState {
  selectedItem: THREE.Mesh | null;
  isReachable: boolean;
  distance: number;
  isAnimating: boolean;
}

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private character: Character;
  private shelf: Shelf;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredItem: THREE.Mesh | null = null;
  private state: InteractionState;
  private onStateChange?: (state: InteractionState) => void;

  constructor(
    _scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    character: Character,
    shelf: Shelf
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.character = character;
    this.shelf = shelf;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.state = {
      selectedItem: null,
      isReachable: false,
      distance: 0,
      isAnimating: false
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('click', this.onClick.bind(this));
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.updateHover();
  }

  private updateHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const items = this.shelf.getAllItems();
    const intersects = this.raycaster.intersectObjects(items, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      if (this.hoveredItem !== mesh) {
        if (this.hoveredItem) {
          this.shelf.setItemHovered(this.hoveredItem, false);
        }
        this.hoveredItem = mesh;
        this.shelf.setItemHovered(mesh, true);
        document.body.style.cursor = 'pointer';
      }
    } else {
      if (this.hoveredItem) {
        this.shelf.setItemHovered(this.hoveredItem, false);
        this.hoveredItem = null;
        document.body.style.cursor = 'default';
      }
    }
  }

  private onClick(event: MouseEvent): void {
    if (this.state.isAnimating) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const items = this.shelf.getAllItems();
    const intersects = this.raycaster.intersectObjects(items, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      this.handleItemClick(mesh);
    }
  }

  private handleItemClick(mesh: THREE.Mesh): void {
    const item = this.shelf.items.find(i => i.mesh === mesh);
    if (!item || item.isGrabbed) return;

    const itemPosition = new THREE.Vector3();
    mesh.getWorldPosition(itemPosition);
    
    const shoulderPosition = this.character.getShoulderPosition();
    const distance = itemPosition.distanceTo(shoulderPosition);
    const maxReach = this.character.getMaxReach();
    const isReachable = distance <= maxReach;

    this.state = {
      selectedItem: mesh,
      isReachable,
      distance,
      isAnimating: true
    };
    this.notifyStateChange();

    if (isReachable) {
      this.performGrabAnimation(mesh, itemPosition);
    } else {
      this.showUnreachableFeedback(mesh, itemPosition);
    }
  }

  private async performGrabAnimation(mesh: THREE.Mesh, targetPosition: THREE.Vector3): Promise<void> {
    await this.character.reachForTarget(targetPosition);
    
    this.shelf.grabItem(mesh, this.character.joints.rightHand);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const storagePos = this.shelf.getStoragePosition();
    await this.character.reachForTarget(storagePos);
    
    this.shelf.moveItemToStorage(mesh);
    
    await this.character.resetArmPosition();
    
    this.state.isAnimating = false;
    this.notifyStateChange();
  }

  private showUnreachableFeedback(mesh: THREE.Mesh, itemPosition: THREE.Vector3): void {
    this.shelf.flashItemUnreachable(mesh);
    this.showTooltip(itemPosition, '够不着！');
    
    setTimeout(() => {
      this.state.isAnimating = false;
      this.notifyStateChange();
    }, 1500);
  }

  private showTooltip(worldPosition: THREE.Vector3, text: string): void {
    const screenPosition = worldPosition.clone().project(this.camera);
    const x = (screenPosition.x + 1) / 2 * window.innerWidth;
    const y = (-screenPosition.y + 1) / 2 * window.innerHeight;

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = text;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
    document.body.appendChild(tooltip);

    setTimeout(() => {
      tooltip.remove();
    }, 2000);
  }

  public checkReachability(worldPosition: THREE.Vector3): { reachable: boolean; distance: number; maxReach: number } {
    const shoulderPosition = this.character.getShoulderPosition();
    const distance = worldPosition.distanceTo(shoulderPosition);
    const maxReach = this.character.getMaxReach();
    return {
      reachable: distance <= maxReach,
      distance,
      maxReach
    };
  }

  public getState(): InteractionState {
    return { ...this.state };
  }

  public setOnStateChange(callback: (state: InteractionState) => void): void {
    this.onStateChange = callback;
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  public update(): void {
    TWEEN.update();
  }

  public dispose(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.removeEventListener('click', this.onClick.bind(this));
  }
}
