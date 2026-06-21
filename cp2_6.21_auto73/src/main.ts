import { GameEngine } from './GameEngine';
import { GameState, Tower } from './types';
import './style.css';

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
