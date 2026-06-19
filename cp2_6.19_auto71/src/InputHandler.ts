import type { FormationType } from './ShipManager';

export interface GameActions {
  moveTarget: { x: number; y: number } | null;
  changeFormation: FormationType | null;
  activateFocusFire: boolean;
}

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private actions: GameActions = {
    moveTarget: null,
    changeFormation: null,
    activateFocusFire: false
  };
  private boundMouseClick: (e: MouseEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.boundMouseClick = this.handleMouseClick.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);
    canvas.addEventListener('click', this.boundMouseClick);
    window.addEventListener('keydown', this.boundKeyDown);
  }

  private handleMouseClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    this.actions.moveTarget = { x, y };
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === '1') {
      this.actions.changeFormation = 'arrow';
    } else if (e.key === '2') {
      this.actions.changeFormation = 'line';
    } else if (e.key === '3') {
      this.actions.changeFormation = 'circle';
    } else if (e.code === 'Space') {
      e.preventDefault();
      this.actions.activateFocusFire = true;
    }
  }

  pollActions(): GameActions {
    const result = { ...this.actions };
    this.actions.moveTarget = null;
    this.actions.changeFormation = null;
    this.actions.activateFocusFire = false;
    return result;
  }

  destroy(): void {
    this.canvas.removeEventListener('click', this.boundMouseClick);
    window.removeEventListener('keydown', this.boundKeyDown);
  }
}
