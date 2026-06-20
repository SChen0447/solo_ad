import {
  GameState,
  TowerType,
  GridPos,
  Tower,
  Enemy,
  Position,
  TOWER_CONFIGS,
  getUpgradeCost,
  getSellValue
} from './types';
import { MapGrid } from './map/mapGrid';
import { PathFinder } from './ai/pathFinder';
import { DecisionTree } from './ai/decisionTree';
import { TowerManager, TowerActionResult } from './entity/towerManager';
import { EnemyManager } from './entity/enemyManager';
import { Renderer } from './ui/renderer';
import { EventHandler } from './ui/eventHandler';

// ============================================================
// Game 主类 - 整体调用调度中心
// ============================================================
// 初始化：
//   MapGrid → PathFinder → DecisionTree
//                       ↘ TowerManager ← eventHandler 交互
//   EnemyManager (依赖 PathFinder + DecisionTree)
//   Renderer (4层Canvas)
//   EventHandler → 回调 Game 的方法
//
// 帧循环：
//   1. towerManager.update(dt, enemies) → 生成伤害、弹道、AOE
//   2. enemyManager.applyDamage(...) → 结算伤害
//   3. enemyManager.update(dt, towers) → 移动敌人、到达终点、生成粒子
//   4. 结算生命、金币、波次状态
//   5. renderer.render(...) → 绘制所有层
// ============================================================

const INITIAL_HP = 100;
const INITIAL_GOLD = 300;
const TARGET_FPS = 60;
const FRAME_MS = 1000 / TARGET_FPS;

export class Game {
  private container: HTMLElement;
  private mapGrid: MapGrid;
  private pathFinder: PathFinder;
  private decisionTree: DecisionTree;
  private towerManager: TowerManager;
  private enemyManager: EnemyManager;
  private renderer: Renderer;
  private eventHandler: EventHandler;

  private state: GameState;
  private aoeImpacts: { pos: Position; radius: number; damage: number }[] = [];
  private lastFrameTime: number = 0;
  private accumulator: number = 0;
  private animationFrameId: number | null = null;
  private running: boolean = false;

  constructor(containerId: string = 'game-container') {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;

    this.mapGrid = new MapGrid();
    this.pathFinder = new PathFinder(this.mapGrid);
    this.decisionTree = new DecisionTree(this.mapGrid);
    this.towerManager = new TowerManager(this.mapGrid, this.pathFinder);
    this.enemyManager = new EnemyManager(this.mapGrid, this.pathFinder, this.decisionTree);
    this.renderer = new Renderer(this.container, this.mapGrid);

    this.state = {
      wave: 0,
      hp: INITIAL_HP,
      maxHp: INITIAL_HP,
      gold: INITIAL_GOLD,
      isWaveActive: false,
      isGameOver: false,
      selectedTowerType: null,
      selectedTowerId: null
    };

    this.eventHandler = new EventHandler(
      this.container,
      this.renderer,
      this.mapGrid,
      {
        onPlaceTower: this.onPlaceTower,
        onSelectTower: this.onSelectTower,
        onUpgradeTower: this.onUpgradeTower,
        onSellTower: this.onSellTower,
        onStartWave: this.onStartWave,
        onRestart: this.onRestart,
        getTowerAt: (pos: GridPos) => this.towerManager.getTowerAt(pos),
        getTowers: () => this.towerManager.getAllTowers()
      }
    );

    this.updateHud();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.accumulator = 0;
    this.gameLoop();
  }

  stop(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  destroy(): void {
    this.stop();
    this.eventHandler.destroy();
  }

  private gameLoop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    let delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    delta = Math.min(delta, FRAME_MS * 3);
    this.accumulator += delta;

    let steps = 0;
    while (this.accumulator >= FRAME_MS && steps < 5) {
      const dt = FRAME_MS / 1000;
      this.update(dt);
      this.accumulator -= FRAME_MS;
      steps++;
    }

    this.draw(FRAME_MS / 1000);

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(dt: number): void {
    if (this.state.isGameOver) return;

    const towers = this.towerManager.getAllTowers();
    const enemies = this.enemyManager.getEnemies();

    const towerResult = this.towerManager.update(dt, enemies);

    for (const [enemyId, damage] of towerResult.enemiesDamaged) {
      const result = this.enemyManager.applyDamage(enemyId, damage);
      if (result.killed && result.enemy) {
        this.state.gold += result.enemy.reward;
      }
    }

    if (towerResult.aoeImpacts.length > 0) {
      for (const aoe of towerResult.aoeImpacts) {
        this.aoeImpacts.push({ ...aoe, damage: 0 });
      }
    }

    const enemyResult = this.enemyManager.update(dt, towers);

    for (const reached of enemyResult.reachedEnd) {
      this.state.hp -= reached.damage;
      if (this.state.hp <= 0) {
        this.state.hp = 0;
        this.triggerGameOver();
      }
    }

    if (this.state.isWaveActive && this.enemyManager.isWaveComplete()) {
      this.state.isWaveActive = false;
      this.enemyManager.recalculatePathsForType('normal', towers);
      this.enemyManager.recalculatePathsForType('fast', towers);
      this.enemyManager.recalculatePathsForType('heavy', towers);
    }

    this.aoeImpacts = this.aoeImpacts.filter(aoe => {
      aoe.radius += aoe.radius * dt * 3;
      aoe.damage -= dt;
      return aoe.damage > -1;
    });

    this.updateHud();
  }

  private draw(dt: number): void {
    const towers = this.towerManager.getAllTowers();
    const enemies = this.enemyManager.getEnemies();
    const projectiles = this.towerManager.getProjectiles();
    const ripples = this.towerManager.getRipples();
    const particles = this.enemyManager.getParticles();

    this.renderer.render(
      towers,
      enemies,
      projectiles,
      ripples,
      particles,
      this.aoeImpacts.filter(a => a.damage > 0),
      this.state,
      dt
    );
  }

  private onPlaceTower = (type: TowerType, pos: GridPos): void => {
    if (this.state.isGameOver) return;

    const result: TowerActionResult = this.towerManager.placeTower(type, pos, this.state.gold);
    if (result.success) {
      this.state.gold += result.goldDelta;
      this.renderer.markDirty('mapDirty');
      this.renderer.markDirty('uiDirty');
      this.updateHud();
    }
  };

  private onSelectTower = (towerId: number | null): void => {
    this.state.selectedTowerId = towerId;
    this.renderer.setSelectedTower(towerId);
  };

  private onUpgradeTower = (): void => {
    if (this.state.selectedTowerId === null || this.state.isGameOver) return;

    const result = this.towerManager.upgradeTower(this.state.selectedTowerId, this.state.gold);
    if (result.success) {
      this.state.gold += result.goldDelta;
      this.updateHud();
    }
  };

  private onSellTower = (): void => {
    if (this.state.selectedTowerId === null || this.state.isGameOver) return;

    const idToSell = this.state.selectedTowerId;
    const result = this.towerManager.sellTower(idToSell);
    if (result.success) {
      this.state.gold += result.goldDelta;
      this.state.selectedTowerId = null;
      this.renderer.setSelectedTower(null);
      this.renderer.markDirty('mapDirty');
      this.updateHud();
    }
  };

  private onStartWave = (): void => {
    if (this.state.isWaveActive || this.state.isGameOver) return;

    const nextWave = this.state.wave + 1;
    const towers = this.towerManager.getAllTowers();
    const success = this.enemyManager.startWave(nextWave, towers);

    if (success) {
      this.state.wave = nextWave;
      this.state.isWaveActive = true;
      this.eventHandler.showWaveIndicator(nextWave);
      this.updateHud();
    }
  };

  private onRestart = (): void => {
    this.state = {
      wave: 0,
      hp: INITIAL_HP,
      maxHp: INITIAL_HP,
      gold: INITIAL_GOLD,
      isWaveActive: false,
      isGameOver: false,
      selectedTowerType: null,
      selectedTowerId: null
    };

    this.towerManager.reset();
    this.enemyManager.reset();
    this.mapGrid.reset();
    this.aoeImpacts = [];

    this.eventHandler.hideGameOver();
    this.renderer.markAllDirty();
    this.renderer.setSelectedTower(null);
    this.updateHud();
  };

  private triggerGameOver(): void {
    this.state.isGameOver = true;
    this.state.isWaveActive = false;
    this.eventHandler.showGameOver(this.state.wave);
  }

  private updateHud(): void {
    const remaining = this.enemyManager.getActiveCount();
    this.eventHandler.updateHud(
      this.state.wave,
      this.state.hp,
      this.state.gold,
      remaining
    );
  }
}

function bootstrap(): void {
  try {
    const game = new Game();
    game.start();
    (window as unknown as { __game: Game }).__game = game;
  } catch (err) {
    console.error('Failed to start game:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
