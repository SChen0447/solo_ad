import { PathManager } from './PathManager';
import { UnitManager } from './UnitManager';
import { TowerManager } from './TowerManager';
import { ParticleSystem } from './ParticleSystem';
import { GameState, Unit, Tower, COLORS, CANVAS_WIDTH, CANVAS_HEIGHT } from './types';

/**
 * GameEngine - 游戏主引擎模块（核心协调者）
 * 
 * 职责：
 *  - 初始化并持有PathManager/UnitManager/TowerManager/ParticleSystem四大子模块
 *  - 驱动requestAnimationFrame主循环，统一调度update()和render()
 *  - 管理全局游戏状态：波次、得分、生命值、游戏结束判定
 *  - 协调子模块间的数据流转（单位位置、命中结果、格子占用等）
 *  - 处理用户输入：画布点击（放炮塔/选炮塔）、下一波按钮、升级/出售
 * 
 * 模块调用关系（数据流图）：
 * 
 *   ┌─────────────────────────────────────────────────────────┐
 *   │                       GameEngine                         │
 *   │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
 *   │  │ PathManager  │  │ UnitManager  │  │ TowerManager  │  │
 *   │  │  (地图/路径) │  │ (敌方单位)   │  │ (炮塔/子弹)   │  │
 *   │  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
 *   │         │  路径点          │  单位列表          │  命中结果 │
 *   │         │────────────────>│──────────────────>│          │
 *   │         │                 │  (位置信息)        │          │
 *   │         │                 │                    │          │
 *   │         │  格子占用更新    │  单位死亡/到达    │          │
 *   │         │<────────────────│<──────────────────│          │
 *   │         │                 │                    │          │
 *   │         │                 │ 造成伤害 (伤害应用)│          │
 *   │         │                 │<──────────────────│          │
 *   │  ┌──────────────────────────────────────────────────┐   │
 *   │  │         ParticleSystem (爆炸/命中粒子)            │   │
 *   │  └──────────────────────────────────────────────────┘   │
 *   └─────────────────────────────────────────────────────────┘
 * 
 * 关键状态转移：
 *  - startNextWave() → waveInProgress=true → 单位按0.8秒间隔生成
 *  - 所有单位 (已生成 - 死亡 - 到达终点) = 0 且 waveSpawnedCount >= waveTotalCount
 *    → waveInProgress=false, wave++
 *  - lives <= 0 → isGameOver=true → 显示GameOver遮罩
 * 
 * 调用者：main.ts（UI入口）
 * 被调用：所有子管理器的update/render/各业务方法
 */
export class GameEngine {
  private ctx: CanvasRenderingContext2D;
  private pathManager: PathManager;
  private unitManager: UnitManager;
  private towerManager: TowerManager;
  private particleSystem: ParticleSystem;

  private gameState: GameState = {
    isRunning: false,
    isGameOver: false,
    wave: 1,
    score: 0,
    lives: 3,
    enemiesRemaining: 0,
    waveInProgress: false
  };

  private waveTotalCount: number = 0;
  private waveSpawnedCount: number = 0;
  private spawnTimeouts: number[] = [];

  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private currentTime: number = 0;

  private onStateChange: ((state: GameState) => void) | null = null;
  private onGameOver: ((score: number) => void) | null = null;
  private onTowerSelected: ((tower: Tower | null) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;

    this.pathManager = new PathManager();
    this.unitManager = new UnitManager();
    this.towerManager = new TowerManager();
    this.particleSystem = new ParticleSystem();

    this.setupCallbacks();
  }

  private setupCallbacks(): void {
    this.unitManager.setOnUnitReachedEnd((unit: Unit) => {
      this.onUnitReachedEnd(unit);
    });

    this.unitManager.setOnUnitKilled((unit: Unit) => {
      this.onUnitKilled(unit);
    });

    this.unitManager.setOnUnitSpawned(() => {
      this.waveSpawnedCount++;
    });

    this.towerManager.setOnTowerRemoved((tower: Tower) => {
      this.pathManager.setCellType(tower.gridX, tower.gridY, 'empty');
    });
  }

  public setOnStateChange(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  public setOnGameOver(callback: (score: number) => void): void {
    this.onGameOver = callback;
  }

  public setOnTowerSelected(callback: (tower: Tower | null) => void): void {
    this.onTowerSelected = callback;
  }

  public getState(): GameState {
    return { ...this.gameState };
  }

  public getPathManager(): PathManager {
    return this.pathManager;
  }

  public getTowerManager(): TowerManager {
    return this.towerManager;
  }

  public init(): void {
    this.pathManager.generateMap();
    const worldPath = this.pathManager.getPathWorldPoints();
    this.unitManager.setPath(worldPath);
    this.pathManager.triggerPathHighlight();
    this.notifyStateChange();
  }

  public start(): void {
    if (this.gameState.isRunning) return;
    this.gameState.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  public stop(): void {
    this.gameState.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private gameLoop = (): void => {
    if (!this.gameState.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;
    this.currentTime += deltaTime;

    this.update(deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    if (this.gameState.isGameOver) return;

    this.pathManager.update(deltaTime);
    this.unitManager.update(deltaTime);

    const aliveUnits = this.unitManager.getUnits();
    const hits = this.towerManager.update(deltaTime, aliveUnits, this.currentTime);

    for (const hit of hits) {
      for (const unitId of hit.hitUnitIds) {
        this.unitManager.damageUnit(unitId, hit.damage);
        const unit = this.unitManager.getUnitById(unitId);
        if (unit) {
          this.particleSystem.createHitEffect(unit.x, unit.y);
        }
      }
    }

    this.particleSystem.update(deltaTime);
  }

  private render(): void {
    this.ctx.fillStyle = COLORS.background;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.pathManager.render(this.ctx);
    this.towerManager.render(this.ctx);
    this.unitManager.render(this.ctx);
    this.particleSystem.render(this.ctx);
  }

  private onUnitReachedEnd(_unit: Unit): void {
    this.gameState.lives--;
    this.gameState.enemiesRemaining = Math.max(0, this.gameState.enemiesRemaining - 1);
    this.notifyStateChange();
    this.checkWaveComplete();

    if (this.gameState.lives <= 0) {
      this.gameOver();
    }
  }

  private onUnitKilled(unit: Unit): void {
    this.gameState.score += 10;
    this.gameState.enemiesRemaining = Math.max(0, this.gameState.enemiesRemaining - 1);
    this.particleSystem.createExplosion(unit.x, unit.y);
    this.notifyStateChange();
    this.checkWaveComplete();
  }

  private checkWaveComplete(): void {
    const allSpawned = this.waveSpawnedCount >= this.waveTotalCount;
    if (this.gameState.waveInProgress && allSpawned && this.gameState.enemiesRemaining <= 0) {
      this.gameState.waveInProgress = false;
      this.gameState.wave++;
      this.waveSpawnedCount = 0;
      this.waveTotalCount = 0;
      this.notifyStateChange();
    }
  }

  private gameOver(): void {
    this.gameState.isGameOver = true;
    this.gameState.isRunning = false;
    if (this.onGameOver) {
      this.onGameOver(this.gameState.score);
    }
    this.notifyStateChange();
  }

  public startNextWave(): void {
    if (this.gameState.isGameOver) return;
    if (this.gameState.waveInProgress) return;

    this.clearSpawnTimeouts();

    this.gameState.waveInProgress = true;
    const unitCount = 5;
    this.waveTotalCount = unitCount;
    this.waveSpawnedCount = 0;
    const startPos = this.pathManager.getStartWorldPos();
    const spawnInterval = 0.8;

    for (let i = 0; i < unitCount; i++) {
      const timeoutId = window.setTimeout(() => {
        if (!this.gameState.isRunning || this.gameState.isGameOver) return;
        this.unitManager.spawnUnit(startPos);
      }, i * spawnInterval * 1000);
      this.spawnTimeouts.push(timeoutId);
    }

    this.gameState.enemiesRemaining = unitCount;
    this.notifyStateChange();
  }

  private clearSpawnTimeouts(): void {
    for (const id of this.spawnTimeouts) {
      clearTimeout(id);
    }
    this.spawnTimeouts = [];
  }

  public handleCanvasClick(worldX: number, worldY: number): void {
    if (this.gameState.isGameOver) return;

    const gridPos = this.pathManager.worldToGrid(worldX, worldY);
    const cellType = this.pathManager.getCellType(gridPos.x, gridPos.y);

    const existingTower = this.towerManager.getTowerAt(gridPos.x, gridPos.y);

    if (existingTower && !existingTower.isRemoving) {
      this.towerManager.selectTower(existingTower);
      if (this.onTowerSelected) {
        this.onTowerSelected(existingTower);
      }
      return;
    }

    if (cellType === 'empty') {
      const worldPos = this.pathManager.gridToWorld(gridPos.x, gridPos.y);
      const tower = this.towerManager.placeTower(gridPos.x, gridPos.y, worldPos.x, worldPos.y);
      if (tower) {
        this.pathManager.setCellType(gridPos.x, gridPos.y, 'tower');
        this.towerManager.selectTower(tower);
        if (this.onTowerSelected) {
          this.onTowerSelected(tower);
        }
      } else {
        this.towerManager.selectTower(null);
        if (this.onTowerSelected) {
          this.onTowerSelected(null);
        }
      }
    } else {
      this.towerManager.selectTower(null);
      if (this.onTowerSelected) {
        this.onTowerSelected(null);
      }
    }
  }

  public upgradeSelectedTower(): boolean {
    const tower = this.towerManager.getSelectedTower();
    if (!tower) return false;
    if (tower.level >= 2) return false;
    if (this.gameState.score < 50) return false;

    this.gameState.score -= 50;
    this.towerManager.upgradeTower(tower);
    this.notifyStateChange();

    if (this.onTowerSelected) {
      this.onTowerSelected(tower);
    }

    return true;
  }

  public sellSelectedTower(): boolean {
    const tower = this.towerManager.getSelectedTower();
    if (!tower) return false;

    this.gameState.score += 30;
    this.towerManager.sellTower(tower);
    this.towerManager.selectTower(null);
    this.notifyStateChange();

    if (this.onTowerSelected) {
      this.onTowerSelected(null);
    }

    return true;
  }

  public reset(): void {
    this.stop();
    this.clearSpawnTimeouts();

    this.gameState = {
      isRunning: false,
      isGameOver: false,
      wave: 1,
      score: 0,
      lives: 3,
      enemiesRemaining: 0,
      waveInProgress: false
    };

    this.waveTotalCount = 0;
    this.waveSpawnedCount = 0;

    this.unitManager.clear();
    this.towerManager.clear();
    this.particleSystem.clear();
    this.currentTime = 0;

    this.init();
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.gameState });
    }
  }

  public getFPS(): number {
    return 60;
  }
}
