export interface MinimapData {
  playerCell: { x: number; y: number };
  explored: boolean[][];
  keyPositions: { x: number; y: number; collected: boolean }[];
  portalPosition: { x: number; y: number } | null;
  mazeWidth: number;
  mazeHeight: number;
}

export class UIManager {
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;
  private floorValue: HTMLElement;
  private fragValue: HTMLElement;
  private whiteOverlay: HTMLElement;
  private slots: HTMLElement[];

  constructor() {
    const mCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
    if (!mCanvas) throw new Error('Minimap canvas not found');
    this.minimapCanvas = mCanvas;
    this.minimapCanvas.width = 360;
    this.minimapCanvas.height = 360;
    const ctx = this.minimapCanvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get minimap context');
    this.minimapCtx = ctx;

    const fv = document.getElementById('floor-value');
    if (!fv) throw new Error('Floor value element not found');
    this.floorValue = fv;

    const fcv = document.getElementById('frag-value');
    if (!fcv) throw new Error('Fragment value element not found');
    this.fragValue = fcv;

    const wo = document.getElementById('white-overlay');
    if (!wo) throw new Error('White overlay element not found');
    this.whiteOverlay = wo;

    const slotEls = document.querySelectorAll('#collect-slots .slot');
    this.slots = Array.from(slotEls) as HTMLElement[];
  }

  public updateMinimap(data: MinimapData, time: number): void {
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(cx, cy) - 2, 0, Math.PI * 2);
    ctx.clip();

    const cellSize = Math.min((w - 20) / data.mazeWidth, (h - 20) / data.mazeHeight);
    const offsetX = cx - (data.mazeWidth * cellSize) / 2;
    const offsetY = cy - (data.mazeHeight * cellSize) / 2;

    for (let y = 0; y < data.mazeHeight; y++) {
      for (let x = 0; x < data.mazeWidth; x++) {
        const px = offsetX + x * cellSize;
        const py = offsetY + y * cellSize;

        if (data.explored[y] && data.explored[y][x]) {
          ctx.fillStyle = 'rgba(60, 40, 100, 0.85)';
        } else {
          ctx.fillStyle = 'rgba(20, 10, 40, 0.95)';
        }
        ctx.fillRect(px, py, cellSize - 0.5, cellSize - 0.5);
      }
    }

    data.keyPositions.forEach((key, i) => {
      if (!key.collected && data.explored[key.y] && data.explored[key.y][key.x]) {
        const pulse = 0.6 + 0.4 * Math.sin(time * Math.PI * 2 / 0.8);
        const kx = offsetX + key.x * cellSize + cellSize / 2;
        const ky = offsetY + key.y * cellSize + cellSize / 2;
        ctx.fillStyle = `rgba(255, 215, 80, ${pulse})`;
        this.drawStar(ctx, kx, ky, cellSize * 0.4, cellSize * 0.18, 4);
      }
    });

    if (data.portalPosition && data.explored[data.portalPosition.y] && data.explored[data.portalPosition.y][data.portalPosition.x]) {
      const px = offsetX + data.portalPosition.x * cellSize + cellSize / 2;
      const py = offsetY + data.portalPosition.y * cellSize + cellSize / 2;
      ctx.strokeStyle = 'rgba(180, 100, 255, 0.95)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(px, py, cellSize * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(120, 60, 200, 0.5)';
      ctx.fill();
    }

    const px = offsetX + data.playerCell.x * cellSize + cellSize / 2;
    const py = offsetY + data.playerCell.y * cellSize + cellSize / 2;
    ctx.fillStyle = 'rgba(255, 220, 120, 1)';
    ctx.beginPath();
    ctx.arc(px, py, cellSize * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 200, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
    points: number
  ): void {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  public updateFloor(floor: number): void {
    this.floorValue.textContent = String(floor);
  }

  public updateFragments(count: number): void {
    this.fragValue.textContent = String(count);
  }

  public fillSlot(index: number): void {
    if (index >= 0 && index < this.slots.length) {
      this.slots[index].classList.add('filled');
    }
  }

  public resetSlots(): void {
    this.slots.forEach(s => s.classList.remove('filled'));
  }

  public async showTransition(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.whiteOverlay.classList.add('active');
      setTimeout(() => {
        this.whiteOverlay.classList.remove('active');
        setTimeout(resolve, 500);
      }, 500);
    });
  }
}
