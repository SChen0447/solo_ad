import Phaser from 'phaser';
import { Tower, TowerType, TOWER_CONFIGS } from '../entities/Tower';
import { Enemy, EnemyType, ENEMY_CONFIGS } from '../entities/Enemy';

const GRID_SIZE = 8;
const CELL_SIZE = 80;
const GRID_OFFSET_X = 560;
const GRID_OFFSET_Y = 200;

const INITIAL_GOLD = 200;
const INITIAL_LIVES = 10;

export class BattleScene extends Phaser.Scene {
  private gold: number = INITIAL_GOLD;
  private lives: number = INITIAL_LIVES;
  private wave: number = 0;
  private isWaveActive: boolean = false;
  private enemiesRemaining: number = 0;
  private gameOver: boolean = false;

  private towers: Tower[] = [];
  private enemies: Enemy[] = [];
  private grid: (Tower | null)[][] = [];

  private path!: Phaser.Curves.Path;
  private pathCells: Set<string> = new Set();

  private selectedTowerType: TowerType | null = null;
  private selectedTower: Tower | null = null;
  private hoveredCell: { x: number; y: number } | null = null;

  private graphics!: Phaser.GameObjects.Graphics;
  private hoverGraphics!: Phaser.GameObjects.Graphics;

  private goldText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private startWaveText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;

  private towerPanel!: Phaser.GameObjects.Container;
  private infoPanel!: Phaser.GameObjects.Container;

  private audioContext!: AudioContext | null;

  constructor() {
    super('BattleScene');
  }

  preload(): void {
    // 使用程序生成的图形，无需预加载资源
  }

  create(): void {
    this.initAudio();
    this.initGrid();
    this.createPath();
    this.createBackground();
    this.createUI();
    this.setupInput();
  }

  private initAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      this.audioContext = null;
    }
  }

  private playSound(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3): void {
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (e) {
      // 忽略音频错误
    }
  }

  private playPlaceSound(): void {
    this.playSound(800, 0.1, 'square', 0.2);
    this.time.delayedCall(50, () => this.playSound(1000, 0.1, 'square', 0.15));
  }

  private playUpgradeSound(): void {
    this.playSound(600, 0.1, 'sine', 0.3);
    this.time.delayedCall(100, () => this.playSound(800, 0.1, 'sine', 0.3));
    this.time.delayedCall(200, () => this.playSound(1000, 0.15, 'sine', 0.3));
  }

  private playSellSound(): void {
    this.playSound(400, 0.2, 'sawtooth', 0.2);
    this.time.delayedCall(100, () => this.playSound(300, 0.15, 'sawtooth', 0.15));
  }

  private initGrid(): void {
    this.grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      this.grid[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        this.grid[y][x] = null;
      }
    }
  }

  private createPath(): void {
    const startX = GRID_OFFSET_X - CELL_SIZE;
    const endX = GRID_OFFSET_X + GRID_SIZE * CELL_SIZE + CELL_SIZE;

    this.path = new Phaser.Curves.Path();

    const pathPoints = [
      { x: startX, y: GRID_OFFSET_Y + CELL_SIZE * 1.5 },
      { x: GRID_OFFSET_X + CELL_SIZE * 1, y: GRID_OFFSET_Y + CELL_SIZE * 1.5 },
      { x: GRID_OFFSET_X + CELL_SIZE * 1, y: GRID_OFFSET_Y + CELL_SIZE * 3.5 },
      { x: GRID_OFFSET_X + CELL_SIZE * 3, y: GRID_OFFSET_Y + CELL_SIZE * 3.5 },
      { x: GRID_OFFSET_X + CELL_SIZE * 3, y: GRID_OFFSET_Y + CELL_SIZE * 0.5 },
      { x: GRID_OFFSET_X + CELL_SIZE * 5, y: GRID_OFFSET_Y + CELL_SIZE * 0.5 },
      { x: GRID_OFFSET_X + CELL_SIZE * 5, y: GRID_OFFSET_Y + CELL_SIZE * 5.5 },
      { x: GRID_OFFSET_X + CELL_SIZE * 7, y: GRID_OFFSET_Y + CELL_SIZE * 5.5 },
      { x: GRID_OFFSET_X + CELL_SIZE * 7, y: GRID_OFFSET_Y + CELL_SIZE * 2.5 },
      { x: endX, y: GRID_OFFSET_Y + CELL_SIZE * 2.5 }
    ];

    this.path.moveTo(pathPoints[0].x, pathPoints[0].y);
    for (let i = 1; i < pathPoints.length; i++) {
      this.path.lineTo(pathPoints[i].x, pathPoints[i].y);
    }

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cellCenterX = GRID_OFFSET_X + x * CELL_SIZE + CELL_SIZE / 2;
        const cellCenterY = GRID_OFFSET_Y + y * CELL_SIZE + CELL_SIZE / 2;

        for (let i = 0; i < pathPoints.length - 1; i++) {
          const p1 = pathPoints[i];
          const p2 = pathPoints[i + 1];

          const minX = Math.min(p1.x, p2.x) - CELL_SIZE / 2;
          const maxX = Math.max(p1.x, p2.x) + CELL_SIZE / 2;
          const minY = Math.min(p1.y, p2.y) - CELL_SIZE / 2;
          const maxY = Math.max(p1.y, p2.y) + CELL_SIZE / 2;

          if (cellCenterX >= minX && cellCenterX <= maxX &&
              cellCenterY >= minY && cellCenterY <= maxY) {
            this.pathCells.add(`${x},${y}`);
            break;
          }
        }
      }
    }
  }

  private createBackground(): void {
    const bgGraphics = this.add.graphics();

    const gradient = bgGraphics.fillGradientStyle(
      0x1a1a2e, 0x1a1a2e,
      0x16213e, 0x16213e,
      1
    );
    bgGraphics.fillRect(0, 0, this.scale.width, this.scale.height);

    this.graphics = this.add.graphics();
    this.hoverGraphics = this.add.graphics();

    this.drawGrid();
    this.drawPath();
  }

  private drawGrid(): void {
    this.graphics.lineStyle(1, 0xffffff, 0.15);

    for (let x = 0; x <= GRID_SIZE; x++) {
      const lineX = GRID_OFFSET_X + x * CELL_SIZE;
      this.graphics.beginPath();
      this.graphics.moveTo(lineX, GRID_OFFSET_Y);
      this.graphics.lineTo(lineX, GRID_OFFSET_Y + GRID_SIZE * CELL_SIZE);
      this.graphics.strokePath();
    }

    for (let y = 0; y <= GRID_SIZE; y++) {
      const lineY = GRID_OFFSET_Y + y * CELL_SIZE;
      this.graphics.beginPath();
      this.graphics.moveTo(GRID_OFFSET_X, lineY);
      this.graphics.lineTo(GRID_OFFSET_X + GRID_SIZE * CELL_SIZE, lineY);
      this.graphics.strokePath();
    }
  }

  private drawPath(): void {
    this.graphics.lineStyle(CELL_SIZE * 0.6, 0x2d3748, 0.8);
    this.path.draw(this.graphics);

    this.graphics.lineStyle(4, 0x4a5568, 1);
    this.path.draw(this.graphics);
  }

  private createUI(): void {
    this.createTopBar();
    this.createTowerPanel();
    this.createInfoPanel();
    this.createStartWaveButton();
  }

  private createTopBar(): void {
    const barGraphics = this.add.graphics();
    barGraphics.fillStyle(0x0f172a, 0.9);
    barGraphics.fillRect(0, 0, this.scale.width, 80);
    barGraphics.lineStyle(2, 0x334155, 1);
    barGraphics.lineBetween(0, 80, this.scale.width, 80);

    const textStyle = {
      fontFamily: 'Courier New, monospace',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    };

    this.livesText = this.add.text(40, 40, `生命: ${this.lives}`, textStyle);
    this.livesText.setOrigin(0, 0.5);
    this.livesText.setShadow(2, 2, '#000000', 4);

    this.goldText = this.add.text(300, 40, `金币: ${this.gold}`, textStyle);
    this.goldText.setOrigin(0, 0.5);
    this.goldText.setShadow(2, 2, '#000000', 4);
    this.goldText.setColor('#ffd700');

    this.waveText = this.add.text(this.scale.width / 2, 40, `波数: ${this.wave}`, textStyle);
    this.waveText.setOrigin(0.5, 0.5);
    this.waveText.setShadow(2, 2, '#000000', 4);
  }

  private createTowerPanel(): void {
    this.towerPanel = this.add.container(0, this.scale.height - 120);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0f172a, 0.95);
    panelBg.fillRect(0, 0, this.scale.width, 120);
    panelBg.lineStyle(2, 0x334155, 1);
    panelBg.lineBetween(0, 0, this.scale.width, 0);
    this.towerPanel.add(panelBg);

    const towerTypes: TowerType[] = ['arrow', 'cannon', 'magic'];
    const towerNames = ['箭塔', '炮塔', '魔法塔'];
    const towerColors = [0x60a5fa, 0xf97316, 0xa855f7];

    const startX = this.scale.width / 2 - 200;

    towerTypes.forEach((type, index) => {
      const config = TOWER_CONFIGS[type];
      const x = startX + index * 200;

      const card = this.add.container(x, 60);

      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x1e293b, 1);
      cardBg.fillRoundedRect(-70, -45, 140, 90, 8);
      cardBg.lineStyle(3, 0x475569, 1);
      cardBg.strokeRoundedRect(-70, -45, 140, 90, 8);
      card.add(cardBg);

      const icon = this.add.rectangle(0, -15, 36, 36, towerColors[index]);
      icon.setStrokeStyle(2, 0xffffff);
      card.add(icon);

      const nameText = this.add.text(0, 20, towerNames[index], {
        fontFamily: 'Courier New, monospace',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold'
      });
      nameText.setOrigin(0.5);
      card.add(nameText);

      const costText = this.add.text(0, 40, `${config.cost}金币`, {
        fontFamily: 'Courier New, monospace',
        fontSize: '14px',
        color: '#ffd700'
      });
      costText.setOrigin(0.5);
      card.add(costText);

      card.setSize(140, 90);
      card.setInteractive({ useHandCursor: true });

      card.on('pointerover', () => {
        if (this.selectedTowerType !== type) {
          cardBg.lineStyle(3, 0x94a3b8, 1);
        }
      });

      card.on('pointerout', () => {
        if (this.selectedTowerType !== type) {
          cardBg.lineStyle(3, 0x475569, 1);
        }
      });

      card.on('pointerdown', () => {
        this.tweens.add({
          targets: card,
          y: 50,
          duration: 150,
          ease: 'Quad.easeOut',
          yoyo: true
        });

        this.selectTowerType(type);
      });

      (card as any).bg = cardBg;
      (card as any).type = type;

      this.towerPanel.add(card);
    });
  }

  private createInfoPanel(): void {
    this.infoPanel = this.add.container(this.scale.width - 300, 100);
    this.infoPanel.setVisible(false);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0f172a, 0.95);
    panelBg.fillRoundedRect(0, 0, 280, 280, 10);
    panelBg.lineStyle(2, 0x334155, 1);
    panelBg.strokeRoundedRect(0, 0, 280, 280, 10);
    this.infoPanel.add(panelBg);

    const titleText = this.add.text(140, 25, '塔信息', {
      fontFamily: 'Courier New, monospace',
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    titleText.setOrigin(0.5);
    this.infoPanel.add(titleText);

    const levelLabel = this.add.text(20, 60, '等级:', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#94a3b8'
    });
    this.infoPanel.add(levelLabel);

    const levelValue = this.add.text(100, 60, '1', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    this.infoPanel.add(levelValue);
    (this.infoPanel as any).levelValue = levelValue;

    const damageLabel = this.add.text(20, 95, '伤害:', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#94a3b8'
    });
    this.infoPanel.add(damageLabel);

    const damageValue = this.add.text(100, 95, '0', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#f97316',
      fontStyle: 'bold'
    });
    this.infoPanel.add(damageValue);
    (this.infoPanel as any).damageValue = damageValue;

    const rangeLabel = this.add.text(20, 130, '范围:', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#94a3b8'
    });
    this.infoPanel.add(rangeLabel);

    const rangeValue = this.add.text(100, 130, '0', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#60a5fa',
      fontStyle: 'bold'
    });
    this.infoPanel.add(rangeValue);
    (this.infoPanel as any).rangeValue = rangeValue;

    const fireRateLabel = this.add.text(20, 165, '攻速:', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#94a3b8'
    });
    this.infoPanel.add(fireRateLabel);

    const fireRateValue = this.add.text(100, 165, '0', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#a855f7',
      fontStyle: 'bold'
    });
    this.infoPanel.add(fireRateValue);
    (this.infoPanel as any).fireRateValue = fireRateValue;

    const upgradeBtn = this.add.graphics();
    upgradeBtn.fillStyle(0x22c55e, 1);
    upgradeBtn.fillRoundedRect(20, 200, 110, 50, 6);
    upgradeBtn.lineStyle(2, 0x16a34a, 1);
    upgradeBtn.strokeRoundedRect(20, 200, 110, 50, 6);
    this.infoPanel.add(upgradeBtn);

    const upgradeText = this.add.text(75, 225, '升级', {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    upgradeText.setOrigin(0.5);
    this.infoPanel.add(upgradeText);

    const upgradeCost = this.add.text(75, 242, '50金币', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#ffd700'
    });
    upgradeCost.setOrigin(0.5);
    this.infoPanel.add(upgradeCost);
    (this.infoPanel as any).upgradeCost = upgradeCost;

    const upgradeBtnArea = this.add.zone(20, 200, 110, 50);
    upgradeBtnArea.setOrigin(0);
    upgradeBtnArea.setInteractive({ useHandCursor: true });
    upgradeBtnArea.on('pointerdown', () => this.upgradeSelectedTower());
    this.infoPanel.add(upgradeBtnArea);
    (this.infoPanel as any).upgradeBtn = upgradeBtn;
    (this.infoPanel as any).upgradeBtnArea = upgradeBtnArea;

    const sellBtn = this.add.graphics();
    sellBtn.fillStyle(0xef4444, 1);
    sellBtn.fillRoundedRect(150, 200, 110, 50, 6);
    sellBtn.lineStyle(2, 0xdc2626, 1);
    sellBtn.strokeRoundedRect(150, 200, 110, 50, 6);
    this.infoPanel.add(sellBtn);

    const sellText = this.add.text(205, 225, '出售', {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    sellText.setOrigin(0.5);
    this.infoPanel.add(sellText);

    const sellValue = this.add.text(205, 242, '+0金币', {
      fontFamily: 'Courier New, monospace',
      fontSize: '12px',
      color: '#22c55e'
    });
    sellValue.setOrigin(0.5);
    this.infoPanel.add(sellValue);
    (this.infoPanel as any).sellValue = sellValue;

    const sellBtnArea = this.add.zone(150, 200, 110, 50);
    sellBtnArea.setOrigin(0);
    sellBtnArea.setInteractive({ useHandCursor: true });
    sellBtnArea.on('pointerdown', () => this.sellSelectedTower());
    this.infoPanel.add(sellBtnArea);

    const closeBtn = this.add.text(260, 10, '✕', {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#94a3b8'
    });
    closeBtn.setOrigin(1, 0);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.deselectTower());
    this.infoPanel.add(closeBtn);
  }

  private createStartWaveButton(): void {
    const btnX = this.scale.width / 2;
    const btnY = this.scale.height - 200;

    const btnGraphics = this.add.graphics();
    btnGraphics.fillStyle(0x3b82f6, 1);
    btnGraphics.fillRoundedRect(btnX - 100, btnY - 30, 200, 60, 10);
    btnGraphics.lineStyle(3, 0x2563eb, 1);
    btnGraphics.strokeRoundedRect(btnX - 100, btnY - 30, 200, 60, 10);

    this.startWaveText = this.add.text(btnX, btnY, '开始下一波', {
      fontFamily: 'Courier New, monospace',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    this.startWaveText.setOrigin(0.5);

    const btnArea = this.add.zone(btnX - 100, btnY - 30, 200, 60);
    btnArea.setOrigin(0);
    btnArea.setInteractive({ useHandCursor: true });
    btnArea.on('pointerdown', () => this.startWave());

    (this.startWaveText as any).btnGraphics = btnGraphics;
    (this.startWaveText as any).btnArea = btnArea;
  }

  private setupInput(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.updateHover(pointer);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleClick(pointer);
    });
  }

  private getGridPosition(worldX: number, worldY: number): { x: number; y: number } | null {
    const gridX = Math.floor((worldX - GRID_OFFSET_X) / CELL_SIZE);
    const gridY = Math.floor((worldY - GRID_OFFSET_Y) / CELL_SIZE);

    if (gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE) {
      return { x: gridX, y: gridY };
    }
    return null;
  }

  private getWorldPosition(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: GRID_OFFSET_X + gridX * CELL_SIZE + CELL_SIZE / 2,
      y: GRID_OFFSET_Y + gridY * CELL_SIZE + CELL_SIZE / 2
    };
  }

  private canPlaceTower(gridX: number, gridY: number): boolean {
    if (this.pathCells.has(`${gridX},${gridY}`)) return false;
    if (this.grid[gridY][gridX] !== null) return false;
    return true;
  }

  private updateHover(pointer: Phaser.Input.Pointer): void {
    const gridPos = this.getGridPosition(pointer.x, pointer.y);

    this.hoverGraphics.clear();

    if (!gridPos) {
      this.hoveredCell = null;
      return;
    }

    this.hoveredCell = gridPos;

    const worldPos = this.getWorldPosition(gridPos.x, gridPos.y);
    const canPlace = this.canPlaceTower(gridPos.x, gridPos.y);

    if (this.selectedTowerType !== null) {
      if (canPlace) {
        this.hoverGraphics.fillStyle(0x00ff88, 0.3);
        this.hoverGraphics.fillRect(
          GRID_OFFSET_X + gridPos.x * CELL_SIZE,
          GRID_OFFSET_Y + gridPos.y * CELL_SIZE,
          CELL_SIZE,
          CELL_SIZE
        );

        const config = TOWER_CONFIGS[this.selectedTowerType];
        this.hoverGraphics.lineStyle(2, 0x00ff88, 0.5);
        this.hoverGraphics.strokeCircle(worldPos.x, worldPos.y, config.levels[0].range);
      } else {
        this.hoverGraphics.fillStyle(0xff0000, 0.3);
        this.hoverGraphics.fillRect(
          GRID_OFFSET_X + gridPos.x * CELL_SIZE,
          GRID_OFFSET_Y + gridPos.y * CELL_SIZE,
          CELL_SIZE,
          CELL_SIZE
        );
      }
    }
  }

  private handleClick(pointer: Phaser.Input.Pointer): void {
    if (this.gameOver) return;

    const gridPos = this.getGridPosition(pointer.x, pointer.y);

    if (!gridPos) {
      this.deselectTower();
      return;
    }

    const existingTower = this.grid[gridPos.y][gridPos.x];

    if (existingTower) {
      this.selectTower(existingTower);
    } else if (this.selectedTowerType !== null && this.canPlaceTower(gridPos.x, gridPos.y)) {
      this.placeTower(gridPos.x, gridPos.y, this.selectedTowerType);
    } else {
      this.deselectTower();
    }
  }

  private selectTowerType(type: TowerType): void {
    if (this.selectedTowerType === type) {
      this.selectedTowerType = null;
    } else {
      this.selectedTowerType = type;
      this.deselectTower();
    }

    this.updateTowerPanelSelection();
  }

  private updateTowerPanelSelection(): void {
    const cards = this.towerPanel.list.filter((child) => (child as any).type !== undefined);

    cards.forEach((card) => {
      const bg = (card as any).bg;
      const type = (card as any).type;

      if (type === this.selectedTowerType) {
        bg.lineStyle(3, 0xffd700, 1);
      } else {
        bg.lineStyle(3, 0x475569, 1);
      }
    });
  }

  private placeTower(gridX: number, gridY: number, type: TowerType): void {
    const config = TOWER_CONFIGS[type];

    if (this.gold < config.cost) {
      this.showFloatingText(this.goldText.x, this.goldText.y, '金币不足!', 0xff0000);
      return;
    }

    const worldPos = this.getWorldPosition(gridX, gridY);
    const tower = new Tower(this, worldPos.x, worldPos.y - 100, type, gridX, gridY);

    this.towers.push(tower);
    this.grid[gridY][gridX] = tower;

    this.tweens.add({
      targets: tower,
      y: worldPos.y,
      duration: 300,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        tower.isPlaced = true;
      }
    });

    this.gold -= config.cost;
    this.updateGoldText();
    this.playPlaceSound();

    this.selectedTowerType = null;
    this.updateTowerPanelSelection();
    this.hoverGraphics.clear();
  }

  private selectTower(tower: Tower): void {
    if (this.selectedTower === tower) return;

    if (this.selectedTower) {
      this.selectedTower.showRange(false);
    }

    this.selectedTower = tower;
    tower.showRange(true);

    this.updateInfoPanel();
    this.infoPanel.setVisible(true);
  }

  private deselectTower(): void {
    if (this.selectedTower) {
      this.selectedTower.showRange(false);
      this.selectedTower = null;
    }

    this.infoPanel.setVisible(false);
  }

  private updateInfoPanel(): void {
    if (!this.selectedTower) return;

    const tower = this.selectedTower;
    const levelText = (this.infoPanel as any).levelValue;
    const damageText = (this.infoPanel as any).damageValue;
    const rangeText = (this.infoPanel as any).rangeValue;
    const fireRateText = (this.infoPanel as any).fireRateValue;
    const upgradeCostText = (this.infoPanel as any).upgradeCost;
    const sellValueText = (this.infoPanel as any).sellValue;
    const upgradeBtn = (this.infoPanel as any).upgradeBtn;
    const upgradeBtnArea = (this.infoPanel as any).upgradeBtnArea;

    levelText.setText(`${tower.getLevel() + 1}`);
    damageText.setText(`${Math.floor(tower.getDamage())}`);
    rangeText.setText(`${Math.floor(tower.getRange())}`);
    fireRateText.setText(`${(1 / tower.getFireRate()).toFixed(1)}/秒`);

    if (tower.canUpgrade()) {
      const upgradeCost = tower.getUpgradeCost();
      upgradeCostText.setText(`${upgradeCost}金币`);
      upgradeBtnArea.setInteractive();
      upgradeBtn.fillStyle(this.gold >= upgradeCost ? 0x22c55e : 0x6b7280, 1);
    } else {
      upgradeCostText.setText('已满级');
      upgradeBtnArea.disableInteractive();
      upgradeBtn.fillStyle(0x6b7280, 1);
    }

    const sellValue = this.calculateSellValue(tower);
    sellValueText.setText(`+${sellValue}金币`);
  }

  private calculateSellValue(tower: Tower): number {
    const config = TOWER_CONFIGS[tower.type];
    let totalCost = config.cost;

    for (let i = 0; i < tower.getLevel(); i++) {
      totalCost += config.levels[i].upgradeCost;
    }

    return Math.floor(totalCost * 0.5);
  }

  private upgradeSelectedTower(): void {
    if (!this.selectedTower || !this.selectedTower.canUpgrade()) return;

    const upgradeCost = this.selectedTower.getUpgradeCost();

    if (this.gold < upgradeCost) {
      this.showFloatingText(this.goldText.x, this.goldText.y, '金币不足!', 0xff0000);
      return;
    }

    this.gold -= upgradeCost;
    this.selectedTower.upgrade();
    this.updateGoldText();
    this.updateInfoPanel();
    this.playUpgradeSound();
  }

  private sellSelectedTower(): void {
    if (!this.selectedTower) return;

    const tower = this.selectedTower;
    const refund = this.calculateSellValue(tower);

    this.gold += refund;
    this.updateGoldText();

    const towerPos = { x: tower.x, y: tower.y };

    this.showFloatingText(towerPos.x, towerPos.y - 30, `+${refund}`, 0xffd700);

    const startPos = new Phaser.Math.Vector2(towerPos.x, towerPos.y - 30);
    const endPos = new Phaser.Math.Vector2(this.goldText.x + 50, this.goldText.y);

    const coinIcon = this.add.text(towerPos.x, towerPos.y - 30, '💰', {
      fontSize: '24px'
    });
    coinIcon.setOrigin(0.5);

    this.tweens.add({
      targets: coinIcon,
      x: endPos.x,
      y: endPos.y,
      duration: 500,
      ease: 'Quad.easeIn',
      onComplete: () => {
        coinIcon.destroy();
      }
    });

    this.grid[tower.gridY][tower.gridX] = null;
    const index = this.towers.indexOf(tower);
    if (index > -1) {
      this.towers.splice(index, 1);
    }

    tower.sell();
    this.playSellSound();

    this.deselectTower();
  }

  private showFloatingText(x: number, y: number, text: string, color: number): void {
    const floatingText = this.add.text(x, y, text, {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: `#${color.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold'
    });
    floatingText.setOrigin(0.5);
    floatingText.setShadow(1, 1, '#000000', 2);

    this.tweens.add({
      targets: floatingText,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Quad.easeOut',
      onComplete: () => {
        floatingText.destroy();
      }
    });
  }

  private updateGoldText(): void {
    this.goldText.setText(`金币: ${this.gold}`);

    if (this.selectedTower) {
      this.updateInfoPanel();
    }
  }

  private updateLivesText(): void {
    this.livesText.setText(`生命: ${this.lives}`);
  }

  private updateWaveText(): void {
    this.waveText.setText(`波数: ${this.wave}`);
  }

  private startWave(): void {
    if (this.isWaveActive || this.gameOver) return;

    this.wave++;
    this.isWaveActive = true;
    this.updateWaveText();

    const enemyCount = 5 + this.wave * 2;
    this.enemiesRemaining = enemyCount;

    const btnGraphics = (this.startWaveText as any).btnGraphics;
    const btnArea = (this.startWaveText as any).btnArea;
    btnGraphics.fillStyle(0x6b7280, 1);
    btnArea.disableInteractive();
    this.startWaveText.setText(`第 ${this.wave} 波进行中...`);

    this.spawnWave(enemyCount);
  }

  private spawnWave(enemyCount: number): void {
    const isBossWave = this.wave % 20 === 0;
    let spawnDelay = 0;

    if (isBossWave) {
      this.time.delayedCall(500, () => {
        this.spawnEnemy('boss');
      });

      for (let i = 0; i < enemyCount - 1; i++) {
        spawnDelay = 1000 + i * 800;
        this.time.delayedCall(spawnDelay, () => {
          if (!this.gameOver) {
            this.spawnEnemy('normal');
          }
        });
      }
    } else {
      for (let i = 0; i < enemyCount; i++) {
        spawnDelay = i * 800;
        this.time.delayedCall(spawnDelay, () => {
          if (!this.gameOver) {
            const rand = Math.random();
            const type: EnemyType = rand < 0.3 ? 'fast' : 'normal';
            this.spawnEnemy(type);
          }
        });
      }
    }
  }

  private spawnEnemy(type: EnemyType): void {
    if (this.gameOver) return;

    const startPoint = this.path.getStartPoint();
    const enemy = new Enemy(this, startPoint.x, startPoint.y, type, this.path);
    this.enemies.push(enemy);
  }

  private onEnemyReachedEnd(enemy: Enemy): void {
    this.lives--;
    this.updateLivesText();

    if (this.lives <= 0) {
      this.endGame(false);
    }
  }

  private onEnemyKilled(enemy: Enemy): void {
    const reward = enemy.getReward() + Math.floor(Math.random() * 20) + 10;
    this.gold += reward;
    this.updateGoldText();

    this.showFloatingText(enemy.x, enemy.y - 20, `+${reward}`, 0xffd700);
  }

  private endGame(victory: boolean): void {
    this.gameOver = true;
    this.isWaveActive = false;

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, this.scale.width, this.scale.height);

    this.gameOverText = this.add.text(centerX, centerY - 50, victory ? '胜利!' : '游戏结束', {
      fontFamily: 'Courier New, monospace',
      fontSize: '64px',
      color: victory ? '#22c55e' : '#ef4444',
      fontStyle: 'bold'
    });
    this.gameOverText.setOrigin(0.5);
    this.gameOverText.setShadow(4, 4, '#000000', 8);

    const scoreText = this.add.text(centerX, centerY + 30, `坚持了 ${this.wave} 波`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '32px',
      color: '#ffffff'
    });
    scoreText.setOrigin(0.5);
    scoreText.setShadow(2, 2, '#000000', 4);

    const restartText = this.add.text(centerX, centerY + 100, '点击重新开始', {
      fontFamily: 'Courier New, monospace',
      fontSize: '24px',
      color: '#ffd700'
    });
    restartText.setOrigin(0.5);
    restartText.setInteractive({ useHandCursor: true });
    restartText.on('pointerdown', () => {
      this.scene.restart();
    });
  }

  update(time: number, delta: number): void {
    if (this.gameOver) return;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(time, delta);

      if (enemy.reachedEnd) {
        this.onEnemyReachedEnd(enemy);
        enemy.destroy();
        this.enemies.splice(i, 1);
        this.enemiesRemaining--;
      } else if (enemy.isDead && !enemy.active) {
        this.onEnemyKilled(enemy);
        this.enemies.splice(i, 1);
        this.enemiesRemaining--;
      }
    }

    for (const tower of this.towers) {
      tower.update(time, delta, this.enemies);
    }

    if (this.isWaveActive && this.enemiesRemaining <= 0 && this.enemies.length === 0) {
      this.isWaveActive = false;

      const btnGraphics = (this.startWaveText as any).btnGraphics;
      const btnArea = (this.startWaveText as any).btnArea;
      btnGraphics.fillStyle(0x3b82f6, 1);
      btnArea.setInteractive();
      this.startWaveText.setText('开始下一波');
    }
  }
}
