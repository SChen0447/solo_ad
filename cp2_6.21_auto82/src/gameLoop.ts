import { ParticleSystem } from './particleSystem';
import { FieldManager } from './fieldManager';
import { Renderer } from './renderer';
import { GameState } from './renderer';
import { getLevel, getTotalLevels, LevelConfig } from './levelLoader';

export class GameLoop {
  private particleSystem: ParticleSystem;
  private fieldManager: FieldManager;
  private renderer: Renderer;
  private lastTime = 0;
  private fps = 60;
  private fpsFrames = 0;
  private fpsTime = 0;
  private levelIndex = 0;
  private levelConfig: LevelConfig | null = null;
  private state: GameState = 'playing';
  private levelCompleteElapsed = 0;
  private timeLeft = 120;
  private performanceMode = false;
  private fpsLowCounter = 0;
  private dragStart: { x: number; y: number } | null = null;
  private isDragging = false;

  constructor(
    particleSystem: ParticleSystem,
    fieldManager: FieldManager,
    renderer: Renderer,
  ) {
    this.particleSystem = particleSystem;
    this.fieldManager = fieldManager;
    this.renderer = renderer;
  }

  loadLevel(index: number): boolean {
    const config = getLevel(index);
    if (!config) return false;

    this.levelConfig = config;
    this.levelIndex = index;
    this.state = 'playing';
    this.levelCompleteElapsed = 0;
    this.timeLeft = config.timeLimit;
    this.performanceMode = false;

    this.particleSystem.initParticles(config.particles);
    this.particleSystem.setObstacles(config.obstacles);
    this.particleSystem.setPerformanceMode(false);
    this.fieldManager.updateFields(config.targets);
    this.renderer.resetTargetState();

    return true;
  }

  handleKeyDown(key: string): void {
    if (this.state !== 'playing') return;

    if (key === ' ' || key === 'Space') {
      const idx = this.particleSystem.getSelectedIndex();
      if (idx >= 0) {
        this.particleSystem.updatePolarity(idx);
      }
    }

    if (key === 'Tab') {
      this.particleSystem.selectNext();
    }
  }

  handleMouseDown(x: number, y: number): void {
    if (this.state !== 'playing') return;
    this.dragStart = { x, y };
    this.isDragging = true;
  }

  handleMouseMove(_x: number, _y: number): void {
  }

  handleMouseUp(x: number, y: number): void {
    if (!this.isDragging || !this.dragStart || this.state !== 'playing') {
      this.isDragging = false;
      this.dragStart = null;
      return;
    }

    const idx = this.particleSystem.getSelectedIndex();
    if (idx >= 0) {
      const p = this.particleSystem.particles[idx];
      if (!p.reached) {
        const dx = p.x - x;
        const dy = p.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxForce = 50;
        const forceMag = Math.min(dist * 0.5, maxForce);
        if (dist > 1) {
          const fx = (dx / dist) * forceMag;
          const fy = (dy / dist) * forceMag;
          this.particleSystem.applyForce(idx, fx, fy);
        }
      }
    }

    this.isDragging = false;
    this.dragStart = null;
  }

  update(timestamp: number): void {
    if (this.lastTime === 0) {
      this.lastTime = timestamp;
      return;
    }

    const rawDt = (timestamp - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05);
    this.lastTime = timestamp;

    this.fpsFrames++;
    this.fpsTime += rawDt;
    if (this.fpsTime >= 0.5) {
      this.fps = this.fpsFrames / this.fpsTime;
      this.fpsFrames = 0;
      this.fpsTime = 0;

      if (this.fps < 50) {
        this.fpsLowCounter++;
        if (this.fpsLowCounter > 2 && !this.performanceMode) {
          this.performanceMode = true;
          this.particleSystem.setPerformanceMode(true);
        }
      } else if (this.fps > 55) {
        this.fpsLowCounter = Math.max(0, this.fpsLowCounter - 1);
        if (this.fpsLowCounter === 0 && this.performanceMode) {
          this.performanceMode = false;
          this.particleSystem.setPerformanceMode(false);
        }
      }
    }

    if (this.state === 'playing') {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.state = 'gameOver';
      }

      if (this.levelConfig) {
        this.particleSystem.updateObstacles(dt);
      }

      this.particleSystem.updateParticles(dt);

      if (this.levelConfig) {
        const reached = this.particleSystem.checkTargetReached(this.levelConfig.targets);
        if (reached.length > 0) {
          this.renderer.updateTargetFlashes(dt, reached);
          for (const ri of reached) {
            this.fieldManager.removeField(ri);
          }
        }

        if (this.particleSystem.allReached()) {
          this.state = 'levelComplete';
          this.levelCompleteElapsed = 0;
        }
      }
    } else if (this.state === 'levelComplete') {
      this.levelCompleteElapsed += dt;
      if (this.levelCompleteElapsed >= 2.5) {
        if (this.levelIndex + 1 < getTotalLevels()) {
          this.loadLevel(this.levelIndex + 1);
        } else {
          this.state = 'gameWin';
        }
      }
    } else if (this.state === 'gameOver') {
    }

    this.renderer.updateTargetFlashes(dt, []);

    this.renderer.draw(
      dt,
      this.particleSystem,
      this.fieldManager,
      this.levelConfig?.obstacles ?? [],
      this.levelConfig?.targets ?? [],
      this.levelIndex,
      this.fps,
      this.timeLeft,
      this.state,
      this.levelCompleteElapsed,
      this.performanceMode,
      this.isDragging ? this.dragStart : null,
    );
  }

  getState(): GameState {
    return this.state;
  }

  restartLevel(): void {
    this.loadLevel(this.levelIndex);
  }
}
