import { PathManager } from './PathManager';
import { UnitManager } from './UnitManager';
import { TowerManager, Tower } from './TowerManager';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pathManager: PathManager;
  private unitManager: UnitManager;
  private towerManager: TowerManager;

  private lastTime: number = 0;
  private animationId: number = 0;
  private isRunning: boolean = false;

  private wave: number = 1;
  private score: number = 0;
  private killedCount: number = 0;
  private leakedCount: number = 0;
  private readonly maxLeaked: number = 3;
  private readonly unitsPerWave: number = 5;
  private isWaveInProgress: boolean = false;
  private spawnQueue: number = 0;
  private spawnTimer: number = 0;
  private readonly spawnInterval: number = 1.0;
  private isGameOver: boolean = false;

  private hoverCol: number = -1;
  private hoverRow: number = -1;

  private waveTitleEl: HTMLElement;
  private remainingTextEl: HTMLElement;
  private scoreTextEl: HTMLElement;
  private leakedTextEl: HTMLElement;
  private killedTextEl: HTMLElement;
  private nextWaveBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private towerMenuEl: HTMLElement;
  private towerMenuTitleEl: HTMLElement;
  private upgradeBtn: HTMLButtonElement;
  private sellBtn: HTMLButtonElement;
  private gameOverOverlayEl: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;

    this.pathManager = new PathManager();
    this.unitManager = new UnitManager();
    this.towerManager = new TowerManager();
    this.towerManager.cellSize = this.pathManager.cellSize;

    this.waveTitleEl = document.getElementById('waveTitle')!;
    this.remainingTextEl = document.getElementById('remainingText')!;
    this.scoreTextEl = document.getElementById('scoreText')!;
    this.leakedTextEl = document.getElementById('leakedText')!;
    this.killedTextEl = document.getElementById('killedText')!;
    this.nextWaveBtn = document.getElementById('nextWaveBtn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
    this.towerMenuEl = document.getElementById('towerMenu')!;
    this.towerMenuTitleEl = document.getElementById('towerMenuTitle')!;
    this.upgradeBtn = document.getElementById('upgradeBtn') as HTMLButtonElement;
    this.sellBtn = document.getElementById('sellBtn') as HTMLButtonElement;
    this.gameOverOverlayEl = document.getElementById('gameOverOverlay')!;

    this.setupCallbacks();
    this.setupEventListeners();
    this.initGame();
  }

  private setupCallbacks(): void {
    this.unitManager.onUnitKilled = () => {
      this.killedCount++;
      this.score += 10;
      this.updateUI();
      this.checkWaveEnd();
    };

    this.unitManager.onUnitLeaked = () => {
      this.leakedCount++;
      this.updateUI();
      if (this.leakedCount >= this.maxLeaked) {
        this.gameOver();
      }
      this.checkWaveEnd();
    };

    this.towerManager.onDamageUnit = (unitId, damage) => {
      this.unitManager.damageUnit(unitId, damage);
    };

    this.towerManager.onTowerSold = (refundScore) => {
      this.score += refundScore;
      this.updateUI();
    };

    this.towerManager.onUpgradeAttempt = (tower) => {
      if (this.score >= 50) {
        this.score -= 50;
        this.updateUI();
        return true;
      }
      return false;
    };
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => {
      this.hoverCol = -1;
      this.hoverRow = -1;
      this.hideTowerMenu();
      this.towerManager.selectTower(null);
    });

    this.nextWaveBtn.addEventListener('click', () => this.startNextWave());
    this.resetBtn.addEventListener('click', () => this.resetGame());
    this.upgradeBtn.addEventListener('click', () => this.handleUpgrade());
    this.sellBtn.addEventListener('click', () => this.handleSell());

    document.addEventListener('click', (e) => {
      if (!this.towerMenuEl.contains(e.target as Node) && e.target !== this.canvas) {
        this.hideTowerMenu();
        this.towerManager.selectTower(null);
      }
    });
  }

  private initGame(): void {
    this.pathManager.resetAndGenerate();
    this.unitManager.setPath(this.pathManager.pathPoints);
    this.updateUI();
    this.start();
  }

  private handleCanvasClick(e: MouseEvent): void {
    if (this.isGameOver) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    const clickedTower = this.towerManager.getTowerAtPixel(px, py);
    if (clickedTower) {
      this.towerManager.selectTower(clickedTower.id);
      this.showTowerMenu(clickedTower, e.clientX, e.clientY);
      return;
    }

    const cell = this.pathManager.getCellAtPixel(px, py);
    if (cell) {
      if (this.pathManager.canPlaceTower(cell.col, cell.row) && !this.towerManager.getTowerAtCell(cell.col, cell.row)) {
        this.towerManager.placeTower(cell.col, cell.row);
      }
    }

    this.hideTowerMenu();
    this.towerManager.selectTower(null);
  }

  private handleCanvasMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    const cell = this.pathManager.getCellAtPixel(px, py);
    if (cell) {
      this.hoverCol = cell.col;
      this.hoverRow = cell.row;
      if (this.pathManager.grid[cell.row][cell.col].isPath) {
        this.pathManager.highlightPathCell(cell.col, cell.row);
      }
    } else {
      this.hoverCol = -1;
      this.hoverRow = -1;
    }
  }

  private showTowerMenu(tower: Tower, clientX: number, clientY: number): void {
    this.towerMenuTitleEl.textContent = `炮塔 Lv.${tower.level}`;
    this.upgradeBtn.disabled = tower.level >= 2 || this.score < 50;
    this.upgradeBtn.textContent = tower.level >= 2 ? '已满级' : `升级 (50分)`;

    const menuWidth = 160;
    const menuHeight = 120;
    let left = clientX + 10;
    let top = clientY + 10;

    if (left + menuWidth > window.innerWidth) {
      left = clientX - menuWidth - 10;
    }
    if (top + menuHeight > window.innerHeight) {
      top = clientY - menuHeight - 10;
    }

    this.towerMenuEl.style.left = `${left}px`;
    this.towerMenuEl.style.top = `${top}px`;
    this.towerMenuEl.classList.add('active');
  }

  private hideTowerMenu(): void {
    this.towerMenuEl.classList.remove('active');
  }

  private handleUpgrade(): void {
    const selected = this.towerManager.getSelectedTower();
    if (selected) {
      if (this.towerManager.upgradeTower(selected.id)) {
        this.showTowerMenu(selected, parseInt(this.towerMenuEl.style.left), parseInt(this.towerMenuEl.style.top));
      }
    }
  }

  private handleSell(): void {
    const selected = this.towerManager.getSelectedTower();
    if (selected) {
      this.towerManager.sellTower(selected.id);
      this.hideTowerMenu();
      this.towerManager.selectTower(null);
    }
  }

  private startNextWave(): void {
    if (this.isWaveInProgress || this.isGameOver) return;
    this.isWaveInProgress = true;
    this.spawnQueue = this.unitsPerWave;
    this.spawnTimer = 0;
    this.nextWaveBtn.disabled = true;
  }

  private checkWaveEnd(): void {
    const state = this.unitManager.getState();
    if (this.isWaveInProgress && this.spawnQueue === 0 && state.activeUnits === 0) {
      this.isWaveInProgress = false;
      this.wave++;
      this.nextWaveBtn.disabled = this.isGameOver;
      this.updateUI();
    }
  }

  private gameOver(): void {
    this.isGameOver = true;
    this.isWaveInProgress = false;
    this.gameOverOverlayEl.classList.add('active');
  }

  private resetGame(): void {
    this.stop();
    this.wave = 1;
    this.score = 0;
    this.killedCount = 0;
    this.leakedCount = 0;
    this.isWaveInProgress = false;
    this.isGameOver = false;
    this.spawnQueue = 0;
    this.spawnTimer = 0;

    this.unitManager.clearUnits();
    this.towerManager.clearTowers();
    this.pathManager.resetAndGenerate();
    this.unitManager.setPath(this.pathManager.pathPoints);

    this.nextWaveBtn.disabled = false;
    this.gameOverOverlayEl.classList.remove('active');
    this.hideTowerMenu();
    this.updateUI();
    this.start();
  }

  private updateUI(): void {
    this.waveTitleEl.textContent = `第 ${this.wave} 波`;
    const state = this.unitManager.getState();
    const remaining = state.activeUnits + this.spawnQueue;
    this.remainingTextEl.textContent = `剩余单位: ${remaining}`;
    this.scoreTextEl.textContent = `得分: ${this.score}`;
    this.leakedTextEl.textContent = `${this.leakedCount} / ${this.maxLeaked}`;
    this.killedTextEl.textContent = `${this.killedCount}`;

    const selected = this.towerManager.getSelectedTower();
    if (selected && this.towerMenuEl.classList.contains('active')) {
      this.upgradeBtn.disabled = selected.level >= 2 || this.score < 50;
    }
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  private loop(currentTime: number): void {
    if (!this.isRunning) return;
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    if (this.isGameOver) {
      this.unitManager.update(dt);
      this.towerManager.update(dt, this.unitManager.getUnits());
      this.pathManager.update(dt);
      return;
    }

    if (this.isWaveInProgress && this.spawnQueue > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const start = this.pathManager.getStartPosition();
        this.unitManager.spawnUnit(start.x, start.y);
        this.spawnQueue--;
        this.spawnTimer = this.spawnInterval;
        this.updateUI();
      }
    }

    this.pathManager.update(dt);
    this.unitManager.update(dt);
    this.towerManager.update(dt, this.unitManager.getUnits());

    this.updateUI();
    this.checkWaveEnd();
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.pathManager.render(ctx);

    if (this.hoverCol >= 0 && this.hoverRow >= 0) {
      const canPlace = this.pathManager.canPlaceTower(this.hoverCol, this.hoverRow)
        && !this.towerManager.getTowerAtCell(this.hoverCol, this.hoverRow);
      if (canPlace) {
        this.towerManager.renderPlacementPreview(ctx, this.hoverCol, this.hoverRow, canPlace);
      }
    }

    this.towerManager.render(ctx);
    this.unitManager.render(ctx);
  }
}

const engine = new GameEngine();
