import { eventBus, GameEvents } from '../core/EventBus';

export interface PingStartData {
  timestamp: number;
}

export interface PingEndData {
  timestamp: number;
  duration: number;
  originX: number;
  originY: number;
}

export interface MouseMoveData {
  x: number;
  y: number;
}

export interface KeyMoveData {
  direction: 'left' | 'right' | 'up' | 'down' | null;
  horizontal: number;
  vertical: number;
}

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private pingStartTimestamp: number = 0;
  private isPinging: boolean = false;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private keys: Set<string> = new Set();
  private boundHandleKeyDown: (e: KeyboardEvent) => void;
  private boundHandleKeyUp: (e: KeyboardEvent) => void;
  private boundHandleMouseMove: (e: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleKeyUp = this.handleKeyUp.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
  }

  public init(): void {
    window.addEventListener('keydown', this.boundHandleKeyDown);
    window.addEventListener('keyup', this.boundHandleKeyUp);
    this.canvas.addEventListener('mousemove', this.boundHandleMouseMove);
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.boundHandleKeyDown);
    window.removeEventListener('keyup', this.boundHandleKeyUp);
    this.canvas.removeEventListener('mousemove', this.boundHandleMouseMove);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.code);

    if (e.code === 'Space' && !this.isPinging && !e.repeat) {
      this.isPinging = true;
      this.pingStartTimestamp = performance.now();
      eventBus.emit(GameEvents.INPUT_PING_START, {
        timestamp: this.pingStartTimestamp
      } as PingStartData);
    }

    this.emitMoveData();
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);

    if (e.code === 'Space' && this.isPinging) {
      this.isPinging = false;
      const endTimestamp = performance.now();
      const duration = endTimestamp - this.pingStartTimestamp;
      eventBus.emit(GameEvents.INPUT_PING_END, {
        timestamp: endTimestamp,
        duration: duration,
        originX: this.mouseX,
        originY: this.mouseY
      } as PingEndData);
    }

    this.emitMoveData();
  }

  private emitMoveData(): void {
    let horizontal = 0;
    let vertical = 0;
    let direction: 'left' | 'right' | 'up' | 'down' | null = null;

    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) {
      horizontal -= 1;
      direction = 'left';
    }
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) {
      horizontal += 1;
      direction = 'right';
    }
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) {
      vertical -= 1;
      direction = direction || 'up';
    }
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) {
      vertical += 1;
      direction = direction || 'down';
    }

    eventBus.emit(GameEvents.INPUT_KEY_MOVE, {
      direction,
      horizontal,
      vertical
    } as KeyMoveData);
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;

    eventBus.emit(GameEvents.INPUT_MOUSE_MOVE, {
      x: this.mouseX,
      y: this.mouseY
    } as MouseMoveData);
  }

  public getMousePosition(): { x: number; y: number } {
    return { x: this.mouseX, y: this.mouseY };
  }
}
