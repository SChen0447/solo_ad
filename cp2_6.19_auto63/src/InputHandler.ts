import { CANVAS_WIDTH, CANVAS_HEIGHT } from './types';

export type ClickCallback = (x: number, y: number) => void;
export type KeyCallback = (key: string) => void;

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private clickHandlers: ClickCallback[] = [];
  private keyHandlers: KeyCallback[] = [];
  private boundHandleClick: (e: MouseEvent) => void;
  private boundHandleKeyDown: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.attach();
  }

  private attach(): void {
    this.canvas.addEventListener('click', this.boundHandleClick);
    window.addEventListener('keydown', this.boundHandleKeyDown);
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.boundHandleClick);
    window.removeEventListener('keydown', this.boundHandleKeyDown);
  }

  onClick(callback: ClickCallback): void {
    this.clickHandlers.push(callback);
  }

  onKeyDown(callback: KeyCallback): void {
    this.keyHandlers.push(callback);
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    for (const handler of this.clickHandlers) {
      handler(x, y);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (['1', '2', '3', ' '].includes(e.key)) {
      e.preventDefault();
      for (const handler of this.keyHandlers) {
        handler(e.key);
      }
    }
  }
}
