import type { HexCoord } from './synthesis-rules';

export interface InputHandlers {
  onDragStart: (elementId: string, screenX: number, screenY: number) => void;
  onDragMove: (screenX: number, screenY: number) => void;
  onDragEnd: (hexCoord: HexCoord | null) => void;
  onCellClick: (hexCoord: HexCoord, button: number) => void;
  onSpaceKey: () => void;
  onMouseMove: (screenX: number, screenY: number) => void;
}

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private handlers: InputHandlers;
  private hexSize: number;
  private offsetX: number;
  private offsetY: number;

  private isDragging: boolean = false;

  constructor(
    canvas: HTMLCanvasElement,
    handlers: InputHandlers,
    hexSize: number,
    offsetX: number,
    offsetY: number
  ) {
    this.canvas = canvas;
    this.handlers = handlers;
    this.hexSize = hexSize;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.bindEvents();
  }

  setOffset(offsetX: number, offsetY: number): void {
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  setHexSize(size: number): void {
    this.hexSize = size;
  }

  startDragFromPanel(elementId: string, clientX: number, clientY: number): void {
    this.isDragging = true;
    this.dragElementId = elementId;
    this.dragStartX = clientX;
    this.dragStartY = clientY;
    this.handlers.onDragStart(elementId, clientX, clientY);
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('mousemove', this.handleGlobalMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleGlobalMouseUp.bind(this));
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.handlers.onMouseMove(x, y);
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
  }

  private handleMouseUp(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hexCoord = this.pixelToHex(x, y);

    if (e.button === 0 && hexCoord) {
      this.handlers.onCellClick(hexCoord, 0);
    }
  }

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hexCoord = this.pixelToHex(x, y);
    if (hexCoord) {
      this.handlers.onCellClick(hexCoord, 2);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      e.preventDefault();
      this.handlers.onSpaceKey();
    }
  }

  private handleGlobalMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      this.handlers.onDragMove(e.clientX, e.clientY);
    }
  }

  private handleGlobalMouseUp(e: MouseEvent): void {
    if (this.isDragging && e.button === 0) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const hexCoord = this.pixelToHex(x, y);

      this.isDragging = false;
      this.dragElementId = null;
      this.handlers.onDragEnd(hexCoord);
    }
  }

  pixelToHex(x: number, y: number): HexCoord | null {
    const px = x - this.offsetX;
    const py = y - this.offsetY;

    const size = this.hexSize;
    const q = ((Math.sqrt(3) / 3) * px - (1 / 3) * py) / size;
    const r = ((2 / 3) * py) / size;

    return this.roundHex(q, r);
  }

  hexToPixel(q: number, r: number): { x: number; y: number } {
    const size = this.hexSize;
    const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const y = size * ((3 / 2) * r);
    return {
      x: x + this.offsetX,
      y: y + this.offsetY
    };
  }

  private roundHex(q: number, r: number): HexCoord {
    const s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);

    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);

    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      rr = -rq - rs;
    }

    return { q: rq, r: rr };
  }

  destroy(): void {
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu.bind(this));
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('mousemove', this.handleGlobalMouseMove.bind(this));
    document.removeEventListener('mouseup', this.handleGlobalMouseUp.bind(this));
  }
}
