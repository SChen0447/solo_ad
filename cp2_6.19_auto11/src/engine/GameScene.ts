import Phaser from 'phaser';
import {
  GRID,
  GRID_COLS,
  GRID_ROWS,
  CELL_SIZE,
  MAP_OFFSET_X,
  MAP_OFFSET_Y,
  MAP_WIDTH,
  MAP_HEIGHT,
  TOWER_CONFIGS,
  INITIAL_GOLD,
  INITIAL_LIVES,
  gridToPixel,
  CellType
} from '../data/LevelData';
import { TowerFactory, Tower, TowerType } from './TowerFactory';
import { WaveManager, Enemy } from './WaveManager';

interface Projectile {
  id: number;
  x: number;
  y: number;
  targetEnemyId: number;
  speed: number;
  damage: number;
  color: number;
  size: number;
  graphics: Phaser.GameObjects.Arc;
  isActive: boolean;
  distToBase: number;
}

const BASE_X = MAP_OFFSET_X + GRID_COLS * CELL_SIZE;
const BASE_Y = MAP_OFFSET_Y + GRID_ROWS * CELL_SIZE;

export class GameScene extends Phaser.Scene {
  private towerFactory!: TowerFactory;
  private waveManager!: WaveManager;

  private towers: Tower[] = [];
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private nextProjectileId: number = 0;

  private gold: number = INITIAL_GOLD;
  private lives: number = INITIAL_LIVES;
  private isGameOver: boolean = false;
  private isVictory: boolean = false;

  private cellGraphics!: Phaser.GameObjects.Graphics;
  private buildableCells: { gridX: number; gridY: number; x: number; y: number; built: boolean; graphics: Phaser.GameObjects.Rectangle | null | undefined }[] = [];
  private breathingCells: { gridX: number; gridY: number; tween: Phaser.Tweens.Tween }[] = [];

  private hudWaveText!: Phaser.GameObjects.Text;
  private hudLivesText!: Phaser.GameObjects.Text;
  private hudGoldText!: Phaser.GameObjects.Text;
  private hudStartWaveBtn!: Phaser.GameObjects.Container;
  private livesPulseTween: Phaser.Tweens.Tween | null = null;
  private hudLivesBg!: Phaser.GameObjects.Graphics;

  private towerPanel: Phaser.GameObjects.Container | null = null;
  private selectedBuildCell: { gridX: number; gridY: number; x: number; y: number } | null = null;

  private resultPanel: Phaser.GameObjects.Container | null = null;
  private glowTimer: Phaser.Time.TimerEvent | null = null;
  private shakeTimer: Phaser.Time.TimerEvent | null = null;

  private readonly MAX_PROJECTILES = 50;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.towerFactory = new TowerFactory(this);
    this.waveManager = new WaveManager(this);

    this.drawBackground();
    this.drawGrid();
    this.drawPathIndicator();
    this.createHUD();
    this.registerWaveEvents();
    this.setupInput();

    this.scale.on('resize', this.handleResize, this);
    this.handleResize();
  }

  private drawBackground(): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x3E2723, 1);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);

    const panel = this.add.graphics();
    panel.fillStyle(0x4E342E, 1);
    panel.fillRoundedRect(MAP_OFFSET_X - 20, MAP_OFFSET_Y - 20, MAP_WIDTH + 40, MAP_HEIGHT + 40, 16);
    panel.lineStyle(4, 0xFFD54F, 1);
    panel.strokeRoundedRect(MAP_OFFSET_X - 20, MAP_OFFSET_Y - 20, MAP_WIDTH + 40, MAP_HEIGHT + 40, 16);

    const titleBg = this.add.text(this.scale.width / 2, 40, '⚔ 中世纪塔防 ⚔', {
      fontFamily: 'Georgia, serif',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#FFD54F'
    }).setOrigin(0.5);
    titleBg.setShadow(4, 4, '#000000', 0.8);
  }

  private drawGrid(): void {
    this.cellGraphics = this.add.graphics();

    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const cellType: CellType = GRID[y][x];
        const px = MAP_OFFSET_X + x * CELL_SIZE;
        const py = MAP_OFFSET_Y + y * CELL_SIZE;
        const cx = px + CELL_SIZE / 2;
        const cy = py + CELL_SIZE / 2;

        switch (cellType) {
          case 0:
            this.cellGraphics.fillStyle(0x81C784, 1);
            this.cellGraphics.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            this.cellGraphics.fillStyle(0x66BB6A, 0.4);
            for (let d = 0; d < 3; d++) {
              const dx = Phaser.Math.Between(px + 8, px + CELL_SIZE - 8);
              const dy = Phaser.Math.Between(py + 8, py + CELL_SIZE - 8);
              this.cellGraphics.fillCircle(dx, dy, 2);
            }
            break;
          case 1:
            this.cellGraphics.fillStyle(0xBDBDBD, 1);
            this.cellGraphics.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            this.cellGraphics.fillStyle(0x9E9E9E, 0.7);
            this.cellGraphics.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            break;
          case 2:
            this.cellGraphics.fillStyle(0x424242, 1);
            this.cellGraphics.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            this.cellGraphics.lineStyle(2, 0x616161, 0.8);
            this.cellGraphics.strokeRect(px + 6, py + 6, CELL_SIZE - 12, CELL_SIZE - 12);

            const buildable: { gridX: number; gridY: number; x: number; y: number; built: boolean; graphics: Phaser.GameObjects.Rectangle | null | undefined } = { gridX: x, gridY: y, x: cx, y: cy, built: false, graphics: null };
            this.buildableCells.push(buildable);

            const breathingRect = this.add.rectangle(cx, cy, CELL_SIZE - 14, CELL_SIZE - 14, 0xFFD54F, 0.08);
            breathingRect.setStrokeStyle(3, 0xFFD54F, 0.6);
            breathingRect.setDepth(2);
            buildable.graphics = breathingRect;

            const tween = this.tweens.add({
              targets: breathingRect,
              alpha: { from: 0.15, to: 0.75 },
              duration: 1400,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });
            this.breathingCells.push({ gridX: x, gridY: y, tween });
            break;
        }

        this.cellGraphics.lineStyle(1, 0x2E1A12, 0.35);
        this.cellGraphics.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
      }
    }
    this.cellGraphics.setDepth(1);
  }

  private drawPathIndicator(): void {
    const entryPx = gridToPixel(0, 1);
    const exitPx = gridToPixel(11, 7);

    const entryMarker = this.add.graphics();
    entryMarker.fillStyle(0x4CAF50, 0.85);
    entryMarker.fillCircle(entryPx.x - CELL_SIZE / 2, entryPx.y, 22);
    const entryTxt = this.add.text(entryPx.x - CELL_SIZE / 2, entryPx.y, '入', {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    entryMarker.setDepth(5);
    entryTxt.setDepth(6);

    const exitMarker = this.add.graphics();
    exitMarker.fillStyle(0xF44336, 0.85);
    exitMarker.fillCircle(exitPx.x + CELL_SIZE / 2, exitPx.y, 22);
    const exitTxt = this.add.text(exitPx.x + CELL_SIZE / 2, exitPx.y, '终', {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    exitMarker.setDepth(5);
    exitTxt.setDepth(6);
  }

  private createHUD(): void {
    const hudY = 65;

    this.hudLivesBg = this.add.graphics();
    this.hudLivesBg.fillStyle(0x0D47A1, 1);
    this.hudLivesBg.fillRoundedRect(520 - 85, hudY - 24, 170, 48, 10);
    this.hudLivesBg.lineStyle(3, 0xFFD54F, 1);
    this.hudLivesBg.strokeRoundedRect(520 - 85, hudY - 24, 170, 48, 10);

    this.hudWaveText = this.createHudItem(280, hudY, '波次', `${this.waveManager.currentWave}/${this.waveManager.totalWaves}`, 'waves');

    this.hudLivesText = this.createHudItem(520, hudY, '生命', this.lives.toString(), 'lives');

    this.hudGoldText = this.createHudItem(760, hudY, '金币', this.gold.toString(), 'gold');

    this.hudStartWaveBtn = this.createStartWaveBtn(1020, hudY);
  }

  private createHudItem(x: number, y: number, label: string, value: string, type: string): Phaser.GameObjects.Text {
    const bg = this.add.graphics();
    bg.fillStyle(0x0D47A1, 1);
    bg.fillRoundedRect(x - 85, y - 24, 170, 48, 10);
    bg.lineStyle(3, 0xFFD54F, 1);
    bg.strokeRoundedRect(x - 85, y - 24, 170, 48, 10);

    const labelTxt = this.add.text(x - 65, y, `${label}:`, {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#FFD54F',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    const valueTxt = this.add.text(x + 65, y, value, {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5);

    valueTxt.setName(type + '_value');

    return valueTxt;
  }

  private createStartWaveBtn(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x0D47A1, 1);
    bg.fillRoundedRect(-100, -26, 200, 52, 12);
    bg.lineStyle(3, 0xFFD54F, 1);
    bg.strokeRoundedRect(-100, -26, 200, 52, 12);
    container.add(bg);

    const text = this.add.text(0, 0, '▶ 开始波次', {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#FFD54F'
    }).setOrigin(0.5);
    container.add(text);

    container.setSize(200, 52);
    container.setInteractive({ useHandCursor: true });

    const normalFill = 0x0D47A1;
    const pressedFill = 0x0A3A85;

    container.on('pointerover', () => {
      bg.fillStyle(0x1565C0, 1);
      bg.fillRoundedRect(-100, -26, 200, 52, 12);
      bg.lineStyle(3, 0xFFD54F, 1);
      bg.strokeRoundedRect(-100, -26, 200, 52, 12);
    });

    container.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 100
      });
      bg.fillStyle(normalFill, 1);
      bg.fillRoundedRect(-100, -26, 200, 52, 12);
      bg.lineStyle(3, 0xFFD54F, 1);
      bg.strokeRoundedRect(-100, -26, 200, 52, 12);
    });

    container.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scale: 0.95,
        duration: 80,
        yoyo: true,
        hold: 60
      });
      bg.fillStyle(pressedFill, 1);
      bg.fillRoundedRect(-100, -26, 200, 52, 12);
      bg.lineStyle(3, 0xFFD54F, 1);
      bg.strokeRoundedRect(-100, -26, 200, 52, 12);
    });

    container.on('pointerup', () => {
      bg.fillStyle(normalFill, 1);
      bg.fillRoundedRect(-100, -26, 200, 52, 12);
      bg.lineStyle(3, 0xFFD54F, 1);
      bg.strokeRoundedRect(-100, -26, 200, 52, 12);
      this.handleStartWave();
    });

    return container;
  }

  private registerWaveEvents(): void {
    this.waveManager.onEnemySpawn((event) => {
      this.enemies.push(event.enemy);
    });

    this.waveManager.onWaveCompleted(() => {
      this.updateHUD();
      this.showFloatingText(this.scale.width / 2, 350, `第 ${this.waveManager.currentWave} 波已清除！+50金币`, 0xFFD54F);
      this.gold += 50;
      this.updateHUD();
    });

    this.waveManager.onAllWavesCompleted(() => {
      this.time.delayedCall(800, () => {
        if (!this.isGameOver) {
          this.showVictory();
        }
      });
    });
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handlePointerDown(pointer);
    });
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isGameOver || this.isVictory) return;

    const gx = Math.floor((pointer.x - MAP_OFFSET_X) / CELL_SIZE);
    const gy = Math.floor((pointer.y - MAP_OFFSET_Y) / CELL_SIZE);

    this.hideTowerPanel();

    if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
      const cellType = GRID[gy][gx];
      if (cellType === 2) {
        const cell = this.buildableCells.find(
          (c) => c.gridX === gx && c.gridY === gy
        );
        if (cell && !cell.built) {
          this.selectedBuildCell = { gridX: gx, gridY: gy, x: cell.x, y: cell.y };
          this.showTowerPanel(cell.x, cell.y);
        }
      }
    }
  }

  private showTowerPanel(cx: number, cy: number): void {
    this.hideTowerPanel();

    let panelX = cx;
    let panelY = cy - CELL_SIZE / 2 - 70;

    if (panelY < 110) {
      panelY = cy + CELL_SIZE / 2 + 70;
    }
    if (panelX < 280) panelX = 280;
    if (panelX > this.scale.width - 280) panelX = this.scale.width - 280;

    this.towerPanel = this.add.container(panelX, panelY);

    const bg = this.add.graphics();
    bg.fillStyle(0x0D47A1, 0.96);
    bg.fillRoundedRect(-230, -70, 460, 140, 16);
    bg.lineStyle(4, 0xFFD54F, 1);
    bg.strokeRoundedRect(-230, -70, 460, 140, 16);
    this.towerPanel.add(bg);

    const title = this.add.text(0, -48, '选择防御塔', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#FFD54F'
    }).setOrigin(0.5);
    this.towerPanel.add(title);

    const towerTypes: TowerType[] = ['arrow', 'cannon', 'magic'];
    const positions = [-140, 0, 140];

    towerTypes.forEach((type, index) => {
      const config = TOWER_CONFIGS[type];
      const px = positions[index];
      const canAfford = this.gold >= config.cost;

      const btnBg = this.add.graphics();
      const fillCol = canAfford ? 0x1A237E : 0x37474F;
      btnBg.fillStyle(fillCol, 1);
      btnBg.fillRoundedRect(px - 60, -28, 120, 100, 10);
      btnBg.lineStyle(3, canAfford ? 0xFFD54F : 0x78909C, 1);
      btnBg.strokeRoundedRect(px - 60, -28, 120, 100, 10);
      this.towerPanel!.add(btnBg);

      const iconGraphics = this.add.graphics();
      iconGraphics.fillStyle(config.color, 1);
      iconGraphics.fillRoundedRect(px - 16, -18, 32, 32, 4);
      iconGraphics.lineStyle(2, config.barrelColor, 1);
      iconGraphics.strokeRoundedRect(px - 16, -18, 32, 32, 4);
      this.towerPanel!.add(iconGraphics);

      const bar = this.add.graphics();
      bar.fillStyle(config.barrelColor, 1);
      bar.fillRect(px - 3, -8, 20, 6);
      this.towerPanel!.add(bar);

      const nameTxt = this.add.text(px, 18, config.name, {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: canAfford ? '#FFFFFF' : '#9E9E9E'
      }).setOrigin(0.5);
      this.towerPanel!.add(nameTxt);

      const costTxt = this.add.text(px, 40, `💰 ${config.cost}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: canAfford ? '#FFD54F' : '#F44336'
      }).setOrigin(0.5);
      this.towerPanel!.add(costTxt);

      const infoTxt = this.add.text(px, 58, `攻${config.damage} · 射${config.range}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '11px',
        color: canAfford ? '#B0BEC5' : '#616161'
      }).setOrigin(0.5);
      this.towerPanel!.add(infoTxt);

      if (canAfford) {
        btnBg.setInteractive(
          new Phaser.Geom.Rectangle(px - 60, -28, 120, 100),
          Phaser.Geom.Rectangle.Contains
        );
        btnBg.on('pointerover', () => {
          btnBg.fillStyle(0x283593, 1);
          btnBg.fillRoundedRect(px - 60, -28, 120, 100, 10);
          btnBg.lineStyle(3, 0xFFD54F, 1);
          btnBg.strokeRoundedRect(px - 60, -28, 120, 100, 10);
        });
        btnBg.on('pointerout', () => {
          btnBg.fillStyle(0x1A237E, 1);
          btnBg.fillRoundedRect(px - 60, -28, 120, 100, 10);
          btnBg.lineStyle(3, 0xFFD54F, 1);
          btnBg.strokeRoundedRect(px - 60, -28, 120, 100, 10);
        });
        btnBg.on('pointerdown', () => {
          this.tweens.add({
            targets: btnBg,
            scale: 0.92,
            duration: 80,
            yoyo: true,
            hold: 40
          });
        });
        btnBg.on('pointerup', () => {
          this.buildTower(type);
        });
      }
    });

    this.tweens.add({
      targets: this.towerPanel,
      scale: { from: 0.3, to: 1 },
      alpha: { from: 0, to: 1 },
      duration: 220,
      ease: 'Back.easeOut'
    });
  }

  private hideTowerPanel(): void {
    this.towerPanel?.destroy();
    this.towerPanel = null;
    this.selectedBuildCell = null;
  }

  private buildTower(type: TowerType): void {
    if (!this.selectedBuildCell) return;

    const config = TOWER_CONFIGS[type];
    if (this.gold < config.cost) {
      this.showFloatingText(
        this.selectedBuildCell.x,
        this.selectedBuildCell.y - 40,
        '金币不足！',
        0xF44336
      );
      return;
    }

    const cell = this.buildableCells.find(
      (c) =>
        c.gridX === this.selectedBuildCell!.gridX &&
        c.gridY === this.selectedBuildCell!.gridY
    );
    if (!cell || cell.built) return;

    this.gold -= config.cost;
    cell.built = true;

    if (cell.graphics) {
      cell.graphics.destroy();
      cell.graphics = null;
    }
    const breathing = this.breathingCells.find(
      (b) =>
        b.gridX === this.selectedBuildCell!.gridX &&
        b.gridY === this.selectedBuildCell!.gridY
    );
    if (breathing) {
      breathing.tween.stop();
    }

    const tower = this.towerFactory.createTower(
      type,
      this.selectedBuildCell.gridX,
      this.selectedBuildCell.gridY,
      this.selectedBuildCell.x,
      this.selectedBuildCell.y
    );
    this.towers.push(tower);

    this.updateHUD();
    this.hideTowerPanel();

    this.showFloatingText(
      this.selectedBuildCell.x,
      this.selectedBuildCell.y - 30,
      `-${config.cost}`,
      0xFFD54F
    );
  }

  private handleStartWave(): void {
    this.waveManager.startNextWave();
    this.updateHUD();
  }

  update(time: number, delta: number): void {
    if (this.isGameOver || this.isVictory) return;

    this.waveManager.update(time);

    for (const enemy of this.enemies) {
      if (enemy.isAlive && !enemy.reachedEnd) {
        this.waveManager.moveEnemy(enemy, delta);

        if (enemy.reachedEnd && enemy.isAlive) {
          enemy.isAlive = false;
          this.lives -= 1;
          this.updateHUD();
          this.waveManager.destroyEnemy(enemy, false);

          if (this.lives <= 0 && !this.isGameOver) {
            this.isGameOver = true;
            this.showGameOver();
          }
        }
      }
    }

    this.enemies = this.enemies.filter((e) => e.isAlive);

    for (const tower of this.towers) {
      this.updateTower(tower, time);
    }

    this.updateProjectiles(delta);
    this.enforceProjectileLimit();

    const aliveCount = this.enemies.length;
    this.waveManager.notifyEnemyKilled(aliveCount);
  }

  private updateTower(tower: Tower, currentTime: number): void {
    let nearestEnemy: Enemy | null = null;
    let nearestDistance = Infinity;

    for (const enemy of this.enemies) {
      if (!enemy.isAlive) continue;
      const dx = enemy.x - tower.x;
      const dy = enemy.y - tower.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= tower.range && dist < nearestDistance) {
        nearestDistance = dist;
        nearestEnemy = enemy;
      }
    }

    if (nearestEnemy) {
      this.towerFactory.rotateBarrelTo(tower, nearestEnemy.x, nearestEnemy.y);

      if (currentTime - tower.lastFireTime >= tower.fireRate) {
        tower.lastFireTime = currentTime;
        this.fireProjectile(tower, nearestEnemy);
      }
    }
  }

  private calcDistToBase(x: number, y: number): number {
    const dx = x - BASE_X;
    const dy = y - BASE_Y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private fireProjectile(tower: Tower, enemy: Enemy): void {
    const angle = Math.atan2(
      enemy.y - tower.y,
      enemy.x - tower.x
    );
    const startX = tower.x + Math.cos(tower.barrelAngle) * 35;
    const startY = tower.y + Math.sin(tower.barrelAngle) * 35;

    const graphics = this.add.circle(
      startX,
      startY,
      tower.config.projectileSize,
      tower.config.projectileColor,
      1
    );
    graphics.setDepth(25);

    if (tower.type === 'magic') {
      graphics.setStrokeStyle(2, 0xFFFFFF, 0.6);
    } else if (tower.type === 'cannon') {
      graphics.setStrokeStyle(2, 0x424242, 0.8);
    }

    const projectile: Projectile = {
      id: this.nextProjectileId++,
      x: startX,
      y: startY,
      targetEnemyId: enemy.id,
      speed: tower.config.projectileSpeed,
      damage: tower.damage,
      color: tower.config.projectileColor,
      size: tower.config.projectileSize,
      graphics,
      isActive: true,
      distToBase: this.calcDistToBase(startX, startY)
    };

    this.projectiles.push(projectile);

    tower.container.setScale(1.08);
    this.tweens.add({
      targets: tower.container,
      scale: 1,
      duration: 80,
      ease: 'Quad.easeOut'
    });
  }

  private enforceProjectileLimit(): void {
    while (this.projectiles.length > this.MAX_PROJECTILES) {
      const activeProjectiles = this.projectiles.filter((p) => p.isActive);
      if (activeProjectiles.length === 0) break;

      activeProjectiles.sort((a, b) => b.distToBase - a.distToBase);
      const toRemove = activeProjectiles[0];
      toRemove.isActive = false;
      toRemove.graphics.destroy();
      this.projectiles = this.projectiles.filter((p) => p !== toRemove);
    }
  }

  private updateProjectiles(delta: number): void {
    const dt = delta / 1000;

    for (const proj of this.projectiles) {
      if (!proj.isActive) continue;

      const target = this.enemies.find((e) => e.id === proj.targetEnemyId);

      if (!target || !target.isAlive) {
        proj.isActive = false;
        proj.graphics.destroy();
        continue;
      }

      const dx = target.x - proj.x;
      const dy = target.y - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      proj.distToBase = this.calcDistToBase(proj.x, proj.y);

      if (dist < 12) {
        this.onProjectileHit(proj, target);
        proj.isActive = false;
        proj.graphics.destroy();
        continue;
      }

      const moveDist = proj.speed * dt;
      const ratio = Math.min(moveDist / dist, 1);
      proj.x += dx * ratio;
      proj.y += dy * ratio;
      proj.graphics.setPosition(proj.x, proj.y);

      if (proj.color === 0xE040FB) {
        proj.graphics.setAlpha(0.7 + Math.sin(this.time.now * 0.02) * 0.3);
      }
    }

    this.projectiles = this.projectiles.filter((p) => p.isActive);
  }

  private onProjectileHit(proj: Projectile, enemy: Enemy): void {
    enemy.hp -= proj.damage;
    this.waveManager.updateEnemyHpBar(enemy);

    this.createHitEffect(proj.x, proj.y, proj.color, enemy.config.color);

    if (enemy.hp <= 0 && enemy.isAlive) {
      enemy.isAlive = false;
      this.gold += enemy.reward;
      this.updateHUD();
      this.showFloatingText(enemy.x, enemy.y - 20, `+${enemy.reward}`, 0xFFD54F);
      this.waveManager.destroyEnemy(enemy, true);
    }
  }

  private createHitEffect(x: number, y: number, projectileColor: number, enemyColor: number): void {
    const colors = [projectileColor, enemyColor, 0xFFFFFF, 0xFFEB3B];
    for (let i = 0; i < 8; i++) {
      const p = this.add.circle(
        x,
        y,
        Phaser.Math.Between(2, 5),
        Phaser.Utils.Array.GetRandom(colors),
        1
      );
      p.setDepth(28);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(10, 30);
      const tx = x + Math.cos(angle) * dist;
      const ty = y + Math.sin(angle) * dist;

      this.tweens.add({
        targets: p,
        x: tx,
        y: ty,
        alpha: 0,
        scale: 0.3,
        duration: Phaser.Math.Between(200, 350),
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy()
      });
    }
  }

  private showFloatingText(x: number, y: number, text: string, color: number): void {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const t = this.add.text(x, y, text, {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: hex
    }).setOrigin(0.5);
    t.setDepth(50);
    t.setShadow(2, 2, '#000', 0.7);

    this.tweens.add({
      targets: t,
      y: y - 50,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy()
    });
  }

  private updateHUD(): void {
    this.hudWaveText.setText(`${this.waveManager.currentWave}/${this.waveManager.totalWaves}`);

    this.hudLivesText.setText(this.lives.toString());

    const ratio = this.lives / INITIAL_LIVES;
    if (ratio <= 0.3 && this.lives > 0) {
      this.hudLivesText.setColor('#F44336');

      if (this.hudLivesBg) {
        this.hudLivesBg.clear();
        this.hudLivesBg.fillStyle(0x7F0000, 0.9);
        this.hudLivesBg.fillRoundedRect(520 - 85, 65 - 24, 170, 48, 10);
        this.hudLivesBg.lineStyle(3, 0xF44336, 1);
        this.hudLivesBg.strokeRoundedRect(520 - 85, 65 - 24, 170, 48, 10);
      }

      if (!this.livesPulseTween) {
        this.livesPulseTween = this.tweens.add({
          targets: this.hudLivesText,
          scale: { from: 1, to: 1.3 },
          duration: 400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    } else {
      this.hudLivesText.setColor('#FFFFFF');

      if (this.hudLivesBg) {
        this.hudLivesBg.clear();
        this.hudLivesBg.fillStyle(0x0D47A1, 1);
        this.hudLivesBg.fillRoundedRect(520 - 85, 65 - 24, 170, 48, 10);
        this.hudLivesBg.lineStyle(3, 0xFFD54F, 1);
        this.hudLivesBg.strokeRoundedRect(520 - 85, 65 - 24, 170, 48, 10);
      }

      if (this.livesPulseTween) {
        this.livesPulseTween.stop();
        this.livesPulseTween = null;
        this.hudLivesText.setScale(1);
      }
    }

    this.hudGoldText.setText(this.gold.toString());
  }

  private showVictory(): void {
    this.isVictory = true;

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    for (let wave = 0; wave < 3; wave++) {
      this.time.delayedCall(wave * 400, () => {
        if (!this.isVictory) return;
        const particleCount = 30;
        for (let i = 0; i < particleCount; i++) {
          const angle = (Math.PI * 2 * i) / particleCount + wave * 0.3;
          const startDist = Phaser.Math.Between(0, 20);
          const endDist = Phaser.Math.Between(120, 350);
          const colors = [0xFFD54F, 0xFFA000, 0xFF6F00, 0xFFEB3B, 0xFFFFFF, 0xFF8F00];
          const p = this.add.circle(
            cx + Math.cos(angle) * startDist,
            cy + Math.sin(angle) * startDist,
            Phaser.Math.Between(3, 8),
            Phaser.Utils.Array.GetRandom(colors),
            1
          );
          p.setDepth(100);

          const tx = cx + Math.cos(angle) * endDist;
          const ty = cy + Math.sin(angle) * endDist;

          this.tweens.add({
            targets: p,
            x: tx,
            y: ty,
            alpha: 0,
            scale: { from: 1.5, to: 0.1 },
            duration: Phaser.Math.Between(800, 1600),
            ease: 'Cubic.easeOut',
            onComplete: () => p.destroy()
          });
        }
      });
    }

    this.time.delayedCall(500, () => {
      if (!this.isVictory) return;
      this.createVictoryPanel();
    });
  }

  private createVictoryPanel(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.resultPanel = this.add.container(cx, cy);
    this.resultPanel.setDepth(200);
    this.resultPanel.setAlpha(0);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.65);
    overlay.fillRect(-this.scale.width, -this.scale.height, this.scale.width * 2, this.scale.height * 2);
    this.resultPanel.add(overlay);

    const panel = this.add.graphics();
    panel.fillStyle(0x0D47A1, 0.98);
    panel.fillRoundedRect(-260, -180, 520, 360, 20);
    panel.lineStyle(6, 0xFFD54F, 1);
    panel.strokeRoundedRect(-260, -180, 520, 360, 20);
    this.resultPanel.add(panel);

    const cornerGlow = this.add.graphics();
    cornerGlow.fillStyle(0xFFD54F, 0.4);
    cornerGlow.fillCircle(-260, -180, 30);
    cornerGlow.fillCircle(260, -180, 30);
    cornerGlow.fillCircle(-260, 180, 30);
    cornerGlow.fillCircle(260, 180, 30);
    this.resultPanel.add(cornerGlow);

    const stars = this.add.graphics();
    for (let i = 0; i < 8; i++) {
      const sx = -240 + (i % 4) * 160 + 80;
      const sy = -160 + Math.floor(i / 4) * 320 + 20;
      stars.fillStyle(0xFFD54F, 0.9);
      this.drawStar(stars, sx, sy, 5, 14, 6);
    }
    this.resultPanel.add(stars);

    const victoryText = this.add.text(0, -40, '胜利！', {
      fontFamily: 'Georgia, serif',
      fontSize: '80px',
      fontStyle: 'bold',
      color: '#FFD54F'
    }).setOrigin(0.5);
    victoryText.setShadow(6, 6, '#8D6E00', 1);
    victoryText.setScale(0.01);
    victoryText.setAlpha(0);
    this.resultPanel.add(victoryText);

    this.tweens.add({
      targets: this.resultPanel,
      alpha: 1,
      duration: 300,
      ease: 'Linear'
    });

    this.tweens.add({
      targets: victoryText,
      scale: { from: 0.01, to: 1.2 },
      alpha: { from: 0, to: 1 },
      duration: 800,
      ease: 'Back.easeOut',
      delay: 300,
      onComplete: () => {
        this.tweens.add({
          targets: victoryText,
          scale: 1,
          duration: 200,
          ease: 'Quad.easeOut'
        });
      }
    });

    const subText = this.add.text(0, 50, '你成功守住了王国！', {
      fontFamily: 'Georgia, serif',
      fontSize: '26px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    subText.setAlpha(0);
    this.tweens.add({
      targets: subText,
      alpha: 1,
      y: 55,
      duration: 600,
      delay: 1200,
      ease: 'Cubic.easeOut'
    });
    this.resultPanel.add(subText);

    const stats = `剩余生命: ${this.lives}   金币: ${this.gold}`;
    const statsText = this.add.text(0, 100, stats, {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#FFEB3B'
    }).setOrigin(0.5);
    statsText.setAlpha(0);
    this.tweens.add({
      targets: statsText,
      alpha: 1,
      duration: 500,
      delay: 1500
    });
    this.resultPanel.add(statsText);

    const restartBtn = this.createResultButton(0, 160, '重新开始', () => {
      this.scene.restart();
    });
    this.resultPanel.add(restartBtn);
  }

  private showGameOver(): void {
    this.isGameOver = true;

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    for (let i = 0; i < 20; i++) {
      const p = this.add.circle(
        cx + Phaser.Math.Between(-100, 100),
        cy + Phaser.Math.Between(-50, 50),
        Phaser.Math.Between(2, 5),
        0xF44336,
        0.8
      );
      p.setDepth(100);
      this.tweens.add({
        targets: p,
        y: p.y - 80,
        alpha: 0,
        duration: Phaser.Math.Between(600, 1200),
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy()
      });
    }

    this.time.delayedCall(300, () => {
      if (!this.isGameOver) return;
      this.createGameOverPanel();
    });
  }

  private createGameOverPanel(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.resultPanel = this.add.container(cx, cy);
    this.resultPanel.setDepth(200);
    this.resultPanel.setAlpha(0);

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(-this.scale.width, -this.scale.height, this.scale.width * 2, this.scale.height * 2);
    this.resultPanel.add(overlay);

    const panel = this.add.graphics();
    panel.fillStyle(0x263238, 0.98);
    panel.fillRoundedRect(-260, -180, 520, 360, 20);
    this.resultPanel.add(panel);

    const glow = this.add.graphics();
    this.resultPanel.add(glow);

    this.glowTimer = this.time.addEvent({
      delay: 33,
      callback: () => {
        if (!this.resultPanel || !glow.active) return;
        glow.clear();
        const t = this.time.now * 0.005;
        const pulse = 4 + Math.sin(t) * 4;
        const alpha = 0.6 + Math.sin(t) * 0.35;
        glow.lineStyle(pulse, 0xF44336, alpha);
        glow.strokeRoundedRect(-264, -184, 528, 368, 22);
        glow.lineStyle(pulse * 0.5, 0xFF5252, alpha * 0.5);
        glow.strokeRoundedRect(-268, -188, 536, 376, 24);
      },
      loop: true
    });

    const failText = this.add.text(0, -40, '失败...', {
      fontFamily: 'Georgia, serif',
      fontSize: '72px',
      fontStyle: 'bold',
      color: '#F44336'
    }).setOrigin(0.5);
    failText.setShadow(4, 4, '#7F0000', 1);
    this.resultPanel.add(failText);

    this.shakeTimer = this.time.addEvent({
      delay: 800,
      callback: () => {
        if (!this.resultPanel || !failText.active) return;
        this.tweens.add({
          targets: failText,
          x: { from: 0, to: Phaser.Math.Between(-10, 10) },
          y: { from: -40, to: -40 + Phaser.Math.Between(-8, 8) },
          duration: 50,
          yoyo: true,
          repeat: 3,
          ease: 'Linear'
        });
      },
      loop: true
    });

    const subText = this.add.text(0, 50, '王国已沦陷...', {
      fontFamily: 'Georgia, serif',
      fontSize: '26px',
      color: '#FFCDD2',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.resultPanel.add(subText);

    const reached = `坚持到了第 ${this.waveManager.currentWave} 波`;
    const reachedText = this.add.text(0, 100, reached, {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#EF9A9A'
    }).setOrigin(0.5);
    this.resultPanel.add(reachedText);

    this.tweens.add({
      targets: this.resultPanel,
      alpha: 1,
      duration: 400,
      ease: 'Linear'
    });

    const restartBtn = this.createResultButton(0, 160, '重新开始', () => {
      this.cleanupTimers();
      this.scene.restart();
    });
    this.resultPanel.add(restartBtn);
  }

  private cleanupTimers(): void {
    if (this.glowTimer) {
      this.glowTimer.destroy();
      this.glowTimer = null;
    }
    if (this.shakeTimer) {
      this.shakeTimer.destroy();
      this.shakeTimer = null;
    }
  }

  private createResultButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x0D47A1, 1);
    bg.fillRoundedRect(-100, -28, 200, 56, 12);
    bg.lineStyle(3, 0xFFD54F, 1);
    bg.strokeRoundedRect(-100, -28, 200, 56, 12);
    container.add(bg);

    const text = this.add.text(0, 0, label, {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#FFD54F'
    }).setOrigin(0.5);
    container.add(text);

    container.setSize(200, 56);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.fillStyle(0x1565C0, 1);
      bg.fillRoundedRect(-100, -28, 200, 56, 12);
      bg.lineStyle(3, 0xFFD54F, 1);
      bg.strokeRoundedRect(-100, -28, 200, 56, 12);
    });

    container.on('pointerout', () => {
      bg.fillStyle(0x0D47A1, 1);
      bg.fillRoundedRect(-100, -28, 200, 56, 12);
      bg.lineStyle(3, 0xFFD54F, 1);
      bg.strokeRoundedRect(-100, -28, 200, 56, 12);
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 80
      });
    });

    container.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scale: 0.95,
        duration: 80
      });
      bg.fillStyle(0x0A3A85, 1);
      bg.fillRoundedRect(-100, -28, 200, 56, 12);
      bg.lineStyle(3, 0xFFD54F, 1);
      bg.strokeRoundedRect(-100, -28, 200, 56, 12);
    });

    container.on('pointerup', () => {
      onClick();
    });

    return container;
  }

  private drawStar(graphics: Phaser.GameObjects.Graphics, cx: number, cy: number, points: number, outer: number, inner: number): void {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / points;

    graphics.beginPath();
    graphics.moveTo(cx, cy - outer);

    for (let i = 0; i < points; i++) {
      x = cx + Math.cos(rot) * outer;
      y = cy + Math.sin(rot) * outer;
      graphics.lineTo(x, y);
      rot += step;
      x = cx + Math.cos(rot) * inner;
      y = cy + Math.sin(rot) * inner;
      graphics.lineTo(x, y);
      rot += step;
    }

    x = cx;
    y = cy - outer;
    graphics.lineTo(x, y);
    graphics.closePath();
    graphics.fillPath();
  }

  private handleResize(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setSize(w, h);
    this.cameras.main.setScroll(0, 0);
  }
}
