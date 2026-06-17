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
  private dragModulePreview!: Phaser.GameObjects.Graphics | null;

  private tickTimer = 0;
  private tickInterval = 5000;
  private isPaused = false;
  private dayText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;

  private floatingTexts: Phaser.GameObjects.Text[] = [];

  private resourceBars: Record<string, { bar: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text; icon: string }> = {};

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

  private createModuleContainer(): void {
    this.moduleContainer = this.add.container(0, 0);
  }

  private createResourceBar(): void {
    const width = this.cameras.main.width;
    this.resourceBarContainer = this.add.container(0, 0);

    const barHeight = 60;
    const barY = 15;

    const barBg = this.add.graphics();
    barBg.fillStyle(0x1a1a2e, 0.8);
    barBg.fillRect(20, barY, width - 40, barHeight);
    barBg.lineStyle(1, 0x00D4FF, 0.5);
    barBg.strokeRect(20, barY, width - 40, barHeight);

    this.resourceBarContainer.add(barBg);

    const resources = [
      { key: 'oxygen', name: '氧气', icon: '💨', color: 0x00D4FF },
      { key: 'water', name: '水', icon: '💧', color: 0x00CED1 },
      { key: 'food', name: '食物', icon: '🍎', color: 0x32CD32 },
      { key: 'power', name: '电力', icon: '⚡', color: 0xFFD700 },
      { key: 'tech_points', name: '科技', icon: '🔬', color: 0xA855F7 },
      { key: 'reputation', name: '信誉', icon: '⭐', color: 0xFFD700 },
      { key: 'materials', name: '材料', icon: '🔧', color: 0xCD853F }
    ];

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

      const barContainer = this.add.graphics();
      barContainer.fillStyle(0x2a2a4a, 1);
      barContainer.fillRect(x + 10, y + 5, barWidth - 30, 8);

      this.resourceBars[res.key] = {
        bar: barContainer,
        text: valueText,
        icon: res.icon
      };

      this.resourceBarContainer.add([iconText, valueText, barContainer]);
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
    panelBg.strokeRect(panelX, panelY, panelWidth, 400);
    panelBg.fillRect(panelX, panelY, panelWidth, 400);

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

    this.buildPanelContainer.add([itemBg, iconBg, iconText, nameText, costText, hitArea]);
  }

  private getModuleIcon(type: string): string {
    const icons: Record<string, string> = {
      life_support: '💨',
      power_core: '⚡',
      lab: '🔬',
      habitat: '🏠',
      greenhouse: '🌱',
      medical: '💊',
      solar_panel: '☀️',
      water_recycler: '💧'
    };
    return icons[type] || '📦';
  }

  private getModuleColor(type: string): string {
    const colors: Record<string, string> = {
      life_support: '#00FF9D',
      power_core: '#FFD700',
      lab: '#A855F7',
      habitat: '#00BFFF',
      greenhouse: '#32CD32',
      medical: '#FF69B4',
      solar_panel: '#FFA500',
      water_recycler: '#00CED1',
      core: '#00D4FF'
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
  }

  private createDragPreview(): void {
    if (!this.selectedModuleType) return;

    const info = stationManager.getModuleInfo(this.selectedModuleType);
    if (!info) return;

    const [w, h] = info.size;
    const width = w * CELL_SIZE - 4;
    const height = h * CELL_SIZE - 4;

    this.dragModulePreview = this.add.graphics();
    this.dragModulePreview.setAlpha(0.7);

    const colorStr = this.getModuleColor(this.selectedModuleType);
    const color = Phaser.Display.Color.HexStringToColor(colorStr).color;

    this.dragModulePreview.fillStyle(color, 0.5);
    this.dragModulePreview.lineStyle(2, color, 1);
    this.dragModulePreview.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
    this.dragModulePreview.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
  }

  private updateDragPreview(): void {
    if (!this.dragModulePreview || !this.selectedModuleType) return;

    const gridX = Math.floor((this.dragX - this.gridOffsetX) / CELL_SIZE);
    const gridY = Math.floor((this.dragY - this.gridOffsetY) / CELL_SIZE);

    const canPlace = stationManager.canPlaceModule(this.selectedModuleType, gridX, gridY);
    const color = canPlace ? 0x00FF00 : 0xFF0000;

    const info = stationManager.getModuleInfo(this.selectedModuleType);
    if (!info) return;

    const [w, h] = info.size;
    const width = w * CELL_SIZE - 4;
    const height = h * CELL_SIZE - 4;

    const centerX = this.gridOffsetX + gridX * CELL_SIZE + (w * CELL_SIZE) / 2;
    const centerY = this.gridOffsetY + gridY * CELL_SIZE + (h * CELL_SIZE) / 2;

    this.dragModulePreview.setPosition(centerX, centerY);

    this.dragModulePreview.clear();
    const colorStr = this.getModuleColor(this.selectedModuleType);
    const baseColor = Phaser.Display.Color.HexStringToColor(colorStr).color;

    this.dragModulePreview.fillStyle(baseColor, 0.3);
    this.dragModulePreview.lineStyle(3, color, 0.8);
    this.dragModulePreview.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
    this.dragModulePreview.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
  }

  private async tryPlaceModule(pointerX: number, pointerY: number): Promise<void> {
    if (!this.selectedModuleType) return;

    const gridX = Math.floor((pointerX - this.gridOffsetX) / CELL_SIZE);
    const gridY = Math.floor((pointerY - this.gridOffsetY) / CELL_SIZE);

    if (stationManager.canPlaceModule(this.selectedModuleType, gridX, gridY)) {
      const success = await stationManager.buildModule(this.selectedModuleType, gridX, gridY);
      if (success) {
        this.renderModules();
      }
    }

    this.cancelBuilding();
  }

  private cancelBuilding(): void {
    this.selectedModuleType = null;
    this.isDragging = false;

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

    if (module.type === 'habitat') {
      container.setSize(moduleWidth, moduleHeight);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => {
        this.showRecruitPanel();
      });
    }
  }

  private showRecruitPanel(): void {
    if (this.recruitPanelContainer) {
      this.recruitPanelContainer.destroy();
    }

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.recruitPanelContainer = this.add.container(0, 0);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.5);
    overlay.fillRect(0, 0, width, height);
    overlay.setInteractive({ useHandCursor: true });
    overlay.on('pointerdown', () => {
      this.hideRecruitPanel();
    });

    const panelWidth = 400;
    const panelHeight = 350;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.95);
    panelBg.lineStyle(2, 0x00D4FF, 0.8);
    panelBg.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 12);
    panelBg.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 12);

    const titleText = this.add.text(width / 2, panelY + 30, '招募船员', {
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
    avatarBg.fillCircle(width / 2 - 80, panelY + 130, 40);

    const avatarInitial = this.add.text(width / 2 - 80, panelY + 130, previewMember.name[0], {
      fontSize: '24px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const memberName = this.add.text(width / 2 - 30, panelY + 110, previewMember.name, {
      fontSize: '20px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0);

    const memberProfession = this.add.text(width / 2 - 30, panelY + 140, previewMember.profession, {
      fontSize: '14px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#00FF9D'
    }).setOrigin(0, 0);

    const memberMorale = this.add.text(width / 2 - 30, panelY + 165, `士气: ${previewMember.morale}`, {
      fontSize: '13px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#FFD700'
    }).setOrigin(0, 0);

    const skillsTitle = this.add.text(width / 2, panelY + 200, '技能', {
      fontSize: '14px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#8888aa'
    }).setOrigin(0.5);

    let skillY = panelY + 225;
    Object.entries(previewMember.skills).forEach(([skill, level]) => {
      const skillName = this.add.text(width / 2 - 100, skillY, skill, {
        fontSize: '12px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: '#ccccdd'
      }).setOrigin(0, 0.5);

      const skillBarBg = this.add.graphics();
      skillBarBg.fillStyle(0x2a2a4a, 1);
      skillBarBg.fillRect(width / 2 - 30, skillY - 5, 100, 10);

      const skillBar = this.add.graphics();
      skillBar.fillStyle(0x00D4FF, 1);
      skillBar.fillRect(width / 2 - 30, skillY - 5, (level / 5) * 100, 10);

      const skillLevel = this.add.text(width / 2 + 75, skillY, `${level}/5`, {
        fontSize: '12px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: '#FFD700'
      }).setOrigin(0, 0.5);

      skillY += 20;
    });

    const recruitBtn = this.add.graphics();
    recruitBtn.fillStyle(0x00D4FF, 0.8);
    recruitBtn.strokeRoundedRect(width / 2 - 80, panelY + 300, 160, 40, 8);
    recruitBtn.fillRoundedRect(width / 2 - 80, panelY + 300, 160, 40, 8);

    const recruitBtnText = this.add.text(width / 2, panelY + 320, '确认招募', {
      fontSize: '16px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#0a0a2a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const canRecruit = this.canRecruit();
    if (!canRecruit) {
      recruitBtn.clear();
      recruitBtn.fillStyle(0x666666, 0.5);
      recruitBtn.fillRoundedRect(width / 2 - 80, panelY + 300, 160, 40, 8);
      recruitBtnText.setColor('#999999');
    }

    const btnHitArea = this.add.zone(width / 2 - 80, panelY + 300, 160, 40).setOrigin(0, 0);
    if (canRecruit) {
      btnHitArea.setInteractive({ useHandCursor: true });
      btnHitArea.on('pointerover', () => {
        recruitBtn.clear();
        recruitBtn.fillStyle(0x00FF9D, 0.9);
        recruitBtn.fillRoundedRect(width / 2 - 80, panelY + 300, 160, 40, 8);
      });
      btnHitArea.on('pointerout', () => {
        recruitBtn.clear();
        recruitBtn.fillStyle(0x00D4FF, 0.8);
        recruitBtn.fillRoundedRect(width / 2 - 80, panelY + 300, 160, 40, 8);
      });
      btnHitArea.on('pointerdown', async () => {
        const result = await stationManager.recruitCrew();
        if (result) {
          this.hideRecruitPanel();
          this.updateCrewDisplay();
        }
      });
    }

    this.recruitPanelContainer.add([
      overlay, panelBg, titleText, costText,
      avatarBg, avatarInitial, memberName, memberProfession, memberMorale,
      skillsTitle, recruitBtn, recruitBtnText, btnHitArea
    ]);
  }

  private generatePreviewCrew(): any {
    const names = ['张伟', '李娜', '王强', '刘洋', '陈明', '杨静', '赵磊', '周芳', '吴涛', '郑霞'];
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

    const state = stationManager.getState();
    if (!state) return;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const startX = width - 20;
    const y = height - 120;
    const cardWidth = 100;
    const cardHeight = 110;
    const spacing = 10;

    const titleText = this.add.text(width - 20, y - 30, `船员 (${state.crew.length}/${stationManager.getTotalCapacity()})`, {
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
    avatarBg.fillCircle(width / 2, 28, 20);

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

    const moraleText = this.add.text(width / 2, 92, `士气: ${member.morale}`, {
      fontSize: '10px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: member.morale > 60 ? '#00FF9D' : member.morale > 30 ? '#FFD700' : '#EF4444'
    }).setOrigin(0.5);

    container.add([cardBg, avatarBg, avatarText, nameText, professionText, moraleText]);

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

    this.crewContainer.add(container);
  }

  private updateUI(): void {
    const state = stationManager.getState();
    if (!state) return;

    this.dayText.setText(`第 ${state.day} 天`);
    this.scoreText.setText(`分数: ${stationManager.calculateScore()}`);

    Object.entries(this.resourceBars).forEach(([key, barInfo]) => {
      const current = (state.resources as any)[key] || 0;
      const max = (state.max_resources as any)[key] || 100;
      const percentage = Math.min(100, (current / max) * 100);

      barInfo.text.setText(Math.floor(current).toString());

      barInfo.bar.clear();
      barInfo.bar.fillStyle(0x2a2a4a, 1);
      barInfo.bar.fillRect(
        30 + Object.keys(this.resourceBars).indexOf(key) * ((this.cameras.main.width - 60) / 7) + 40,
        45,
        ((this.cameras.main.width - 60) / 7) - 50,
        8
      );

      let barColor = 0x00FF9D;
      if (percentage < 30) barColor = 0xEF4444;
      else if (percentage < 60) barColor = 0xFFD700;

      barInfo.bar.fillStyle(barColor, 1);
      barInfo.bar.fillRect(
        30 + Object.keys(this.resourceBars).indexOf(key) * ((this.cameras.main.width - 60) / 7) + 40,
        45,
        (((this.cameras.main.width - 60) / 7) - 50) * (percentage / 100),
        8
      );

      if (percentage < 20) {
        const pulse = Math.sin(this.time.now / 200) * 0.5 + 0.5;
        barInfo.text.setColor(pulse > 0.5 ? '#EF4444' : '#FF6B6B');
      } else {
        barInfo.text.setColor('#ffffff');
      }
    });

    this.updateCrewDisplay();
  }

  override update(time: number, delta: number): void {
    if (this.isPaused) return;

    this.tickTimer -= delta;

    if (this.tickTimer <= 0) {
      this.tickTimer = this.tickInterval;
      this.doTick();
    }

    stationManager.updateFloatingNumbers();
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
      Object.values(production).forEach(v => totalProduction += v);

      if (totalProduction > 0) {
        this.createFloatingText(x, y, `+${totalProduction}`, true);
      }
    });
  }

  private createFloatingText(x: number, y: number, text: string, isPositive: boolean): void {
    const color = isPositive ? '#00FF9D' : '#EF4444';
    const floatingText = this.add.text(x, y, text, {
      fontSize: '16px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: color,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: floatingText,
      y: y - 50,
      alpha: 0,
      duration: 1500,
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

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, width, height);

    const panelWidth = 500;
    const panelHeight = 450;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.95);
    panelBg.lineStyle(2, 0xEF4444, 0.8);
    panelBg.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 16);
    panelBg.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 16);

    const titleText = this.add.text(width / 2, panelY + 40, '游戏结束', {
      fontSize: '36px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#EF4444',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const state = stationManager.getState();
    const score = stationManager.calculateScore();

    const scoreText = this.add.text(width / 2, panelY + 90, `最终分数: ${score}`, {
      fontSize: '28px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#FFD700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const daysText = this.add.text(width / 2, panelY + 130, `存活天数: ${state?.day || 0} 天`, {
      fontSize: '18px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#00D4FF'
    }).setOrigin(0.5);

    const inputLabel = this.add.text(width / 2, panelY + 180, '输入你的昵称:', {
      fontSize: '16px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#ccccdd'
    }).setOrigin(0.5);

    const inputBg = this.add.graphics();
    inputBg.fillStyle(0x2a2a4a, 1);
    inputBg.lineStyle(1, 0x00D4FF, 0.5);
    inputBg.strokeRoundedRect(width / 2 - 150, panelY + 200, 300, 40, 6);
    inputBg.fillRoundedRect(width / 2 - 150, panelY + 200, 300, 40, 6);

    let playerName = '指挥官';
    const nameText = this.add.text(width / 2, panelY + 220, playerName, {
      fontSize: '18px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#ffffff'
    }).setOrigin(0.5);

    const submitBtn = this.add.graphics();
    submitBtn.fillStyle(0x00D4FF, 0.8);
    submitBtn.strokeRoundedRect(width / 2 - 100, panelY + 260, 200, 45, 8);
    submitBtn.fillRoundedRect(width / 2 - 100, panelY + 260, 200, 45, 8);

    const submitBtnText = this.add.text(width / 2, panelY + 283, '提交分数', {
      fontSize: '18px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#0a0a2a',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const leaderboardBtn = this.add.graphics();
    leaderboardBtn.fillStyle(0x2a2a4a, 0.8);
    leaderboardBtn.lineStyle(1, 0x00FF9D, 0.8);
    leaderboardBtn.strokeRoundedRect(width / 2 - 100, panelY + 320, 200, 40, 8);
    leaderboardBtn.fillRoundedRect(width / 2 - 100, panelY + 320, 200, 40, 8);

    const leaderboardBtnText = this.add.text(width / 2, panelY + 340, '查看排行榜', {
      fontSize: '16px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#00FF9D'
    }).setOrigin(0.5);

    const submitHitArea = this.add.zone(width / 2 - 100, panelY + 260, 200, 45).setOrigin(0, 0);
    submitHitArea.setInteractive({ useHandCursor: true });
    submitHitArea.on('pointerover', () => {
      submitBtn.clear();
      submitBtn.fillStyle(0x00FF9D, 0.9);
      submitBtn.fillRoundedRect(width / 2 - 100, panelY + 260, 200, 45, 8);
    });
    submitHitArea.on('pointerout', () => {
      submitBtn.clear();
      submitBtn.fillStyle(0x00D4FF, 0.8);
      submitBtn.fillRoundedRect(width / 2 - 100, panelY + 260, 200, 45, 8);
    });
    submitHitArea.on('pointerdown', async () => {
      await stationManager.submitScore(playerName, score, state?.day || 0);
      this.showLeaderboard();
    });

    const leaderboardHitArea = this.add.zone(width / 2 - 100, panelY + 320, 200, 40).setOrigin(0, 0);
    leaderboardHitArea.setInteractive({ useHandCursor: true });
    leaderboardHitArea.on('pointerover', () => {
      leaderboardBtn.clear();
      leaderboardBtn.fillStyle(0x3a3a6a, 0.9);
      leaderboardBtn.fillRoundedRect(width / 2 - 100, panelY + 320, 200, 40, 8);
    });
    leaderboardHitArea.on('pointerout', () => {
      leaderboardBtn.clear();
      leaderboardBtn.fillStyle(0x2a2a4a, 0.8);
      leaderboardBtn.fillRoundedRect(width / 2 - 100, panelY + 320, 200, 40, 8);
    });
    leaderboardHitArea.on('pointerdown', () => {
      this.showLeaderboard();
    });

    const inputHitArea = this.add.zone(width / 2 - 150, panelY + 200, 300, 40).setOrigin(0, 0);
    inputHitArea.setInteractive({ useHandCursor: true });
    inputHitArea.on('pointerdown', () => {
      const input = prompt('请输入你的昵称:', playerName);
      if (input && input.trim()) {
        playerName = input.trim().substring(0, 12);
        nameText.setText(playerName);
      }
    });

    this.gameOverContainer.add([
      overlay, panelBg, titleText, scoreText, daysText,
      inputLabel, inputBg, nameText,
      submitBtn, submitBtnText, submitHitArea,
      leaderboardBtn, leaderboardBtnText, leaderboardHitArea,
      inputHitArea
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

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, width, height);
    overlay.setInteractive({ useHandCursor: true });
    overlay.on('pointerdown', () => {
      this.hideLeaderboard();
    });

    const panelWidth = 450;
    const panelHeight = 500;
    const panelX = width / 2 - panelWidth / 2;
    const panelY = height / 2 - panelHeight / 2;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.95);
    panelBg.lineStyle(2, 0x00D4FF, 0.8);
    panelBg.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 16);
    panelBg.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 16);

    const titleText = this.add.text(width / 2, panelY + 30, '🏆 排行榜', {
      fontSize: '28px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#FFD700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const headerText = this.add.text(panelX + 25, panelY + 70, '排名  昵称            分数    天数', {
      fontSize: '14px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#8888aa'
    }).setOrigin(0, 0);

    const rowHeight = 35;
    const startY = panelY + 100;

    leaderboard.forEach((entry: any, index: number) => {
      const y = startY + index * rowHeight;
      const isEven = index % 2 === 0;

      const rowBg = this.add.graphics();
      rowBg.fillStyle(isEven ? 0x1a1a2e : 0x2a2a4a, 0.5);
      rowBg.fillRect(panelX + 15, y - 5, panelWidth - 30, rowHeight - 5);

      let rankColor = '#ffffff';
      let rankIcon = `${index + 1}`;
      if (index === 0) { rankColor = '#FFD700'; rankIcon = '🥇'; }
      else if (index === 1) { rankColor = '#C0C0C0'; rankIcon = '🥈'; }
      else if (index === 2) { rankColor = '#CD7F32'; rankIcon = '🥉'; }

      const rankText = this.add.text(panelX + 30, y + 8, rankIcon, {
        fontSize: '16px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: rankColor,
        fontStyle: 'bold'
      }).setOrigin(0, 0);

      const nameText = this.add.text(panelX + 80, y + 8, entry.name, {
        fontSize: '14px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: '#ffffff'
      }).setOrigin(0, 0);

      const scoreText = this.add.text(panelX + 250, y + 8, entry.score.toString(), {
        fontSize: '14px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: '#00FF9D',
        fontStyle: 'bold'
      }).setOrigin(0, 0);

      const daysText = this.add.text(panelX + 350, y + 8, `${entry.days}天`, {
        fontSize: '14px',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: '#8888aa'
      }).setOrigin(0, 0);

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

    const closeBtnText = this.add.text(width / 2, panelY + panelHeight - 40, '关闭', {
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
      overlay, panelBg, titleText, headerText,
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
