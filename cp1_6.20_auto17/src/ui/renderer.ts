import {
  Tower,
  Enemy,
  Projectile,
  Particle,
  RippleEffect,
  TowerType,
  GridPos,
  Position,
  GameState,
  GRID_SIZE,
  GRID_COLS,
  GRID_ROWS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  TOWER_CONFIGS,
  ENEMY_CONFIGS,
  gridToPixel,
  pixelToGrid,
  getUpgradeCost,
  getSellValue
} from '../types';
import { MapGrid } from '../map/mapGrid';

// 数据流向：接收所有模块数据 → 绘制到4层Canvas
// 分层策略：
//   mapLayer:    静态（地图网格/障碍物）→ 仅在修改时重绘
//   entityLayer: 动态（炮塔/敌人/弹道）→ 每帧重绘
//   effectLayer: 特效（粒子/波纹/AOE）→ 每帧重绘
//   uiLayer:     UI（范围圈/放置预览）→ 交互时重绘

export interface RenderState {
  mapDirty: boolean;
  entityDirty: boolean;
  effectDirty: boolean;
  uiDirty: boolean;
}

export interface HoverInfo {
  tower: Tower | null;
  screenPos: Position | null;
}

export class Renderer {
  private mapLayer: HTMLCanvasElement;
  private entityLayer: HTMLCanvasElement;
  private effectLayer: HTMLCanvasElement;
  private uiLayer: HTMLCanvasElement;

  private mapCtx: CanvasRenderingContext2D;
  private entityCtx: CanvasRenderingContext2D;
  private effectCtx: CanvasRenderingContext2D;
  private uiCtx: CanvasRenderingContext2D;

  private mapGrid: MapGrid;
  private dirty: RenderState = {
    mapDirty: true,
    entityDirty: true,
    effectDirty: true,
    uiDirty: true
  };

  private hoverInfo: HoverInfo = { tower: null, screenPos: null };
  private previewType: TowerType | null = null;
  private previewPos: GridPos | null = null;
  private selectedTowerId: number | null = null;
  private validPlacement: boolean = false;
  private canvasScale: number = 1;
  private canvasOffsetX: number = 0;
  private canvasOffsetY: number = 0;

  constructor(container: HTMLElement, mapGrid: MapGrid) {
    this.mapGrid = mapGrid;

    this.mapLayer = document.getElementById('map-layer') as HTMLCanvasElement;
    this.entityLayer = document.getElementById('entity-layer') as HTMLCanvasElement;
    this.effectLayer = document.getElementById('effect-layer') as HTMLCanvasElement;
    this.uiLayer = document.getElementById('ui-layer') as HTMLCanvasElement;

    this.mapCtx = this.mapLayer.getContext('2d')!;
    this.entityCtx = this.entityLayer.getContext('2d')!;
    this.effectCtx = this.effectLayer.getContext('2d')!;
    this.uiCtx = this.uiLayer.getContext('2d')!;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;

    this.canvasScale = Math.min(
      containerWidth / CANVAS_WIDTH,
      containerHeight / CANVAS_HEIGHT
    );

    const displayW = CANVAS_WIDTH * this.canvasScale;
    const displayH = CANVAS_HEIGHT * this.canvasScale;

    this.canvasOffsetX = (containerWidth - displayW) / 2;
    this.canvasOffsetY = (containerHeight - displayH) / 2;

    const canvases = [this.mapLayer, this.entityLayer, this.effectLayer, this.uiLayer];
    for (const canvas of canvases) {
      canvas.width = CANVAS_WIDTH * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;
      canvas.style.width = displayW + 'px';
      canvas.style.height = displayH + 'px';
      canvas.style.left = this.canvasOffsetX + 'px';
      canvas.style.top = this.canvasOffsetY + 'px';
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  screenToCanvas(screenX: number, screenY: number): Position {
    return {
      x: (screenX - this.canvasOffsetX) / this.canvasScale,
      y: (screenY - this.canvasOffsetY) / this.canvasScale
    };
  }

  markDirty(which: keyof RenderState): void {
    this.dirty[which] = true;
  }

  markAllDirty(): void {
    this.dirty.mapDirty = true;
    this.dirty.entityDirty = true;
    this.dirty.effectDirty = true;
    this.dirty.uiDirty = true;
  }

  setPreview(type: TowerType | null, pos: GridPos | null, valid: boolean): void {
    this.previewType = type;
    this.previewPos = pos;
    this.validPlacement = valid;
    this.markDirty('uiDirty');
  }

  setHover(info: HoverInfo): void {
    this.hoverInfo = info;
    this.markDirty('uiDirty');
  }

  setSelectedTower(id: number | null): void {
    this.selectedTowerId = id;
    this.markDirty('uiDirty');
  }

  private clearLayer(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private drawMapGrid(): void {
    const ctx = this.mapCtx;
    this.clearLayer(ctx);

    const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#16162a');
    gradient.addColorStop(1, '#1e1e38');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    for (let gx = 0; gx <= GRID_COLS; gx++) {
      ctx.beginPath();
      ctx.moveTo(gx * GRID_SIZE, 0);
      ctx.lineTo(gx * GRID_SIZE, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let gy = 0; gy <= GRID_ROWS; gy++) {
      ctx.beginPath();
      ctx.moveTo(0, gy * GRID_SIZE);
      ctx.lineTo(CANVAS_WIDTH, gy * GRID_SIZE);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const start = this.mapGrid.getStart();
    const end = this.mapGrid.getEnd();

    this.drawEndpoint(start, '#00d4ff', '起点');
    this.drawEndpoint(end, '#ff2a6d', '终点');

    for (let gy = 0; gy < GRID_ROWS; gy++) {
      for (let gx = 0; gx < GRID_COLS; gx++) {
        if (this.mapGrid.isObstacle(gx, gy)) {
          ctx.fillStyle = 'rgba(100, 100, 140, 0.15)';
          ctx.fillRect(gx * GRID_SIZE + 2, gy * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
        }
      }
    }
  }

  private drawEndpoint(gridPos: GridPos, color: string, label: string): void {
    const ctx = this.mapCtx;
    const p = gridToPixel(gridPos);

    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, GRID_SIZE);
    grd.addColorStop(0, color + 'cc');
    grd.addColorStop(1, color + '00');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, GRID_SIZE, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color + 'dd';
    ctx.beginPath();
    ctx.arc(p.x, p.y, GRID_SIZE * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, p.x, p.y);
  }

  private drawTowers(towers: Tower[]): void {
    const ctx = this.entityCtx;

    for (const tower of towers) {
      this.drawTower(ctx, tower);
    }
  }

  private drawTower(ctx: CanvasRenderingContext2D, tower: Tower): void {
    const cfg = TOWER_CONFIGS[tower.type];
    const p = tower.pixelPos;
    const size = GRID_SIZE * 0.4;

    ctx.save();
    ctx.shadowColor = cfg.color + '80';
    ctx.shadowBlur = 15;

    ctx.fillStyle = 'rgba(40, 40, 70, 0.95)';
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    switch (tower.type) {
      case 'arrow':
        ctx.strokeStyle = cfg.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x - size * 0.5, p.y);
        ctx.lineTo(p.x + size * 0.5, p.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x + size * 0.2, p.y - size * 0.3);
        ctx.lineTo(p.x + size * 0.6, p.y);
        ctx.lineTo(p.x + size * 0.2, p.y + size * 0.3);
        ctx.stroke();
        break;
      case 'magic':
        ctx.fillStyle = cfg.color;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const r = i % 2 === 0 ? size * 0.5 : size * 0.25;
          const x = p.x + Math.cos(ang) * r;
          const y = p.y + Math.sin(ang) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        break;
      case 'cannon':
        ctx.fillStyle = cfg.color;
        ctx.fillRect(p.x - 3, p.y - size * 0.7, 6, size * 0.9);
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 0.35, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    for (let i = 0; i < tower.level; i++) {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(p.x - 8 + i * 8, p.y + size + 6, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawEnemies(enemies: Enemy[]): void {
    const ctx = this.entityCtx;

    for (const enemy of enemies) {
      this.drawEnemy(ctx, enemy);
    }
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy): void {
    const cfg = ENEMY_CONFIGS[enemy.type];
    const p = enemy.pos;
    const s = cfg.size;

    ctx.save();
    ctx.shadowColor = cfg.color + '80';
    ctx.shadowBlur = 8;

    ctx.fillStyle = cfg.color + 'ee';
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1.5;

    switch (enemy.type) {
      case 'fast':
        ctx.beginPath();
        ctx.moveTo(p.x + s, p.y);
        ctx.lineTo(p.x - s * 0.8, p.y - s * 0.8);
        ctx.lineTo(p.x - s * 0.4, p.y);
        ctx.lineTo(p.x - s * 0.8, p.y + s * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case 'heavy':
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2;
          const x = p.x + Math.cos(ang) * s;
          const y = p.y + Math.sin(ang) * s;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = cfg.color + '60';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, s * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'normal':
      default:
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
    }

    ctx.shadowBlur = 0;

    const barW = s * 2.2;
    const barH = 4;
    const barY = p.y - s - 8;
    const hpRatio = Math.max(0, enemy.hp / enemy.maxHp);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(p.x - barW / 2, barY, barW, barH);

    let barColor: string;
    if (enemy.type === 'normal') {
      const r = Math.floor(255 * (1 - hpRatio));
      const g = Math.floor(255 * hpRatio);
      barColor = `rgb(${r}, ${g}, 80)`;
    } else if (enemy.type === 'fast') {
      barColor = '#fb923c';
    } else {
      barColor = '#ef4444';
    }
    ctx.fillStyle = barColor;
    ctx.fillRect(p.x - barW / 2, barY, barW * hpRatio, barH);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(p.x - barW / 2, barY, barW, barH);

    if (enemy.slowTimer > 0) {
      ctx.strokeStyle = '#00d4ff80';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawProjectiles(projectiles: Projectile[]): void {
    const ctx = this.entityCtx;

    for (const proj of projectiles) {
      this.drawProjectile(ctx, proj);
    }
  }

  private drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile): void {
    const progress = Math.min(1, proj.progress);
    const ix = proj.fromPos.x + (proj.toPos.x - proj.fromPos.x) * progress;
    const iy = proj.fromPos.y + (proj.toPos.y - proj.fromPos.y) * progress;

    ctx.save();
    ctx.shadowColor = proj.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = proj.color;

    switch (proj.type) {
      case 'arrow': {
        const tailLen = 14;
        const dx = proj.toPos.x - proj.fromPos.x;
        const dy = proj.toPos.y - proj.fromPos.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const tailX = ix - nx * tailLen;
        const tailY = iy - ny * tailLen;
        ctx.strokeStyle = proj.color + 'aa';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(ix, iy);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(ix, iy, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'magic': {
        ctx.beginPath();
        ctx.arc(ix, iy, 5, 0, Math.PI * 2);
        ctx.fill();
        const alpha = 0.5;
        for (let i = 1; i <= 3; i++) {
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(ix, iy, 5 + i * 3, 0, Math.PI * 2);
          ctx.strokeStyle = proj.color;
          ctx.lineWidth = 1;
          ctx.stroke();
          alpha *= 0.4;
        }
        break;
      }
      case 'cannon': {
        ctx.beginPath();
        ctx.arc(ix, iy, 6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }

  private drawEffects(ripples: RippleEffect[], particles: Particle[], aoeImpacts: { pos: Position; radius: number; damage: number }[], dt: number): void {
    const ctx = this.effectCtx;
    this.clearLayer(ctx);

    for (const ripple of ripples) {
      ctx.strokeStyle = `rgba(0, 212, 255, ${ripple.alpha * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ripple.pos.x, ripple.pos.y, ripple.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 42, 109, ${ripple.alpha * 0.3})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ripple.pos.x, ripple.pos.y, ripple.radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const aoe of aoeImpacts) {
      const grd = ctx.createRadialGradient(aoe.pos.x, aoe.pos.y, 0, aoe.pos.x, aoe.pos.y, aoe.radius);
      grd.addColorStop(0, 'rgba(249, 115, 22, 0.8)');
      grd.addColorStop(0.5, 'rgba(249, 115, 22, 0.3)');
      grd.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(aoe.pos.x, aoe.pos.y, aoe.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const particle of particles) {
      const alpha = particle.life / particle.maxLife;
      ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(particle.pos.x, particle.pos.y, particle.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawUi(towers: Tower[], state: GameState): void {
    const ctx = this.uiCtx;
    this.clearLayer(ctx);

    if (this.selectedTowerId !== null) {
      const tower = towers.find(t => t.id === this.selectedTowerId);
      if (tower) {
        const cfg = TOWER_CONFIGS[tower.type];
        const range = cfg.range[tower.level - 1];
        this.drawRangeCircle(ctx, tower.pixelPos, range, '#ff2a6d', 0.35);
      }
    }

    if (this.hoverInfo.tower) {
      const tower = this.hoverInfo.tower;
      const cfg = TOWER_CONFIGS[tower.type];
      const range = cfg.range[tower.level - 1];
      this.drawRangeCircle(ctx, tower.pixelPos, range, '#00d4ff', 0.25);
    }

    if (this.previewType && this.previewPos) {
      const p = gridToPixel(this.previewPos);
      const cfg = TOWER_CONFIGS[this.previewType];
      const color = this.validPlacement ? cfg.color : '#ef4444';
      const range = cfg.range[0];

      this.drawRangeCircle(ctx, p, range, color, this.validPlacement ? 0.25 : 0.15);

      ctx.fillStyle = this.validPlacement ? cfg.color + '40' : '#ef444440';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.fillRect(
        this.previewPos.gx * GRID_SIZE + 2,
        this.previewPos.gy * GRID_SIZE + 2,
        GRID_SIZE - 4,
        GRID_SIZE - 4
      );
      ctx.strokeRect(
        this.previewPos.gx * GRID_SIZE + 2,
        this.previewPos.gy * GRID_SIZE + 2,
        GRID_SIZE - 4,
        GRID_SIZE - 4
      );
      ctx.setLineDash([]);

      if (this.validPlacement) {
        const size = GRID_SIZE * 0.32;
        ctx.fillStyle = cfg.color + 'cc';
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawRangeCircle(ctx: CanvasRenderingContext2D, p: Position, range: number, color: string, alpha: number): void {
    const grd = ctx.createRadialGradient(p.x, p.y, range * 0.7, p.x, p.y, range);
    grd.addColorStop(0, color + '00');
    grd.addColorStop(1, color + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.x, p.y, range, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = color + '80';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  render(
    towers: Tower[],
    enemies: Enemy[],
    projectiles: Projectile[],
    ripples: RippleEffect[],
    particles: Particle[],
    aoeImpacts: { pos: Position; radius: number; damage: number }[],
    state: GameState,
    dt: number
  ): void {
    if (this.dirty.mapDirty) {
      this.drawMapGrid();
      this.dirty.mapDirty = false;
    }

    if (this.dirty.entityDirty) {
      this.clearLayer(this.entityCtx);
      this.drawTowers(towers);
      this.drawEnemies(enemies);
      this.drawProjectiles(projectiles);
    }

    if (this.dirty.effectDirty) {
      this.drawEffects(ripples, particles, aoeImpacts, dt);
    }

    if (this.dirty.uiDirty) {
      this.drawUi(towers, state);
      this.dirty.uiDirty = false;
    }
  }

  getTooltipContent(tower: Tower): string {
    const cfg = TOWER_CONFIGS[tower.type];
    const lv = tower.level - 1;
    const upgradeCost = getUpgradeCost(tower);
    const sellValue = getSellValue(tower);

    return `
      <div class="tooltip-title">${cfg.name} Lv.${tower.level}</div>
      <div class="tooltip-row">
        <span class="tooltip-label">伤害</span>
        <span>${cfg.damage[lv]}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">攻击范围</span>
        <span>${cfg.range[lv]}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">攻速</span>
        <span>${(1 / cfg.attackSpeed[lv]).toFixed(1)}/s</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">升级费用</span>
        <span style="color: #ffd700;">${upgradeCost > 0 ? upgradeCost + ' 金币' : '已满级'}</span>
      </div>
      <div class="tooltip-row">
        <span class="tooltip-label">出售价格</span>
        <span style="color: #ef4444;">${sellValue} 金币</span>
      </div>
    `;
  }
}
