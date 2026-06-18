import { ResourceManager } from './ResourceManager';
import { DefenseTower, Projectile, Tower, RippleEffect } from './DefenseTower';
import { EnemySpawner, Enemy, EnergyDrop } from './EnemySpawner';

const MAP_WIDTH = 800;
const MAP_HEIGHT = 600;
const GRID_SIZE = 40;
const TOOLBAR_WIDTH = 100;
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 650;
const MAP_OFFSET_X = TOOLBAR_WIDTH + (CANVAS_WIDTH - TOOLBAR_WIDTH - MAP_WIDTH) / 2;
const MAP_OFFSET_Y = (CANVAS_HEIGHT - MAP_HEIGHT) / 2;
const CORE_X = MAP_WIDTH / 2;
const CORE_Y = MAP_HEIGHT / 2;
const CORE_RADIUS = 15;
const CORE_BREATH_PERIOD = 1500;
const TOWER_BUILD_COST = 10;
const TOWER_UPGRADE_COST = 20;

export { MAP_WIDTH, MAP_HEIGHT, GRID_SIZE, TOOLBAR_WIDTH, CANVAS_WIDTH, CANVAS_HEIGHT, MAP_OFFSET_X, MAP_OFFSET_Y };

export class Game {
  resourceManager: ResourceManager;
  defenseTower: DefenseTower;
  enemySpawner: EnemySpawner;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number = 0;
  private lastTimestamp: number = 0;
  private paused: boolean = false;
  private coreHitFlashTimer: number = 0;
  private hoverGridX: number = -1;
  private hoverGridY: number = -1;
  private selectedTowerIndex: number = -1;
  private gameTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resourceManager = new ResourceManager();
    this.defenseTower = new DefenseTower();
    this.enemySpawner = new EnemySpawner(MAP_WIDTH, MAP_HEIGHT);

    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.gameLoop = this.gameLoop.bind(this);

    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('click', this.handleClick);
  }

  start(): void {
    this.lastTimestamp = performance.now();
    this.animFrameId = requestAnimationFrame(this.gameLoop);
  }

  stop(): void {
    cancelAnimationFrame(this.animFrameId);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('click', this.handleClick);
  }

  togglePause(): void {
    this.paused = !this.paused;
  }

  isPaused(): boolean {
    return this.paused;
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX - MAP_OFFSET_X;
    const my = (e.clientY - rect.top) * scaleY - MAP_OFFSET_Y;

    if (mx >= 0 && mx < MAP_WIDTH && my >= 0 && my < MAP_HEIGHT) {
      this.hoverGridX = Math.floor(mx / GRID_SIZE);
      this.hoverGridY = Math.floor(my / GRID_SIZE);
    } else {
      this.hoverGridX = -1;
      this.hoverGridY = -1;
    }
  }

  private handleClick(e: MouseEvent): void {
    if (this.paused) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    if (canvasX >= 10 && canvasX <= 90 && canvasY >= 10 && canvasY <= 90) {
      this.togglePause();
      return;
    }

    const mapX = canvasX - MAP_OFFSET_X;
    const mapY = canvasY - MAP_OFFSET_Y;

    if (mapX < 0 || mapX >= MAP_WIDTH || mapY < 0 || mapY >= MAP_HEIGHT) {
      this.selectedTowerIndex = -1;
      return;
    }

    const collected = this.enemySpawner.tryCollectDrop(mapX, mapY);
    if (collected > 0) {
      this.resourceManager.add(collected);
    }

    const gx = Math.floor(mapX / GRID_SIZE);
    const gy = Math.floor(mapY / GRID_SIZE);

    const existingIdx = this.defenseTower.getTowerAtGrid(gx, gy);
    if (existingIdx >= 0) {
      this.selectedTowerIndex = existingIdx;
      return;
    }

    if (this.selectedTowerIndex >= 0) {
      const selTower = this.defenseTower.towers[this.selectedTowerIndex];
      if (selTower) {
        const upgradeBtnX = selTower.x + MAP_OFFSET_X;
        const upgradeBtnY = selTower.y + MAP_OFFSET_Y - 35;
        if (
          canvasX >= upgradeBtnX - 35 &&
          canvasX <= upgradeBtnX + 35 &&
          canvasY >= upgradeBtnY - 12 &&
          canvasY <= upgradeBtnY + 12
        ) {
          if (selTower.level < 2 && this.resourceManager.spend(TOWER_UPGRADE_COST)) {
            this.defenseTower.upgradeTower(this.selectedTowerIndex);
          }
          return;
        }
      }
      this.selectedTowerIndex = -1;
    }

    if (this.defenseTower.canBuildAt(gx, gy, CORE_X, CORE_Y, GRID_SIZE)) {
      if (this.resourceManager.spend(TOWER_BUILD_COST)) {
        this.defenseTower.buildTower(gx, gy, GRID_SIZE);
        this.selectedTowerIndex = -1;
      }
    }
  }

  private gameLoop(timestamp: number): void {
    this.animFrameId = requestAnimationFrame(this.gameLoop);

    const deltaMs = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    if (this.paused) {
      this.render();
      return;
    }

    this.gameTime += deltaMs;
    this.update(timestamp, deltaMs);
    this.render();
  }

  private update(timestamp: number, deltaMs: number): void {
    this.enemySpawner.trySpawnWave(timestamp);

    this.defenseTower.update(timestamp, this.enemySpawner.enemies);

    const { hitCore } = this.enemySpawner.update();
    if (hitCore) {
      this.coreHitFlashTimer = 200;
    }
    if (this.coreHitFlashTimer > 0) {
      this.coreHitFlashTimer -= deltaMs;
    }

    this.checkCollisions();

    this.defenseTower.cleanupProjectiles();
    this.enemySpawner.cleanupEnemies();

    this.resourceManager.updateFlash(deltaMs);

    for (const tower of this.defenseTower.towers) {
      if (tower.buildAnimTimer > 0) {
        tower.buildAnimTimer -= deltaMs;
      }
    }
  }

  private checkCollisions(): void {
    for (const proj of this.defenseTower.projectiles) {
      if (!proj.alive) continue;

      for (const enemy of this.enemySpawner.enemies) {
        if (!enemy.alive) continue;
        const dx = proj.x - enemy.x;
        const dy = proj.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < enemy.size + proj.radius) {
          proj.alive = false;
          this.enemySpawner.damageEnemy(enemy.id, proj.damage);
          break;
        }
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.renderToolbar(ctx);
    this.renderMap(ctx);
    this.renderCore(ctx);
    this.renderEntrances(ctx);
    this.renderTowers(ctx);
    this.renderEnemies(ctx);
    this.renderProjectiles(ctx);
    this.renderRipples(ctx);
    this.renderEnergyDrops(ctx);
    this.renderHoverHighlight(ctx);
    this.renderUpgradeUI(ctx);
    this.renderHUD(ctx);
    this.renderCoreHitFlash(ctx);
  }

  private renderToolbar(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#16213ee6';
    ctx.fillRect(0, 0, TOOLBAR_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    ctx.beginPath();
    ctx.arc(50, 50, 25, 0, Math.PI * 2);
    ctx.fillStyle = '#444466';
    ctx.fill();
    ctx.strokeStyle = '#666688';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    if (this.paused) {
      ctx.fillStyle = '#ddd';
      ctx.beginPath();
      ctx.moveTo(42, 35);
      ctx.lineTo(62, 50);
      ctx.lineTo(42, 65);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#ddd';
      ctx.fillRect(40, 38, 20, 5);
      ctx.fillRect(40, 48, 20, 5);
      ctx.fillRect(40, 58, 20, 5);
    }

    ctx.fillStyle = '#aaaacc';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`WAVE`, 50, 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`${this.enemySpawner.waveNumber}`, 50, 125);

    ctx.fillStyle = '#aaaacc';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`ENEMIES`, 50, 165);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`${this.enemySpawner.aliveEnemyCount}`, 50, 185);

    ctx.fillStyle = '#666688';
    ctx.font = '10px monospace';
    ctx.fillText('CLICK GRID', 50, 550);
    ctx.fillText('TO BUILD', 50, 565);
    ctx.fillText('TOWER', 50, 580);
    ctx.fillText(`COST: ${TOWER_BUILD_COST}`, 50, 600);
  }

  private renderMap(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(MAP_OFFSET_X, MAP_OFFSET_Y);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    ctx.strokeStyle = '#2a2a3e';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= MAP_WIDTH; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, MAP_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= MAP_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(MAP_WIDTH, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderCore(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(MAP_OFFSET_X, MAP_OFFSET_Y);

    const breathPhase = (this.gameTime % CORE_BREATH_PERIOD) / CORE_BREATH_PERIOD;
    const breathScale = 1 + 0.3 * Math.sin(breathPhase * Math.PI * 2);
    const glowRadius = CORE_RADIUS + 10 * breathScale;

    const gradient = ctx.createRadialGradient(CORE_X, CORE_Y, CORE_RADIUS * 0.5, CORE_X, CORE_Y, glowRadius);
    gradient.addColorStop(0, 'rgba(150, 200, 255, 0.4)');
    gradient.addColorStop(0.5, 'rgba(100, 150, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(50, 100, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(CORE_X, CORE_Y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(CORE_X, CORE_Y, CORE_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(100, 180, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  private renderEntrances(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(MAP_OFFSET_X, MAP_OFFSET_Y);

    for (const entrance of this.enemySpawner.entrances) {
      const flash = 0.5 + 0.5 * Math.sin(entrance.arrowPhase);

      ctx.save();
      ctx.translate(entrance.x, entrance.y);

      let angle = 0;
      if (entrance.x === 0) angle = 0;
      else if (entrance.x === MAP_WIDTH) angle = Math.PI;
      else if (entrance.y === MAP_HEIGHT) angle = -Math.PI / 2;

      ctx.rotate(angle);

      ctx.fillStyle = `rgba(255, 50, 50, ${0.3 + 0.5 * flash})`;
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(-5, -10);
      ctx.lineTo(-5, 10);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 80, 80, ${0.5 + 0.3 * flash})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }

  private renderTowers(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(MAP_OFFSET_X, MAP_OFFSET_Y);

    for (const tower of this.defenseTower.towers) {
      let scale = 1;
      if (tower.buildAnimTimer > 0) {
        const progress = 1 - tower.buildAnimTimer / 150;
        scale = 0.95 + 0.05 * progress;
      }
      if (tower.upgradeAnimTimer > 0) {
        const progress = 1 - tower.upgradeAnimTimer / 150;
        scale = 0.95 + 0.05 * progress;
      }

      ctx.save();
      ctx.translate(tower.x, tower.y);
      ctx.scale(scale, scale);

      if (this.selectedTowerIndex >= 0 && this.defenseTower.towers[this.selectedTowerIndex] === tower) {
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, tower.range, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 212, 255, 0.05)';
        ctx.fill();
      }

      const haloColor = tower.level >= 2 ? '#9933ff' : '#00d4ff';
      ctx.save();
      ctx.rotate((tower.haloAngle * Math.PI) / 180);
      ctx.strokeStyle = haloColor;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 1.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 24, Math.PI * 1.4, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();

      const bodyColor = tower.level >= 2 ? '#6633cc' : '#2266cc';
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = haloColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (tower.level >= 2) {
        ctx.fillStyle = '#ff3333';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#4488ff';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      if (tower.flashTimer > 0) {
        const flashAlpha = tower.flashTimer / 100;
        ctx.fillStyle = `rgba(255, 255, 200, ${flashAlpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(0, -18, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    ctx.restore();
  }

  private renderEnemies(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(MAP_OFFSET_X, MAP_OFFSET_Y);

    for (const enemy of this.enemySpawner.enemies) {
      if (!enemy.alive) continue;

      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      const isFlashing = enemy.hitFlashTimer > 0;
      ctx.fillStyle = isFlashing ? '#ffffff' : '#33cc33';
      ctx.strokeStyle = isFlashing ? '#ffffff' : '#22aa22';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = Math.cos(angle) * enemy.size;
        const py = Math.sin(angle) * enemy.size;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (enemy.hp < enemy.maxHp) {
        const hpRatio = enemy.hp / enemy.maxHp;
        const barWidth = enemy.size * 2;
        ctx.fillStyle = '#333';
        ctx.fillRect(-barWidth / 2, -enemy.size - 8, barWidth, 3);
        ctx.fillStyle = hpRatio > 0.5 ? '#33cc33' : hpRatio > 0.25 ? '#cccc33' : '#cc3333';
        ctx.fillRect(-barWidth / 2, -enemy.size - 8, barWidth * hpRatio, 3);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(MAP_OFFSET_X, MAP_OFFSET_Y);

    for (const proj of this.defenseTower.projectiles) {
      if (!proj.alive) continue;

      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  private renderRipples(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(MAP_OFFSET_X, MAP_OFFSET_Y);

    for (const ripple of this.defenseTower.ripples) {
      const progress = ripple.timer / ripple.duration;
      const radius = 20 + 30 * progress;
      const alpha = 1 - progress;
      ctx.strokeStyle = `rgba(0, 212, 255, ${alpha * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderEnergyDrops(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(MAP_OFFSET_X, MAP_OFFSET_Y);

    for (const drop of this.enemySpawner.energyDrops) {
      if (drop.collected) continue;

      const flash = 0.5 + 0.5 * Math.sin(drop.flashPhase);
      const alpha = Math.min(1, (drop.duration - drop.timer) / 500);

      ctx.fillStyle = `rgba(224, 185, 74, ${(0.6 + 0.4 * flash) * alpha})`;
      ctx.fillRect(drop.x - 5, drop.y - 5, 10, 10);

      ctx.strokeStyle = `rgba(255, 220, 100, ${0.5 * alpha})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(drop.x - 5, drop.y - 5, 10, 10);
    }

    ctx.restore();
  }

  private renderHoverHighlight(ctx: CanvasRenderingContext2D): void {
    if (this.hoverGridX < 0 || this.hoverGridY < 0) return;
    if (this.paused) return;

    const existingIdx = this.defenseTower.getTowerAtGrid(this.hoverGridX, this.hoverGridY);
    if (existingIdx >= 0) return;

    ctx.save();
    ctx.translate(MAP_OFFSET_X, MAP_OFFSET_Y);

    const cx = this.hoverGridX * GRID_SIZE + GRID_SIZE / 2;
    const cy = this.hoverGridY * GRID_SIZE + GRID_SIZE / 2;

    const canBuild = this.defenseTower.canBuildAt(this.hoverGridX, this.hoverGridY, CORE_X, CORE_Y, GRID_SIZE);
    const canAfford = this.resourceManager.canAfford(TOWER_BUILD_COST);

    if (canBuild && canAfford) {
      ctx.fillStyle = 'rgba(0, 150, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 180, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(255, 50, 50, 0.15)';
      ctx.fillRect(this.hoverGridX * GRID_SIZE, this.hoverGridY * GRID_SIZE, GRID_SIZE, GRID_SIZE);
    }

    ctx.restore();
  }

  private renderUpgradeUI(ctx: CanvasRenderingContext2D): void {
    if (this.selectedTowerIndex < 0 || this.selectedTowerIndex >= this.defenseTower.towers.length) return;

    const tower = this.defenseTower.towers[this.selectedTowerIndex];
    const screenX = tower.x + MAP_OFFSET_X;
    const screenY = tower.y + MAP_OFFSET_Y - 35;

    if (tower.level < 2) {
      const canAfford = this.resourceManager.canAfford(TOWER_UPGRADE_COST);
      ctx.fillStyle = canAfford ? 'rgba(100, 50, 180, 0.9)' : 'rgba(80, 80, 80, 0.9)';
      const bw = 70;
      const bh = 24;
      const bx = screenX - bw / 2;
      const by = screenY - bh / 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 6);
      ctx.fill();

      ctx.fillStyle = canAfford ? '#fff' : '#999';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`UPG ${TOWER_UPGRADE_COST}E`, screenX, screenY);
    } else {
      ctx.fillStyle = 'rgba(60, 60, 100, 0.9)';
      const bw = 70;
      const bh = 24;
      const bx = screenX - bw / 2;
      const by = screenY - bh / 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 6);
      ctx.fill();

      ctx.fillStyle = '#aaa';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('MAX LV', screenX, screenY);
    }
  }

  private renderHUD(ctx: CanvasRenderingContext2D): void {
    const energy = this.resourceManager.energy;
    const isFlashing = this.resourceManager.shouldFlashRed();

    ctx.save();

    if (this.resourceManager.isLow()) {
      ctx.fillStyle = isFlashing ? '#ff3333' : '#e0b94a';
    } else {
      ctx.fillStyle = '#e0b94a';
    }
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = '#00000033';
    ctx.shadowBlur = 4;
    ctx.fillText(`⚡ ${energy}`, MAP_OFFSET_X + 10, MAP_OFFSET_Y + 8);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(
      `Wave: ${this.enemySpawner.waveNumber}  Enemies: ${this.enemySpawner.aliveEnemyCount}`,
      MAP_OFFSET_X + MAP_WIDTH - 10,
      MAP_OFFSET_Y + 12
    );

    ctx.restore();
  }

  private renderCoreHitFlash(ctx: CanvasRenderingContext2D): void {
    if (this.coreHitFlashTimer <= 0) return;

    const alpha = (this.coreHitFlashTimer / 200) * 0.3;
    ctx.save();

    ctx.strokeStyle = `rgba(255, 30, 30, ${alpha})`;
    ctx.lineWidth = 20;
    ctx.strokeRect(MAP_OFFSET_X, MAP_OFFSET_Y, MAP_WIDTH, MAP_HEIGHT);

    ctx.restore();
  }
}
