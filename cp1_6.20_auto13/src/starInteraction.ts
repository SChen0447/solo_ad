import * as THREE from 'three';
import { StarData, GalaxyData } from './galaxyGenerator';
import { UIManager } from './uiManager';

export class StarInteraction {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private starsPoints: THREE.Points;
  private starData: StarData[];
  private uiManager: UIManager;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredIndex: number = -1;
  private highlightSprite: THREE.Sprite;
  private originalColors: Float32Array;
  private sizes: Float32Array;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    starsPoints: THREE.Points,
    galaxyData: GalaxyData,
    uiManager: UIManager
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.starsPoints = starsPoints;
    this.starData = galaxyData.stars;
    this.uiManager = uiManager;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    const geometry = starsPoints.geometry as THREE.BufferGeometry;
    const colorsAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
    this.originalColors = new Float32Array(colorsAttr.array as Float32Array);
    
    const sizesAttr = geometry.getAttribute('size') as THREE.BufferAttribute;
    this.sizes = new Float32Array(sizesAttr.array as Float32Array);

    const highlightMaterial = new THREE.SpriteMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.highlightSprite = new THREE.Sprite(highlightMaterial);
    this.highlightSprite.scale.set(0, 0, 1);
    this.highlightSprite.visible = false;
    this.scene.add(this.highlightSprite);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', (event) => {
      this.onMouseMove(event);
    });

    canvas.addEventListener('click', (event) => {
      this.onClick(event);
    });
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const intersection = this.raycast();
    if (intersection !== -1) {
      const star = this.starData[intersection];
      this.uiManager.showPanel(star);
    }
  }

  private raycast(): number {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    this.raycaster.params.Points = { threshold: 3 };

    const intersects = this.raycaster.intersectObject(this.starsPoints);

    if (intersects.length > 0 && intersects[0].index !== undefined) {
      return intersects[0].index;
    }
    return -1;
  }

  public update(deltaTime: number): void {
    const intersection = this.raycast();
    
    if (intersection !== -1) {
      if (this.hoveredIndex !== intersection) {
        this.setHovered(intersection);
      }
      this.uiManager.setCursorPointer(true);
    } else {
      if (this.hoveredIndex !== -1) {
        this.clearHovered();
      }
      this.uiManager.setCursorPointer(false);
    }

    this.updateHighlight(deltaTime);
  }

  private setHovered(index: number): void {
    if (this.hoveredIndex !== -1) {
      this.restoreStarColor(this.hoveredIndex);
      this.restoreStarSize(this.hoveredIndex);
    }

    this.hoveredIndex = index;
    const star = this.starData[index];

    this.highlightStarColor(index);
    this.highlightStarSize(index);

    this.highlightSprite.position.copy(star.position);
    const spriteSize = star.size * 5;
    this.highlightSprite.scale.set(spriteSize, spriteSize, 1);
    this.highlightSprite.visible = true;
    this.highlightSprite.material.opacity = 0.8;

    const currentPanelStar = this.uiManager.getCurrentStar();
    if (currentPanelStar && currentPanelStar === star) {
      (this.highlightSprite.material as THREE.SpriteMaterial).color.setHex(0xffd700);
    } else {
      (this.highlightSprite.material as THREE.SpriteMaterial).color.setHex(0x4fc3f7);
    }
  }

  private clearHovered(): void {
    if (this.hoveredIndex !== -1) {
      this.restoreStarColor(this.hoveredIndex);
      this.restoreStarSize(this.hoveredIndex);
    }
    this.hoveredIndex = -1;
    this.highlightSprite.visible = false;
  }

  private highlightStarColor(index: number): void {
    const geometry = this.starsPoints.geometry as THREE.BufferGeometry;
    const colors = geometry.getAttribute('color') as THREE.BufferAttribute;
    
    const baseR = this.originalColors[index * 3];
    const baseG = this.originalColors[index * 3 + 1];
    const baseB = this.originalColors[index * 3 + 2];

    const highlightR = Math.min(1, baseR + 0.3);
    const highlightG = Math.min(1, baseG + 0.4);
    const highlightB = Math.min(1, baseB + 0.6);

    colors.setXYZ(index, highlightR, highlightG, highlightB);
    colors.needsUpdate = true;
  }

  private restoreStarColor(index: number): void {
    const geometry = this.starsPoints.geometry as THREE.BufferGeometry;
    const colors = geometry.getAttribute('color') as THREE.BufferAttribute;
    
    colors.setXYZ(
      index,
      this.originalColors[index * 3],
      this.originalColors[index * 3 + 1],
      this.originalColors[index * 3 + 2]
    );
    colors.needsUpdate = true;
  }

  private highlightStarSize(index: number): void {
    const geometry = this.starsPoints.geometry as THREE.BufferGeometry;
    const sizes = geometry.getAttribute('size') as THREE.BufferAttribute;
    sizes.setX(index, this.sizes[index] * 1.5);
    sizes.needsUpdate = true;
  }

  private restoreStarSize(index: number): void {
    const geometry = this.starsPoints.geometry as THREE.BufferGeometry;
    const sizes = geometry.getAttribute('size') as THREE.BufferAttribute;
    sizes.setX(index, this.sizes[index]);
    sizes.needsUpdate = true;
  }

  private updateHighlight(deltaTime: number): void {
    if (this.hoveredIndex !== -1) {
      const star = this.starData[this.hoveredIndex];
      const baseSize = star.size * 5;
      const pulseScale = 1 + Math.sin(performance.now() * 0.003) * 0.2;
      const targetScale = baseSize * pulseScale;
      const currentScale = this.highlightSprite.scale.x;
      const newScale = currentScale + (targetScale - currentScale) * deltaTime * 10;
      this.highlightSprite.scale.set(newScale, newScale, 1);
    }
  }

  public getHoveredIndex(): number {
    return this.hoveredIndex;
  }

  public getHoveredStar(): StarData | null {
    if (this.hoveredIndex === -1) return null;
    return this.starData[this.hoveredIndex];
  }

  public updateSelectedHighlight(): void {
    if (this.hoveredIndex !== -1) {
      const star = this.starData[this.hoveredIndex];
      const currentPanelStar = this.uiManager.getCurrentStar();
      if (currentPanelStar && currentPanelStar === star) {
        (this.highlightSprite.material as THREE.SpriteMaterial).color.setHex(0xffd700);
      } else {
        (this.highlightSprite.material as THREE.SpriteMaterial).color.setHex(0x4fc3f7);
      }
    }
  }
}
