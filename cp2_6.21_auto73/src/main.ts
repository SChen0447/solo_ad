import { GameEngine } from './GameEngine';
import { GameState, Tower } from './types';
import './style.css';

/**
 * main.ts - 应用入口文件（UI层）
 * 
 * 职责：
 *  - 初始化DOM元素引用（画布、信息面板、按钮、遮罩层）
 *  - 创建GameEngine实例，启动游戏主循环
 *  - 绑定Canvas点击事件，将像素坐标转换后传递给GameEngine
 *  - 绑定UI按钮事件（下一波、升级、出售、重新开始）
 *  - 订阅GameEngine的状态变更回调，实时更新DOM显示
 *  - 处理响应式布局和DOM级别的动画（游戏结束遮罩等）
 * 
 * 模块调用关系（架构总览）：
 * 
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │                        main.ts (UI层)                        │
 *   │  DOM事件 → handleCanvasClick/按钮事件 → 调用引擎方法          │
 *   │  ← onStateChange回调 → 更新波次/得分/生命等DOM显示           │
 *   │  ← onTowerSelected → 显示/隐藏升级出售面板                   │
 *   │  ← onGameOver → 显示GameOver遮罩层                           │
 *   └────────────────────────────┬────────────────────────────────┘
 *                                │
 *   ┌────────────────────────────▼────────────────────────────────┐
 *   │                     GameEngine (协调层)                       │
 *   │  update()循环:  [PathManager] → [UnitManager] → [TowerManager]│
 *   │  render()循环:  [四个子模块render → Canvas 2D API]            │
 *   │  状态管理: wave/score/lives/waveInProgress                    │
 *   │  输入处理: 放置/选中炮塔、下一波、升级/出售、重置             │
 *   └──────┬──────────────┬───────────────┬───────────────┬────────┘
 *          │              │               │               │
 *   ┌──────▼────┐  ┌──────▼─────┐  ┌──────▼─────┐  ┌─────▼──────┐
 *   │PathManager│  │UnitManager │  │TowerManager│  │ParticleSys │
 *   │ A*路径    │  │ 单位移动   │  │ 炮塔攻击   │  │ 爆炸粒子  │
 *   │ 地图生成  │  │ 生命值    │  │ 升级出售   │  │ 命中特效  │
 *   └───────────┘  └────────────┘  └────────────┘  └────────────┘
 * 
 * 调用者：HTML入口 <script type="module">标签
 * 被调用：GameEngine的所有对外API
 */
class GameUI {
  private engine: GameEngine;
  private canvas: HTMLCanvasElement;
  private waveNumberEl: HTMLElement;
  private enemyCountEl: HTMLElement;
  private scoreValueEl: HTMLElement;
  private livesValueEl: HTMLElement;
  private nextWaveBtn: HTMLButtonElement;
  private towerPanel: HTMLElement;
  private towerStatsEl: HTMLElement;
  private upgradeBtn: HTMLButtonElement;
  private sellBtn: HTMLButtonElement;
  private gameOverOverlay: HTMLElement;
  private gameOverScoreEl: HTMLElement;
  private restartBtn: HTMLButtonElement;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.waveNumberEl = document.getElementById('waveNumber') as HTMLElement;
    this.enemyCountEl = document.getElementById('enemyCount') as HTMLElement;
    this.scoreValueEl = document.getElementById('scoreValue') as HTMLElement;
    this.livesValueEl = document.getElementById('livesValue') as HTMLElement;
    this.nextWaveBtn = document.getElementById('nextWaveBtn') as HTMLButtonElement;
    this.towerPanel = document.getElementById('towerPanel') as HTMLElement;
    this.towerStatsEl = document.getElementById('towerStats') as HTMLElement;
    this.upgradeBtn = document.getElementById('upgradeBtn') as HTMLButtonElement;
    this.sellBtn = document.getElementById('sellBtn') as HTMLButtonElement;
    this.gameOverOverlay = document.getElementById('gameOverOverlay') as HTMLElement;
    this.gameOverScoreEl = document.getElementById('gameOverScore') as HTMLElement;
    this.restartBtn = document.getElementById('restartBtn') as HTMLButtonElement;

    this.engine = new GameEngine(this.canvas);

    this.setupEventListeners();
    this.setupEngineCallbacks();

    this.engine.init();
    this.engine.start();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      this.engine.handleCanvasClick(x, y);
    });

    this.nextWaveBtn.addEventListener('click', () => {
      this.engine.startNextWave();
    });

    this.upgradeBtn.addEventListener('click', () => {
      this.engine.upgradeSelectedTower();
    });

    this.sellBtn.addEventListener('click', () => {
      this.engine.sellSelectedTower();
    });

    this.restartBtn.addEventListener('click', () => {
      this.restartGame();
    });
  }

  private setupEngineCallbacks(): void {
    this.engine.setOnStateChange((state: GameState) => {
      this.updateUI(state);
    });

    this.engine.setOnGameOver((score: number) => {
      this.showGameOver(score);
    });

    this.engine.setOnTowerSelected((tower: Tower | null) => {
      this.updateTowerPanel(tower);
    });
  }

  private updateUI(state: GameState): void {
    this.waveNumberEl.textContent = `第 ${state.wave} 波`;
    this.enemyCountEl.textContent = `剩余单位: ${state.enemiesRemaining}`;
    this.scoreValueEl.textContent = state.score.toString();
    this.livesValueEl.textContent = state.lives.toString();

    if (state.waveInProgress || state.isGameOver) {
      this.nextWaveBtn.disabled = true;
      this.nextWaveBtn.style.opacity = '0.5';
      this.nextWaveBtn.style.cursor = 'not-allowed';
    } else {
      this.nextWaveBtn.disabled = false;
      this.nextWaveBtn.style.opacity = '1';
      this.nextWaveBtn.style.cursor = 'pointer';
    }
  }

  private updateTowerPanel(tower: Tower | null): void {
    if (!tower) {
      this.towerPanel.style.display = 'none';
      return;
    }

    this.towerPanel.style.display = 'block';

    const levelText = tower.level >= 2 ? '二级（已升级）' : '一级';
    const rangeText = tower.level >= 2 ? '4格' : '3格';
    const damageText = tower.level >= 2 ? '35点' : '20点';

    this.towerStatsEl.innerHTML = `
      <div>等级: ${levelText}</div>
      <div>射程: ${rangeText}</div>
      <div>伤害: ${damageText}</div>
      <div>射速: 1.2秒/次</div>
    `;

    if (tower.level >= 2) {
      this.upgradeBtn.disabled = true;
      this.upgradeBtn.style.opacity = '0.5';
      this.upgradeBtn.textContent = '已满级';
    } else {
      this.upgradeBtn.disabled = false;
      this.upgradeBtn.style.opacity = '1';
      this.upgradeBtn.textContent = '升级 (50分)';
    }
  }

  private showGameOver(score: number): void {
    this.gameOverScoreEl.textContent = `得分: ${score}`;
    this.gameOverOverlay.classList.add('active');
  }

  private hideGameOver(): void {
    this.gameOverOverlay.classList.remove('active');
  }

  private restartGame(): void {
    this.hideGameOver();
    this.towerPanel.style.display = 'none';
    this.engine.reset();
    this.engine.start();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GameUI();
});
