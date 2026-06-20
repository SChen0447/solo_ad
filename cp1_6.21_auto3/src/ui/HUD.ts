import { UpgradeManager, UPGRADE_INFO, UpgradeType } from '../upgrade/UpgradeManager';

export interface GameStats {
  score: number;
  wave: number;
  shield: number;
  maxShield: number;
  energy: number;
  kills: number;
  isEmergency: boolean;
  isGameOver: boolean;
}

export type UpgradeRequestCallback = (type: UpgradeType) => void;

export class HUD {
  private upgradeManager: UpgradeManager;
  private scoreElement: HTMLElement;
  private waveElement: HTMLElement;
  private shieldFillElement: HTMLElement;
  private energyElement: HTMLElement;
  private emergencyOverlay: HTMLElement;
  private upgradePanel: HTMLElement;
  private upgradeBtn: HTMLElement;
  private closeUpgradeBtn: HTMLElement;
  private upgradeList: HTMLElement;
  private startScreen: HTMLElement;
  private gameOverScreen: HTMLElement;
  private startBtn: HTMLElement;
  private restartBtn: HTMLElement;
  private finalScoreElement: HTMLElement;
  private finalKillsElement: HTMLElement;
  private finalWaveElement: HTMLElement;
  private finalUpgradesElement: HTMLElement;

  private upgradeRequestCallbacks: UpgradeRequestCallback[] = [];
  private startCallbacks: (() => void)[] = [];
  private restartCallbacks: (() => void)[] = [];

  private isPanelOpen: boolean = false;
  private stats: GameStats = {
    score: 0,
    wave: 1,
    shield: 100,
    maxShield: 100,
    energy: 0,
    kills: 0,
    isEmergency: false,
    isGameOver: false,
  };

  constructor(upgradeManager: UpgradeManager) {
    this.upgradeManager = upgradeManager;

    this.scoreElement = document.getElementById('score')!;
    this.waveElement = document.getElementById('wave')!;
    this.shieldFillElement = document.getElementById('shield-fill')!;
    this.energyElement = document.getElementById('energy')!;
    this.emergencyOverlay = document.getElementById('emergency-overlay')!;
    this.upgradePanel = document.getElementById('upgrade-panel')!;
    this.upgradeBtn = document.getElementById('upgrade-btn')!;
    this.closeUpgradeBtn = document.getElementById('close-upgrade-btn')!;
    this.upgradeList = document.getElementById('upgrade-list')!;
    this.startScreen = document.getElementById('start-screen')!;
    this.gameOverScreen = document.getElementById('game-over-screen')!;
    this.startBtn = document.getElementById('start-btn')!;
    this.restartBtn = document.getElementById('restart-btn')!;
    this.finalScoreElement = document.getElementById('final-score')!;
    this.finalKillsElement = document.getElementById('final-kills')!;
    this.finalWaveElement = document.getElementById('final-wave')!;
    this.finalUpgradesElement = document.getElementById('final-upgrades')!;

    this.setupEventListeners();
    this.setupUpgradeManagerListeners();
    this.renderUpgradeList();
  }

  private setupEventListeners(): void {
    this.upgradeBtn.addEventListener('click', () => {
      this.togglePanel();
    });

    this.closeUpgradeBtn.addEventListener('click', () => {
      this.closePanel();
    });

    this.startBtn.addEventListener('click', () => {
      this.hideStartScreen();
      this.startCallbacks.forEach((cb) => cb());
    });

    this.restartBtn.addEventListener('click', () => {
      this.hideGameOverScreen();
      this.restartCallbacks.forEach((cb) => cb());
    });
  }

  private setupUpgradeManagerListeners(): void {
    this.upgradeManager.onEnergyChange(() => {
      this.updateEnergyDisplay();
      this.renderUpgradeList();
    });

    this.upgradeManager.onUpgradeChange(() => {
      this.updateUpgradeIcons();
      this.renderUpgradeList();
    });
  }

  public updateStats(stats: Partial<GameStats>): void {
    this.stats = { ...this.stats, ...stats };
    this.renderStats();
  }

  private renderStats(): void {
    this.scoreElement.textContent = this.stats.score.toString();
    this.waveElement.textContent = this.stats.wave.toString();
    this.energyElement.textContent = this.stats.energy.toString();

    const shieldPercent = Math.max(0, (this.stats.shield / this.stats.maxShield) * 100);
    this.shieldFillElement.style.width = shieldPercent + '%';

    if (shieldPercent < 30) {
      this.shieldFillElement.classList.add('low');
    } else {
      this.shieldFillElement.classList.remove('low');
    }

    if (this.stats.isEmergency) {
      this.emergencyOverlay.classList.add('active');
    } else {
      this.emergencyOverlay.classList.remove('active');
    }
  }

  private updateEnergyDisplay(): void {
    this.stats.energy = this.upgradeManager.getEnergy();
    this.energyElement.textContent = this.stats.energy.toString();
  }

  private updateUpgradeIcons(): void {
    const shieldIcon = document.getElementById('icon-shield');
    const weaponIcon = document.getElementById('icon-weapon');
    const turretIcon = document.getElementById('icon-turret');

    this.setUpgradeIcon(shieldIcon, 'shield');
    this.setUpgradeIcon(weaponIcon, 'weapon');
    this.setUpgradeIcon(turretIcon, 'turret');
  }

  private setUpgradeIcon(element: HTMLElement | null, type: UpgradeType): void {
    if (!element) return;

    const level = this.upgradeManager.getUpgradeLevel(type);

    element.classList.remove('unlocked', 'level-2', 'level-3');

    if (level > 0) {
      element.classList.add('unlocked');
      if (level >= 3) {
        element.classList.add('level-3');
      } else if (level >= 2) {
        element.classList.add('level-2');
      }
    }
  }

  private renderUpgradeList(): void {
    this.upgradeList.innerHTML = '';

    const types: UpgradeType[] = ['shield', 'weapon', 'turret'];

    types.forEach((type) => {
      const info = UPGRADE_INFO[type];
      const level = this.upgradeManager.getUpgradeLevel(type);
      const cost = this.upgradeManager.getUpgradeCost(type);
      const canUpgrade = this.upgradeManager.canUpgrade(type);
      const isMaxed = this.upgradeManager.isMaxLevel(type);

      const item = document.createElement('div');
      item.className = `upgrade-item ${isMaxed ? 'maxed' : ''}`;

      item.innerHTML = `
        <div class="upgrade-item-header">
          <div class="upgrade-item-icon">${info.icon}</div>
          <div class="upgrade-item-name">${info.name}</div>
          <div class="upgrade-item-level">Lv.${level}/${info.maxLevel}</div>
        </div>
        <div class="upgrade-item-desc">${info.description}</div>
        <div class="upgrade-item-cost">
          <span>${isMaxed ? '已满级' : `💎 ${cost} 能量`}</span>
          <button ${canUpgrade ? '' : 'disabled'} data-type="${type}">
            ${isMaxed ? 'MAX' : '升级'}
          </button>
        </div>
      `;

      const btn = item.querySelector('button');
      if (btn && !isMaxed) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.handleUpgradeRequest(type);
        });
      }

      this.upgradeList.appendChild(item);
    });
  }

  private handleUpgradeRequest(type: UpgradeType): void {
    this.upgradeRequestCallbacks.forEach((cb) => cb(type));
  }

  public onUpgradeRequest(callback: UpgradeRequestCallback): void {
    this.upgradeRequestCallbacks.push(callback);
  }

  public onStart(callback: () => void): void {
    this.startCallbacks.push(callback);
  }

  public onRestart(callback: () => void): void {
    this.restartCallbacks.push(callback);
  }

  public openPanel(): void {
    this.isPanelOpen = true;
    this.upgradePanel.classList.add('open');
    this.upgradeBtn.style.display = 'none';
  }

  public closePanel(): void {
    this.isPanelOpen = false;
    this.upgradePanel.classList.remove('open');
    this.upgradeBtn.style.display = 'block';
  }

  public togglePanel(): void {
    if (this.isPanelOpen) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  public showStartScreen(): void {
    this.startScreen.style.display = 'flex';
  }

  public hideStartScreen(): void {
    this.startScreen.style.display = 'none';
  }

  public showGameOverScreen(stats: {
    score: number;
    kills: number;
    wave: number;
    upgrades: number;
  }): void {
    this.finalScoreElement.textContent = stats.score.toString();
    this.finalKillsElement.textContent = stats.kills.toString();
    this.finalWaveElement.textContent = stats.wave.toString();
    this.finalUpgradesElement.textContent = stats.upgrades.toString();

    this.gameOverScreen.style.display = 'flex';
  }

  public hideGameOverScreen(): void {
    this.gameOverScreen.style.display = 'none';
  }

  public reset(): void {
    this.stats = {
      score: 0,
      wave: 1,
      shield: 100,
      maxShield: 100,
      energy: 0,
      kills: 0,
      isEmergency: false,
      isGameOver: false,
    };
    this.renderStats();
    this.updateUpgradeIcons();
    this.renderUpgradeList();
    this.emergencyOverlay.classList.remove('active');
  }
}
