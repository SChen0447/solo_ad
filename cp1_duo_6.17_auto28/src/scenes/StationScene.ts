import Phaser from 'phaser';
import { stationManager, Module, CrewMember, ModuleInfo } from '../utils/StationManager';
import { GameEvent } from '../utils/EventGenerator';

const GRID_SIZE = 6;
const CELL_SIZE = 80;
const GRID_LINE_COLOR = 0x333366;

export class StationScene extends Phaser.Scene {
  private gridOffsetX = 0;
  private gridOffsetY = 0;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private gridHighlightGraphics!: Phaser.GameObjects.Graphics;
  private moduleContainer!: Phaser.GameObjects.Container;
  private resourceBarContainer!: Phaser.GameObjects.Container;
  private crewContainer!: Phaser.GameObjects.Container;
  private buildPanelContainer!: Phaser.GameObjects.Container;
  private gameOverContainer!: Phaser.GameObjects.Container;
  private leaderboardContainer!: Phaser.GameObjects.Container;
  private recruitPanelContainer!: Phaser.GameObjects.Container;

  private selectedModuleType: string | null = null;
  private isDragging = false;
  private dragX = 0;
  private dragY = 0;
  private dragModulePreview!: Phaser.GameObjects.Container | null;

  private tickTimer = 0;
  private tickInterval = 5000;
  private isPaused = false;
  private dayText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;

  private resourceBars: Record<string, {
    bar: Phaser.GameObjects.Graphics;
    text: Phaser.GameObjects.Text;
    icon: string;
    pulseGlow: Phaser.GameObjects.Graphics;
    barWidth: number;
    barX: number;
    barY: number;
  }> = {};

  private resourceKeys: string[] = [];
  private crewDetailPanel: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('StationScene');
  }

  async create(): Promise<void> {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.createBackground();

    this.gridOffsetX = width / 2 - (GRID_SIZE * CELL_SIZE) / 2;
    this.gridOffsetY = height / 2 - (GRID_SIZE * CELL_SIZE) / 2 + 30;

    const success = await stationManager.initGame();
    if (!success) {
      console.error('Failed to initialize game');
      return;
    }

    this.createGrid();
    this.createGridHighlight();
    this.createModuleContainer();
    this.createResourceBar();
    this.createBuildPanel();
    this.createCrewPanel();
    this.createDayDisplay();

    this.setupInput();

    this.tickTimer = this.tickInterval;

    stationManager.subscribe(() => {
      this.updateUI();
    });

    this.updateUI();
    this.renderModules();
    this.updateCrewDisplay();
  }

  private createBackground(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const bg = this.add.graphics();
    bg.fillGradientStyle(
      0x0a0a2a, 0x0a0a2a,
      0x1a1a3a, 0x1a1a3a
    );
    bg.fillRect(0, 0, width, height);

    for (let i = 0; i < 100; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.5 + 0.2;
      const star = this.add.circle(x, y, size, 0xffffff, alpha);
      this.tweens.add({
        targets: star,
        alpha: alpha * 0.3,
        duration: 2000 + Math.random() * 3000,
        yoyo: true,
        repeat: -1
      });
    }
  }

  private createGrid(): void {
    this.gridGraphics = this.add.graphics();

    for (let x = 0; x <= GRID_SIZE; x++) {
      this.gridGraphics.lineStyle(1, GRID_LINE_COLOR, 0.6);
      this.gridGraphics.lineBetween(
        this.gridOffsetX + x * CELL_SIZE,
        this.gridOffsetY,
        this.gridOffsetX + x * CELL_SIZE,
        this.gridOffsetY + GRID_SIZE * CELL_SIZE
      );
    }

    for (let y = 0; y <= GRID_SIZE; y++) {
      this.gridGraphics.lineStyle(1, GRID_LINE_COLOR, 0.6);
      this.gridGraphics.lineBetween(
        this.gridOffsetX,
        this.gridOffsetY + y * CELL_SIZE,
        this.gridOffsetX + GRID_SIZE * CELL_SIZE,
        this.gridOffsetY + y * CELL_SIZE
      );
    }

    const border = this.add.graphics();
    border.lineStyle(2, 0x00D4FF, 0.5);
    border.strokeRect(
      this.gridOffsetX - 2,
      this.gridOffsetY - 2,
      GRID_SIZE * CELL_SIZE + 4,
      GRID_SIZE * CELL_SIZE + 4
    );
  }

  private createGridHighlight(): void {
    this.gridHighlightGraphics = this.add.graphics();
    this.gridHighlightGraphics.setDepth(5);
  }

  private updateGridHighlight(gridX: number, gridY: number, moduleType: string): void {
    this.gridHighlightGraphics.clear();

    const info = stationManager.getModuleInfo(moduleType);
    if (!info) return;

    const [w, h] = info.size;
    const canPlace = stationManager.canPlaceModule(moduleType, gridX, gridY);
    const color = canPlace ? 0x00FF00 : 0xFF0000;
    const alpha = canPlace ? 0.25 : 0.35;

    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        const cellX = gridX + dx;
        const cellY = gridY + dy;

        const isValidCell = cellX >= 0 && cellY >= 0 && cellX < GRID_SIZE && cellY < GRID_SIZE;
        const cellColor = isValidCell ? color : 0xFF0000;
        const cellAlpha = isValidCell ? alpha : 0.5;

        this.gridHighlightGraphics.fillStyle(cellColor, cellAlpha);
        this.gridHighlightGraphics.fillRect(
          this.gridOffsetX + cellX * CELL_SIZE + 2,
          this.gridOffsetY + cellY * CELL_SIZE + 2,
          CELL_SIZE - 4,
          CELL_SIZE - 4
        );

        this.gridHighlightGraphics.lineStyle(2, cellColor, 0.9);
        this.gridHighlightGraphics.strokeRect(
          this.gridOffsetX + cellX * CELL_SIZE + 2,
          this.gridOffsetY + cellY * CELL_SIZE + 2,
          CELL_SIZE - 4,
          CELL_SIZE - 4
        );
      }
    }
  }

  private clearGridHighlight(): void {
    this.gridHighlightGraphics.clear();
  }

  private createModuleContainer(): void {
    this.moduleContainer = this.add.container(0, 0);
    this.moduleContainer.setDepth(10);
  }

  private createResourceBar(): void {
    const width = this.cameras.main.width;
    this.resourceBarContainer = this.add.container(0, 0);
    this.resourceBarContainer.setDepth(20);

    const barHeight = 60;
    const barY = 15;

    const barBg = this.add.graphics();
    barBg.fillStyle(0x1a1a2e, 0.8);
    barBg.fillRect(20, barY, width - 40, barHeight);
    barBg.lineStyle(1, 0x00D4FF, 0.5);
    barBg.strokeRect(20, barY, width - 40, barHeight);

    this.resourceBarContainer.add(barBg);

    const resources = [
      { key: 'oxygen', name: '氧气', icon: '💨' },
      { key: 'water', name: '水', icon: '💧' },
      { key: 'food', name: '食物', icon: '🍎' },
      { key: 'power', name: '电力', icon: '⚡' },
      { key: 'tech_points', name: '科技', icon: '🔬' },
      { key: 'reputation', name: '信誉', icon: '⭐' },
      { key: 'materials', name: '材料', icon: '🔧' }
    ];

    this.resourceKeys = resources.map(r => r.key);
    const barWidth = (width - 60) / resources.length;

    resources.forEach((res, index) => {
      const x = 30 + index * barWidth + barWidth / 2;
      const y = barY + barHeight / 2;

      const iconText = this.add.text(x - barWidth / 2 + 5, y, res.icon, {
        fontSize: '24px'
      }).setOrigin(0, 0.5);

      const valueText = this.add.text(x + 10, y - 10, '0', {
        fontSize: '16px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      const barGraphics = this.add.graphics();
      const pulseGlow = this.add.graphics();

      const barX = x + 10;
      const barY2 = y + 5;
      const barW = barWidth - 30;
      const barH = 8;

      barGraphics.fillStyle(0x2a2a4a, 1);
      barGraphics.fillRect(barX, barY2, barW, barH);

      this.resourceBars[res.key] = {
        bar: barGraphics,
        text: valueText,
        icon: res.icon,
        pulseGlow: pulseGlow,
        barWidth: barW,
        barX: barX,
        barY: barY2
      };

      this.resourceBarContainer.add([iconText, valueText, barGraphics, pulseGlow]);
    });
  }

  private createDayDisplay(): void {
    const width = this.cameras.main.width;

    this.dayText = this.add.text(width - 30, 90, '第 1 天', {
      fontSize: '20px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#00D4FF',
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    this.scoreText = this.add.text(width - 30, 120, '分数: 0', {
      fontSize: '16px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#FFD700'
    }).setOrigin(1, 0);
  }

  private createBuildPanel(): void {
    this.buildPanelContainer = this.add.container(0, 0);

    const panelX = 20;
    const panelY = 180;
    const panelWidth = 150;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.9);
    panelBg.lineStyle(1, 0x00D4FF, 0.5);
    panelBg.strokeRect(panelX, panelY, panelWidth, 450);
    panelBg.fillRect(panelX, panelY, panelWidth, 450);

    const titleText = this.add.text(panelX + panelWidth / 2, panelY + 15, '建造模块', {
      fontSize: '18px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#00D4FF',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0);

    this.buildPanelContainer.add([panelBg, titleText]);

    const moduleTypes = stationManager.getModuleTypes();
    const buildableModules = Object.entries(moduleTypes).filter(([key]) => key !== 'core');

    buildableModules.forEach(([key, info], index) => {
      const y = panelY + 50 + index * 55;
      this.createBuildItem(key, info as ModuleInfo, panelX + 10, y, panelWidth - 20, 50);
    });

    const hintText = this.add.text(panelX + panelWidth / 2, panelY + 420, '拖拽到网格放置', {
      fontSize: '11px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#8888aa'
    }).setOrigin(0.5, 0);
    this.buildPanelContainer.add(hintText);
  }

  private createBuildItem(
    moduleType: string,
    info: ModuleInfo,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const itemBg = this.add.graphics();
    itemBg.fillStyle(0x2a2a4a, 0.8);
    itemBg.lineStyle(1, 0x333366, 1);
    itemBg.strokeRect(x, y, width, height, 6);
    itemBg.fillRect(x, y, width, height, 6);

    const colorStr = this.getModuleColor(moduleType);
    const color = Phaser.Display.Color.HexStringToColor(colorStr).color;

    const iconBg = this.add.graphics();
    iconBg.fillStyle(color, 0.8);
    iconBg.fillRoundedRect(x + 5, y + 5, 40, 40, 4);

    const iconText = this.add.text(x + 25, y + 25, this.getModuleIcon(moduleType), {
      fontSize: '20px'
    }).setOrigin(0.5);

    const nameText = this.add.text(x + 52, y + 8, info.name, {
      fontSize: '13px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#ffffff'
    }).setOrigin(0, 0);

    const costText = this.add.text(x + 52, y + 28, this.getCostText(info.cost), {
      fontSize: '11px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#FFD700'
    }).setOrigin(0, 0);

    const sizeText = this.add.text(x + 52, y + 42, `尺寸: ${info.size[0]}x${info.size[1]}`, {
      fontSize: '9px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#8888aa'
    }).setOrigin(0, 0);

    const hitArea = this.add.zone(x, y, width, height).setOrigin(0, 0);
    hitArea.setInteractive({ useHandCursor: true });

    hitArea.on('pointerover', () => {
      itemBg.clear();
      itemBg.fillStyle(0x3a3a5a, 0.9);
      itemBg.lineStyle(2, 0x00D4FF, 1);
      itemBg.strokeRect(x, y, width, height, 6);
      itemBg.fillRect(x, y, width, height, 6);
    });

    hitArea.on('pointerout', () => {
      itemBg.clear();
      itemBg.fillStyle(0x2a2a4a, 0.8);
      itemBg.lineStyle(1, 0x333366, 1);
      itemBg.strokeRect(x, y, width, height, 6);
      itemBg.fillRect(x, y, width, height, 6);
    });

    hitArea.on('pointerdown', () => {
      this.startBuilding(moduleType);
    });

    this.buildPanelContainer.add([itemBg, iconBg, iconText, nameText, costText, sizeText, hitArea]);
  }

  private getModuleIcon(type: string): string {
    const icons: Record<string, string> = {
      core: '🏠',
      life_support: '💨',
      power_core: '⚡',
      lab: '🔬',
      habitat: '🛏️',
      greenhouse: '🌱',
      medical: '💊',
      solar_panel: '☀️',
      water_recycler: '💧'
    };
    return icons[type] || '📦';
  }

  private getModuleColor(type: string): string {
    const colors: Record<string, string> = {
      core: '#00D4FF',
      life_support: '#00FF9D',
      power_core: '#FFD700',
      lab: '#A855F7',
      habitat: '#00BFFF',
      greenhouse: '#32CD32',
      medical: '#FF69B4',
      solar_panel: '#FFA500',
      water_recycler: '#00CED1'
    };
    return colors[type] || '#00D4FF';
  }

  private getCostText(cost: Record<string, number>): string {
    const names: Record<string, string> = {
      tech_points: '🔬',
      materials: '🔧'
    };
    const parts = Object.entries(cost).map(([k, v]) => `${names[k] || k}${v}`);
    return parts.join(' ') || '免费';
  }

  private createCrewPanel(): void {
    this.crewContainer = this.add.container(0, 0);
    this.crewContainer.setDepth(15);
    this.crewDetailPanel = null;
  }

  private setupInput(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.selectedModuleType && this.isDragging) {
        this.dragX = pointer.x;
        this.dragY = pointer.y;
        this.updateDragPreview();
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.selectedModuleType && this.isDragging) {
        this.tryPlaceModule(pointer.x, pointer.y);
      }
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.cancelBuilding();
      this.hideRecruitPanel();
      this.hideCrewDetailPanel();
    });
  }

  private startBuilding(moduleType: string): void {
    if (!stationManager.canAfford(moduleType)) {
      console.log('资源不足');
      return;
    }

    this.selectedModuleType = moduleType;
    this.isDragging = true;

    if (this.dragModulePreview) {
      this.dragModulePreview.destroy();
    }

    const pointer = this.input.activePointer;
    this.dragX = pointer.x;
    this.dragY = pointer.y;

    this.createDragPreview();
    this.updateDragPreview();
  }

  private createDragPreview(): void {
    if (!this.selectedModuleType) return;

    const info = stationManager.getModuleInfo(this.selectedModuleType);
    if (!info) return;

    const [w, h] = info.size;
    const moduleWidth = w * CELL_SIZE - 8;
    const moduleHeight = h * CELL_SIZE - 8;

    this.dragModulePreview = this.add.container(0, 0);
    this.dragModulePreview.setDepth(30);
    this.dragModulePreview.setAlpha(0.85);

    const colorStr = this.getModuleColor(this.selectedModuleType);
    const color = Phaser.Display.Color.HexStringToColor(colorStr).color;

    const bg = this.add.graphics();
    bg.fillStyle(color, 0.5);
    bg.lineStyle(3, color, 0.9);
    bg.strokeRoundedRect(-moduleWidth / 2, -moduleHeight / 2, moduleWidth, moduleHeight, 8);
    bg.fillRoundedRect(-moduleWidth / 2, -moduleHeight / 2, moduleWidth, moduleHeight, 8);

    const iconText = this.add.text(0, -5, this.getModuleIcon(this.selectedModuleType), {
      fontSize: '28px'
    }).setOrigin(0.5);

    const nameText = this.add.text(0, moduleHeight / 2 - 12, info.name, {
      fontSize: '11px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#ffffff'
    }).setOrigin(0.5);

    this.dragModulePreview.add([bg, iconText, nameText]);
  }

  private updateDragPreview(): void {
    if (!this.dragModulePreview || !this.selectedModuleType) return;

    const gridX = Math.floor((this.dragX - this.gridOffsetX) / CELL_SIZE);
    const gridY = Math.floor((this.dragY - this.gridOffsetY) / CELL_SIZE);

    const info = stationManager.getModuleInfo(this.selectedModuleType);
    if (!info) return;

    const [w, h] = info.size;
    const centerX = this.gridOffsetX + gridX * CELL_SIZE + (w * CELL_SIZE) / 2;
    const centerY = this.gridOffsetY + gridY * CELL_SIZE + (h * CELL_SIZE) / 2;

    this.dragModulePreview.setPosition(centerX, centerY);
    this.updateGridHighlight(gridX, gridY, this.selectedModuleType);
  }

  private async tryPlaceModule(pointerX: number, pointerY: number): Promise<void> {
    if (!this.selectedModuleType) return;

    const gridX = Math.floor((pointerX - this.gridOffsetX) / CELL_SIZE);
    const gridY = Math.floor((pointerY - this.gridOffsetY) / CELL_SIZE);

    if (stationManager.canPlaceModule(this.selectedModuleType, gridX, gridY)) {
      const success = await stationManager.buildModule(this.selectedModuleType, gridX, gridY);
      if (success) {
        this.renderModules();
        this.updateCrewDisplay();
      }
    }

    this.cancelBuilding();
  }

  private cancelBuilding(): void {
    this.selectedModuleType = null;
    this.isDragging = false;

    this.clearGridHighlight();

    if (this.dragModulePreview) {
      this.dragModulePreview.destroy();
      this.dragModulePreview = null;
    }
  }

  private renderModules(): void {
    this.moduleContainer.removeAll(true);

    const state = stationManager.getState();
    if (!state) return;

    state.modules.forEach((module: Module) => {
      this.createModuleSprite(module);
    });
  }

  private createModuleSprite(module: Module): void {
    const info = stationManager.getModuleInfo(module.type);
    if (!info) return;

    const [w, h] = info.size;
    const moduleWidth = w * CELL_SIZE - 8;
    const moduleHeight = h * CELL_SIZE - 8;

    const x = this.gridOffsetX + module.x * CELL_SIZE + (w * CELL_SIZE) / 2;
    const y = this.gridOffsetY + module.y * CELL_SIZE + (h * CELL_SIZE) / 2;

    const container = this.add.container(x, y);

    const colorStr = this.getModuleColor(module.type);
    const color = Phaser.Display.Color.HexStringToColor(colorStr).color;

    const bg = this.add.graphics();
    bg.fillStyle(color, 0.4);
    bg.lineStyle(2, color, 0.8);
    bg.strokeRoundedRect(-moduleWidth / 2, -moduleHeight / 2, moduleWidth, moduleHeight, 8);
    bg.fillRoundedRect(-moduleWidth / 2, -moduleHeight / 2, moduleWidth, moduleHeight, 8);

    const iconText = this.add.text(0, -5, this.getModuleIcon(module.type), {
      fontSize: '28px'
    }).setOrigin(0.5);

    const nameText = this.add.text(0, moduleHeight / 2 - 12, info.name, {
      fontSize: '11px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#ffffff'
    }).setOrigin(0.5);

    container.add([bg, iconText, nameText]);

    container.setScale(0);
    container.setAlpha(0);

    this.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });

    this.moduleContainer.add(container);

    container.setSize(moduleWidth, moduleHeight);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scale: 1.05,
        duration: 150,
        ease: 'Power2.easeOut'
      });
      bg.clear();
      bg.fillStyle(color, 0.6);
      bg.lineStyle(3, 0x00FF9D, 1);
      bg.strokeRoundedRect(-moduleWidth / 2, -moduleHeight / 2, moduleWidth, moduleHeight, 8);
      bg.fillRoundedRect(-moduleWidth / 2, -moduleHeight / 2, moduleWidth, moduleHeight, 8);
    });

    container.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 150,
        ease: 'Power2.easeOut'
      });
      bg.clear();
      bg.fillStyle(color, 0.4);
      bg.lineStyle(2, color, 0.8);
      bg.strokeRoundedRect(-moduleWidth / 2, -moduleHeight / 2, moduleWidth, moduleHeight, 8);
      bg.fillRoundedRect(-moduleWidth / 2, -moduleHeight / 2, moduleWidth, moduleHeight, 8);
    });

    container.on('pointerdown', () => {
      if (module.type === 'habitat') {
        this.showRecruitPanel();
      }
    });
  }

  private showRecruitPanel(): void {
    if (this.recruitPanelContainer) {
      this.recruitPanelContainer.destroy();
    }

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.recruitPanelContainer = this.add.container(0, 0);
    this.recruitPanelContainer.setDepth(50);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, width, height);
    overlay.setInteractive({ useHandCursor: true });
    overlay.on('pointerdown', () => {
      this.hideRecruitPanel();
    });

    const panelWidth = 420;
    const panelHeight = 420;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.95);
    panelBg.lineStyle(2, 0x00D4FF, 0.8);
    panelBg.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 12);
    panelBg.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 12);

    const titleText = this.add.text(width / 2, panelY + 30, '🛸 招募船员', {
      fontSize: '24px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#00D4FF',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const costText = this.add.text(width / 2, panelY + 60, '消耗: 🔬10 科技点 + 🍎5 食物', {
      fontSize: '14px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#FFD700'
    }).setOrigin(0.5);

    const previewMember = this.generatePreviewCrew();
    const avatarColor = Phaser.Display.Color.HexStringToColor(previewMember.avatar_color).color;

    const avatarBg = this.add.graphics();
    avatarBg.fillStyle(avatarColor, 1);
    avatarBg.lineStyle(3, 0xffffff, 0.3);
    avatarBg.fillCircle(width / 2 - 100, panelY + 135, 45);
    avatarBg.strokeCircle(width / 2 - 100, panelY + 135, 45);

    const avatarInitial = this.add.text(width / 2 - 100, panelY + 135, previewMember.name[0], {
      fontSize: '28px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const memberName = this.add.text(width / 2 - 40, panelY + 110, previewMember.name, {
      fontSize: '22px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0);

    const memberProfession = this.add.text(width / 2 - 40, panelY + 142, previewMember.profession, {
      fontSize: '15px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#00FF9D'
    }).setOrigin(0, 0);

    const memberMorale = this.add.text(width / 2 - 40, panelY + 170, `士气: ${previewMember.morale}/100`, {
      fontSize: '13px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#FFD700'
    }).setOrigin(0, 0);

    const moraleBarBg = this.add.graphics();
    moraleBarBg.fillStyle(0x2a2a4a, 1);
    moraleBarBg.fillRect(width / 2 - 40, panelY + 190, 150, 8);

    const moraleBar = this.add.graphics();
    moraleBar.fillStyle(0x00FF9D, 1);
    moraleBar.fillRect(width / 2 - 40, panelY + 190, (previewMember.morale / 100) * 150, 8);

    const skillsTitle = this.add.text(panelX + 30, panelY + 230, '📊 技能属性', {
      fontSize: '16px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#00D4FF',
      fontStyle: 'bold'
    }).setOrigin(0, 0);

    let skillY = panelY + 260;
    Object.entries(previewMember.skills).forEach(([skill, level]) => {
      const skillName = this.add.text(panelX + 30, skillY, skill, {
        fontSize: '13px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: '#ccccdd'
      }).setOrigin(0, 0.5);

      const skillBarBg = this.add.graphics();
      skillBarBg.fillStyle(0x2a2a4a, 1);
      skillBarBg.fillRect(panelX + 100, skillY - 6, 200, 12);

      const skillBar = this.add.graphics();
      const skillColor = level >= 4 ? 0x00FF9D : level >= 2 ? 0xFFD700 : 0xEF4444;
      skillBar.fillStyle(skillColor, 1);
      skillBar.fillRect(panelX + 100, skillY - 6, (level / 5) * 200, 12);

      const skillLevel = this.add.text(panelX + 310, skillY, `Lv.${level}`, {
        fontSize: '12px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: '#FFD700',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      skillY += 28;
    });

    const canRecruit = this.canRecruit();

    const recruitBtn = this.add.graphics();
    const btnColor = canRecruit ? 0x00D4FF : 0x666666;
    recruitBtn.fillStyle(btnColor, canRecruit ? 0.8 : 0.5);
    recruitBtn.strokeRoundedRect(width / 2 - 100, panelY + 370, 200, 40, 8);
    recruitBtn.fillRoundedRect(width / 2 - 100, panelY + 370, 200, 40, 8);

    const recruitBtnText = this.add.text(width / 2, panelY + 390, canRecruit ? '✅ 确认招募' : '❌ 条件不足', {
      fontSize: '16px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: canRecruit ? '#0a0a2a' : '#999999',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    if (canRecruit) {
      const btnHitArea = this.add.zone(width / 2 - 100, panelY + 370, 200, 40).setOrigin(0, 0);
      btnHitArea.setInteractive({ useHandCursor: true });
      btnHitArea.on('pointerover', () => {
        recruitBtn.clear();
        recruitBtn.fillStyle(0x00FF9D, 0.9);
        recruitBtn.fillRoundedRect(width / 2 - 100, panelY + 370, 200, 40, 8);
      });
      btnHitArea.on('pointerout', () => {
        recruitBtn.clear();
        recruitBtn.fillStyle(0x00D4FF, 0.8);
        recruitBtn.fillRoundedRect(width / 2 - 100, panelY + 370, 200, 40, 8);
      });
      btnHitArea.on('pointerdown', async () => {
        const result = await stationManager.recruitCrew();
        if (result) {
          this.hideRecruitPanel();
          this.updateCrewDisplay();
        }
      });
      this.recruitPanelContainer.add(btnHitArea);
    }

    const refreshBtn = this.add.graphics();
    refreshBtn.fillStyle(0x2a2a4a, 0.8);
    refreshBtn.lineStyle(1, 0x00D4FF, 0.5);
    refreshBtn.strokeRoundedRect(panelX + 20, panelY + 370, 100, 40, 8);
    refreshBtn.fillRoundedRect(panelX + 20, panelY + 370, 100, 40, 8);

    const refreshBtnText = this.add.text(panelX + 70, panelY + 390, '🔄 刷新', {
      fontSize: '14px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#00D4FF'
    }).setOrigin(0.5);

    const refreshHitArea = this.add.zone(panelX + 20, panelY + 370, 100, 40).setOrigin(0, 0);
    refreshHitArea.setInteractive({ useHandCursor: true });
    refreshHitArea.on('pointerdown', () => {
      this.recruitPanelContainer?.destroy();
      this.showRecruitPanel();
    });

    this.recruitPanelContainer.add([
      overlay, panelBg, titleText, costText,
      avatarBg, avatarInitial, memberName, memberProfession, memberMorale,
      moraleBarBg, moraleBar,
      skillsTitle, recruitBtn, recruitBtnText,
      refreshBtn, refreshBtnText, refreshHitArea
    ]);
  }

  private generatePreviewCrew(): any {
    const names = ['张伟', '李娜', '王强', '刘洋', '陈明', '杨静', '赵磊', '周芳', '吴涛', '郑霞',
      '孙浩', '马琳', '朱军', '胡雪', '林峰', '何婷', '罗明', '梁宇', '宋佳', '唐杰'];
    const professions = ['工程师', '生物学家', '医生', '厨师', '宇航员', '维修工', '通信员', '指挥官'];
    const skills = ['工程', '科研', '医疗', '烹饪', '驾驶', '维修', '通信', '领导'];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'];

    const name = names[Math.floor(Math.random() * names.length)];
    const profession = professions[Math.floor(Math.random() * professions.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const shuffledSkills = [...skills].sort(() => Math.random() - 0.5).slice(0, 3);
    const skillObj: Record<string, number> = {};
    shuffledSkills.forEach(s => {
      skillObj[s] = Math.floor(Math.random() * 5) + 1;
    });

    return {
      name,
      profession,
      avatar_color: color,
      morale: 80,
      skills: skillObj
    };
  }

  private canRecruit(): boolean {
    const state = stationManager.getState();
    if (!state) return false;

    if (state.resources.tech_points < 10) return false;
    if (state.resources.food < 5) return false;

    const totalCapacity = stationManager.getTotalCapacity();
    if (state.crew.length >= totalCapacity) return false;

    return true;
  }

  private hideRecruitPanel(): void {
    if (this.recruitPanelContainer) {
      this.recruitPanelContainer.destroy();
      this.recruitPanelContainer = null as any;
    }
  }

  private updateCrewDisplay(): void {
    this.crewContainer.removeAll(true);
    this.hideCrewDetailPanel();

    const state = stationManager.getState();
    if (!state) return;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const startX = width - 20;
    const y = height - 120;
    const cardWidth = 100;
    const cardHeight = 110;
    const spacing = 10;

    const titleText = this.add.text(width - 20, y - 30, `👥 船员 (${state.crew.length}/${stationManager.getTotalCapacity()})`, {
      fontSize: '14px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#00D4FF',
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    this.crewContainer.add(titleText);

    state.crew.forEach((member: CrewMember, index: number) => {
      const x = startX - (index + 1) * (cardWidth + spacing);
      this.createCrewCard(member, x, y, cardWidth, cardHeight);
    });

    if (state.crew.length === 0) {
      const hintText = this.add.text(width - 20, y + 50, '点击居住舱招募船员', {
        fontSize: '12px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: '#8888aa'
      }).setOrigin(1, 0);
      this.crewContainer.add(hintText);
    }
  }

  private createCrewCard(member: CrewMember, x: number, y: number, width: number, height: number): void {
    const container = this.add.container(x, y);

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x2a2a4a, 0.9);
    cardBg.lineStyle(1, 0x00D4FF, 0.5);
    cardBg.strokeRoundedRect(0, 0, width, height, 8);
    cardBg.fillRoundedRect(0, 0, width, height, 8);

    const avatarColor = Phaser.Display.Color.HexStringToColor(member.avatar_color).color;
    const avatarBg = this.add.graphics();
    avatarBg.fillStyle(avatarColor, 1);
    avatarBg.lineStyle(2, 0xffffff, 0.2);
    avatarBg.fillCircle(width / 2, 28, 20);
    avatarBg.strokeCircle(width / 2, 28, 20);

    const avatarText = this.add.text(width / 2, 28, member.name[0], {
      fontSize: '18px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const nameText = this.add.text(width / 2, 58, member.name, {
      fontSize: '12px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#ffffff'
    }).setOrigin(0.5);

    const professionText = this.add.text(width / 2, 75, member.profession, {
      fontSize: '10px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#00FF9D'
    }).setOrigin(0.5);

    const moraleBarBg = this.add.graphics();
    moraleBarBg.fillStyle(0x1a1a2e, 1);
    moraleBarBg.fillRect(10, 90, width - 20, 6);

    const moraleColor = member.morale > 60 ? 0x00FF9D : member.morale > 30 ? 0xFFD700 : 0xEF4444;
    const moraleBar = this.add.graphics();
    moraleBar.fillStyle(moraleColor, 1);
    moraleBar.fillRect(10, 90, ((width - 20) * member.morale) / 100, 6);

    const moraleText = this.add.text(width / 2, 102, `士气 ${member.morale}`, {
      fontSize: '9px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#8888aa'
    }).setOrigin(0.5);

    container.add([cardBg, avatarBg, avatarText, nameText, professionText, moraleBarBg, moraleBar, moraleText]);

    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });

    let isHovered = false;
    container.on('pointerover', () => {
      if (!isHovered) {
        isHovered = true;
        this.tweens.add({
          targets: container,
          y: y - 5,
          duration: 200,
          ease: 'Power2.easeOut'
        });
        cardBg.clear();
        cardBg.fillStyle(0x3a3a6a, 0.95);
        cardBg.lineStyle(2, 0x00D4FF, 0.8);
        cardBg.strokeRoundedRect(0, 0, width, height, 8);
        cardBg.fillRoundedRect(0, 0, width, height, 8);
      }
    });

    container.on('pointerout', () => {
      if (isHovered) {
        isHovered = false;
        this.tweens.add({
          targets: container,
          y: y,
          duration: 200,
          ease: 'Power2.easeOut'
        });
        cardBg.clear();
        cardBg.fillStyle(0x2a2a4a, 0.9);
        cardBg.lineStyle(1, 0x00D4FF, 0.5);
        cardBg.strokeRoundedRect(0, 0, width, height, 8);
        cardBg.fillRoundedRect(0, 0, width, height, 8);
      }
    });

    container.on('pointerdown', () => {
      this.showCrewDetailPanel(member, x + width / 2, y);
    });

    this.crewContainer.add(container);
  }

  private showCrewDetailPanel(member: CrewMember, anchorX: number, anchorY: number): void {
    this.hideCrewDetailPanel();

    const panelWidth = 250;
    const panelHeight = 200;
    const panelX = Math.max(20, Math.min(anchorX - panelWidth / 2, this.cameras.main.width - panelWidth - 20));
    const panelY = anchorY - panelHeight - 10;

    this.crewDetailPanel = this.add.container(0, 0);
    this.crewDetailPanel.setDepth(40);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.95);
    panelBg.lineStyle(2, 0x00D4FF, 0.8);
    panelBg.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 10);
    panelBg.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 10);

    const avatarColor = Phaser.Display.Color.HexStringToColor(member.avatar_color).color;
    const avatarBg = this.add.graphics();
    avatarBg.fillStyle(avatarColor, 1);
    avatarBg.fillCircle(panelX + 35, panelY + 40, 25);

    const avatarText = this.add.text(panelX + 35, panelY + 40, member.name[0], {
      fontSize: '22px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const nameText = this.add.text(panelX + 70, panelY + 25, member.name, {
      fontSize: '18px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0);

    const professionText = this.add.text(panelX + 70, panelY + 50, member.profession, {
      fontSize: '14px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#00FF9D'
    }).setOrigin(0, 0);

    const moraleLabel = this.add.text(panelX + 70, panelY + 75, `士气: ${member.morale}/100`, {
      fontSize: '12px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#FFD700'
    }).setOrigin(0, 0);

    const skillsTitle = this.add.text(panelX + 20, panelY + 100, '技能:', {
      fontSize: '13px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#00D4FF',
      fontStyle: 'bold'
    }).setOrigin(0, 0);

    let skillY = panelY + 125;
    Object.entries(member.skills).forEach(([skill, level]) => {
      const skillName = this.add.text(panelX + 20, skillY, skill, {
        fontSize: '11px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: '#ccccdd'
      }).setOrigin(0, 0.5);

      const skillBarBg = this.add.graphics();
      skillBarBg.fillStyle(0x2a2a4a, 1);
      skillBarBg.fillRect(panelX + 75, skillY - 4, 130, 8);

      const skillBar = this.add.graphics();
      const skillColor = level >= 4 ? 0x00FF9D : level >= 2 ? 0xFFD700 : 0xEF4444;
      skillBar.fillStyle(skillColor, 1);
      skillBar.fillRect(panelX + 75, skillY - 4, (level / 5) * 130, 8);

      const skillLevel = this.add.text(panelX + 210, skillY, `${level}`, {
        fontSize: '11px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: '#FFD700'
      }).setOrigin(0, 0.5);

      skillY += 22;
    });

    this.crewDetailPanel.add([
      panelBg, avatarBg, avatarText, nameText, professionText,
      moraleLabel, skillsTitle
    ]);
  }

  private hideCrewDetailPanel(): void {
    if (this.crewDetailPanel) {
      this.crewDetailPanel.destroy();
      this.crewDetailPanel = null;
    }
  }

  private updateUI(): void {
    const state = stationManager.getState();
    if (!state) return;

    this.dayText.setText(`第 ${state.day} 天`);
    this.scoreText.setText(`分数: ${stationManager.calculateScore()}`);

    this.resourceKeys.forEach((key) => {
      const barInfo = this.resourceBars[key];
      if (!barInfo) return;

      const current = (state.resources as any)[key] || 0;
      const max = (state.max_resources as any)[key] || 100;
      const percentage = Math.min(100, (current / max) * 100);

      barInfo.text.setText(Math.floor(current).toString());

      barInfo.bar.clear();
      barInfo.bar.fillStyle(0x2a2a4a, 1);
      barInfo.bar.fillRect(barInfo.barX, barInfo.barY, barInfo.barWidth, 8);

      let barColor = 0x00FF9D;
      if (percentage < 30) barColor = 0xEF4444;
      else if (percentage < 60) barColor = 0xFFD700;

      barInfo.bar.fillStyle(barColor, 1);
      barInfo.bar.fillRect(
        barInfo.barX,
        barInfo.barY,
        barInfo.barWidth * (percentage / 100),
        8
      );

      if (percentage < 20) {
        const pulse = Math.sin(this.time.now / 150) * 0.5 + 0.5;
        barInfo.text.setColor(pulse > 0.5 ? '#EF4444' : '#FF6B6B');
        barInfo.text.setFontSize(pulse > 0.5 ? '18px' : '16px');

        barInfo.pulseGlow.clear();
        barInfo.pulseGlow.fillStyle(0xEF4444, pulse * 0.3);
        barInfo.pulseGlow.fillRoundedRect(
          barInfo.barX - 3,
          barInfo.barY - 3,
          barInfo.barWidth + 6,
          14,
          4
        );
      } else {
        barInfo.text.setColor('#ffffff');
        barInfo.text.setFontSize('16px');
        barInfo.pulseGlow.clear();
      }
    });
  }

  override update(time: number, delta: number): void {
    if (this.isPaused) return;

    this.tickTimer -= delta;

    if (this.tickTimer <= 0) {
      this.tickTimer = this.tickInterval;
      this.doTick();
    }

    this.updateUI();
  }

  private async doTick(): Promise<void> {
    const result = await stationManager.tick();
    if (!result) return;

    this.showResourceChanges(result.resourceChanges);
    this.updateUI();
    this.renderModules();

    if (result.event) {
      this.isPaused = true;
      this.scene.launch('EventScene', {
        event: result.event,
        onClose: () => {
          this.isPaused = false;
          this.updateUI();
          this.renderModules();
          this.updateCrewDisplay();
        }
      });
    }

    if (result.gameOver) {
      this.showGameOver();
    }
  }

  private showResourceChanges(changes: Record<string, number>): void {
    const state = stationManager.getState();
    if (!state) return;

    state.modules.forEach((module: Module) => {
      const info = stationManager.getModuleInfo(module.type);
      if (!info) return;

      const [w, h] = info.size;
      const x = this.gridOffsetX + module.x * CELL_SIZE + (w * CELL_SIZE) / 2;
      const y = this.gridOffsetY + module.y * CELL_SIZE;

      const production = info.production;
      const consumption = info.consumption;

      let totalProduction = 0;
      let totalConsumption = 0;

      Object.values(production).forEach(v => totalProduction += v);
      Object.values(consumption).forEach(v => totalConsumption += v);

      if (totalProduction > 0) {
        this.createFloatingText(x, y - 20, `+${totalProduction.toFixed(1)}`, true);
      }
      if (totalConsumption > 0) {
        this.createFloatingText(x, y - 5, `-${totalConsumption.toFixed(1)}`, false);
      }
    });
  }

  private createFloatingText(x: number, y: number, text: string, isPositive: boolean): void {
    const color = isPositive ? '#00FF9D' : '#EF4444';
    const floatingText = this.add.text(x, y, text, {
      fontSize: '14px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: color,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    floatingText.setDepth(25);

    this.tweens.add({
      targets: floatingText,
      y: y - 40,
      alpha: 0,
      duration: 1200,
      ease: 'Power2.easeOut',
      onComplete: () => {
        floatingText.destroy();
      }
    });
  }

  private showGameOver(): void {
    this.isPaused = true;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.gameOverContainer = this.add.container(0, 0);
    this.gameOverContainer.setDepth(100);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);

    const panelWidth = 500;
    const panelHeight = 480;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.95);
    panelBg.lineStyle(3, 0xEF4444, 0.8);
    panelBg.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 16);
    panelBg.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 16);

    const titleText = this.add.text(width / 2, panelY + 40, '💀 游戏结束', {
      fontSize: '36px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#EF4444',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const state = stationManager.getState();
    const score = stationManager.calculateScore();

    const scoreLabelText = this.add.text(width / 2, panelY + 95, '🏆 最终分数', {
      fontSize: '18px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#8888aa'
    }).setOrigin(0.5);

    const scoreValueText = this.add.text(width / 2, panelY + 130, score.toLocaleString(), {
      fontSize: '42px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#FFD700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const daysText = this.add.text(width / 2, panelY + 175, `存活天数: ${state?.day || 0} 天`, {
      fontSize: '16px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#00D4FF'
    }).setOrigin(0.5);

    const divider = this.add.graphics();
    divider.lineStyle(1, 0x333366, 1);
    divider.lineBetween(panelX + 50, panelY + 200, panelX + panelWidth - 50, panelY + 200);

    const inputLabel = this.add.text(width / 2, panelY + 225, '✍️ 输入你的昵称上传排行榜', {
      fontSize: '16px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#ccccdd'
    }).setOrigin(0.5);

    const inputBg = this.add.graphics();
    inputBg.fillStyle(0x2a2a4a, 1);
    inputBg.lineStyle(2, 0x00D4FF, 0.5);
    inputBg.strokeRoundedRect(width / 2 - 150, panelY + 250, 300, 45, 8);
    inputBg.fillRoundedRect(width / 2 - 150, panelY + 250, 300, 45, 8);

    let playerName = '指挥官';
    const nameText = this.add.text(width / 2, panelY + 273, playerName, {
      fontSize: '20px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const inputHitArea = this.add.zone(width / 2 - 150, panelY + 250, 300, 45).setOrigin(0, 0);
    inputHitArea.setInteractive({ useHandCursor: true });
    inputHitArea.on('pointerdown', () => {
      const input = prompt('请输入你的昵称:', playerName);
      if (input && input.trim()) {
        playerName = input.trim().substring(0, 12);
        nameText.setText(playerName);
      }
    });

    const submitBtn = this.add.graphics();
    submitBtn.fillStyle(0x00D4FF, 0.8);
    submitBtn.strokeRoundedRect(width / 2 - 120, panelY + 320, 240, 50, 10);
    submitBtn.fillRoundedRect(width / 2 - 120, panelY + 320, 240, 50, 10);

    const submitBtnText = this.add.text(width / 2, panelY + 345, '📤 提交分数', {
      fontSize: '20px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#0a0a2a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const submitHitArea = this.add.zone(width / 2 - 120, panelY + 320, 240, 50).setOrigin(0, 0);
    submitHitArea.setInteractive({ useHandCursor: true });
    submitHitArea.on('pointerover', () => {
      submitBtn.clear();
      submitBtn.fillStyle(0x00FF9D, 0.9);
      submitBtn.fillRoundedRect(width / 2 - 120, panelY + 320, 240, 50, 10);
    });
    submitHitArea.on('pointerout', () => {
      submitBtn.clear();
      submitBtn.fillStyle(0x00D4FF, 0.8);
      submitBtn.fillRoundedRect(width / 2 - 120, panelY + 320, 240, 50, 10);
    });
    submitHitArea.on('pointerdown', async () => {
      await stationManager.submitScore(playerName, score, state?.day || 0);
      this.showLeaderboard();
    });

    const leaderboardBtn = this.add.graphics();
    leaderboardBtn.fillStyle(0x2a2a4a, 0.8);
    leaderboardBtn.lineStyle(1, 0x00FF9D, 0.8);
    leaderboardBtn.strokeRoundedRect(width / 2 - 120, panelY + 390, 240, 40, 8);
    leaderboardBtn.fillRoundedRect(width / 2 - 120, panelY + 390, 240, 40, 8);

    const leaderboardBtnText = this.add.text(width / 2, panelY + 410, '🏆 查看排行榜', {
      fontSize: '16px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#00FF9D'
    }).setOrigin(0.5);

    const leaderboardHitArea = this.add.zone(width / 2 - 120, panelY + 390, 240, 40).setOrigin(0, 0);
    leaderboardHitArea.setInteractive({ useHandCursor: true });
    leaderboardHitArea.on('pointerover', () => {
      leaderboardBtn.clear();
      leaderboardBtn.fillStyle(0x3a3a6a, 0.9);
      leaderboardBtn.fillRoundedRect(width / 2 - 120, panelY + 390, 240, 40, 8);
    });
    leaderboardHitArea.on('pointerout', () => {
      leaderboardBtn.clear();
      leaderboardBtn.fillStyle(0x2a2a4a, 0.8);
      leaderboardBtn.fillRoundedRect(width / 2 - 120, panelY + 390, 240, 40, 8);
    });
    leaderboardHitArea.on('pointerdown', () => {
      this.showLeaderboard();
    });

    this.gameOverContainer.add([
      overlay, panelBg, titleText, scoreLabelText, scoreValueText, daysText, divider,
      inputLabel, inputBg, nameText, inputHitArea,
      submitBtn, submitBtnText, submitHitArea,
      leaderboardBtn, leaderboardBtnText, leaderboardHitArea
    ]);
  }

  private async showLeaderboard(): Promise<void> {
    if (this.gameOverContainer) {
      this.gameOverContainer.destroy();
    }

    const leaderboard = await stationManager.getLeaderboard();

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.leaderboardContainer = this.add.container(0, 0);
    this.leaderboardContainer.setDepth(100);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    overlay.setInteractive({ useHandCursor: true });
    overlay.on('pointerdown', () => {
      this.hideLeaderboard();
      this.restartGame();
    });

    const panelWidth = 500;
    const panelHeight = 550;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.95);
    panelBg.lineStyle(2, 0xFFD700, 0.6);
    panelBg.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 16);
    panelBg.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 16);

    const titleText = this.add.text(width / 2, panelY + 30, '🏆 排行榜 TOP 20', {
      fontSize: '28px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#FFD700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x2a2a4a, 0.8);
    headerBg.fillRect(panelX + 20, panelY + 70, panelWidth - 40, 35);

    const rankHeader = this.add.text(panelX + 40, panelY + 87, '排名', {
      fontSize: '14px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#00D4FF',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    const nameHeader = this.add.text(panelX + 100, panelY + 87, '昵称', {
      fontSize: '14px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#00D4FF',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    const scoreHeader = this.add.text(panelX + 280, panelY + 87, '分数', {
      fontSize: '14px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#00D4FF',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    const daysHeader = this.add.text(panelX + 380, panelY + 87, '天数', {
      fontSize: '14px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#00D4FF',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    const rowHeight = 32;
    const startY = panelY + 115;

    leaderboard.slice(0, 12).forEach((entry: any, index: number) => {
      const y = startY + index * rowHeight;
      const isEven = index % 2 === 0;

      const rowBg = this.add.graphics();
      rowBg.fillStyle(isEven ? 0x1a1a2e : 0x2a2a4a, 0.5);
      rowBg.fillRect(panelX + 20, y, panelWidth - 40, rowHeight);

      let rankColor = '#ffffff';
      let rankIcon = `${index + 1}`;
      if (index === 0) { rankColor = '#FFD700'; rankIcon = '🥇'; }
      else if (index === 1) { rankColor = '#C0C0C0'; rankIcon = '🥈'; }
      else if (index === 2) { rankColor = '#CD7F32'; rankIcon = '🥉'; }

      const rankText = this.add.text(panelX + 40, y + rowHeight / 2, rankIcon, {
        fontSize: '16px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: rankColor,
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      const nameText = this.add.text(panelX + 100, y + rowHeight / 2, entry.name, {
        fontSize: '14px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: '#ffffff'
      }).setOrigin(0, 0.5);

      const scoreText = this.add.text(panelX + 280, y + rowHeight / 2, entry.score.toLocaleString(), {
        fontSize: '14px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: '#00FF9D',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      const daysText = this.add.text(panelX + 380, y + rowHeight / 2, `${entry.days}天`, {
        fontSize: '13px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: '#8888aa'
      }).setOrigin(0, 0.5);

      this.leaderboardContainer.add([rowBg, rankText, nameText, scoreText, daysText]);
    });

    if (leaderboard.length === 0) {
      const emptyText = this.add.text(width / 2, startY + 50, '暂无记录，成为第一名吧！', {
        fontSize: '16px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: '#8888aa'
      }).setOrigin(0.5);
      this.leaderboardContainer.add(emptyText);
    }

    const closeBtn = this.add.graphics();
    closeBtn.fillStyle(0x00D4FF, 0.8);
    closeBtn.strokeRoundedRect(width / 2 - 80, panelY + panelHeight - 60, 160, 40, 8);
    closeBtn.fillRoundedRect(width / 2 - 80, panelY + panelHeight - 60, 160, 40, 8);

    const closeBtnText = this.add.text(width / 2, panelY + panelHeight - 40, '重新开始', {
      fontSize: '16px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#0a0a2a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const closeHitArea = this.add.zone(width / 2 - 80, panelY + panelHeight - 60, 160, 40).setOrigin(0, 0);
    closeHitArea.setInteractive({ useHandCursor: true });
    closeHitArea.on('pointerover', () => {
      closeBtn.clear();
      closeBtn.fillStyle(0x00FF9D, 0.9);
      closeBtn.fillRoundedRect(width / 2 - 80, panelY + panelHeight - 60, 160, 40, 8);
    });
    closeHitArea.on('pointerout', () => {
      closeBtn.clear();
      closeBtn.fillStyle(0x00D4FF, 0.8);
      closeBtn.fillRoundedRect(width / 2 - 80, panelY + panelHeight - 60, 160, 40, 8);
    });
    closeHitArea.on('pointerdown', () => {
      this.hideLeaderboard();
      this.restartGame();
    });

    this.leaderboardContainer.add([
      overlay, panelBg, titleText, headerBg,
      rankHeader, nameHeader, scoreHeader, daysHeader,
      closeBtn, closeBtnText, closeHitArea
    ]);
  }

  private hideLeaderboard(): void {
    if (this.leaderboardContainer) {
      this.leaderboardContainer.destroy();
      this.leaderboardContainer = null as any;
    }
  }

  private restartGame(): void {
    this.scene.restart();
  }
}
