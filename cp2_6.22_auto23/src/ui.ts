import { Game } from './game';
import { Tower, TowerType, TOWER_CONFIGS } from './entity';

export class UIManager {
  private game: Game;
  private container: HTMLElement;
  private uiLayer: HTMLElement;
  private mapWidth: number;
  private mapHeight: number;
  private panelWidth: number;

  private buildMenu: HTMLElement | null = null;
  private upgradePanel: HTMLElement | null = null;
  private goldDisplay: HTMLElement | null = null;
  private healthBar: HTMLElement | null = null;
  private healthText: HTMLElement | null = null;
  private waveDisplay: HTMLElement | null = null;
  private buildingList: HTMLElement | null = null;
  private goldBounceTimeout: number | null = null;

  private selectedTile: { col: number; row: number } | null = null;
  private selectedTower: Tower | null = null;

  private onTowerBuilt?: () => void;
  private onTowerUpgraded?: () => void;
  private onBuildingSelect?: (tower: Tower) => void;

  constructor(
    game: Game,
    container: HTMLElement,
    uiLayer: HTMLElement,
    mapWidth: number,
    mapHeight: number,
    panelWidth: number
  ) {
    this.game = game;
    this.container = container;
    this.uiLayer = uiLayer;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.panelWidth = panelWidth;
  }

  init(): void {
    this.createSidePanel();
    this.setupCanvasClick();
    this.updateGoldDisplay();
    this.updateHealthDisplay();
    this.updateWaveDisplay();
    this.updateBuildingList();
  }

  private createSidePanel(): void {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: absolute;
      top: 0;
      right: 0;
      width: ${this.panelWidth}px;
      height: ${this.mapHeight}px;
      background: #1E293B;
      border-left: 2px solid #D97706;
      padding: 16px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 16px;
      color: #FFF8E7;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      pointer-events: auto;
    `;

    const title = document.createElement('div');
    title.textContent = '状态面板';
    title.style.cssText = `
      font-size: 18px;
      font-weight: bold;
      color: #D97706;
      text-align: center;
      padding-bottom: 8px;
      border-bottom: 1px solid #374151;
    `;
    panel.appendChild(title);

    const healthSection = this.createHealthSection();
    panel.appendChild(healthSection);

    const goldSection = this.createGoldSection();
    panel.appendChild(goldSection);

    const waveSection = this.createWaveSection();
    panel.appendChild(waveSection);

    const buildingSection = this.createBuildingSection();
    panel.appendChild(buildingSection);

    this.uiLayer.appendChild(panel);
  }

  private createHealthSection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;

    const label = document.createElement('div');
    label.textContent = '基地生命';
    label.style.cssText = `
      font-size: 14px;
      color: #9CA3AF;
    `;
    section.appendChild(label);

    const barContainer = document.createElement('div');
    barContainer.style.cssText = `
      position: relative;
      width: 100%;
      height: 20px;
      background: #374151;
      border-radius: 10px;
      overflow: hidden;
    `;

    const bar = document.createElement('div');
    bar.style.cssText = `
      width: 100%;
      height: 100%;
      background: #EF4444;
      border-radius: 10px;
      transition: width 0.3s ease;
    `;
    this.healthBar = bar;
    barContainer.appendChild(bar);

    const text = document.createElement('div');
    text.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 12px;
      font-weight: bold;
      color: white;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    `;
    this.healthText = text;
    barContainer.appendChild(text);

    section.appendChild(barContainer);
    return section;
  }

  private createGoldSection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
    `;

    const label = document.createElement('div');
    label.textContent = '金币';
    label.style.cssText = `
      font-size: 14px;
      color: #9CA3AF;
    `;
    section.appendChild(label);

    const goldContainer = document.createElement('div');
    goldContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    const coinIcon = document.createElement('div');
    coinIcon.textContent = '💰';
    coinIcon.style.fontSize = '24px';
    goldContainer.appendChild(coinIcon);

    const goldText = document.createElement('div');
    goldText.style.cssText = `
      font-size: 24px;
      font-weight: bold;
      color: #F59E0B;
      transition: transform 0.3s ease-out;
    `;
    this.goldDisplay = goldText;
    goldContainer.appendChild(goldText);

    section.appendChild(goldContainer);
    return section;
  }

  private createWaveSection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 12px;
      background: rgba(217, 119, 6, 0.1);
      border-radius: 8px;
      border: 1px solid rgba(217, 119, 6, 0.3);
    `;

    const label = document.createElement('div');
    label.textContent = '当前波次';
    label.style.cssText = `
      font-size: 14px;
      color: #9CA3AF;
    `;
    section.appendChild(label);

    const waveText = document.createElement('div');
    waveText.style.cssText = `
      font-size: 28px;
      font-weight: bold;
      color: #D97706;
      text-align: center;
    `;
    this.waveDisplay = waveText;
    section.appendChild(waveText);

    return section;
  }

  private createBuildingSection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-height: 0;
    `;

    const label = document.createElement('div');
    label.textContent = '已建造建筑';
    label.style.cssText = `
      font-size: 14px;
      color: #9CA3AF;
    `;
    section.appendChild(label);

    const listContainer = document.createElement('div');
    listContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-right: 4px;
    `;
    listContainer.className = 'interactive';
    this.buildingList = listContainer;
    section.appendChild(listContainer);

    return section;
  }

  private setupCanvasClick(): void {
    const canvas = this.container.querySelector('canvas');
    if (!canvas) return;

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x >= this.mapWidth) return;

      this.handleMapClick(x, y);
    });
  }

  private handleMapClick(x: number, y: number): void {
    const grid = this.game.grid;
    const colRow = grid.getColRowAtPixel(x, y);

    if (!colRow) return;

    const existingTower = this.game.getTowerAt(colRow.col, colRow.row);

    if (existingTower) {
      this.showUpgradePanel(existingTower, x, y);
      this.hideBuildMenu();
      this.selectedTower = existingTower;
      this.selectedTile = null;
    } else if (grid.isBuildable(colRow.col, colRow.row)) {
      this.showBuildMenu(colRow.col, colRow.row, x, y);
      this.hideUpgradePanel();
      this.selectedTile = colRow;
      this.selectedTower = null;
    } else {
      this.hideBuildMenu();
      this.hideUpgradePanel();
      this.selectedTile = null;
      this.selectedTower = null;
    }
  }

  private showBuildMenu(col: number, row: number, x: number, y: number): void {
    this.hideBuildMenu();

    const menu = document.createElement('div');
    menu.style.cssText = `
      position: absolute;
      left: ${Math.min(x + 10, this.mapWidth - 210)}px;
      top: ${Math.min(y, this.mapHeight - 200)}px;
      width: 200px;
      background: #1F2937;
      border: 2px solid #D97706;
      border-radius: 12px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      z-index: 100;
      pointer-events: auto;
    `;
    menu.className = 'interactive';

    const towerTypes = [
      { type: TowerType.ARROW, name: '箭塔', cost: 30, desc: '快速射箭，单体伤害' },
      { type: TowerType.CANNON, name: '炮塔', cost: 50, desc: '范围溅射，群体伤害' },
      { type: TowerType.MAGIC, name: '魔法塔', cost: 45, desc: '追踪弹，减速效果' },
      { type: TowerType.COLLECTOR, name: '采集站', cost: 40, desc: '采集附近资源点金币' }
    ];

    for (const tower of towerTypes) {
      const btn = this.createBuildButton(tower.type, tower.name, tower.cost, tower.desc, col, row);
      menu.appendChild(btn);
    }

    this.uiLayer.appendChild(menu);
    this.buildMenu = menu;

    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick, { once: true });
    }, 10);
  }

  private createBuildButton(
    type: TowerType,
    name: string,
    cost: number,
    desc: string,
    col: number,
    row: number
  ): HTMLElement {
    const config = TOWER_CONFIGS[type];
    const canAfford = this.game.state.gold >= cost;

    const btn = document.createElement('div');
    btn.style.cssText = `
      height: 40px;
      background: ${config.color};
      border-radius: 8px;
      display: flex;
      align-items: center;
      padding: 0 12px;
      cursor: ${canAfford ? 'pointer' : 'not-allowed'};
      opacity: ${canAfford ? 1 : 0.5};
      transition: transform 0.2s ease, background 0.2s ease;
      position: relative;
      user-select: none;
      border: 2px solid #3E2723;
    `;

    const nameSpan = document.createElement('span');
    nameSpan.textContent = name;
    nameSpan.style.cssText = `
      flex: 1;
      color: #FFF8E7;
      font-weight: bold;
      font-size: 14px;
    `;
    btn.appendChild(nameSpan);

    const costSpan = document.createElement('span');
    costSpan.textContent = `💰${cost}`;
    costSpan.style.cssText = `
      color: #F59E0B;
      font-size: 12px;
      font-weight: bold;
    `;
    btn.appendChild(costSpan);

    const tooltip = document.createElement('div');
    tooltip.textContent = desc;
    tooltip.style.cssText = `
      position: absolute;
      left: calc(100% + 10px);
      top: 50%;
      transform: translateY(-50%);
      background: #111827;
      color: #FFF8E7;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
      z-index: 10;
      border: 1px solid #D97706;
    `;
    btn.appendChild(tooltip);

    if (canAfford) {
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateX(-4px)';
        tooltip.style.opacity = '1';
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translateX(0)';
        tooltip.style.opacity = '0';
      });

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.buildTower(type, col, row);
      });
    }

    return btn;
  }

  private buildTower(type: TowerType, col: number, row: number): void {
    const success = this.game.buildTower(type, col, row);
    if (success) {
      this.hideBuildMenu();
      this.updateGoldDisplay();
      this.updateBuildingList();
      this.selectedTile = null;
      if (this.onTowerBuilt) {
        this.onTowerBuilt();
      }
    }
  }

  private showUpgradePanel(tower: Tower, x: number, y: number): void {
    this.hideUpgradePanel();

    const config = tower.getConfig();
    const baseConfig = tower.getBaseConfig();
    const canUpgrade = tower.canUpgrade();
    const upgradeCost = tower.getUpgradeCost();
    const canAfford = this.game.state.gold >= upgradeCost;

    const panel = document.createElement('div');
    panel.style.cssText = `
      position: absolute;
      left: ${Math.min(x + 10, this.mapWidth - 230)}px;
      top: ${Math.min(y, this.mapHeight - 280)}px;
      width: 220px;
      background: #111827;
      border: 2px solid #D97706;
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      z-index: 100;
      pointer-events: auto;
      color: #FFF8E7;
    `;
    panel.className = 'interactive';

    const title = document.createElement('div');
    title.textContent = baseConfig.name;
    title.style.cssText = `
      font-size: 18px;
      font-weight: bold;
      color: #D97706;
      text-align: center;
      padding-bottom: 8px;
      border-bottom: 1px solid #374151;
    `;
    panel.appendChild(title);

    const levelDisplay = document.createElement('div');
    levelDisplay.innerHTML = `当前等级: <span style="color: #FFD700;">Lv.${tower.level + 1}</span>`;
    levelDisplay.style.fontSize = '14px';
    panel.appendChild(levelDisplay);

    const statsDiv = document.createElement('div');
    statsDiv.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
      color: #9CA3AF;
    `;

    if (tower.type !== TowerType.COLLECTOR) {
      statsDiv.innerHTML += `<div>伤害: ${config.damage}</div>`;
      statsDiv.innerHTML += `<div>射速: ${config.fireRate.toFixed(1)}/秒</div>`;
      statsDiv.innerHTML += `<div>射程: ${config.range}px</div>`;
    } else {
      statsDiv.innerHTML += `<div>采集间隔: ${(1 / config.fireRate).toFixed(1)}秒</div>`;
      statsDiv.innerHTML += `<div>采集范围: ${config.range}px</div>`;
    }

    if (config.splashRadius) {
      statsDiv.innerHTML += `<div>溅射范围: ${config.splashRadius}px</div>`;
    }
    if (config.slowDuration) {
      statsDiv.innerHTML += `<div>减速: ${(config.slowAmount! * 100).toFixed(0)}% / ${(config.slowDuration / 1000).toFixed(1)}秒</div>`;
    }

    panel.appendChild(statsDiv);

    if (canUpgrade) {
      const nextLevelDiv = document.createElement('div');
      nextLevelDiv.style.cssText = `
        padding: 8px;
        background: rgba(34, 197, 94, 0.1);
        border-radius: 8px;
        font-size: 12px;
        color: #22C55E;
      `;
      nextLevelDiv.innerHTML = `<div style="font-weight: bold; margin-bottom: 4px;">下一级预览:</div>`;

      const nextConfig = baseConfig.levels[tower.level + 1];
      if (tower.type !== TowerType.COLLECTOR) {
        nextLevelDiv.innerHTML += `<div>伤害: ${nextConfig.damage} (+${nextConfig.damage - config.damage})</div>`;
        nextLevelDiv.innerHTML += `<div>射速: ${nextConfig.fireRate.toFixed(1)}/秒</div>`;
      } else {
        nextLevelDiv.innerHTML += `<div>采集间隔: ${(1 / nextConfig.fireRate).toFixed(1)}秒</div>`;
      }
      if (nextConfig.splashRadius && config.splashRadius) {
        nextLevelDiv.innerHTML += `<div>溅射范围: ${nextConfig.splashRadius}px (+${nextConfig.splashRadius - config.splashRadius})</div>`;
      }
      if (nextConfig.slowDuration && config.slowDuration) {
        nextLevelDiv.innerHTML += `<div>减速时间: ${(nextConfig.slowDuration / 1000).toFixed(1)}秒</div>`;
      }

      panel.appendChild(nextLevelDiv);

      const upgradeBtn = document.createElement('div');
      upgradeBtn.style.cssText = `
        height: 40px;
        background: ${canAfford ? '#22C55E' : '#374151'};
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: ${canAfford ? 'pointer' : 'not-allowed'};
        font-weight: bold;
        transition: background 0.2s ease, transform 0.2s ease;
        user-select: none;
      `;
      upgradeBtn.innerHTML = `升级 (💰${upgradeCost})`;

      if (canAfford) {
        upgradeBtn.addEventListener('mouseenter', () => {
          upgradeBtn.style.transform = 'scale(1.02)';
        });
        upgradeBtn.addEventListener('mouseleave', () => {
          upgradeBtn.style.transform = 'scale(1)';
        });
        upgradeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.upgradeTower(tower);
        });
      }

      panel.appendChild(upgradeBtn);
    } else {
      const maxLevelDiv = document.createElement('div');
      maxLevelDiv.textContent = '已达到最高等级';
      maxLevelDiv.style.cssText = `
        text-align: center;
        color: #FFD700;
        font-weight: bold;
        padding: 8px;
        background: rgba(255, 215, 0, 0.1);
        border-radius: 8px;
      `;
      panel.appendChild(maxLevelDiv);
    }

    this.uiLayer.appendChild(panel);
    this.upgradePanel = panel;

    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick, { once: true });
    }, 10);
  }

  private upgradeTower(tower: Tower): void {
    const success = this.game.upgradeTower(tower.id);
    if (success) {
      this.updateGoldDisplay();
      this.updateBuildingList();
      this.hideUpgradePanel();
      this.selectedTower = null;
      if (this.onTowerUpgraded) {
        this.onTowerUpgraded();
      }
    }
  }

  private handleOutsideClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    if (this.buildMenu && !this.buildMenu.contains(target)) {
      this.hideBuildMenu();
      this.selectedTile = null;
    }
    if (this.upgradePanel && !this.upgradePanel.contains(target)) {
      this.hideUpgradePanel();
      this.selectedTower = null;
    }
  };

  hideBuildMenu(): void {
    if (this.buildMenu) {
      this.buildMenu.remove();
      this.buildMenu = null;
    }
  }

  hideUpgradePanel(): void {
    if (this.upgradePanel) {
      this.upgradePanel.remove();
      this.upgradePanel = null;
    }
  }

  updateGoldDisplay(): void {
    if (this.goldDisplay) {
      this.goldDisplay.textContent = this.game.state.gold.toString();

      if (this.game.state.goldBounceTime > 0) {
        this.goldDisplay.style.transform = 'translateY(-5px) scale(1.3)';
        this.goldDisplay.style.color = '#FCD34D';

        if (this.goldBounceTimeout) {
          clearTimeout(this.goldBounceTimeout);
        }

        this.goldBounceTimeout = window.setTimeout(() => {
          if (this.goldDisplay) {
            this.goldDisplay.style.transform = 'translateY(0) scale(1)';
            this.goldDisplay.style.color = '#F59E0B';
          }
        }, 300);
      }
    }
  }

  updateHealthDisplay(): void {
    if (this.healthBar && this.healthText) {
      const percent = Math.max(0, (this.game.state.baseHealth / this.game.state.maxBaseHealth) * 100);
      this.healthBar.style.width = `${percent}%`;
      this.healthText.textContent = `${Math.round(this.game.state.baseHealth)}/${this.game.state.maxBaseHealth}`;
    }
  }

  updateWaveDisplay(): void {
    if (this.waveDisplay) {
      this.waveDisplay.textContent = `第 ${this.game.state.wave} 波`;
    }
  }

  updateBuildingList(): void {
    if (!this.buildingList) return;

    this.buildingList.innerHTML = '';

    const towers = this.game.entityManager.towers;

    if (towers.length === 0) {
      const emptyText = document.createElement('div');
      emptyText.textContent = '暂无建筑';
      emptyText.style.cssText = `
        color: #6B7280;
        font-size: 12px;
        text-align: center;
        padding: 20px 0;
      `;
      this.buildingList.appendChild(emptyText);
      return;
    }

    for (const tower of towers) {
      const item = this.createBuildingListItem(tower);
      this.buildingList.appendChild(item);
    }
  }

  private createBuildingListItem(tower: Tower): HTMLElement {
    const baseConfig = tower.getBaseConfig();

    const item = document.createElement('div');
    item.style.cssText = `
      height: 40px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 8px;
      background: rgba(255, 248, 231, 0.05);
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.2s ease;
    `;

    item.addEventListener('mouseenter', () => {
      item.style.background = 'rgba(217, 119, 6, 0.2)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = 'rgba(255, 248, 231, 0.05)';
    });
    item.addEventListener('click', () => {
      if (this.onBuildingSelect) {
        this.onBuildingSelect(tower);
      }
    });

    const icon = document.createElement('div');
    icon.style.cssText = `
      width: 24px;
      height: 24px;
      background: ${baseConfig.color};
      border-radius: 4px;
      border: 2px solid #3E2723;
      flex-shrink: 0;
    `;
    item.appendChild(icon);

    const info = document.createElement('div');
    info.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 0;
    `;

    const name = document.createElement('div');
    name.textContent = baseConfig.name;
    name.style.cssText = `
      font-size: 12px;
      color: #FFF8E7;
      font-weight: bold;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;
    info.appendChild(name);

    const level = document.createElement('div');
    level.textContent = `Lv.${tower.level + 1}`;
    level.style.cssText = `
      font-size: 10px;
      color: #FFD700;
    `;
    info.appendChild(level);

    item.appendChild(info);

    return item;
  }

  getSelectedTile(): { col: number; row: number } | null {
    return this.selectedTile;
  }

  getSelectedTower(): Tower | null {
    return this.selectedTower;
  }

  selectTower(tower: Tower): void {
    this.selectedTower = tower;
    this.selectedTile = null;
    const x = tower.col * this.game.grid.tileSize + this.game.grid.tileSize / 2;
    const y = tower.row * this.game.grid.tileSize + this.game.grid.tileSize / 2;
    this.showUpgradePanel(tower, x, y);
    this.hideBuildMenu();
  }

  setOnTowerBuilt(callback: () => void): void {
    this.onTowerBuilt = callback;
  }

  setOnTowerUpgraded(callback: () => void): void {
    this.onTowerUpgraded = callback;
  }

  setOnBuildingSelect(callback: (tower: Tower) => void): void {
    this.onBuildingSelect = callback;
  }

  update(): void {
    this.updateGoldDisplay();
    this.updateHealthDisplay();
    this.updateWaveDisplay();
  }
}
