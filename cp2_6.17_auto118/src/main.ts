import {
  CANVAS_SIZE,
  CELL_SIZE,
  GRID_SIZE,
  TowerType,
  TOWER_CONFIGS,
  ENEMY_SPAWN_INTERVAL_MS,
  pixelToGrid,
  gridToPixel,
  TowerConfig
} from './config';
import { GameMap } from './GameMap';
import { Tower, Projectile } from './Tower';
import { Enemy } from './Enemy';
import { GameState } from './GameState';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameMap: GameMap;
  private gameState: GameState;
  private towers: Tower[];
  private enemies: Enemy[];
  private projectiles: Projectile[];
  private selectedTowerType: TowerType | null;
  private selectedTower: Tower | null;
  private mouseX: number;
  private mouseY: number;
  private mouseInCanvas: boolean;
  private lastSpawnTime: number;
  private lastFrameTime: number;
  private running: boolean;
  private upgradeBtnScale: number;
  private sellBtnScale: number;
  private lastClickTime: number;

  private hudResources: HTMLElement;
  private hudWave: HTMLElement;
  private hudEnemies: HTMLElement;
  private hudScore: HTMLElement;
  private hudLives: HTMLElement;
  private startWaveBtn: HTMLButtonElement;
  private towerInfoPanel: HTMLElement;
  private selectedTowerName: HTMLElement;
  private selectedTowerLevel: HTMLElement;
  private selectedTowerStats: HTMLElement;
  private upgradeBtn: HTMLButtonElement;
  private sellBtn: HTMLButtonElement;
  private gameOverlay: HTMLElement;
  private overlayTitle: HTMLElement;
  private overlayScore: HTMLElement;
  private restartBtn: HTMLButtonElement;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    this.ctx = ctx;

    this.gameMap = new GameMap();
    this.gameState = new GameState();
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.selectedTowerType = null;
    this.selectedTower = null;
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseInCanvas = false;
    this.lastSpawnTime = 0;
    this.lastFrameTime = 0;
    this.running = true;
    this.upgradeBtnScale = 1;
    this.sellBtnScale = 1;
    this.lastClickTime = 0;

    this.hudResources = document.getElementById('resources')!;
    this.hudWave = document.getElementById('wave')!;
    this.hudEnemies = document.getElementById('enemies')!;
    this.hudScore = document.getElementById('score')!;
    this.hudLives = document.getElementById('lives')!;
    this.startWaveBtn = document.getElementById('start-wave-btn') as HTMLButtonElement;
    this.towerInfoPanel = document.getElementById('tower-info-panel')!;
    this.selectedTowerName = document.getElementById('selected-tower-name')!;
    this.selectedTowerLevel = document.getElementById('selected-tower-level')!;
    this.selectedTowerStats = document.getElementById('selected-tower-stats')!;
    this.upgradeBtn = document.getElementById('upgrade-btn') as HTMLButtonElement;
    this.sellBtn = document.getElementById('sell-btn') as HTMLButtonElement;
    this.gameOverlay = document.getElementById('game-overlay')!;
    this.overlayTitle = document.getElementById('overlay-title')!;
    this.overlayScore = document.getElementById('overlay-score')!;
    this.restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;

    this.bindEvents();
    this.updateHUD();
    this.updateTowerShopButtons();
    this.lastFrameTime = performance.now();
    this.gameLoop(this.lastFrameTime);
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      this.mouseInCanvas = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouseInCanvas = false;
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.gameState.isGameOver() || this.gameState.isVictory()) return;
      const rect = this.canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      this.handleCanvasClick(px, py);
    });

    this.startWaveBtn.addEventListener('click', () => {
      if (this.gameState.startNextWave()) {
        this.lastSpawnTime = performance.now();
        this.updateHUD();
      }
    });

    document.querySelectorAll('.tower-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = (btn as HTMLElement).dataset.tower as TowerType;
        if (type) {
          this.selectTowerType(type);
        }
      });
    });

    this.upgradeBtn.addEventListener('click', () => {
      if (this.selectedTower && this.selectedTower.canUpgrade()) {
        const cost = this.selectedTower.getUpgradeCost();
        if (this.gameState.spend(cost)) {
          this.selectedTower.upgrade();
          this.updateHUD();
          this.updateTowerInfoPanel();
          this.updateTowerShopButtons();
        }
      }
    });

    this.sellBtn.addEventListener('click', () => {
      if (this.selectedTower) {
        const refund = this.selectedTower.getSellValue();
        this.gameState.addResources(refund);
        this.gameMap.removeTower(this.selectedTower.getGridX(), this.selectedTower.getGridY());
        this.towers = this.towers.filter(t => t !== this.selectedTower);
        this.selectedTower = null;
        this.updateHUD();
        this.updateTowerInfoPanel();
        this.updateTowerShopButtons();
      }
    });

    this.restartBtn.addEventListener('click', () => {
      this.restart();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.selectedTowerType = null;
        this.selectedTower = null;
        this.updateTowerShopButtons();
        this.updateTowerInfoPanel();
      } else if (e.key === '1') {
        this.selectTowerType('arrow');
      } else if (e.key === '2') {
        this.selectTowerType('cannon');
      } else if (e.key === '3') {
        this.selectTowerType('magic');
      } else if (e.key === ' ') {
        e.preventDefault();
        if (this.gameState.startNextWave()) {
          this.lastSpawnTime = performance.now();
          this.updateHUD();
        }
      }
    });
  }

  private selectTowerType(type: TowerType): void {
    const config = TOWER_CONFIGS[type];
    if (!this.gameState.canAfford(config.cost)) return;
    this.selectedTowerType = type;
    this.selectedTower = null;
    this.updateTowerShopButtons();
    this.updateTowerInfoPanel();
  }

  private getUpgradeBtnRect(): { x: number; y: number; w: number; h: number } {
    if (!this.selectedTower) return { x: 0, y: 0, w: 0, h: 0 };
    const btnW = 24;
    const btnH = 20;
    const spacing = 6;
    const totalW = btnW * 2 + spacing;
    const startX = this.selectedTower.getX() - totalW / 2;
    const y = this.selectedTower.getY() - 30 - CELL_SIZE / 2;
    return { x: startX, y, w: btnW, h: btnH };
  }

  private getSellBtnRect(): { x: number; y: number; w: number; h: number } {
    if (!this.selectedTower) return { x: 0, y: 0, w: 0, h: 0 };
    const btnW = 24;
    const btnH = 20;
    const spacing = 6;
    const upgradeRect = this.getUpgradeBtnRect();
    return { x: upgradeRect.x + btnW + spacing, y: upgradeRect.y, w: btnW, h: btnH };
  }

  private isPointInRect(px: number, py: number, rect: { x: number; y: number; w: number; h: number }): boolean {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
  }

  private handleCanvasClick(px: number, py: number): void {
    if (this.selectedTower) {
      const upgradeRect = this.getUpgradeBtnRect();
      const sellRect = this.getSellBtnRect();
      const now = performance.now();

      if (this.isPointInRect(px, py, upgradeRect) && now - this.lastClickTime > 200) {
        this.lastClickTime = now;
        this.upgradeBtnScale = 0.8;
        if (this.selectedTower.canUpgrade()) {
          const cost = this.selectedTower.getUpgradeCost();
          if (this.gameState.spend(cost)) {
            this.selectedTower.upgrade();
            this.updateHUD();
            this.updateTowerInfoPanel();
            this.updateTowerShopButtons();
          }
        }
        return;
      }

      if (this.isPointInRect(px, py, sellRect) && now - this.lastClickTime > 200) {
        this.lastClickTime = now;
        this.sellBtnScale = 0.8;
        const refund = this.selectedTower.getSellValue();
        this.gameState.addResources(refund);
        this.gameMap.removeTower(this.selectedTower.getGridX(), this.selectedTower.getGridY());
        this.towers = this.towers.filter(t => t !== this.selectedTower);
        this.selectedTower = null;
        this.updateHUD();
        this.updateTowerInfoPanel();
        this.updateTowerShopButtons();
        return;
      }
    }

    const { x: gx, y: gy } = pixelToGrid(px, py);
    if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return;

    const cell = this.gameMap.getCell(gx, gy);
    if (!cell) return;

    if (cell.tower) {
      this.selectedTower = cell.tower;
      this.selectedTowerType = null;
      this.updateTowerShopButtons();
      this.updateTowerInfoPanel();
    } else if (this.selectedTowerType && this.gameMap.isBuildable(gx, gy)) {
      const config = TOWER_CONFIGS[this.selectedTowerType];
      if (this.gameState.spend(config.cost)) {
        const tower = new Tower(gx, gy, this.selectedTowerType);
        this.gameMap.placeTower(gx, gy, tower);
        this.towers.push(tower);
        this.selectedTowerType = null;
        this.updateHUD();
        this.updateTowerShopButtons();
      }
    } else {
      this.selectedTower = null;
      this.updateTowerInfoPanel();
    }
  }

  private updateTowerShopButtons(): void {
    document.querySelectorAll('.tower-btn').forEach(btn => {
      const type = (btn as HTMLElement).dataset.tower as TowerType;
      const config = TOWER_CONFIGS[type];
      const canAfford = this.gameState.canAfford(config.cost);

      btn.classList.toggle('disabled', !canAfford);
      btn.classList.toggle('selected', this.selectedTowerType === type);
    });
  }

  private updateTowerInfoPanel(): void {
    if (this.selectedTower) {
      this.towerInfoPanel.classList.add('visible');
      this.selectedTowerName.textContent = this.selectedTower.getName();
      this.selectedTowerLevel.textContent = `等级: ${this.selectedTower.getLevel()} / 3`;

      const dmg = this.selectedTower.getDamage();
      const fr = this.selectedTower.getFireRate().toFixed(2);
      const range = this.selectedTower.getRange();
      const special: string[] = [];
      const cfg = this.selectedTower.getConfig();
      if (cfg.splashRadius) special.push(`溅射: ${cfg.splashRadius}px`);
      if (cfg.slowPercent) special.push(`减速: ${(cfg.slowPercent * 100).toFixed(0)}% ${cfg.slowDuration}s`);

      this.selectedTowerStats.innerHTML = `
        伤害: ${dmg}<br>
        射速: ${fr}/秒<br>
        范围: ${range}px<br>
        ${special.length > 0 ? special.join('<br>') : ''}
      `;

      if (this.selectedTower.canUpgrade()) {
        const upCost = this.selectedTower.getUpgradeCost();
        this.upgradeBtn.textContent = `升级 (${upCost})`;
        this.upgradeBtn.disabled = !this.gameState.canAfford(upCost);
      } else {
        this.upgradeBtn.textContent = '已满级';
        this.upgradeBtn.disabled = true;
      }

      this.sellBtn.textContent = `出售 (+${this.selectedTower.getSellValue()})`;
    } else {
      this.towerInfoPanel.classList.remove('visible');
    }
  }

  private updateHUD(): void {
    const data = this.gameState.getData();
    this.hudResources.textContent = data.resources.toString();
    this.hudWave.textContent = `${data.wave} / ${this.gameState.getTotalWaves()}`;
    this.hudEnemies.textContent = data.enemiesRemaining.toString();
    this.hudScore.textContent = data.score.toString();
    this.hudLives.textContent = data.lives.toString();

    this.startWaveBtn.disabled = data.waveInProgress || data.gameOver || data.victory || data.wave >= this.gameState.getTotalWaves();
    if (data.wave >= this.gameState.getTotalWaves() && !data.waveInProgress) {
      this.startWaveBtn.textContent = '已完成';
    } else if (data.waveInProgress) {
      this.startWaveBtn.textContent = '进行中...';
    } else {
      this.startWaveBtn.textContent = `开始波次 ${data.wave + 1}`;
    }

    this.updateTowerShopButtons();

    if (data.gameOver || data.victory) {
      this.showGameOver(data.victory);
    }
  }

  private showGameOver(victory: boolean): void {
    this.gameOverlay.classList.add('visible');
    this.overlayTitle.textContent = victory ? '胜利！' : '失败';
    this.overlayTitle.className = 'overlay-title ' + (victory ? 'victory' : 'defeat');
    this.overlayScore.textContent = `最终得分: ${this.gameState.getScore()}`;
  }

  private restart(): void {
    this.gameState.reset();
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.gameMap = new GameMap();
    this.selectedTower = null;
    this.selectedTowerType = null;
    this.gameOverlay.classList.remove('visible');
    this.updateHUD();
    this.updateTowerShopButtons();
    this.updateTowerInfoPanel();
  }

  private spawnEnemy(currentTime: number): void {
    if (!this.gameState.isWaveInProgress()) return;

    const pending = this.gameState.getPendingEnemies();
    if (this.gameState.getEnemiesSpawned() >= pending.length) return;

    if (currentTime - this.lastSpawnTime >= ENEMY_SPAWN_INTERVAL_MS) {
      const type = pending[this.gameState.getEnemiesSpawned()];
      const enemy = new Enemy(type);
      this.enemies.push(enemy);
      this.gameState.incrementSpawned();
      this.gameState.setEnemiesAlive(this.gameState.getEnemiesAlive() + 1);
      this.lastSpawnTime = currentTime;
    }
  }

  private updateProjectiles(currentTime: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (p.targetEnemy && p.targetEnemy.isAlive()) {
        p.targetX = p.targetEnemy.getX();
        p.targetY = p.targetEnemy.getY();
      }

      if (dist <= p.speed) {
        if (p.splashRadius) {
          for (const enemy of this.enemies) {
            if (!enemy.isAlive()) continue;
            const edx = enemy.getX() - p.targetX;
            const edy = enemy.getY() - p.targetY;
            if (edx * edx + edy * edy <= p.splashRadius * p.splashRadius) {
              enemy.takeDamage(p.damage, currentTime);
            }
          }
        } else if (p.targetEnemy && p.targetEnemy.isAlive()) {
          p.targetEnemy.takeDamage(p.damage, currentTime);
          if (p.slowPercent && p.slowDuration) {
            p.targetEnemy.applySlow(p.slowPercent, p.slowDuration, currentTime);
          }
        }
        this.projectiles.splice(i, 1);
      } else {
        p.x += (dx / dist) * p.speed;
        p.y += (dy / dist) * p.speed;
      }
    }
  }

  private checkEnemyDeaths(currentTime: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(currentTime);

      if (enemy.hasReachedEnd()) {
        this.gameState.loseLife();
        this.gameState.setEnemiesAlive(this.gameState.getEnemiesAlive() - 1);
        this.enemies.splice(i, 1);
        this.updateHUD();
      } else if (!enemy.isAlive() && !enemy.hasReachedEnd()) {
        this.gameState.addScore(enemy.getScore());
        this.gameState.addResources(enemy.getScore());
        this.gameState.setEnemiesAlive(this.gameState.getEnemiesAlive() - 1);
        this.enemies.splice(i, 1);
        this.updateHUD();
      }
    }

    if (this.gameState.isWaveInProgress()) {
      const pending = this.gameState.getPendingEnemies();
      if (this.gameState.getEnemiesSpawned() >= pending.length && this.gameState.getEnemiesAlive() === 0) {
        this.gameState.endWave();
        this.updateHUD();
      }
    }
  }

  private drawProjectiles(): void {
    for (const p of this.projectiles) {
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = p.color + '44';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawTowerActionButtons(): void {
    if (!this.selectedTower) return;

    const upgradeRect = this.getUpgradeBtnRect();
    const sellRect = this.getSellBtnRect();

    this.drawActionButton(
      upgradeRect.x,
      upgradeRect.y,
      upgradeRect.w,
      upgradeRect.h,
      this.upgradeBtnScale,
      '#28a745',
      '↑',
      this.selectedTower.canUpgrade() ? this.selectedTower.getUpgradeCost() : null
    );

    this.drawActionButton(
      sellRect.x,
      sellRect.y,
      sellRect.w,
      sellRect.h,
      this.sellBtnScale,
      '#dc3545',
      '$',
      this.selectedTower.getSellValue()
    );
  }

  private drawActionButton(
    x: number,
    y: number,
    w: number,
    h: number,
    scale: number,
    color: string,
    icon: string,
    costOrValue: number | null
  ): void {
    const cx = x + w / 2;
    const cy = y + h / 2;

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.scale(scale, scale);

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    const r = 4;
    const left = -w / 2;
    const right = w / 2;
    const top = -h / 2;
    const bottom = h / 2;
    this.ctx.moveTo(left + r, top);
    this.ctx.lineTo(right - r, top);
    this.ctx.quadraticCurveTo(right, top, right, top + r);
    this.ctx.lineTo(right, bottom - r);
    this.ctx.quadraticCurveTo(right, bottom, right - r, bottom);
    this.ctx.lineTo(left + r, bottom);
    this.ctx.quadraticCurveTo(left, bottom, left, bottom - r);
    this.ctx.lineTo(left, top + r);
    this.ctx.quadraticCurveTo(left, top, left + r, top);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.strokeStyle = '#ffffff66';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 12px Consolas';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(icon, 0, 0);

    if (costOrValue !== null) {
      this.ctx.fillStyle = costOrValue > 0 ? '#ffd700' : '#fff';
      this.ctx.font = '10px Consolas';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(costOrValue.toString(), 0, h / 2 + 2);
    }

    this.ctx.restore();
  }

  private drawBuildPreview(): void {
    if (!this.mouseInCanvas || !this.selectedTowerType) return;
    const { x: gx, y: gy } = pixelToGrid(this.mouseX, this.mouseY);
    if (gx < 0 || gx >= GRID_SIZE || gy < 0 || gy >= GRID_SIZE) return;

    const canBuild = this.gameMap.isBuildable(gx, gy) && this.gameState.canAfford(TOWER_CONFIGS[this.selectedTowerType].cost);
    const rangeConfig = { range: TOWER_CONFIGS[this.selectedTowerType].range };
    this.gameMap.drawBuildHighlight(this.ctx, gx, gy, canBuild, rangeConfig);

    if (canBuild) {
      const pos = gridToPixel(gx, gy);
      const config = TOWER_CONFIGS[this.selectedTowerType];
      const halfSize = config.size / 2;
      this.ctx.globalAlpha = 0.5;
      this.ctx.fillStyle = config.color;

      switch (config.shape) {
        case 'triangle':
          this.ctx.beginPath();
          this.ctx.moveTo(pos.x, pos.y - halfSize);
          this.ctx.lineTo(pos.x + halfSize, pos.y + halfSize);
          this.ctx.lineTo(pos.x - halfSize, pos.y + halfSize);
          this.ctx.closePath();
          this.ctx.fill();
          break;
        case 'square':
          this.ctx.fillRect(pos.x - halfSize, pos.y - halfSize, config.size, config.size);
          break;
        case 'diamond':
          this.ctx.beginPath();
          this.ctx.moveTo(pos.x, pos.y - halfSize);
          this.ctx.lineTo(pos.x + halfSize, pos.y);
          this.ctx.lineTo(pos.x, pos.y + halfSize);
          this.ctx.lineTo(pos.x - halfSize, pos.y);
          this.ctx.closePath();
          this.ctx.fill();
          break;
      }
      this.ctx.globalAlpha = 1;
    }
  }

  private render(currentTime: number): void {
    this.ctx.fillStyle = '#1e1e2e';
    this.ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    this.gameMap.draw(this.ctx);

    for (const tower of this.towers) {
      tower.draw(this.ctx, tower === this.selectedTower);
    }

    for (const enemy of this.enemies) {
      enemy.draw(this.ctx, currentTime);
    }

    this.drawProjectiles();
    this.drawBuildPreview();
    this.drawTowerActionButtons();
  }

  private gameLoop = (currentTime: number): void => {
    if (!this.running) return;

    this.upgradeBtnScale = this.upgradeBtnScale + (1 - this.upgradeBtnScale) * 0.2;
    this.sellBtnScale = this.sellBtnScale + (1 - this.sellBtnScale) * 0.2;

    this.spawnEnemy(currentTime);

    for (const tower of this.towers) {
      tower.update(currentTime, this.enemies, this.projectiles);
    }

    this.updateProjectiles(currentTime);
    this.checkEnemyDeaths(currentTime);

    this.render(currentTime);

    this.lastFrameTime = currentTime;
    requestAnimationFrame(this.gameLoop);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
