import { GameEngine } from '../game/GameEngine';
import { FormationType } from '../game/Formation';
import { SelectionBox } from './Renderer';

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private engine: GameEngine;
  private selectionBox: SelectionBox | null = null;
  private rightClickTarget: { x: number; y: number } | null = null;
  private rightClickTargetTime: number = 0;

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas;
    this.engine = engine;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  private getCanvasPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private onMouseDown(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);

    if (e.button === 0) {
      if (!e.shiftKey) {
        this.engine.clearSelection();
      }
      this.selectionBox = {
        startX: pos.x,
        startY: pos.y,
        endX: pos.x,
        endY: pos.y,
        isSelecting: true,
      };
    } else if (e.button === 2) {
      this.rightClickTarget = pos;
      this.rightClickTargetTime = performance.now();
      this.engine.moveUnitsToTarget(pos);
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);

    if (this.selectionBox && this.selectionBox.isSelecting) {
      this.selectionBox.endX = pos.x;
      this.selectionBox.endY = pos.y;
    }
  }

  private onMouseUp(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);

    if (e.button === 0 && this.selectionBox) {
      this.selectionBox.endX = pos.x;
      this.selectionBox.endY = pos.y;
      this.selectionBox.isSelecting = false;

      const width = Math.abs(this.selectionBox.endX - this.selectionBox.startX);
      const height = Math.abs(this.selectionBox.endY - this.selectionBox.startY);

      if (width > 5 || height > 5) {
        this.engine.selectUnitsInRect({
          x: this.selectionBox.startX,
          y: this.selectionBox.startY,
          width,
          height,
        }, e.shiftKey);
      }

      this.selectionBox = null;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === '1') {
      this.engine.setFormation('wedge');
    } else if (e.key === '2') {
      this.engine.setFormation('line');
    } else if (e.key === '3') {
      this.engine.setFormation('rect');
    } else if (e.key === 'Escape') {
      this.engine.clearSelection();
    }
  }

  public getSelectionBox(): SelectionBox | null {
    return this.selectionBox;
  }

  public getRightClickTarget(): { x: number; y: number } | null {
    const now = performance.now();
    if (now - this.rightClickTargetTime > 2000) {
      this.rightClickTarget = null;
    }
    return this.rightClickTarget;
  }

  public destroy(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.onMouseUp.bind(this));
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
  }
}
