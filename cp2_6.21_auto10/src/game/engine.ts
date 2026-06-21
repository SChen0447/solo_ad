import { Player, PlayerForm } from './player';
import {
  LevelData,
  LightSource,
  ShadowBlock,
  Brick,
  Wall,
  Exit,
  createLightSource,
  createShadowBlock,
  createBrick,
  createWall,
  createExit,
  updateLightSources,
  renderLightSources,
  updateShadowBlocks,
  renderShadowBlocks,
  updateBricks,
  renderBricks,
  renderWalls,
  renderExit,
  computeShadowRegions,
  isPointInShadow,
  isRectInLightBeam,
  BrickFragment
} from './levelElements';

export interface InputState {
  keys: Set<string>;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  spacePressed: boolean;
}

export interface GameEngineCallbacks {
  onPlayerFormChange: (form: PlayerForm) => void;
  onLevelComplete: () => void;
  getActiveTool: () => string | null;
  onElementPlaced?: (type: string, x: number, y: number) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private lightSources: LightSource[] = [];
  private shadowBlocks: ShadowBlock[] = [];
  private bricks: Brick[] = [];
  private walls: Wall[] = [];
  private exits: Exit[] = [];
  private fragments: BrickFragment[] = [];
  private walkableShadowRegions: { x: number; y: number; w: number; h: number; points: { x: number; y: number }[] }[] = [];
  private isPlaying: boolean = false;
  private isEditorMode: boolean = true;
  private lastTime: number = 0;
  private animationFrameId: number = 0;
  private callbacks: GameEngineCallbacks;
  private shakeIntensity: number = 0;
  private shakeTimer: number = 0;
  private gridSize: number = 40;
  private fps: number = 60;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    this.player = new Player(100, 400, (form) => callbacks.onPlayerFormChange(form));
    this.setupDefaultLevel();
  }

  private setupDefaultLevel(): void {
    const w = this.canvas.width - 280;
    const h = this.canvas.height;
    
    this.walls = [
      createWall(0, h - 40, w, 40),
      createWall(0, 0, 20, h),
      createWall(w - 20, 0, 20, h),
      createWall(0, 0, w, 20),
      createWall(300, h - 200, 200, 20),
      createWall(600, h - 350, 200, 20),
    ];
    this.lightSources = [
      createLightSource(w / 2, 80, 0, Math.PI * 0.6, 500),
    ];
    this.shadowBlocks = [
      createShadowBlock(420, h - 280, 60, 80),
    ];
    this.bricks = [
      createBrick(700, h - 390, 40, 40),
      createBrick(740, h - 390, 40, 40),
    ];
    this.exits = [
      createExit(w - 100, h - 120, 50, 80),
    ];
    this.player.setPosition(80, h - 100);
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    const gameW = width - 280;
    if (this.walls.length >= 4) {
      this.walls[0] = createWall(0, height - 40, gameW, 40);
      this.walls[1] = createWall(0, 0, 20, height);
      this.walls[2] = createWall(gameW - 20, 0, 20, height);
      this.walls[3] = createWall(0, 0, gameW, 20);
    }
  }

  public getGameAreaWidth(): number {
    return this.canvas.width - 280;
  }

  public loadLevel(levelData: LevelData): void {
    this.lightSources = levelData.lightSources.map(ls => ({ ...ls, animTime: 0 }));
    this.shadowBlocks = levelData.shadowBlocks.map(sb => ({ ...sb, vx: 0, vy: 0, spawnAnim: 0 }));
    this.bricks = levelData.bricks.map(b => ({ ...b, illuminated: false, broken: false, breakTimer: 0, spawnAnim: 0 }));
    this.walls = levelData.walls.map(w => ({ ...w }));
    this.exits = levelData.exits.map(e => ({ ...e, animTime: 0 }));
    this.fragments = [];
    this.player.setPosition(80, this.canvas.height - 100);
    this.player.reset();
  }

  public getLevelData(): LevelData {
    return {
      lightSources: this.lightSources.map(ls => ({
        x: ls.x, y: ls.y, angle: ls.angle, spread: ls.spread, range: ls.range
      })),
      shadowBlocks: this.shadowBlocks.map(sb => ({
        x: sb.x, y: sb.y, width: sb.width, height: sb.height
      })),
      bricks: this.bricks.filter(b => !b.broken).map(b => ({
        x: b.x, y: b.y, width: b.width, height: b.height
      })),
      walls: this.walls.map(w => ({
        x: w.x, y: w.y, width: w.width, height: w.height
      })),
      exits: this.exits.map(e => ({
        x: e.x, y: e.y, width: e.width, height: e.height
      }))
    };
  }

  public clearLevel(): void {
    const gameW = this.canvas.width - 280;
    const h = this.canvas.height;
    this.lightSources = [];
    this.shadowBlocks = [];
    this.bricks = [];
    this.exits = [];
    this.walls = [
      createWall(0, h - 40, gameW, 40),
      createWall(0, 0, 20, h),
      createWall(gameW - 20, 0, 20, h),
      createWall(0, 0, gameW, 20),
    ];
    this.player.setPosition(80, h - 100);
    this.fragments = [];
  }

  public startPlayMode(): void {
    this.isPlaying = true;
    this.isEditorMode = false;
    this.loadLevel(this.getLevelData());
  }

  public startEditorMode(): void {
    this.isPlaying = false;
    this.isEditorMode = true;
    this.player.reset();
  }

  public isInPlayMode(): boolean {
    return this.isPlaying;
  }

  public addElement(type: string, x: number, y: number): void {
    const gx = Math.round(x / this.gridSize) * this.gridSize;
    const gy = Math.round(y / this.gridSize) * this.gridSize;
    
    switch (type) {
      case 'lightSource':
        this.lightSources.push(createLightSource(gx, gy, 0, Math.PI * 0.6, 500));
        break;
      case 'shadowBlock':
        this.shadowBlocks.push(createShadowBlock(gx, gy - 40, 60, 80));
        break;
      case 'brick':
        this.bricks.push(createBrick(gx, gy - 20, 40, 40));
        break;
    }
  }

  public handleInput(input: InputState): void {
    if (input.spacePressed && !this.player.isTransitioning()) {
      this.player.toggleForm();
    }

    if (this.isEditorMode && input.mouseDown) {
      const tool = this.callbacks.getActiveTool();
      if (tool && input.mouseX < this.getGameAreaWidth()) {
        this.callbacks.onElementPlaced?.(tool, input.mouseX, input.mouseY);
      }
    }

    if (this.isPlaying) {
      const moveX = (input.keys.has('d') || input.keys.has('D') ? 1 : 0) -
                    (input.keys.has('a') || input.keys.has('A') ? 1 : 0);
      const moveY = (input.keys.has('s') || input.keys.has('S') ? 1 : 0) -
                    (input.keys.has('w') || input.keys.has('W') ? 1 : 0);
      this.player.setMoveDirection(moveX, moveY);
    }
  }

  public start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  public stop(): void {
    cancelAnimationFrame(this.animationFrameId);
  }

  private loop(): void {
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > 0.05) dt = 0.05;

    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    this.player.update(dt);

    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
      if (this.shakeTimer <= 0) this.shakeIntensity = 0;
    }

    if (this.isPlaying) {
      this.updatePlayerPhysics(dt);
      updateLightSources(this.lightSources, dt);
      updateShadowBlocks(this.shadowBlocks, this.walls, dt);
      this.handleShadowBlockPushing(dt);
      this.updateBrickIllumination();
      updateBricks(this.bricks, dt);
      this.handleBrickBreaking();
      this.updateFragments(dt);
      this.checkExitCollision();
    } else {
      updateLightSources(this.lightSources, dt);
    }

    this.updateWalkableShadowRegions();
  }

  private updateWalkableShadowRegions(): void {
    const regions = computeShadowRegions(this.lightSources, this.shadowBlocks);
    this.walkableShadowRegions = regions.map(r => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of r.points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY, points: r.points };
    });
  }

  public isInWalkableShadow(px: number, py: number): boolean {
    return isPointInShadow(px, py, this.lightSources, this.shadowBlocks);
  }

  private updatePlayerPhysics(dt: number): void {
    const pos = this.player.getPosition();
    const radius = this.player.getRadius();
    const vel = this.player.getVelocity();

    let newX = pos.x + vel.x * dt;
    let newY = pos.y + vel.y * dt;

    const solids: { x: number; y: number; w: number; h: number }[] = [];
    for (const w of this.walls) solids.push({ x: w.x, y: w.y, w: w.width, h: w.height });
    for (const sb of this.shadowBlocks) solids.push({ x: sb.x, y: sb.y, w: sb.width, h: sb.height });
    for (const b of this.bricks) if (!b.broken) solids.push({ x: b.x, y: b.y, w: b.width, h: b.height });

    let collided = false;

    for (const s of solids) {
      const closestX = Math.max(s.x, Math.min(newX, s.x + s.w));
      const closestY = Math.max(s.y, Math.min(newY, s.y + s.h));
      const dx = newX - closestX;
      const dy = newY - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < radius * radius) {
        collided = true;
        const dist = Math.sqrt(distSq) || 0.001;
        const overlap = radius - dist;
        newX += (dx / dist) * overlap;
        newY += (dy / dist) * overlap;
      }
    }

    if (collided) {
      this.triggerShake(2, 0.1);
    }

    const gameW = this.canvas.width - 280;
    const gameH = this.canvas.height;
    newX = Math.max(radius, Math.min(gameW - radius, newX));
    newY = Math.max(radius, Math.min(gameH - radius, newY));

    this.player.setPosition(newX, newY);
  }

  private handleShadowBlockPushing(dt: number): void {
    const pos = this.player.getPosition();
    const radius = this.player.getRadius();
    const vel = this.player.getVelocity();

    for (const sb of this.shadowBlocks) {
      const sbRight = sb.x + sb.width;
      const sbBottom = sb.y + sb.height;

      if (pos.x + radius > sb.x - 5 && pos.x - radius < sbRight + 5 &&
          pos.y + radius > sb.y && pos.y - radius < sbBottom) {
        if (vel.x > 0 && pos.x < sb.x) {
          const pushSpeed = 80;
          let newSbX = sb.x + pushSpeed * dt;
          if (!this.collidesWithWalls(newSbX, sb.y, sb.width, sb.height, sb)) {
            sb.x = newSbX;
          }
        } else if (vel.x < 0 && pos.x > sbRight) {
          const pushSpeed = 80;
          let newSbX = sb.x - pushSpeed * dt;
          if (!this.collidesWithWalls(newSbX, sb.y, sb.width, sb.height, sb)) {
            sb.x = newSbX;
          }
        }
      }
    }
  }

  private collidesWithWalls(x: number, y: number, w: number, h: number, exclude: ShadowBlock): boolean {
    for (const wall of this.walls) {
      if (x < wall.x + wall.width && x + w > wall.x &&
          y < wall.y + wall.height && y + h > wall.y) return true;
    }
    for (const sb of this.shadowBlocks) {
      if (sb === exclude) continue;
      if (x < sb.x + sb.width && x + w > sb.x &&
          y < sb.y + sb.height && y + h > sb.y) return true;
    }
    return false;
  }

  private updateBrickIllumination(): void {
    for (const brick of this.bricks) {
      if (brick.broken) continue;
      brick.illuminated = isRectInLightBeam(
        brick.x, brick.y, brick.width, brick.height,
        this.lightSources, this.shadowBlocks
      );
    }
  }

  private handleBrickBreaking(): void {
    const pos = this.player.getPosition();
    const radius = this.player.getRadius();

    for (const brick of this.bricks) {
      if (brick.broken) continue;
      if (!brick.illuminated) continue;
      if (this.player.getForm() !== PlayerForm.DARK) continue;

      if (pos.x + radius > brick.x && pos.x - radius < brick.x + brick.width &&
          pos.y + radius > brick.y && pos.y - radius < brick.y + brick.height) {
        brick.broken = true;
        brick.breakTimer = 0.5;
        this.spawnFragments(brick);
        this.triggerShake(4, 0.15);
      }
    }
  }

  private spawnFragments(brick: Brick): void {
    const count = 3 + Math.floor(Math.random() * 3);
    const available = Math.max(0, 30 - this.fragments.length);
    const actualCount = Math.min(count, available);

    const cx = brick.x + brick.width / 2;
    const cy = brick.y + brick.height / 2;
    const corners = [
      { x: brick.x + 4, y: brick.y + 4 },
      { x: brick.x + brick.width - 4, y: brick.y + 4 },
      { x: brick.x + brick.width - 4, y: brick.y + brick.height - 4 },
      { x: brick.x + 4, y: brick.y + brick.height - 4 },
    ];

    for (let i = 0; i < actualCount; i++) {
      const corner = corners[i % corners.length];
      const jitterX = (i < 4 ? corner.x : cx) + (Math.random() - 0.5) * 8;
      const jitterY = (i < 4 ? corner.y : cy) + (Math.random() - 0.5) * 8;
      const angle = Math.atan2(jitterY - cy, jitterX - cx) + (Math.random() - 0.5) * 0.6;
      const speed = 200 + Math.random() * 200;

      this.fragments.push({
        x: jitterX,
        y: jitterY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 150,
        size: 5 + Math.random() * 9,
        life: 0.5,
        maxLife: 0.5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 10
      });
    }
  }

  private updateFragments(dt: number): void {
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const f = this.fragments[i];
      f.vy += 600 * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rotation += f.rotSpeed * dt;
      f.life -= dt;
      if (f.life <= 0) this.fragments.splice(i, 1);
    }
  }

  private checkExitCollision(): void {
    const pos = this.player.getPosition();
    const radius = this.player.getRadius();

    for (const exit of this.exits) {
      if (pos.x + radius > exit.x && pos.x - radius < exit.x + exit.width &&
          pos.y + radius > exit.y && pos.y - radius < exit.y + exit.height) {
        this.callbacks.onLevelComplete();
      }
    }
  }

  private triggerShake(intensity: number, duration: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const gameW = w - 280;

    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    if (this.shakeIntensity > 0) {
      const sx = (Math.random() - 0.5) * this.shakeIntensity * 2;
      const sy = (Math.random() - 0.5) * this.shakeIntensity * 2;
      ctx.translate(sx, sy);
    }

    if (this.isEditorMode) {
      this.drawGrid(gameW, h);
    }

    const shadowRegions = computeShadowRegions(this.lightSources, this.shadowBlocks);
    for (const region of shadowRegions) {
      if (region.points.length < 3) continue;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of region.points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      const shadowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(maxX - minX, maxY - minY));
      shadowGrad.addColorStop(0, 'rgba(20, 0, 50, 0.7)');
      shadowGrad.addColorStop(0.6, 'rgba(30, 0, 70, 0.55)');
      shadowGrad.addColorStop(1, 'rgba(50, 10, 90, 0.35)');

      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.moveTo(region.points[0].x, region.points[0].y);
      for (let i = 1; i < region.points.length; i++) {
        ctx.lineTo(region.points[i].x, region.points[i].y);
      }
      ctx.closePath();
      ctx.fill();

      ctx.save();
      ctx.clip();
      const patternTime = performance.now() * 0.001;
      ctx.strokeStyle = 'rgba(120, 60, 180, 0.12)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const offset = ((patternTime * 25 + i * 30) % 60) - 10;
        ctx.beginPath();
        ctx.moveTo(minX - 20, minY + i * 18 + offset);
        ctx.lineTo(maxX + 20, minY + i * 18 + offset + 10);
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = 'rgba(150, 70, 220, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.lineDashOffset = -performance.now() * 0.02;
      ctx.beginPath();
      ctx.moveTo(region.points[0].x, region.points[0].y);
      for (let i = 1; i < region.points.length; i++) {
        ctx.lineTo(region.points[i].x, region.points[i].y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    renderLightSources(ctx, this.lightSources, this.shadowBlocks);
    renderWalls(ctx, this.walls);
    renderBricks(ctx, this.bricks);
    renderShadowBlocks(ctx, this.shadowBlocks);
    renderExit(ctx, this.exits);

    for (const f of this.fragments) {
      const alpha = f.life / f.maxLife;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rotation);
      ctx.fillStyle = `rgba(210, 180, 140, ${alpha})`;
      ctx.fillRect(-f.size / 2, -f.size / 2, f.size, f.size);
      ctx.restore();
    }

    this.player.render(ctx);
    ctx.restore();

    this.drawDivider(ctx, gameW, h);
    this.drawFPS(ctx, w);
    this.drawModeIndicator(ctx, w);
  }

  private drawGrid(w: number, h: number): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  private drawDivider(ctx: CanvasRenderingContext2D, gameW: number, h: number): void {
    const gradient = ctx.createLinearGradient(gameW, 0, gameW, h);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(1, '#4A0080');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gameW, 0);
    ctx.lineTo(gameW, h);
    ctx.stroke();
  }

  private drawFPS(ctx: CanvasRenderingContext2D, w: number): void {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`FPS: ${this.fps}`, w - 290, 20);
  }

  private drawModeIndicator(ctx: CanvasRenderingContext2D, w: number): void {
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    if (this.isEditorMode) {
      ctx.fillStyle = '#FFD700';
      ctx.fillText('✏ 编辑模式', w - 290, 45);
    } else {
      ctx.fillStyle = '#4A0080';
      ctx.fillText('▶ 试玩模式', w - 290, 45);
    }
  }

  public getPlayer(): Player {
    return this.player;
  }

  public getShadowRegions() {
    return computeShadowRegions(this.lightSources, this.shadowBlocks);
  }

  public isPointInShadowPath(x: number, y: number): boolean {
    return isPointInShadow(x, y, this.lightSources, this.shadowBlocks);
  }
}
