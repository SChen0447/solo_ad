import { Player, PlayerForm } from './player';
import { Wall, LightSource, ShadowBlock, Brick, Exit, ShadowArea, Rect } from './levelElements';

export interface LevelData {
  walls: Array<{ x: number; y: number; w: number; h: number }>;
  lights: Array<{ x: number; y: number; angle: number; spread: number; range: number }>;
  shadowBlocks: Array<{ x: number; y: number; w: number; h: number }>;
  bricks: Array<{ x: number; y: number; w: number; h: number }>;
  exit: { x: number; y: number; w: number; h: number } | null;
  playerStart: { x: number; y: number };
}

export type GameMode = 'editor' | 'play';

export class Engine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  player: Player;
  walls: Wall[] = [];
  lights: LightSource[] = [];
  shadowBlocks: ShadowBlock[] = [];
  bricks: Brick[] = [];
  exit: Exit | null = null;
  shadowAreas: ShadowArea[] = [];
  keys: Set<string> = new Set();
  gameTime: number = 0;
  mode: GameMode = 'editor';
  isRunning: boolean = false;
  lastTimestamp: number = 0;
  fps: number = 0;
  frameCount: number = 0;
  fpsTimer: number = 0;
  levelComplete: boolean = false;
  onLevelComplete?: () => void;
  areaWidth: number;
  areaHeight: number;

  constructor(canvas: HTMLCanvasElement, areaWidth: number, areaHeight: number) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.areaWidth = areaWidth;
    this.areaHeight = areaHeight;
    this.player = new Player(100, 100);
  }

  loadLevel(data: LevelData): void {
    this.walls = data.walls.map(w => new Wall(w.x, w.y, w.w, w.h));
    this.lights = data.lights.map(l => new LightSource(l.x, l.y, l.angle, l.spread, l.range));
    this.shadowBlocks = data.shadowBlocks.map(b => new ShadowBlock(b.x, b.y, b.w, b.h));
    this.bricks = data.bricks.map(b => new Brick(b.x, b.y, b.w, b.h));
    this.exit = data.exit ? new Exit(data.exit.x, data.exit.y, data.exit.w, data.exit.h) : null;
    this.player = new Player(data.playerStart.x, data.playerStart.y);
    this.levelComplete = false;
    this.gameTime = 0;
    this.computeShadows();
  }

  startPlay(): void {
    this.mode = 'play';
    this.isRunning = true;
    this.levelComplete = false;
    this.gameTime = 0;
    this.lastTimestamp = performance.now();
  }

  stopPlay(): void {
    this.mode = 'editor';
    this.isRunning = false;
  }

  resetLevel(data: LevelData): void {
    this.loadLevel(data);
    this.mode = 'editor';
    this.isRunning = false;
    this.levelComplete = false;
  }

  private computeShadows(): void {
    this.shadowAreas = [];
    for (const light of this.lights) {
      for (const block of this.shadowBlocks) {
        const shadow = light.computeShadow(block.toRect());
        if (shadow) {
          this.shadowAreas.push(shadow);
        }
      }
    }
  }

  isPointInShadow(px: number, py: number): boolean {
    for (const shadow of this.shadowAreas) {
      if (this.pointInPolygon(px, py, shadow.points)) return true;
    }
    return false;
  }

  private pointInPolygon(px: number, py: number, polygon: { x: number; y: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  update(dt: number): void {
    if (this.mode !== 'play' || this.levelComplete) return;

    this.gameTime += dt;
    dt = Math.min(dt, 1 / 30);

    const allWalls: Rect[] = [
      ...this.walls.map(w => w.toRect()),
      ...this.bricks.filter(b => !b.isDestroyed).map(b => b.toRect()),
      ...this.shadowBlocks.map(b => b.toRect())
    ];

    this.player.update(dt, this.keys, allWalls);

    for (const brick of this.bricks) {
      brick.update(dt, this.lights);
    }

    this.computeShadows();

    this.handlePlayerBlockPush(dt);

    this.handleBrickDestruction();

    this.checkExitReached();

    this.fpsTimer += dt;
    this.frameCount++;
    if (this.fpsTimer >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }
  }

  private handlePlayerBlockPush(dt: number): void {
    const pushSpeed = 100;
    for (const block of this.shadowBlocks) {
      const br = block.toRect();
      const dx = this.player.x - (br.x + br.w / 2);
      const dy = this.player.y - (br.y + br.h / 2);
      const overlapX = (br.w / 2 + 14) - Math.abs(dx);
      const overlapY = (br.h / 2 + 14) - Math.abs(dy);

      if (overlapX > 0 && overlapY > 0) {
        const pushDirX = dx > 0 ? -1 : 1;
        const pushDirY = dy > 0 ? -1 : 1;

        if (overlapX < overlapY) {
          block.x += pushDirX * overlapX;
          this.player.x += pushDirX * -1 * 0;
        } else {
          block.y += pushDirY * overlapY;
          this.player.y += pushDirY * -1 * 0;
        }
      }
    }
  }

  private handleBrickDestruction(): void {
    if (this.player.form !== PlayerForm.Dark) return;
    for (const brick of this.bricks) {
      if (!brick.isWeakened || brick.isDestroyed) continue;
      const br = brick.toRect();
      const dx = this.player.x - (br.x + br.w / 2);
      const dy = this.player.y - (br.y + br.h / 2);
      const overlapX = (br.w / 2 + 14) - Math.abs(dx);
      const overlapY = (br.h / 2 + 14) - Math.abs(dy);
      if (overlapX > 0 && overlapY > 0) {
        brick.destroy();
      }
    }
  }

  private checkExitReached(): void {
    if (!this.exit || this.levelComplete) return;
    const er = this.exit.toRect();
    const dx = this.player.x - (er.x + er.w / 2);
    const dy = this.player.y - (er.y + er.h / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 25) {
      this.levelComplete = true;
      if (this.onLevelComplete) {
        this.onLevelComplete();
      }
    }
  }

  render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.areaWidth, this.areaHeight);

    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(0, 0, this.areaWidth, this.areaHeight);

    this.drawGrid(ctx);

    for (const wall of this.walls) {
      wall.render(ctx);
    }

    for (const light of this.lights) {
      light.render(ctx, this.gameTime);
    }

    for (const block of this.shadowBlocks) {
      const blockShadows: ShadowArea[] = [];
      for (const light of this.lights) {
        const shadow = light.computeShadow(block.toRect());
        if (shadow) blockShadows.push(shadow);
      }
      block.render(ctx, blockShadows);
    }

    for (const brick of this.bricks) {
      brick.render(ctx, this.gameTime);
    }

    if (this.exit) {
      this.exit.render(ctx, this.gameTime);
    }

    if (this.mode === 'play') {
      this.player.render(ctx, this.gameTime);
    }

    this.renderHUD(ctx);

    if (this.levelComplete) {
      this.renderLevelComplete(ctx);
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 0.5;
    const gridSize = 40;
    for (let x = 0; x < this.areaWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.areaHeight);
      ctx.stroke();
    }
    for (let y = 0; y < this.areaHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.areaWidth, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderHUD(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '13px monospace';

    const formText = this.player.form === PlayerForm.Light ? '☀ 光明' : '🌙 黑暗';
    ctx.fillText(`形态: ${formText}`, 10, 24);

    if (this.mode === 'play') {
      ctx.fillText(`FPS: ${this.fps}`, 10, 44);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText('空格:切换形态 | WASD:移动', 10, this.areaHeight - 12);
    }
    ctx.restore();
  }

  private renderLevelComplete(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, this.areaWidth, this.areaHeight);

    ctx.fillStyle = '#00FF96';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('关卡完成!', this.areaWidth / 2, this.areaHeight / 2 - 10);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '16px monospace';
    ctx.fillText('按 ESC 返回编辑器', this.areaWidth / 2, this.areaHeight / 2 + 30);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  getLevelData(): LevelData {
    return {
      walls: this.walls.map(w => ({ x: w.x, y: w.y, w: w.w, h: w.h })),
      lights: this.lights.map(l => ({ x: l.x, y: l.y, angle: l.angle, spread: l.spread, range: l.range })),
      shadowBlocks: this.shadowBlocks.map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h })),
      bricks: this.bricks.map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h })),
      exit: this.exit ? { x: this.exit.x, y: this.exit.y, w: this.exit.w, h: this.exit.h } : null,
      playerStart: { x: 100, y: 100 }
    };
  }
}
