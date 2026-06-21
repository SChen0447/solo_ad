import { GridState, Ripple, Particle, ElementType, ELEMENT_INFO, GRID_WIDTH, GRID_HEIGHT, CELL_SIZE } from './type';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cellSize: number = CELL_SIZE;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private time: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  public resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.canvas.width = width;
    this.canvas.height = height;

    const maxCellWidth = Math.floor(width / GRID_WIDTH);
    const maxCellHeight = Math.floor(height / GRID_HEIGHT);
    this.cellSize = Math.min(this.cellSize, Math.min(maxCellWidth, maxCellHeight));

    const gridPixelWidth = GRID_WIDTH * this.cellSize;
    const gridPixelHeight = GRID_HEIGHT * this.cellSize;
    this.offsetX = (width - gridPixelWidth) / 2;
    this.offsetY = (height - gridPixelHeight) / 2;
  }

  public getCellSize(): number {
    return this.cellSize;
  }

  public getOffsetX(): number {
    return this.offsetX;
  }

  public getOffsetY(): number {
    return this.offsetY;
  }

  public screenToGrid(screenX: number, screenY: number): { x: number; y: number } {
    const x = Math.floor((screenX - this.offsetX) / this.cellSize);
    const y = Math.floor((screenY - this.offsetY) / this.cellSize);
    return { x, y };
  }

  public render(grid: GridState, ripples: Ripple[], particles: Particle[], deltaTime: number): void {
    this.time += deltaTime;
    this.drawBackground();
    this.drawGrid(grid);
    this.drawRipples(ripples);
    this.drawParticles(particles);
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    const gradient = ctx.createRadialGradient(
      width * 0.7, height * 0.2, 0,
      width * 0.5, height * 0.5, Math.max(width, height) * 0.8
    );
    gradient.addColorStop(0, '#1a237e');
    gradient.addColorStop(0.5, '#0d1421');
    gradient.addColorStop(1, '#000000');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  private drawGrid(grid: GridState): void {
    const ctx = this.ctx;
    const imageData = ctx.createImageData(this.canvas.width, this.canvas.height);
    const data = imageData.data;

    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const cell = grid.cells[y][x];
        if (cell.type === ElementType.EMPTY) continue;

        const info = ELEMENT_INFO[cell.type];
        let { r, g, b } = info.colorRgb;
        const a = Math.floor(cell.opacity * 255);

        if (cell.type === ElementType.FIRE) {
          const flicker = 0.7 + Math.sin(this.time / 100 + x * 0.5 + y * 0.3) * 0.3;
          r = Math.floor(r * flicker);
          g = Math.floor(g * flicker);
          if (Math.random() < 0.1) {
            r = Math.min(255, r + 30);
            g = Math.min(255, g + 20);
          }
        }

        if (cell.type === ElementType.WATER) {
          const wave = 0.85 + Math.sin(this.time / 200 + x * 0.2 + y * 0.1) * 0.15;
          r = Math.floor(r * wave);
          g = Math.floor(g * wave);
          b = Math.floor(Math.min(255, b * (1 + wave * 0.1)));
        }

        if (cell.type === ElementType.WOOD && cell.burnTimer > 0) {
          const burnProgress = 1 - cell.burnTimer / 5000;
          r = Math.floor(r * (1 - burnProgress * 0.5));
          g = Math.floor(g * (1 - burnProgress * 0.7));
          b = Math.floor(b * (1 - burnProgress * 0.8));
          if (Math.random() < burnProgress * 0.3) {
            r = Math.min(255, r + 50);
          }
        }

        const pixelX = Math.floor(this.offsetX + x * this.cellSize);
        const pixelY = Math.floor(this.offsetY + y * this.cellSize);

        for (let py = 0; py < this.cellSize; py++) {
          for (let px = 0; px < this.cellSize; px++) {
            const idx = (pixelY + py) * this.canvas.width + (pixelX + px);
            const dataIdx = idx * 4;

            if (cell.type === ElementType.WATER || cell.type === ElementType.SMOKE || cell.type === ElementType.STEAM) {
              const bgR = data[dataIdx];
              const bgG = data[dataIdx + 1];
              const bgB = data[dataIdx + 2];
              const alpha = cell.opacity * (cell.type === ElementType.WATER ? 0.7 : 0.5);

              data[dataIdx] = Math.floor(bgR * (1 - alpha) + r * alpha);
              data[dataIdx + 1] = Math.floor(bgG * (1 - alpha) + g * alpha);
              data[dataIdx + 2] = Math.floor(bgB * (1 - alpha) + b * alpha);
              data[dataIdx + 3] = 255;
            } else {
              data[dataIdx] = r;
              data[dataIdx + 1] = g;
              data[dataIdx + 2] = b;
              data[dataIdx + 3] = a;
            }
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  private drawRipples(ripples: Ripple[]): void {
    const ctx = this.ctx;
    ctx.save();

    ctx.lineWidth = 1;

    for (const ripple of ripples) {
      const x = this.offsetX + (ripple.x + 0.5) * this.cellSize;
      const y = this.offsetY + (ripple.y + 0.5) * this.cellSize;
      const radius = ripple.radius * this.cellSize;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(200, 230, 255, ${ripple.alpha * 0.6})`;
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    ctx.save();

    for (const particle of particles) {
      const x = this.offsetX + particle.x * this.cellSize;
      const y = this.offsetY + particle.y * this.cellSize;
      const alpha = particle.life / particle.maxLife;
      const size = particle.size * this.cellSize * alpha;

      ctx.fillStyle = particle.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  public drawCursor(x: number, y: number, color: string): void {
    const ctx = this.ctx;
    ctx.save();

    const pixelX = this.offsetX + x * this.cellSize;
    const pixelY = this.offsetY + y * this.cellSize;
    const size = this.cellSize * 3;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;
    ctx.strokeRect(pixelX - 1, pixelY - 1, size + 2, size + 2);

    ctx.restore();
  }
}
