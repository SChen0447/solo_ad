import './styles/main.css';
import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { PlayerController } from './PlayerController';
import { ArtworkManager } from './ArtworkManager';
import { UIDisplay } from './UIDisplay';
import { ProjectData } from './types';

class App {
  private container: HTMLElement;
  private sceneManager: SceneManager;
  private playerController: PlayerController;
  private artworkManager: ArtworkManager;
  private uiDisplay: UIDisplay;

  private clock: THREE.Clock;
  private deltaTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateInterval: number = 0.25;
  private fpsTimer: number = 0;
  
  private idleThreshold: number = 5;
  private isIdleMode: boolean = false;
  private idleRotationSpeed: number = 5 * (Math.PI / 180);

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.sceneManager = new SceneManager(this.container);
    this.playerController = new PlayerController(this.sceneManager.camera, this.container);
    this.artworkManager = new ArtworkManager(this.sceneManager.scene);
    this.uiDisplay = new UIDisplay();

    this.uiDisplay.showLoading();

    this.init().catch((err) => {
      console.error('初始化失败:', err);
    });
  }

  private async init(): Promise<void> {
    const response = await fetch('/projects.json');
    const projects: ProjectData[] = await response.json();

    await this.artworkManager.loadProjects(projects);
    this.sceneManager.registerArtworks(this.artworkManager.artworks);

    this.setupInteraction();
    
    setTimeout(() => {
      this.uiDisplay.hideLoading();
    }, 500);

    this.animate();
  }

  private setupInteraction(): void {
    this.container.addEventListener('click', (e) => {
      if (this.uiDisplay.getIsCardVisible()) return;
      if (!document.pointerLockElement) return;

      this.sceneManager.updatePointer(e.clientX, e.clientY, this.container);
      const intersects = this.sceneManager.getIntersectedObjects();

      if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        const artwork = this.artworkManager.findArtworkByMesh(intersectedObject);
        
        if (artwork && artwork.isHovered) {
          this.uiDisplay.showCard(artwork.data);
        }
      }
    });

    this.uiDisplay.onCardClose = () => {
      this.playerController.lastMoveTime = performance.now();
    };
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    this.deltaTime = Math.min(this.clock.getDelta(), 0.1);
    
    this.updateFPS();
    
    if (!this.uiDisplay.getIsCardVisible()) {
      this.updateIdleMode();
      
      if (this.isIdleMode) {
        this.updateIdleRotation();
      } else {
        this.playerController.update(this.deltaTime);
      }
    }

    const playerPos = this.playerController.getPosition();
    this.artworkManager.update(playerPos, this.deltaTime);

    this.sceneManager.render();
  }

  private updateFPS(): void {
    this.frameCount++;
    this.fpsTimer += this.deltaTime;

    if (this.fpsTimer >= this.fpsUpdateInterval) {
      const fps = this.frameCount / this.fpsTimer;
      this.uiDisplay.updateFPS(fps);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }
  }

  private updateIdleMode(): void {
    const now = performance.now();
    const timeSinceLastMove = (now - this.playerController.lastMoveTime) / 1000;
    
    if (timeSinceLastMove > this.idleThreshold && !this.isIdleMode) {
      this.isIdleMode = true;
    } else if (timeSinceLastMove < this.idleThreshold && this.isIdleMode) {
      this.isIdleMode = false;
    }
  }

  private updateIdleRotation(): void {
    const playerPos = this.playerController.getPosition();
    const nearestArtwork = this.artworkManager.getNearestArtwork(playerPos);
    
    if (nearestArtwork) {
      const targetDirection = new THREE.Vector3();
      targetDirection.subVectors(nearestArtwork.basePosition, playerPos);
      targetDirection.y = 0;
      targetDirection.normalize();
      
      const targetYaw = Math.atan2(targetDirection.x, targetDirection.z) - Math.PI;
      let currentYaw = this.playerController.getYaw();
      
      const yawDiff = targetYaw - currentYaw;
      const normalizedDiff = Math.atan2(Math.sin(yawDiff), Math.cos(yawDiff));
      
      const rotationAmount = this.idleRotationSpeed * this.deltaTime;
      
      if (Math.abs(normalizedDiff) > rotationAmount) {
        currentYaw += Math.sign(normalizedDiff) * rotationAmount;
      } else {
        currentYaw = targetYaw;
      }
      
      this.playerController.setYaw(currentYaw);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
