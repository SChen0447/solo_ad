import { FormationType } from './ShipManager';

export interface InputState {
  clickX: number;
  clickY: number;
  clicked: boolean;
  formationKey: number;
  focusFire: boolean;
}

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private inputState: InputState;
  private scaleX: number = 1;
  private scaleY: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.inputState = {
      clickX: 0,
      clickY: 0,
      clicked: false,
      formationKey: 0,
      focusFire: false
    };

    this.canvas.addEventListener('click', this.handleClick.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.inputState.clickX = (e.clientX - rect.left) / this.scaleX;
    this.inputState.clickY = (e.clientY - rect.top) / this.scaleY;
    this.inputState.clicked = true;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === '1') {
      this.inputState.formationKey = 1;
    } else if (e.key === '2') {
      this.inputState.formationKey = 2;
    } else if (e.key === '3') {
      this.inputState.formationKey = 3;
    } else if (e.code === 'Space') {
      e.preventDefault();
      this.inputState.focusFire = true;
    }
  }

  consumeInput(): InputState {
    const state = { ...this.inputState };
    this.inputState.clicked = false;
    this.inputState.formationKey = 0;
    this.inputState.focusFire = false;
    return state;
  }

  setScale(scaleX: number, scaleY: number): void {
    this.scaleX = scaleX;
    this.scaleY = scaleY;
  }

  destroy(): void {
    this.canvas.removeEventListener('click', this.handleClick.bind(this));
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }
}
