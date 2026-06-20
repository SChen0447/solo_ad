import { ParticleType, PARTICLE_TYPE_KEYS } from './particleTypes';
import { ParticleSystem } from './particleSystem';
import { StarField } from './starField';

export interface InteractionState {
  currentType: ParticleType;
  isMouseDown: boolean;
  isRightMouseDown: boolean;
  mouseX: number;
  mouseY: number;
  lastMouseX: number;
  lastMouseY: number;
  emitRate: number;
}

export class InteractionManager {
  private canvas: HTMLCanvasElement;
  private particleSystem: ParticleSystem;
  private starField: StarField;
  private state: InteractionState;
  private onTypeChange?: (type: ParticleType) => void;
  private onPanChange?: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    particleSystem: ParticleSystem,
    starField: StarField
  ) {
    this.canvas = canvas;
    this.particleSystem = particleSystem;
    this.starField = starField;
    this.state = {
      currentType: ParticleType.FIRE,
      isMouseDown: false,
      isRightMouseDown: false,
      mouseX: 0,
      mouseY: 0,
      lastMouseX: 0,
      lastMouseY: 0,
      emitRate: 3
    };

    this.bindEvents();
  }

  setOnTypeChange(callback: (type: ParticleType) => void): void {
    this.onTypeChange = callback;
  }

  setOnPanChange(callback: () => void): void {
    this.onPanChange = callback;
  }

  getCurrentType(): ParticleType {
    return this.state.currentType;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));

    window.addEventListener('keydown', this.onKeyDown.bind(this));

    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
  }

  private getWorldCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const offset = this.particleSystem.getOffset();
    return {
      x: clientX - rect.left + offset.x,
      y: clientY - rect.top + offset.y
    };
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.state.isMouseDown = true;
      this.state.mouseX = e.clientX;
      this.state.mouseY = e.clientY;
      this.state.lastMouseX = e.clientX;
      this.state.lastMouseY = e.clientY;
      this.emitParticle(e.clientX, e.clientY);
    } else if (e.button === 2) {
      this.state.isRightMouseDown = true;
      this.state.lastMouseX = e.clientX;
      this.state.lastMouseY = e.clientY;
      this.canvas.style.cursor = 'grabbing';
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      this.state.isMouseDown = false;
    } else if (e.button === 2) {
      this.state.isRightMouseDown = false;
      this.canvas.style.cursor = 'crosshair';
    }
  }

  private onMouseMove(e: MouseEvent): void {
    this.state.mouseX = e.clientX;
    this.state.mouseY = e.clientY;

    if (this.state.isMouseDown) {
      this.emitParticlesAlongLine(
        this.state.lastMouseX,
        this.state.lastMouseY,
        e.clientX,
        e.clientY
      );
    }

    if (this.state.isRightMouseDown) {
      const dx = e.clientX - this.state.lastMouseX;
      const dy = e.clientY - this.state.lastMouseY;

      const offset = this.particleSystem.getOffset();
      this.particleSystem.setOffset(offset.x - dx, offset.y - dy);

      this.starField.rotateBy(dx, dy);

      if (this.onPanChange) {
        this.onPanChange();
      }
    }

    this.state.lastMouseX = e.clientX;
    this.state.lastMouseY = e.clientY;
  }

  private onMouseLeave(): void {
    this.state.isMouseDown = false;
    this.state.isRightMouseDown = false;
    this.canvas.style.cursor = 'crosshair';
  }

  private onKeyDown(e: KeyboardEvent): void {
    const key = e.key;

    if (key >= '1' && key <= '5') {
      const index = parseInt(key) - 1;
      if (index < PARTICLE_TYPE_KEYS.length) {
        this.state.currentType = PARTICLE_TYPE_KEYS[index];
        if (this.onTypeChange) {
          this.onTypeChange(this.state.currentType);
        }
      }
    }

    if (key === ' ' || key === 'Spacebar') {
      e.preventDefault();
      this.particleSystem.clear();
    }

    if (key === 'c' || key === 'C') {
      this.particleSystem.clear();
    }
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.state.isMouseDown = true;
      this.state.mouseX = touch.clientX;
      this.state.mouseY = touch.clientY;
      this.state.lastMouseX = touch.clientX;
      this.state.lastMouseY = touch.clientY;
      this.emitParticle(touch.clientX, touch.clientY);
    }
  }

  private onTouchEnd(): void {
    this.state.isMouseDown = false;
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1 && this.state.isMouseDown) {
      const touch = e.touches[0];
      this.emitParticlesAlongLine(
        this.state.lastMouseX,
        this.state.lastMouseY,
        touch.clientX,
        touch.clientY
      );
      this.state.lastMouseX = touch.clientX;
      this.state.lastMouseY = touch.clientY;
      this.state.mouseX = touch.clientX;
      this.state.mouseY = touch.clientY;
    }
  }

  private emitParticle(clientX: number, clientY: number): void {
    const coords = this.getWorldCoords(clientX, clientY);
    this.particleSystem.spawnParticle(coords.x, coords.y, this.state.currentType);
  }

  private emitParticlesAlongLine(x1: number, y1: number, x2: number, y2: number): void {
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const steps = Math.max(1, Math.floor(dist / 8));

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;

      for (let j = 0; j < this.state.emitRate; j++) {
        const offsetX = (Math.random() - 0.5) * 10;
        const offsetY = (Math.random() - 0.5) * 10;
        const coords = this.getWorldCoords(x + offsetX, y + offsetY);
        const vx = (Math.random() - 0.5) * 3;
        const vy = (Math.random() - 0.5) * 3;
        this.particleSystem.spawnParticle(coords.x, coords.y, this.state.currentType, vx, vy);
      }
    }
  }

  update(): void {
    if (this.state.isMouseDown) {
      for (let i = 0; i < this.state.emitRate; i++) {
        const offsetX = (Math.random() - 0.5) * 12;
        const offsetY = (Math.random() - 0.5) * 12;
        const coords = this.getWorldCoords(
          this.state.mouseX + offsetX,
          this.state.mouseY + offsetY
        );
        const vx = (Math.random() - 0.5) * 2;
        const vy = (Math.random() - 0.5) * 2;
        this.particleSystem.spawnParticle(
          coords.x,
          coords.y,
          this.state.currentType,
          vx,
          vy
        );
      }
    }
  }

  dispose(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.removeEventListener('mouseleave', this.onMouseLeave.bind(this));
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
  }
}
