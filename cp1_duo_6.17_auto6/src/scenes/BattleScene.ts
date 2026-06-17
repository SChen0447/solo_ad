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
  private occupiedCells: Set<string> = new Set();

  private path!: Phaser.Curves.Path;
  private pathCells: Set<string> = new Set();

  private selectedTowerType: TowerType | null = null;
  private selectedTower: Tower | null = null;

  private graphics!: Phaser.GameObjects.Graphics;
  private hoverGraphics!: Phaser.GameObjects.Graphics;
  private pathGraphics!: Phaser.GameObjects.Graphics;

  private goldText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private startWaveText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;

  private towerPanel!: Phaser.GameObjects.Container;
  private infoPanel!: Phaser.GameObjects.Container;
  private topBar!: Phaser.GameObjects.Container;

  private audioContext!: AudioContext | null;

  constructor() {
    super('BattleScene');
  }

  preload(): void {
    // 使用程序生成的图形和纹理
  }

  create(): void {
    this.initAudio();
    this.generateTextures();
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

  private generateTextures(): void {
    if (!this.textures.exists('particle_glow')) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0xffd700, 1);
      gfx.fillCircle(5, 5, 5);
      gfx.generateTexture('particle_glow', 10, 10);
      gfx.destroy();
    }
  }

  private playSound(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3): void {
    if (!this.audioContext) return;

    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
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
      // ignore
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
    this.occupiedCells = new Set();
  }

  private createPath(): void {
    const startX = GRID_OFFSET_X - CELL_SIZE;
    const endX = GRID_OFFSET_X + GRID_SIZE * CELL_SIZE + CELL_SIZE;

    const pathPoints = [
      new Phaser.Math.Vector2(startX, GRID_OFFSET_Y + CELL_SIZE * 1.5),
      new Phaser.Math.Vector2(GRID_OFFSET_X + CELL_SIZE * 1, GRID_OFFSET_Y + CELL_SIZE * 1.5),
      new Phaser.Math.Vector2(GRID_OFFSET_X + CELL_SIZE * 1, GRID_OFFSET_Y + CELL_SIZE * 3.5),
      new Phaser.Math.Vector2(GRID_OFFSET_X + CELL_SIZE * 3, GRID_OFFSET_Y + CELL_SIZE * 3.5),
      new Phaser.Math.Vector2(GRID_OFFSET_X + CELL_SIZE * 3, GRID_OFFSET_Y + CELL_SIZE * 0.5),
      new Phaser.Math.Vector2(GRID_OFFSET_X + CELL_SIZE * 5, GRID_OFFSET_Y + CELL_SIZE * 0.5),
      new Phaser.Math.Vector2(GRID_OFFSET_X + CELL_SIZE * 5, GRID_OFFSET_Y + CELL_SIZE * 5.5),
      new Phaser.Math.Vector2(GRID_OFFSET_X + CELL_SIZE * 7, GRID_OFFSET_Y + CELL_SIZE * 5.5),
      new Phaser.Math.Vector2(GRID_OFFSET_X + CELL_SIZE * 7, GRID_OFFSET_Y + CELL_SIZE * 2.5),
      new Phaser.Math.Vector2(endX, GRID_OFFSET_Y + CELL_SIZE * 2.5)
    ];

    this.path = new Phaser.Curves.Path(pathPoints[0].x, pathPoints[0].y);
    this.path.splineTo(pathPoints.slice(1));

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
    bgGraphics.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
    bgGraphics.fillRect(0, 0, this.scale.width, this.scale.height);
    bgGraphics.setDepth(0);

    this.graphics = this.add.graphics();
    this.graphics.setDepth(1);
    this.hoverGraphics = this.add.graphics();
    this.hoverGraphics.setDepth(5);
    this.pathGraphics = this.add.graphics();
    this.pathGraphics.setDepth(1);

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
    this.pathGraphics.lineStyle(CELL_SIZE * 0.6, 0x2d3748, 0.8);
    this.path.draw(this.pathGraphics);

    this.pathGraphics.lineStyle(4, 0x4a5568, 1);
    this.path.draw(this.pathGraphics);

    const arrowPoints = [
      { x: GRID_OFFSET_X - CELL_SIZE * 0.8, y: GRID_OFFSET_Y + CELL_SIZE * 1.5 },
    ];
    const endPt = this.path.getEndPoint();

    const startGfx = this.add.graphics();
    startGfx.setDepth(2);
    startGfx.fillStyle(0x22c55e, 0.8);
    startGfx.fillTriangle(
      arrowPoints[0].x - 15, arrowPoints[0].y - 20,
      arrowPoints[0].x - 15, arrowPoints[0].y + 20,
      arrowPoints[0].x + 15, arrowPoints[0].y
    );

    const endGfx = this.add.graphics();
    endGfx.setDepth(2);
    endGfx.fillStyle(0xef4444, 0.8);
    endGfx.fillTriangle(
      endPt.x + 15, endPt.y - 20,
      endPt.x + 15, endPt.y + 20,
      endPt.x - 15, endPt.y
    );
  }

  private createUI(): void {
    this.createTopBar();
    this.createTowerPanel();
    this.createInfoPanel();
    this.createStartWaveButton();
  }

  private createTopBar(): void {
    this.topBar = this.add.container(0, 0);
    this.topBar.setDepth(50);

    const barGraphics = this.add.graphics();
    barGraphics.fillStyle(0x0f172a, 0.95);
    barGraphics.fillRect(0, 0, this.scale.width, 80);
    barGraphics.lineStyle(2, 0x334155, 1);
    barGraphics.lineBetween(0, 80, this.scale.width, 80);
    this.topBar.add(barGraphics);

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Courier New, monospace',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    };

    const heartIcon = this.add.text(40, 40, 'HP', {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#ef4444',
      fontStyle: 'bold'
    });
    heartIcon.setOrigin(0, 0.5);
    heartIcon.setShadow(2, 2, '#000000', 4);
    this.topBar.add(heartIcon);

    this.livesText = this.add.text(90, 40, `${this.lives}`, textStyle);
    this.livesText.setOrigin(0, 0.5);
    this.livesText.setShadow(2, 2, '#000000', 4);
    this.livesText.setColor('#ef4444');
    this.topBar.add(this.livesText);

    const coinIcon = this.add.text(220, 40, 'G', {
      fontFamily: 'Courier New, monospace',
      fontSize: '22px',
      color: '#ffd700',
      fontStyle: 'bold'
    });
    coinIcon.setOrigin(0, 0.5);
    coinIcon.setShadow(2, 2, '#000000', 4);
    this.topBar.add(coinIcon);

    this.goldText = this.add.text(260, 40, `${this.gold}`, textStyle);
    this.goldText.setOrigin(0, 0.5);
    this.goldText.setShadow(2, 2, '#000000', 4);
    this.goldText.setColor('#ffd700');
    this.topBar.add(this.goldText);

    const waveIcon = this.add.text(this.scale.width / 2 - 60, 40, 'WAVE', {
      fontFamily: 'Courier New, monospace',
      fontSize: '18px',
      color: '#60a5fa',
      fontStyle: 'bold'
    });
    waveIcon.setOrigin(0, 0.5);
    waveIcon.setShadow(2, 2, '#000000', 4);
    this.topBar.add(waveIcon);

    this.waveText = this.add.text(this.scale.width / 2 + 20, 40, `${this.wave}`, textStyle);
    this.waveText.setOrigin(0, 0.5);
    this.waveText.setShadow(2, 2, '#000000', 4);
    this.waveText.setColor('#60a5fa');
    this.topBar.add(this.waveText);
  }

  private createTowerPanel(): void {
    this.towerPanel = this.add.container(0, this.scale.height - 120);
    this.towerPanel.setDepth(50);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0f172a, 0.95);
    panelBg.fillRect(0, 0, this.scale.width, 120);
    panelBg.lineStyle(2, 0x334155, 1);
    panelBg.lineBetween(0, 0, this.scale.width, 0);
    this.towerPanel.add(panelBg);

    const towerTypes: TowerType[] = ['arrow', 'cannon', 'magic'];
    const towerNames = ['箭塔', '炮塔', '魔法塔'];
    const towerDescs = ['快速/中伤', '范围/慢速', '高伤/减速'];
    const towerColors = [0x60a5fa, 0xf97316, 0xa855f7];

    const startX = this.scale.width / 2 - 300;

    towerTypes.forEach((type, index) => {
      const config = TOWER_CONFIGS[type];
      const x = startX + index * 220;

      const card = this.add.container(x + 110, 60);

      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x1e293b, 1);
      cardBg.fillRoundedRect(-90, -48, 180, 96, 8);
      cardBg.lineStyle(3, 0x475569, 1);
      cardBg.strokeRoundedRect(-90, -48, 180, 96, 8);
      card.add(cardBg);

      const icon = this.add.rectangle(-50, -5, 36, 36, towerColors[index]);
      icon.setStrokeStyle(2, 0xffffff);
      card.add(icon);

      if (type === 'arrow') {
        const arrowIcon = this.add.rectangle(-50, -10, 6, 16, 0xffffff);
        card.add(arrowIcon);
      } else if (type === 'cannon') {
        const cannonIcon = this.add.rectangle(-50, -8, 12, 18, 0x333333);
        card.add(cannonIcon);
      } else {
        const magicIcon = this.add.arc(-50, -5, 10, 0, 360, false, 0xa855f7, 0.6);
        card.add(magicIcon);
      }

      const nameText = this.add.text(10, -20, towerNames[index], {
        fontFamily: 'Courier New, monospace',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold'
      });
      nameText.setOrigin(0.5);
      card.add(nameText);

      const descText = this.add.text(10, 5, towerDescs[index], {
        fontFamily: 'Courier New, monospace',
        fontSize: '13px',
        color: '#94a3b8'
      });
      descText.setOrigin(0.5);
      card.add(descText);

      const costText = this.add.text(10, 28, `${config.cost}G`, {
        fontFamily: 'Courier New, monospace',
        fontSize: '16px',
        color: '#ffd700',
        fontStyle: 'bold'
      });
      costText.setOrigin(0.5);
      card.add(costText);

      card.setSize(180, 96);
      card.setInteractive({ useHandCursor: true });

      card.on('pointerover', () => {
        if (this.selectedTowerType !== type) {
          cardBg.clear();
          cardBg.fillStyle(0x1e293b, 1);
          cardBg.fillRoundedRect(-90, -48, 180, 96, 8);
          cardBg.lineStyle(3, 0x94a3b8, 1);
          cardBg.strokeRoundedRect(-90, -48, 180, 96, 8);
        }
      });

      card.on('pointerout', () => {
        if (this.selectedTowerType !== type) {
          cardBg.clear();
          cardBg.fillStyle(0x1e293b, 1);
          cardBg.fillRoundedRect(-90, -48, 180, 96, 8);
          cardBg.lineStyle(3, 0x475569, 1);
          cardBg.strokeRoundedRect(-90, -48, 180, 96, 8);
        }
      });

      card.on('pointerdown', () => {
        this.tweens.add({
          targets: card,
          y: 48,
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
    this.infoPanel.setDepth(60);

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

    const upgradeText = this.add.text(75, 218, '升级', {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    upgradeText.setOrigin(0.5);
    this.infoPanel.add(upgradeText);

    const upgradeCost = this.add.text(75, 238, '50金币', {
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

    const sellText = this.add.text(205, 218, '出售', {
      fontFamily: 'Courier New, monospace',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    sellText.setOrigin(0.5);
    this.infoPanel.add(sellText);

    const sellValue = this.add.text(205, 238, '+0金币', {
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

    const closeBtn = this.add.text(260, 10, 'X', {
      fontFamily: 'Courier New, monospace',
      fontSize: '22px',
      color: '#94a3b8',
      fontStyle: 'bold'
    });
    closeBtn.setOrigin(1, 0);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.deselectTower());
    this.infoPanel.add(closeBtn);
  }

  private createStartWaveButton(): void {
    const btnX = this.scale.width / 2;
    const btnY = this.scale.height - 200;

    const btnContainer = this.add.container(btnX, btnY);
    btnContainer.setDepth(50);

    const btnGraphics = this.add.graphics();
    btnGraphics.fillStyle(0x3b82f6, 1);
    btnGraphics.fillRoundedRect(-100, -28, 200, 56, 10);
    btnGraphics.lineStyle(3, 0x2563eb, 1);
    btnGraphics.strokeRoundedRect(-100, -28, 200, 56, 10);
    btnContainer.add(btnGraphics);

    this.startWaveText = this.add.text(0, 0, '开始下一波', {
      fontFamily: 'Courier New, monospace',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    this.startWaveText.setOrigin(0.5);
    btnContainer.add(this.startWaveText);

    const btnArea = this.add.zone(-100, -28, 200, 56);
    btnArea.setOrigin(0);
    btnArea.setInteractive({ useHandCursor: true });
    btnArea.on('pointerdown', () => this.startWave());
    btnContainer.add(btnArea);

    (this.startWaveText as any).btnContainer = btnContainer;
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
    if (this.occupiedCells.has(`${gridX},${gridY}`)) return false;
    if (this.grid[gridY][gridX] !== null) return false;
    return true;
  }

  private updateHover(pointer: Phaser.Input.Pointer): void {
    const gridPos = this.getGridPosition(pointer.x, pointer.y);

    this.hoverGraphics.clear();

    if (!gridPos) return;

    const worldPos = this.getWorldPosition(gridPos.x, gridPos.y);
    const canPlace = this.canPlaceTower(gridPos.x, gridPos.y);
    const isOccupied = this.occupiedCells.has(`${gridPos.x},${gridPos.y}`);
    const isPath = this.pathCells.has(`${gridPos.x},${gridPos.y}`);

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
        this.hoverGraphics.fillStyle(isOccupied ? 0xff0000 : 0xff4444, 0.3);
        this.hoverGraphics.fillRect(
          GRID_OFFSET_X + gridPos.x * CELL_SIZE,
          GRID_OFFSET_Y + gridPos.y * CELL_SIZE,
          CELL_SIZE,
          CELL_SIZE
        );

        if (isOccupied) {
          this.hoverGraphics.lineStyle(2, 0xff0000, 0.6);
          this.hoverGraphics.strokeRect(
            GRID_OFFSET_X + gridPos.x * CELL_SIZE + 2,
            GRID_OFFSET_Y + gridPos.y * CELL_SIZE + 2,
            CELL_SIZE - 4,
            CELL_SIZE - 4
          );
        }
      }
    } else if (isOccupied) {
      this.hoverGraphics.fillStyle(0xffffff, 0.1);
      this.hoverGraphics.fillRect(
        GRID_OFFSET_X + gridPos.x * CELL_SIZE,
        GRID_OFFSET_Y + gridPos.y * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE
      );
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
    } else if (this.selectedTowerType !== null && !this.canPlaceTower(gridPos.x, gridPos.y)) {
      const isOccupied = this.occupiedCells.has(`${gridPos.x},${gridPos.y}`);
      if (isOccupied) {
        this.showFloatingText(
          GRID_OFFSET_X + gridPos.x * CELL_SIZE + CELL_SIZE / 2,
          GRID_OFFSET_Y + gridPos.y * CELL_SIZE + CELL_SIZE / 2,
          '已占用', 0xff0000
        );
      } else {
        this.showFloatingText(
          GRID_OFFSET_X + gridPos.x * CELL_SIZE + CELL_SIZE / 2,
          GRID_OFFSET_Y + gridPos.y * CELL_SIZE + CELL_SIZE / 2,
          '不可放置', 0xff4444
        );
      }
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

      bg.clear();
      bg.fillStyle(0x1e293b, 1);
      bg.fillRoundedRect(-90, -48, 180, 96, 8);

      if (type === this.selectedTowerType) {
        bg.lineStyle(3, 0xffd700, 1);
        bg.strokeRoundedRect(-90, -48, 180, 96, 8);
      } else {
        bg.lineStyle(3, 0x475569, 1);
        bg.strokeRoundedRect(-90, -48, 180, 96, 8);
      }
    });
  }

  private placeTower(gridX: number, gridY: number, type: TowerType): void {
    const config = TOWER_CONFIGS[type];

    if (this.gold < config.cost) {
      this.showFloatingText(this.goldText.x + 50, this.goldText.y, '金币不足!', 0xff0000);
      return;
    }

    if (!this.canPlaceTower(gridX, gridY)) {
      return;
    }

    const worldPos = this.getWorldPosition(gridX, gridY);
    const tower = new Tower(this, worldPos.x, worldPos.y - 100, type, gridX, gridY);
    tower.setDepth(10);

    this.towers.push(tower);
    this.grid[gridY][gridX] = tower;
    this.occupiedCells.add(`${gridX},${gridY}`);

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
    fireRateText.setText(`${(1 / tower.getFireRate()).toFixed(1)}/s`);

    if (tower.canUpgrade()) {
      const upgradeCost = tower.getUpgradeCost();
      upgradeCostText.setText(`${upgradeCost}G`);
      upgradeBtnArea.setInteractive();

      upgradeBtn.clear();
      upgradeBtn.fillStyle(this.gold >= upgradeCost ? 0x22c55e : 0x6b7280, 1);
      upgradeBtn.fillRoundedRect(20, 200, 110, 50, 6);
      upgradeBtn.lineStyle(2, this.gold >= upgradeCost ? 0x16a34a : 0x4b5563, 1);
      upgradeBtn.strokeRoundedRect(20, 200, 110, 50, 6);
    } else {
      upgradeCostText.setText('MAX');
      upgradeBtnArea.disableInteractive();

      upgradeBtn.clear();
      upgradeBtn.fillStyle(0x6b7280, 1);
      upgradeBtn.fillRoundedRect(20, 200, 110, 50, 6);
      upgradeBtn.lineStyle(2, 0x4b5563, 1);
      upgradeBtn.strokeRoundedRect(20, 200, 110, 50, 6);
    }

    const sellValue = this.calculateSellValue(tower);
    sellValueText.setText(`+${sellValue}G`);
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
      this.showFloatingText(this.goldText.x + 50, this.goldText.y, '金币不足!', 0xff0000);
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

    const coinIcon = this.add.text(towerPos.x, towerPos.y - 30, '+G', {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#ffd700',
      fontStyle: 'bold'
    });
    coinIcon.setOrigin(0.5);
    coinIcon.setDepth(55);

    this.tweens.add({
      targets: coinIcon,
      x: this.goldText.x + 50,
      y: this.goldText.y,
      duration: 500,
      ease: 'Quad.easeIn',
      onComplete: () => {
        coinIcon.destroy();
      }
    });

    this.grid[tower.gridY][tower.gridX] = null;
    this.occupiedCells.delete(`${tower.gridX},${tower.gridY}`);
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
    floatingText.setDepth(55);

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
    this.goldText.setText(`${this.gold}`);

    if (this.selectedTower) {
      this.updateInfoPanel();
    }
  }

  private updateLivesText(): void {
    this.livesText.setText(`${this.lives}`);
  }

  private updateWaveText(): void {
    this.waveText.setText(`${this.wave}`);
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

    btnGraphics.clear();
    btnGraphics.fillStyle(0x6b7280, 1);
    btnGraphics.fillRoundedRect(-100, -28, 200, 56, 10);
    btnGraphics.lineStyle(3, 0x4b5563, 1);
    btnGraphics.strokeRoundedRect(-100, -28, 200, 56, 10);
    btnArea.disableInteractive();
    this.startWaveText.setText(`第 ${this.wave} 波`);

    this.spawnWave(enemyCount);
  }

  private spawnWave(enemyCount: number): void {
    const isBossWave = this.wave % 20 === 0;

    if (isBossWave) {
      this.time.delayedCall(500, () => {
        this.spawnEnemy('boss');
      });

      for (let i = 0; i < enemyCount - 1; i++) {
        const spawnDelay = 1000 + i * 800;
        this.time.delayedCall(spawnDelay, () => {
          if (!this.gameOver) {
            this.spawnEnemy('normal');
          }
        });
      }
    } else {
      for (let i = 0; i < enemyCount; i++) {
        const spawnDelay = i * 800;
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
    enemy.setDepth(8);
    this.enemies.push(enemy);
  }

  private onEnemyReachedEnd(enemy: Enemy): void {
    this.lives--;
    this.updateLivesText();

    this.showFloatingText(enemy.x, enemy.y - 20, '-1 HP', 0xef4444);

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
    overlay.setDepth(100);

    this.gameOverText = this.add.text(centerX, centerY - 50, victory ? '胜利!' : '游戏结束', {
      fontFamily: 'Courier New, monospace',
      fontSize: '64px',
      color: victory ? '#22c55e' : '#ef4444',
      fontStyle: 'bold'
    });
    this.gameOverText.setOrigin(0.5);
    this.gameOverText.setShadow(4, 4, '#000000', 8);
    this.gameOverText.setDepth(101);

    const scoreText = this.add.text(centerX, centerY + 30, `坚持了 ${this.wave} 波`, {
      fontFamily: 'Courier New, monospace',
      fontSize: '32px',
      color: '#ffffff'
    });
    scoreText.setOrigin(0.5);
    scoreText.setShadow(2, 2, '#000000', 4);
    scoreText.setDepth(101);

    const restartText = this.add.text(centerX, centerY + 100, '点击重新开始', {
      fontFamily: 'Courier New, monospace',
      fontSize: '24px',
      color: '#ffd700'
    });
    restartText.setOrigin(0.5);
    restartText.setInteractive({ useHandCursor: true });
    restartText.setDepth(101);
    restartText.on('pointerdown', () => {
      this.scene.restart();
    });
  }

  update(time: number, delta: number): void {
    if (this.gameOver) return;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (enemy.isDead || enemy.pendingDestroy) {
        if (!enemy.pendingDestroy) {
          this.onEnemyKilled(enemy);
        }
        enemy.forceDestroy();
        this.enemies.splice(i, 1);
        this.enemiesRemaining--;
        continue;
      }

      enemy.update(time, delta);

      if (enemy.reachedEnd) {
        this.onEnemyReachedEnd(enemy);
        enemy.forceDestroy();
        this.enemies.splice(i, 1);
        this.enemiesRemaining--;
      }
    }

    const aliveEnemies = this.enemies.filter(e => !e.isDead && !e.reachedEnd && !e.pendingDestroy);

    for (const tower of this.towers) {
      tower.update(time, delta, aliveEnemies);
    }

    if (this.isWaveActive && this.enemiesRemaining <= 0 && this.enemies.length === 0) {
      this.isWaveActive = false;

      const btnGraphics = (this.startWaveText as any).btnGraphics;
      const btnArea = (this.startWaveText as any).btnArea;

      btnGraphics.clear();
      btnGraphics.fillStyle(0x3b82f6, 1);
      btnGraphics.fillRoundedRect(-100, -28, 200, 56, 10);
      btnGraphics.lineStyle(3, 0x2563eb, 1);
      btnGraphics.strokeRoundedRect(-100, -28, 200, 56, 10);
      btnArea.setInteractive();
      this.startWaveText.setText('开始下一波');
    }
  }
}
