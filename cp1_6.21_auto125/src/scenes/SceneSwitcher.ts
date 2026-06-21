import Phaser from 'phaser';
import { GravityManager, PlanetData } from '../physics/GravityManager';
import { UIOverlay } from '../ui/UIOverlay';

export interface SceneTransitionCallback {
  (planet: PlanetData): void;
}

export class SceneSwitcher {
  private scene: Phaser.Scene;
  private gravityManager: GravityManager;
  private uiOverlay: UIOverlay | null = null;
  private transitionOverlay: Phaser.GameObjects.Graphics | null = null;
  private transitionProgress: number = 0;
  private isTransitioning: boolean = false;
  private transitionDuration: number = 1500;
  private pendingPlanetId: string | null = null;
  private transitionPhase: 'fade_out' | 'fade_in' | 'none' = 'none';
  private onTransitionStart: SceneTransitionCallback | null = null;
  private onTransitionComplete: SceneTransitionCallback | null = null;

  constructor(scene: Phaser.Scene, gravityManager: GravityManager) {
    this.scene = scene;
    this.gravityManager = gravityManager;
  }

  public setUIOverlay(overlay: UIOverlay): void {
    this.uiOverlay = overlay;
  }

  public setOnTransitionStart(callback: SceneTransitionCallback): void {
    this.onTransitionStart = callback;
  }

  public setOnTransitionComplete(callback: SceneTransitionCallback): void {
    this.onTransitionComplete = callback;
  }

  public switchToPlanet(planetId: string): boolean {
    if (this.isTransitioning) {
      this.pendingPlanetId = planetId;
      return false;
    }

    const planet = this.gravityManager.getAllPlanets().find(p => p.id === planetId);
    if (!planet || planet.id === this.gravityManager.getCurrentPlanet().id) {
      return false;
    }

    this.beginTransition(planet);
    return true;
  }

  private beginTransition(planet: PlanetData): void {
    this.isTransitioning = true;
    this.transitionPhase = 'fade_out';
    this.transitionProgress = 0;

    if (this.onTransitionStart) {
      this.onTransitionStart(planet);
    }

    const gravitySwitched = this.gravityManager.switchToPlanet(planet.id);
    if (gravitySwitched) {
      this.uiOverlay?.setSelectedPlanet(planet.id);
    }
  }

  private createTransitionOverlay(): void {
    if (this.transitionOverlay) return;

    this.transitionOverlay = this.scene.add.graphics();
    this.transitionOverlay.setDepth(2000);
    this.transitionOverlay.setScrollFactor(0);
  }

  private updateTransitionOverlay(alpha: number): void {
    if (!this.transitionOverlay) return;

    const w = this.scene.scale.width;
    const h = this.scene.scale.height;

    this.transitionOverlay.clear();
    this.transitionOverlay.fillStyle(0x000000, alpha);
    this.transitionOverlay.fillRect(0, 0, w, h);

    const planet = this.gravityManager.getCurrentPlanet();
    const ringAlpha = alpha * 0.5;
    this.transitionOverlay.lineStyle(4, planet.accentColor, ringAlpha);
    this.transitionOverlay.strokeCircle(w / 2, h / 2, 50 + (1 - alpha) * 200);
  }

  public update(time: number, delta: number): void {
    if (this.gravityManager.isTransitioning()) {
      this.uiOverlay?.updatePlanetInfo(
        this.gravityManager.getCurrentPlanet(),
        this.gravityManager.getCurrentGravity() / this.gravityManager.getBaseGravity()
      );
    }

    if (!this.isTransitioning) {
      if (this.transitionOverlay) {
        this.transitionOverlay.clear();
        this.transitionOverlay.setAlpha(0);
      }
      return;
    }

    this.transitionProgress += delta;
    let t = Math.min(this.transitionProgress / this.transitionDuration, 1);
    t = this.easeInOutCubic(t);

    this.createTransitionOverlay();

    let overlayAlpha: number;
    if (this.transitionPhase === 'fade_out') {
      overlayAlpha = t * 0.25;
    } else {
      overlayAlpha = (1 - t) * 0.25;
    }

    this.updateTransitionOverlay(overlayAlpha);

    if (t >= 1) {
      if (this.transitionPhase === 'fade_out') {
        this.transitionPhase = 'fade_in';
        this.transitionProgress = 0;
      } else {
        this.finishTransition();
      }
    }
  }

  private finishTransition(): void {
    this.isTransitioning = false;
    this.transitionPhase = 'none';
    this.transitionProgress = 0;

    if (this.transitionOverlay) {
      this.transitionOverlay.clear();
    }

    const planet = this.gravityManager.getCurrentPlanet();
    if (this.onTransitionComplete) {
      this.onTransitionComplete(planet);
    }

    if (this.pendingPlanetId) {
      const nextId = this.pendingPlanetId;
      this.pendingPlanetId = null;
      this.switchToPlanet(nextId);
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public getIsTransitioning(): boolean {
    return this.isTransitioning;
  }

  public destroy(): void {
    if (this.transitionOverlay) {
      this.transitionOverlay.destroy();
      this.transitionOverlay = null;
    }
  }
}
