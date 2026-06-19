import { GameManager, GameStats } from './game/GameManager';
import { SceneRenderer } from './render/SceneRenderer';
import { UIOverlay } from './render/UIOverlay';
import * as THREE from 'three';

class Game {
  private gameManager: GameManager;
  private sceneRenderer: SceneRenderer;
  private uiOverlay: UIOverlay;
  private container: HTMLElement;
  private keys: Set<string> = new Set();
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private currentView: 'ghost' | 'cat' = 'ghost';
  private animationFrameId: number = 0;
  private lastTime: number = 0;
  private catMoveDir: THREE.Vector3 = new THREE.Vector3();
  private bestCatchImage: ImageData | null = null;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container "${containerId}" not found`);
    }
    this.container = container;

    this.gameManager = new GameManager();
    this.sceneRenderer = new SceneRenderer({ container: this.container });
    this.uiOverlay = new UIOverlay({ container: this.container });

    this.setupGameEvents();
    this.setupInput();
    this.startRenderLoop();
  }

  private setupGameEvents(): void {
    this.gameManager.setOnUpdate((delta) => {
      this.handleGhostMovement(delta);
      this.handleCatMovement(delta);
      this.updateUI(delta);
    });

    this.gameManager.setOnGameEnd((stats) => {
      this.handleGameEnd(stats);
    });

    this.uiOverlay.setOnStartGame(() => {
      this.startGame();
    });

    this.uiOverlay.setOnRestartGame(() => {
      this.restartGame();
    });

    this.uiOverlay.setOnBackToMenu(() => {
      this.backToMenu();
    });

    this.sceneRenderer.setOnCatch((_catId) => {
      setTimeout(() => {
        const frameData = this.sceneRenderer.captureFrame();
        if (frameData) {
          this.bestCatchImage = frameData;
        }
      }, 50);
    });
  }

  private setupInput(): void {
    document.addEventListener('keydown', (e) => {
      this.keys.add(e.code);

      if (e.code === 'Space' && this.currentView === 'ghost') {
        e.preventDefault();
        this.gameManager.setPerspectiveMode(true);
      }

      if (e.code === 'KeyQ' && this.currentView === 'cat') {
        const cats = this.gameManager.getCatStates();
        if (cats.length > 0 && !cats[0].isCaught) {
          this.gameManager.toggleDisguise(cats[0].id);
        }
      }

      if (e.code === 'Tab') {
        e.preventDefault();
        this.toggleView();
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);

      if (e.code === 'Space' && this.currentView === 'ghost') {
        this.gameManager.setPerspectiveMode(false);
      }
    });

    this.setupDragRotation();
  }

  private setupDragRotation(): void {
    const canvas = this.sceneRenderer.getDomElement();

    canvas.addEventListener('mousedown', (e) => {
      if (this.currentView === 'ghost' && this.gameManager.getState() === 'playing') {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        canvas.style.cursor = 'grabbing';
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging && this.currentView === 'ghost') {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        const ghostState = this.gameManager.getGhostState();
        const euler = new THREE.Euler().copy(ghostState.rotation);
        euler.y -= deltaX * 0.005;
        euler.x -= deltaY * 0.005;
        euler.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, euler.x));
        this.gameManager.setGhostRotation(euler);
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        canvas.style.cursor = 'grab';
      }
    });

    canvas.style.cursor = 'grab';
  }

  private handleGhostMovement(delta: number): void {
    const dir = new THREE.Vector3();

    if (this.keys.has('KeyW')) dir.z -= 1;
    if (this.keys.has('KeyS')) dir.z += 1;
    if (this.keys.has('KeyA')) dir.x -= 1;
    if (this.keys.has('KeyD')) dir.x += 1;

    if (dir.length() > 0) {
      this.gameManager.moveGhost(dir, delta);
    }
  }

  private handleCatMovement(delta: number): void {
    this.catMoveDir.set(0, 0, 0);

    const cats = this.gameManager.getCatStates();
    const activeCats = cats.filter(c => !c.isCaught);
    if (activeCats.length === 0) return;

    const leadCat = activeCats[0];
    if (leadCat.isDisguised) return;

    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) this.catMoveDir.z -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) this.catMoveDir.z += 1;
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) this.catMoveDir.x -= 1;
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) this.catMoveDir.x += 1;

    if (this.catMoveDir.length() > 0) {
      this.gameManager.moveCat(leadCat.id, this.catMoveDir, delta);
    }
  }

  private updateUI(delta: number): void {
    const ghostState = this.gameManager.getGhostState();
    this.sceneRenderer.updateGhost(ghostState, delta);

    const catStates = this.gameManager.getCatStates();
    this.sceneRenderer.updateCats(catStates, delta);

    const activeCats = catStates.filter(c => !c.isCaught);

    if (this.currentView === 'ghost') {
      this.uiOverlay.updateGhostStatus(ghostState);
    } else {
      if (activeCats.length > 0) {
        this.sceneRenderer.updateCatCamera(activeCats[0].position);
      }
    }

    this.uiOverlay.updateTimer(this.gameManager.getRemainingTime());

    this.uiOverlay.updateCatCount(activeCats.length);

    if (activeCats.length > 0) {
      const leadCat = activeCats[0];
      this.uiOverlay.updateDisguiseStatus(leadCat.isDisguised, leadCat.disguiseType || undefined);
    }

    this.uiOverlay.updateTips(delta);

    this.sceneRenderer.update(delta);
  }

  private startRenderLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      const currentTime = performance.now();
      const delta = Math.min((currentTime - this.lastTime) / 1000, 0.1);
      this.lastTime = currentTime;

      if (this.gameManager.getState() !== 'playing') {
        this.sceneRenderer.update(delta);
      }

      this.sceneRenderer.render();
    };

    this.lastTime = performance.now();
    animate();
  }

  private startGame(): void {
    this.bestCatchImage = null;
    this.gameManager.startGame();
    this.sceneRenderer.initCats(this.gameManager.getCatStates());
    this.sceneRenderer.setCurrentView(this.currentView);
    this.uiOverlay.showScreen('game');
  }

  private handleGameEnd(stats: GameStats): void {
    this.uiOverlay.showScreen('result');
    this.uiOverlay.showResult(stats, this.bestCatchImage || undefined);
  }

  private restartGame(): void {
    this.bestCatchImage = null;
    this.gameManager.startGame();
    this.sceneRenderer.initCats(this.gameManager.getCatStates());
    this.sceneRenderer.setCurrentView(this.currentView);
    this.uiOverlay.showScreen('game');
  }

  private backToMenu(): void {
    this.gameManager = new GameManager();
    this.setupGameEvents();
    this.bestCatchImage = null;
    this.uiOverlay.showScreen('menu');
  }

  private toggleView(): void {
    this.currentView = this.currentView === 'ghost' ? 'cat' : 'ghost';
    this.sceneRenderer.setCurrentView(this.currentView);
  }

  destroy(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.gameManager.destroy();
    this.sceneRenderer.destroy();
    this.uiOverlay.destroy();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game('app');
});

export default Game;
