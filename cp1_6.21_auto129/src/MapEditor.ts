import { TileType, TileMatrix, ExportData, TILE_INFO, GRID_SIZE, TILE_SIZE } from './types';

interface EraseAnimation {
  gridX: number;
  gridY: number;
  startTime: number;
  duration: number;
}

export class MapEditor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private matrix: TileMatrix;
  private selectedTile: TileType = TileType.Grass;
  private mouseGridX: number = -1;
  private mouseGridY: number = -1;
  private isMouseInCanvas: boolean = false;
  private isLeftDragging: boolean = false;
  private isRightDragging: boolean = false;
  private eraseAnimations: EraseAnimation[] = [];
  private pulseStartTime: number = 0;
  private onMatrixChange?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;

    this.matrix = this.createEmptyMatrix();
    this.bindEvents();
    this.pulseStartTime = performance.now();
    this.animate();
  }

  private createEmptyMatrix(): TileMatrix {
    const m: TileMatrix = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      m[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        m[y][x] = TileType.Empty;
      }
    }
    return m;
  }

  setOnMatrixChange(callback: () => void): void {
    this.onMatrixChange = callback;
  }

  getMatrix(): TileMatrix {
    return JSON.parse(JSON.stringify(this.matrix));
  }

  setMatrix(matrix: TileMatrix): void {
    this.matrix = JSON.parse(JSON.stringify(matrix));
    if (this.onMatrixChange) this.onMatrixChange();
  }

  getSelectedTile(): TileType {
    return this.selectedTile;
  }

  setSelectedTile(tile: TileType): void {
    this.selectedTile = tile;
  }

  exportToJSON(): ExportData {
    return {
      width: GRID_SIZE,
      height: GRID_SIZE,
      tileSize: TILE_SIZE,
      matrix: this.getMatrix()
    };
  }

  exportToJSONString(): string {
    return JSON.stringify(this.exportToJSON(), null, 2);
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private getGridPosition(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((clientY - rect.top) / TILE_SIZE);
    return { x, y };
  }

  private handleMouseMove(e: MouseEvent): void {
    const pos = this.getGridPosition(e.clientX, e.clientY);
    this.mouseGridX = pos.x;
    this.mouseGridY = pos.y;

    if (this.isLeftDragging && this.isValidGrid(pos.x, pos.y)) {
      this.placeTile(pos.x, pos.y);
    } else if (this.isRightDragging && this.isValidGrid(pos.x, pos.y)) {
      this.eraseTile(pos.x, pos.y);
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    const pos = this.getGridPosition(e.clientX, e.clientY);
    if (!this.isValidGrid(pos.x, pos.y)) return;

    if (e.button === 0) {
      this.isLeftDragging = true;
      this.placeTile(pos.x, pos.y);
    } else if (e.button === 2) {
      this.isRightDragging = true;
      this.eraseTile(pos.x, pos.y);
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      this.isLeftDragging = false;
    } else if (e.button === 2) {
      this.isRightDragging = false;
    }
  }

  private handleMouseEnter(): void {
    this.isMouseInCanvas = true;
  }

  private handleMouseLeave(): void {
    this.isMouseInCanvas = false;
    this.isLeftDragging = false;
    this.isRightDragging = false;
    this.mouseGridX = -1;
    this.mouseGridY = -1;
  }

  private isValidGrid(x: number, y: number): boolean {
    return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
  }

  private canPlace(x: number, y: number): boolean {
    return this.isValidGrid(x, y) && this.matrix[y][x] === TileType.Empty;
  }

  private placeTile(x: number, y: number): void {
    if (!this.canPlace(x, y)) return;
    this.matrix[y][x] = this.selectedTile;
    if (this.onMatrixChange) this.onMatrixChange();
  }

  private eraseTile(x: number, y: number): void {
    if (!this.isValidGrid(x, y)) return;
    if (this.matrix[y][x] === TileType.Empty) return;

    const alreadyAnimating = this.eraseAnimations.some(
      (a) => a.gridX === x && a.gridY === y
    );
    if (!alreadyAnimating) {
      this.eraseAnimations.push({
        gridX: x,
        gridY: y,
        startTime: performance.now(),
        duration: 200
      });
    }

    this.matrix[y][x] = TileType.Empty;
    if (this.onMatrixChange) this.onMatrixChange();
  }

  private animate = (): void => {
    this.render();
    requestAnimationFrame(this.animate);
  };

  render(): void {
    const ctx = this.ctx;
    const width = GRID_SIZE * TILE_SIZE;
    const height = GRID_SIZE * TILE_SIZE;

    ctx.clearRect(0, 0, width, height);

    this.drawGrid();
    this.drawTiles();
    this.drawEraseAnimations();
    this.drawPreview();
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    const width = GRID_SIZE * TILE_SIZE;
    const height = GRID_SIZE * TILE_SIZE;

    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;

    for (let x = 0; x <= GRID_SIZE; x++) {
      ctx.beginPath();
      ctx.moveTo(x * TILE_SIZE + 0.5, 0);
      ctx.lineTo(x * TILE_SIZE + 0.5, height);
      ctx.stroke();
    }

    for (let y = 0; y <= GRID_SIZE; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * TILE_SIZE + 0.5);
      ctx.lineTo(width, y * TILE_SIZE + 0.5);
      ctx.stroke();
    }
  }

  private drawTiles(): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tileType = this.matrix[y][x];
        if (tileType === TileType.Empty) continue;
        this.drawTile(x, y, tileType);
      }
    }
  }

  private drawTile(gridX: number, gridY: number, tileType: number, alpha: number = 1): void {
    const ctx = this.ctx;
    const px = gridX * TILE_SIZE;
    const py = gridY * TILE_SIZE;
    const info = TILE_INFO[tileType];

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = info.color;
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

    this.drawTilePattern(gridX, gridY, tileType);

    ctx.restore();
  }

  private drawTilePattern(gridX: number, gridY: number, tileType: number): void {
    const ctx = this.ctx;
    const px = gridX * TILE_SIZE;
    const py = gridY * TILE_SIZE;

    switch (tileType) {
      case TileType.Grass:
        ctx.fillStyle = 'rgba(60, 100, 45, 0.4)';
        for (let i = 0; i < 8; i++) {
          const gx = px + ((gridX * 7 + i * 13) % (TILE_SIZE - 6)) + 3;
          const gy = py + ((gridY * 11 + i * 17) % (TILE_SIZE - 6)) + 3;
          ctx.beginPath();
          ctx.arc(gx, gy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case TileType.StonePath:
        ctx.strokeStyle = 'rgba(80, 80, 80, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.beginPath();
        ctx.moveTo(px + TILE_SIZE / 2, py + 2);
        ctx.lineTo(px + TILE_SIZE / 2, py + TILE_SIZE - 2);
        ctx.moveTo(px + 2, py + TILE_SIZE / 2);
        ctx.lineTo(px + TILE_SIZE - 2, py + TILE_SIZE / 2);
        ctx.stroke();
        break;

      case TileType.WoodFloor:
        ctx.strokeStyle = 'rgba(130, 90, 45, 0.6)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(px, py + (TILE_SIZE / 4) * i);
          ctx.lineTo(px + TILE_SIZE, py + (TILE_SIZE / 4) * i);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(100, 70, 35, 0.3)';
        for (let i = 0; i < 3; i++) {
          const knotX = px + ((gridX * 17 + i * 23) % (TILE_SIZE - 16)) + 8;
          const knotY = py + (TILE_SIZE / 4) * (i + 0.5);
          ctx.beginPath();
          ctx.ellipse(knotX, knotY, 3, 2, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;

      case TileType.Water:
        ctx.fillStyle = 'rgba(120, 180, 220, 0.3)';
        const waveOffset = (performance.now() / 500 + gridX + gridY) % (Math.PI * 2);
        for (let i = 0; i < 3; i++) {
          const wy = py + 15 + i * 15 + Math.sin(waveOffset + i) * 2;
          ctx.beginPath();
          ctx.moveTo(px + 5, wy);
          ctx.quadraticCurveTo(px + TILE_SIZE / 2, wy - 4, px + TILE_SIZE - 5, wy);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = 'rgba(120, 180, 220, 0.4)';
          ctx.stroke();
        }
        break;

      case TileType.Wall:
        ctx.fillStyle = 'rgba(80, 80, 80, 0.8)';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.6)';
        ctx.lineWidth = 1;
        const brickRows = 3;
        const brickCols = 2;
        const brickW = TILE_SIZE / brickCols;
        const brickH = TILE_SIZE / brickRows;
        for (let row = 0; row < brickRows; row++) {
          const offset = (row % 2) * (brickW / 2);
          for (let col = -1; col <= brickCols; col++) {
            const bx = px + col * brickW + offset;
            const by = py + row * brickH;
            ctx.strokeRect(bx, by, brickW, brickH);
          }
        }
        break;
    }
  }

  private drawEraseAnimations(): void {
    const now = performance.now();
    const ctx = this.ctx;

    this.eraseAnimations = this.eraseAnimations.filter((anim) => {
      const elapsed = now - anim.startTime;
      if (elapsed >= anim.duration) return false;

      const progress = elapsed / anim.duration;
      const scale = 1 - progress;
      const alpha = 1 - progress;

      const px = anim.gridX * TILE_SIZE + TILE_SIZE / 2;
      const py = anim.gridY * TILE_SIZE + TILE_SIZE / 2;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(px, py);
      ctx.scale(scale, scale);
      ctx.translate(-px, -py);
      this.drawTile(anim.gridX, anim.gridY, TileType.Wall, alpha);
      ctx.restore();

      return true;
    });
  }

  private drawPreview(): void {
    if (!this.isMouseInCanvas) return;
    if (!this.isValidGrid(this.mouseGridX, this.mouseGridY)) return;
    if (this.selectedTile === TileType.Empty) return;

    const ctx = this.ctx;
    const px = this.mouseGridX * TILE_SIZE;
    const py = this.mouseGridY * TILE_SIZE;
    const hasTile = this.matrix[this.mouseGridY][this.mouseGridX] !== TileType.Empty;

    const pulseElapsed = (performance.now() - this.pulseStartTime) % 500;
    const pulseAlpha = 0.3 + Math.sin((pulseElapsed / 500) * Math.PI * 2) * 0.15;

    ctx.save();

    if (hasTile) {
      ctx.globalAlpha = pulseAlpha + 0.2;
      ctx.fillStyle = 'rgba(255, 80, 80, 0.6)';
    } else {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = TILE_INFO[this.selectedTile].color;
    }

    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = hasTile ? 'rgba(255, 80, 80, 0.8)' : 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);

    ctx.restore();
  }

  resize(): void {
    this.canvas.width = GRID_SIZE * TILE_SIZE;
    this.canvas.height = GRID_SIZE * TILE_SIZE;
  }

  clearMap(): void {
    this.matrix = this.createEmptyMatrix();
    this.eraseAnimations = [];
    if (this.onMatrixChange) this.onMatrixChange();
  }
}
