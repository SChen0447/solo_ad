import type { Direction, Position } from '../game/types';
import type { GameEngine } from '../game/GameEngine';
import type { GameRenderer } from './GameRenderer';

export interface InputHandlers {
  onPlace: (pos: Position) => void;
  onRemove: (pos: Position) => void;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}

export class InputManager {
  engine: GameEngine;
  renderer: GameRenderer | null = null;
  element: HTMLElement | null = null;
  handlers: InputHandlers;
  joystickActive: boolean = false;
  joystickCenter: Position = { x: 0, y: 0 };
  lastDir: Direction | null = null;
  joystickTouchId: number | null = null;

  constructor(engine: GameEngine, handlers: InputHandlers) {
    this.engine = engine;
    this.handlers = handlers;
  }

  attach(element: HTMLElement, renderer: GameRenderer): void {
    this.element = element;
    this.renderer = renderer;

    window.addEventListener('keydown', this.handleKeyDown);
    element.addEventListener('mousemove', this.handleMouseMove);
    element.addEventListener('mouseleave', this.handleMouseLeave);
    element.addEventListener('click', this.handleClick);
    element.addEventListener('contextmenu', this.handleRightClick);
    element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    element.addEventListener('touchend', this.handleTouchEnd, { passive: false });
  }

  detach(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.element) {
      this.element.removeEventListener('mousemove', this.handleMouseMove);
      this.element.removeEventListener('mouseleave', this.handleMouseLeave);
      this.element.removeEventListener('click', this.handleClick);
      this.element.removeEventListener('contextmenu', this.handleRightClick);
      this.element.removeEventListener('touchstart', this.handleTouchStart);
      this.element.removeEventListener('touchmove', this.handleTouchMove);
      this.element.removeEventListener('touchend', this.handleTouchEnd);
    }
    this.element = null;
    this.renderer = null;
  }

  handleKeyDown = (e: KeyboardEvent): void => {
    if (this.engine.state.isWin || this.engine.state.isGameOver) return;

    switch (e.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        e.preventDefault();
        this.engine.movePlayer('up');
        break;
      case 's':
      case 'arrowdown':
        e.preventDefault();
        this.engine.movePlayer('down');
        break;
      case 'a':
      case 'arrowleft':
        e.preventDefault();
        this.engine.movePlayer('left');
        break;
      case 'd':
      case 'arrowright':
        e.preventDefault();
        this.engine.movePlayer('right');
        break;
      case 'e':
        e.preventDefault();
        if (this.renderer && this.renderer.hoverCell) {
          this.handlers.onPlace(this.renderer.hoverCell);
        }
        break;
      case 'r':
        e.preventDefault();
        this.engine.rotateMirror();
        break;
      case '1':
        e.preventDefault();
        this.engine.selectTool('mirror');
        break;
      case '2':
        e.preventDefault();
        this.engine.selectTool('prism');
        break;
      case 'escape':
        e.preventDefault();
        this.engine.selectTool(null);
        break;
    }
  };

  handleMouseMove = (e: MouseEvent): void => {
    if (!this.renderer || !this.element) return;
    const rect = this.element.getBoundingClientRect();
    const scaleX = (this.element as HTMLCanvasElement).width / rect.width;
    const scaleY = (this.element as HTMLCanvasElement).height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    this.renderer.setMousePos({ x, y });
  };

  handleMouseLeave = (): void => {
    if (!this.renderer) return;
    this.renderer.setMousePos(null);
  };

  handleClick = (e: MouseEvent): void => {
    if (!this.renderer || !this.element) return;
    const rect = this.element.getBoundingClientRect();
    const scaleX = (this.element as HTMLCanvasElement).width / rect.width;
    const scaleY = (this.element as HTMLCanvasElement).height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const cell = this.renderer.screenToCell(x, y);
    this.handlers.onPlace(cell);
  };

  handleRightClick = (e: MouseEvent): void => {
    e.preventDefault();
    if (!this.renderer || !this.element) return;
    const rect = this.element.getBoundingClientRect();
    const scaleX = (this.element as HTMLCanvasElement).width / rect.width;
    const scaleY = (this.element as HTMLCanvasElement).height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const cell = this.renderer.screenToCell(x, y);
    this.handlers.onRemove(cell);
  };

  handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (!this.renderer || !this.element) return;

    const touch = e.touches[0];
    const rect = this.element.getBoundingClientRect();
    const scaleX = (this.element as HTMLCanvasElement).width / rect.width;
    const scaleY = (this.element as HTMLCanvasElement).height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;
    this.renderer.setMousePos({ x, y });
  };

  handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (!this.renderer || !this.element) return;

    const touch = e.touches[0];
    const rect = this.element.getBoundingClientRect();
    const scaleX = (this.element as HTMLCanvasElement).width / rect.width;
    const scaleY = (this.element as HTMLCanvasElement).height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;
    this.renderer.setMousePos({ x, y });
  };

  handleTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();
    if (!this.renderer || !this.element) return;

    const touch = e.changedTouches[0];
    const rect = this.element.getBoundingClientRect();
    const scaleX = (this.element as HTMLCanvasElement).width / rect.width;
    const scaleY = (this.element as HTMLCanvasElement).height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;
    const cell = this.renderer.screenToCell(x, y);
    this.handlers.onPlace(cell);
    this.renderer.setMousePos(null);
  };

  handleJoystickMove = (dx: number, dy: number): void => {
    const threshold = 20;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
      this.lastDir = null;
      return;
    }

    let dir: Direction;
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? 'right' : 'left';
    } else {
      dir = dy > 0 ? 'down' : 'up';
    }

    if (dir !== this.lastDir) {
      this.lastDir = dir;
      this.engine.movePlayer(dir);
    }
  };
}
