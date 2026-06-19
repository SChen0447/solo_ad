import { AnimationController } from './animationController';
import { BuildingConfig } from './buildingPanel';

interface PlacedBuilding {
  id: string;
  config: BuildingConfig;
  gridCol: number;
  gridRow: number;
  x: number;
  y: number;
  selected: boolean;
}

const GRID_SIZE = 80;
const GROUND_Y_RATIO = 0.78;
const VANISHING_POINT_Y_RATIO = 0.35;
let nextBuildingId = 0;

export class SkylineScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animCtrl: AnimationController;
  private buildings: PlacedBuilding[] = [];
  private selectedBuildingId: string | null = null;
  private isNight: boolean = true;

  private cameraX: number = 0;
  private cameraY: number = 0;
  private zoom: number = 1;

  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private panCamStartX: number = 0;
  private panCamStartY: number = 0;

  private isDraggingBuilding: boolean = false;
  private dragBuilding: PlacedBuilding | null = null;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;

  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private groundY: number = 0;
  private vanishY: number = 0;

  private fpsFrames: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 60;
  private placingConfig: BuildingConfig | null = null;
  private mouseDownPos: { x: number; y: number } | null = null;

  setPlacingConfig(config: BuildingConfig | null): void {
    this.placingConfig = config;
    this.canvas.style.cursor = config ? 'copy' : 'crosshair';
  }

  constructor(canvas: HTMLCanvasElement, animCtrl: AnimationController) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.animCtrl = animCtrl;
    this.resize();
    this.bindEvents();
  }

  resize(): void {
    const container = this.canvas.parentElement!;
    this.canvasWidth = container.clientWidth;
    this.canvasHeight = container.clientHeight;
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;
    this.groundY = this.canvasHeight * GROUND_Y_RATIO;
    this.vanishY = this.canvasHeight * VANISHING_POINT_Y_RATIO;
    this.animCtrl.updateSize(this.canvasWidth, this.canvasHeight);
  }

  setNightMode(night: boolean): void {
    this.isNight = night;
  }

  getZoom(): number {
    return this.zoom;
  }

  resetView(): void {
    this.cameraX = 0;
    this.cameraY = 0;
    this.zoom = 1;
  }

  addBuilding(config: BuildingConfig, canvasX: number, canvasY: number): void {
    const worldX = this.screenToWorldX(canvasX);
    const worldY = this.screenToWorldY(canvasY);

    let gridCol = Math.round((worldX - config.width / 2) / GRID_SIZE);
    let gridRow = Math.round((worldY - config.height) / GRID_SIZE);

    const snapX = gridCol * GRID_SIZE;
    const snapY = this.groundY;

    const id = `b_${nextBuildingId++}`;
    const building: PlacedBuilding = {
      id,
      config,
      gridCol,
      gridRow,
      x: snapX,
      y: snapY,
      selected: false,
    };
    this.buildings.push(building);

    const fromY = snapY - 80;
    this.animCtrl.addSpringAnim(id, fromY, snapY);
    this.animCtrl.initWindowsForBuilding(id, config.windowRows, config.windowCols);
  }

  deleteSelected(): void {
    if (!this.selectedBuildingId) return;
    this.animCtrl.removeWindowsForBuilding(this.selectedBuildingId);
    this.buildings = this.buildings.filter((b) => b.id !== this.selectedBuildingId);
    this.selectedBuildingId = null;
  }

  clearAll(): void {
    for (const b of this.buildings) {
      this.animCtrl.removeWindowsForBuilding(b.id);
    }
    this.buildings = [];
    this.selectedBuildingId = null;
  }

  getBuildingCount(): number {
    return this.buildings.length;
  }

  getFps(): number {
    return this.currentFps;
  }

  private screenToWorldX(sx: number): number {
    return (sx - this.canvasWidth / 2) / this.zoom + this.canvasWidth / 2 - this.cameraX;
  }

  private screenToWorldY(sy: number): number {
    return (sy - this.canvasHeight / 2) / this.zoom + this.canvasHeight / 2 - this.cameraY;
  }

  private worldToScreenX(wx: number): number {
    return (wx + this.cameraX - this.canvasWidth / 2) * this.zoom + this.canvasWidth / 2;
  }

  private worldToScreenY(wy: number): number {
    return (wy + this.cameraY - this.canvasHeight / 2) * this.zoom + this.canvasHeight / 2;
  }

  private findBuildingAt(sx: number, sy: number): PlacedBuilding | null {
    const wx = this.screenToWorldX(sx);
    const wy = this.screenToWorldY(sy);
    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const b = this.buildings[i];
      const springOffset = this.animCtrl.getSpringOffset(b.id);
      const by = b.y - b.config.height + springOffset;
      if (wx >= b.x && wx <= b.x + b.config.width && wy >= by && wy <= b.y) {
        return b;
      }
    }
    return null;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.canvas.addEventListener('dblclick', (e) => this.onDblClick(e));
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    this.mouseDownPos = { x: mx, y: my };

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this.isPanning = true;
      this.panStartX = e.clientX;
      this.panStartY = e.clientY;
      this.panCamStartX = this.cameraX;
      this.panCamStartY = this.cameraY;
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (this.placingConfig && e.button === 0) {
      this.addBuilding(this.placingConfig, mx, my);
      return;
    }

    const hit = this.findBuildingAt(mx, my);
    if (hit) {
      this.deselectAll();
      hit.selected = true;
      this.selectedBuildingId = hit.id;
      this.isDraggingBuilding = true;
      this.dragBuilding = hit;
      const wx = this.screenToWorldX(mx);
      const wy = this.screenToWorldY(my);
      this.dragOffsetX = wx - hit.x;
      this.dragOffsetY = wy - hit.y;
      this.canvas.style.cursor = 'move';
    } else {
      this.deselectAll();
      this.isPanning = true;
      this.panStartX = e.clientX;
      this.panStartY = e.clientY;
      this.panCamStartX = this.cameraX;
      this.panCamStartY = this.cameraY;
      this.canvas.style.cursor = 'grabbing';
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isPanning) {
      const dx = (e.clientX - this.panStartX) / this.zoom;
      const dy = (e.clientY - this.panStartY) / this.zoom;
      this.cameraX = this.panCamStartX + dx;
      this.cameraY = this.panCamStartY + dy;
    } else if (this.isDraggingBuilding && this.dragBuilding) {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const wx = this.screenToWorldX(mx) - this.dragOffsetX;
      const wy = this.screenToWorldY(my) - this.dragOffsetY;
      const snappedCol = Math.round(wx / GRID_SIZE);
      this.dragBuilding.x = snappedCol * GRID_SIZE;
      this.dragBuilding.gridCol = snappedCol;
      this.dragBuilding.y = this.groundY;
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    this.isPanning = false;
    this.isDraggingBuilding = false;
    this.dragBuilding = null;
    this.mouseDownPos = null;
    this.canvas.style.cursor = this.placingConfig ? 'copy' : 'crosshair';
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    this.zoom = Math.max(0.2, Math.min(3, this.zoom + delta));
  }

  private onDblClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const hit = this.findBuildingAt(mx, my);
    if (hit) {
      this.animCtrl.removeWindowsForBuilding(hit.id);
      this.buildings = this.buildings.filter((b) => b.id !== hit.id);
      if (this.selectedBuildingId === hit.id) this.selectedBuildingId = null;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      this.deleteSelected();
    }
  }

  private deselectAll(): void {
    for (const b of this.buildings) b.selected = false;
    this.selectedBuildingId = null;
  }

  render(timestamp: number): void {
    this.fpsFrames++;
    if (timestamp - this.fpsTime >= 1000) {
      this.currentFps = this.fpsFrames;
      this.fpsFrames = 0;
      this.fpsTime = timestamp;
    }

    this.animCtrl.update(timestamp);

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.save();
    ctx.translate(this.canvasWidth / 2, this.canvasHeight / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.canvasWidth / 2 + this.cameraX, -this.canvasHeight / 2 + this.cameraY);

    this.drawSky(ctx);
    if (this.isNight) {
      this.animCtrl.drawStars(ctx);
    }
    this.drawGrid(ctx);
    this.drawBuildings(ctx);

    ctx.restore();
  }

  private drawSky(ctx: CanvasRenderingContext2D): void {
    let gradient: CanvasGradient;
    if (this.isNight) {
      gradient = ctx.createLinearGradient(0, 0, 0, this.groundY);
      gradient.addColorStop(0, '#0a0a2e');
      gradient.addColorStop(0.4, '#1a1a4e');
      gradient.addColorStop(0.7, '#2d1b4e');
      gradient.addColorStop(1, '#1a1a3e');
    } else {
      gradient = ctx.createLinearGradient(0, 0, 0, this.groundY);
      gradient.addColorStop(0, '#4a90d9');
      gradient.addColorStop(0.5, '#87ceeb');
      gradient.addColorStop(1, '#b0d4f1');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.groundY);
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    const groundY = this.groundY;
    const vpx = this.canvasWidth / 2;
    const vpy = this.vanishY;

    ctx.strokeStyle = this.isNight
      ? 'rgba(0, 210, 255, 0.08)'
      : 'rgba(100, 150, 200, 0.15)';
    ctx.lineWidth = 1;

    const viewLeft = this.screenToWorldX(0);
    const viewRight = this.screenToWorldX(this.canvasWidth);
    const startCol = Math.floor(viewLeft / GRID_SIZE) - 1;
    const endCol = Math.ceil(viewRight / GRID_SIZE) + 1;

    for (let col = startCol; col <= endCol; col++) {
      const x = col * GRID_SIZE;
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(vpx + (x - vpx) * 0.3, vpy);
      ctx.stroke();
    }

    const depthLines = 10;
    for (let i = 0; i <= depthLines; i++) {
      const t = i / depthLines;
      const y = groundY + t * (this.canvasHeight - groundY);
      ctx.beginPath();
      ctx.moveTo(viewLeft - GRID_SIZE, y);
      ctx.lineTo(viewRight + GRID_SIZE, y);
      ctx.stroke();
    }

    ctx.fillStyle = this.isNight ? '#0d0d2a' : '#c8d8e8';
    ctx.fillRect(0, groundY, this.canvasWidth, this.canvasHeight - groundY);

    const groundGrad = ctx.createLinearGradient(0, groundY, 0, this.canvasHeight);
    if (this.isNight) {
      groundGrad.addColorStop(0, '#0d0d2a');
      groundGrad.addColorStop(1, '#050515');
    } else {
      groundGrad.addColorStop(0, '#c8d8e8');
      groundGrad.addColorStop(1, '#a0b8d0');
    }
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, this.canvasWidth, this.canvasHeight - groundY);

    ctx.strokeStyle = this.isNight
      ? 'rgba(0, 210, 255, 0.25)'
      : 'rgba(80, 120, 160, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(this.canvasWidth, groundY);
    ctx.stroke();
  }

  private drawBuildings(ctx: CanvasRenderingContext2D): void {
    const sorted = [...this.buildings].sort((a, b) => a.x - b.x);

    for (const b of sorted) {
      this.drawSingleBuilding(ctx, b);
    }
  }

  private drawSingleBuilding(ctx: CanvasRenderingContext2D, b: PlacedBuilding): void {
    const cfg = b.config;
    const springOffset = this.animCtrl.getSpringOffset(b.id);
    const bx = b.x;
    const by = b.y - cfg.height + springOffset;
    const bw = cfg.width;
    const bh = cfg.height;

    if (this.isNight) {
      const shadowGrad = ctx.createLinearGradient(bx, by, bx + bw + 30, by);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.fillRect(bx + bw, by + bh * 0.1, 30, bh * 0.9);
    }

    ctx.fillStyle = cfg.bodyColor;
    ctx.fillRect(bx, by, bw, bh);

    if (!this.isNight) {
      const lightGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
      lightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
      lightGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
      lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
      ctx.fillStyle = lightGrad;
      ctx.fillRect(bx, by, bw, bh);
    }

    this.drawRoof(ctx, cfg, bx, by, bw, bh);

    if (this.isNight) {
      this.animCtrl.drawWindows(
        ctx,
        b.id,
        bx,
        by,
        bw,
        bh,
        cfg.windowRows,
        cfg.windowCols,
      );
    } else {
      this.drawDayWindows(ctx, cfg, bx, by, bw, bh);
    }

    if (cfg.height >= cfg.heightThreshold) {
      const lightX = bx + bw / 2;
      let lightY: number;
      if (cfg.roofType === 'pointed') {
        lightY = by - bh * 0.15;
      } else if (cfg.roofType === 'antenna') {
        lightY = by - bh * 0.12;
      } else {
        lightY = by;
      }
      this.animCtrl.drawWarningLight(ctx, lightX, lightY, cfg.height);
    }

    if (b.selected) {
      ctx.strokeStyle = '#00d2ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(bx - 3, by - 3, bw + 6, bh + 6);
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(0, 210, 255, 0.05)';
      ctx.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
    }
  }

  private drawRoof(
    ctx: CanvasRenderingContext2D,
    cfg: BuildingConfig,
    bx: number,
    by: number,
    bw: number,
    bh: number,
  ): void {
    if (cfg.roofType === 'pointed') {
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + bw / 2, by - bh * 0.15);
      ctx.lineTo(bx + bw, by);
      ctx.closePath();
      ctx.fillStyle = cfg.roofColor;
      ctx.fill();
    } else if (cfg.roofType === 'dome') {
      ctx.beginPath();
      ctx.ellipse(bx + bw / 2, by, bw / 2, bh * 0.08, 0, Math.PI, 0);
      ctx.fillStyle = cfg.roofColor;
      ctx.fill();
    } else if (cfg.roofType === 'antenna') {
      ctx.strokeStyle = cfg.roofColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx + bw / 2, by);
      ctx.lineTo(bx + bw / 2, by - bh * 0.12);
      ctx.stroke();
    } else {
      ctx.fillStyle = cfg.roofColor;
      ctx.fillRect(bx - 2, by - 4, bw + 4, 4);
    }
  }

  private drawDayWindows(
    ctx: CanvasRenderingContext2D,
    cfg: BuildingConfig,
    bx: number,
    by: number,
    bw: number,
    bh: number,
  ): void {
    const padX = bw * 0.1;
    const padY = bh * 0.06;
    const areaW = bw - padX * 2;
    const areaH = bh - padY * 2;
    const cellW = areaW / cfg.windowCols;
    const cellH = areaH / cfg.windowRows;
    const winW = cellW * 0.55;
    const winH = cellH * 0.45;

    for (let r = 0; r < cfg.windowRows; r++) {
      for (let c = 0; c < cfg.windowCols; c++) {
        const wx = bx + padX + c * cellW + (cellW - winW) / 2;
        const wy = by + padY + r * cellH + (cellH - winH) / 2;

        const reflGrad = ctx.createLinearGradient(wx, wy, wx + winW, wy + winH);
        reflGrad.addColorStop(0, 'rgba(200, 220, 255, 0.5)');
        reflGrad.addColorStop(0.5, 'rgba(150, 200, 240, 0.3)');
        reflGrad.addColorStop(1, 'rgba(100, 160, 220, 0.5)');
        ctx.fillStyle = reflGrad;
        ctx.fillRect(wx, wy, winW, winH);

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(wx, wy, winW, winH);
      }
    }
  }
}
