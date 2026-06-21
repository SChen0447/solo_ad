import { SceneManager } from './SceneManager';
import { loadExhibits, ExhibitData } from './ExhibitData';
import { ExhibitObject } from './ExhibitObject';
import { UIOverlay } from './UIOverlay';
import * as THREE from 'three';

class MuseumApp {
  private sceneManager: SceneManager;
  private uiOverlay: UIOverlay;
  private exhibits: ExhibitObject[] = [];
  private currentExhibit: ExhibitObject | null = null;
  private hoveredExhibit: ExhibitObject | null = null;
  
  private clock: THREE.Clock;
  private animationFrameId: number = 0;
  private isFullscreen: boolean = false;
  
  private interactiveMeshes: THREE.Mesh[] = [];
  private meshToExhibitMap: Map<THREE.Mesh, ExhibitObject> = new Map();

  constructor() {
    this.sceneManager = new SceneManager('scene-canvas');
    this.clock = new THREE.Clock();
    
    this.uiOverlay = new UIOverlay({
      onResetView: () => this.handleResetView(),
      onToggleFullscreen: () => this.handleToggleFullscreen(),
      onClosePanel: () => this.handleClosePanel(),
      onTogglePlay: () => this.handleTogglePlay()
    });
    
    this.initExhibits();
    this.setupInteraction();
    this.animate();
  }
  
  private initExhibits(): void {
    const exhibitDataList: ExhibitData[] = loadExhibits();
    
    exhibitDataList.forEach(data => {
      const exhibit = new ExhibitObject(data);
      this.exhibits.push(exhibit);
      this.sceneManager.scene.add(exhibit.group);
      
      const pedestal = exhibit.getPedestalMesh();
      this.interactiveMeshes.push(pedestal);
      this.meshToExhibitMap.set(pedestal, exhibit);
      
      const instrumentMeshes = exhibit.getInstrumentMeshes();
      instrumentMeshes.forEach(mesh => {
        this.interactiveMeshes.push(mesh);
        this.meshToExhibitMap.set(mesh, exhibit);
      });
    });
  }
  
  private setupInteraction(): void {
    const canvas = this.sceneManager.canvas;
    
    canvas.addEventListener('mousemove', (e) => {
      this.handleMouseMove(e.clientX, e.clientY);
    });
    
    canvas.addEventListener('click', (e) => {
      this.handleClick(e.clientX, e.clientY);
    });
    
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.handleMouseMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
    
    canvas.addEventListener('touchend', (e) => {
      if (e.changedTouches.length > 0) {
        this.handleClick(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
    });
    
    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen = !!document.fullscreenElement;
      this.uiOverlay.setFullscreenActive(this.isFullscreen);
    });
  }
  
  private handleMouseMove(clientX: number, clientY: number): void {
    this.sceneManager.updateMouse(clientX, clientY);
    
    const intersects = this.sceneManager.getIntersects(this.interactiveMeshes);
    
    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const exhibit = this.meshToExhibitMap.get(mesh);
      
      if (exhibit && exhibit !== this.hoveredExhibit) {
        if (this.hoveredExhibit) {
          this.hoveredExhibit.onHoverEnd();
        }
        exhibit.onHover();
        this.hoveredExhibit = exhibit;
        document.body.style.cursor = 'pointer';
      }
    } else if (this.hoveredExhibit) {
      this.hoveredExhibit.onHoverEnd();
      this.hoveredExhibit = null;
      document.body.style.cursor = 'default';
    }
  }
  
  private handleClick(clientX: number, clientY: number): void {
    this.sceneManager.updateMouse(clientX, clientY);
    
    const intersects = this.sceneManager.getIntersects(this.interactiveMeshes);
    
    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const exhibit = this.meshToExhibitMap.get(mesh);
      
      if (exhibit) {
        exhibit.onClick();
        this.currentExhibit = exhibit;
        this.uiOverlay.showPanel(exhibit.data);
        this.updatePlayState();
      }
    }
  }
  
  private handleResetView(): void {
    this.sceneManager.resetView();
  }
  
  private handleToggleFullscreen(): void {
    if (!this.isFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }
  
  private handleClosePanel(): void {
    this.uiOverlay.hidePanel();
    if (this.currentExhibit && this.currentExhibit.isPlaying) {
      this.currentExhibit.stopTone();
      this.uiOverlay.setPlaying(false);
    }
  }
  
  private handleTogglePlay(): void {
    if (!this.currentExhibit) return;
    
    if (this.currentExhibit.isPlaying) {
      this.currentExhibit.stopTone();
      this.uiOverlay.setPlaying(false);
    } else {
      this.currentExhibit.playTone();
      const duration = this.getToneDurationMs(this.currentExhibit.data.toneType);
      this.uiOverlay.setPlaying(true, duration);
    }
  }
  
  private getToneDurationMs(toneType: string): number {
    switch (toneType) {
      case 'arpeggio': return 4000;
      case 'longnote': return 3000;
      case 'scale': return 3500;
      case 'chord': return 2500;
      case 'pluck': return 3000;
      case 'strum': return 3000;
      default: return 3000;
    }
  }
  
  private updatePlayState(): void {
    if (this.currentExhibit) {
      this.uiOverlay.setPlaying(this.currentExhibit.isPlaying);
    }
  }
  
  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    
    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();
    
    this.exhibits.forEach(exhibit => {
      exhibit.update(deltaTime, elapsedTime);
    });
    
    this.sceneManager.update();
  }
  
  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.exhibits.forEach(exhibit => {
      exhibit.stopTone();
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new MuseumApp();
});
