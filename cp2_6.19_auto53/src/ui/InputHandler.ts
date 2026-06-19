import type { GameEngine } from '../game/GameEngine';
import type { Renderer } from './Renderer';
import type { FormationType } from '../game/Formation';

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private gameEngine: GameEngine;
  private renderer: Renderer;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragEndX: number = 0;
  private dragEndY: number = 0;
  private onFormationChange: ((type: FormationType) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, gameEngine: GameEngine, renderer: Renderer) {
    this.canvas = canvas;
    this.gameEngine = gameEngine;
    this.renderer = renderer;

    this.bindEvents();
  }

  public setOnFormationChange(callback: (type: FormationType) => void): void {
    this.onFormationChange = callback;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const mapWidth = this.canvas.width * 0.7;
    if (x > mapWidth) return;

    if (e.button === 0) {
      this.isDragging = true;
      this.dragStartX = x;
      this.dragStartY = y;
      this.dragEndX = x;
      this.dragEndY = y;

      this.renderer.setSelectionRect({
        startX: this.dragStartX,
        startY: this.dragStartY,
        endX: this.dragEndX,
        endY: this.dragEndY,
        active: true
      });
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const mapWidth = this.canvas.width * 0.7;
    const clampedX = Math.min(Math.max(x, 0), mapWidth);
    const clampedY = Math.min(Math.max(y, 0), this.canvas.height);

    this.dragEndX = clampedX;
    this.dragEndY = clampedY;

    this.renderer.setSelectionRect({
      startX: this.dragStartX,
      startY: this.dragStartY,
      endX: this.dragEndX,
      endY: this.dragEndY,
      active: true
    });
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button !== 0) return;

    if (this.isDragging) {
      this.isDragging = false;

      const dx = Math.abs(this.dragEndX - this.dragStartX);
      const dy = Math.abs(this.dragEndY - this.dragStartY);

      if (dx > 5 || dy > 5) {
        this.gameEngine.selectUnitsInRect(
          this.dragStartX,
          this.dragStartY,
          this.dragEndX,
          this.dragEndY
        );
      } else {
        this.gameEngine.clearSelection();
      }

      this.renderer.setSelectionRect({
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        active: false
      });
    }
  }

  private onContextMenu(e: MouseEvent): void {
    e.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const mapWidth = this.canvas.width * 0.7;
    if (x > mapWidth) return;

    const selectedUnits = this.gameEngine.getSelectedUnits();
    if (selectedUnits.length === 0) return;

    this.gameEngine.moveUnitsToTarget(x, y);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === '1') {
      this.gameEngine.changeFormation('wedge');
      this.renderer.triggerFormationAnimation('wedge');
      if (this.onFormationChange) {
        this.onFormationChange('wedge');
      }
    } else if (e.key === '2') {
      this.gameEngine.changeFormation('line');
      this.renderer.triggerFormationAnimation('line');
      if (this.onFormationChange) {
        this.onFormationChange('line');
      }
    } else if (e.key === '`' || e.key === '0') {
      this.gameEngine.changeFormation('rect');
      this.renderer.triggerFormationAnimation('rect');
      if (this.onFormationChange) {
        this.onFormationChange('rect');
      }
    }
  }

  public destroy(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.removeEventListener('contextmenu', this.onContextMenu.bind(this));
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
  }
}
