import Phaser from 'phaser';
import { generateMaze, MazeData, CellType } from '../utils/MazeGenerator';

const TILE_SIZE = 48;
const MAZE_SIZE = 10;
const VISION_RANGE = 1;
const MOVE_DURATION = 50;

function lerpColor(color1: number, color2: number, t: number): number {
  const r1 = (color1 >> 16) & 0xff;
  const g1 = (color1 >> 8) & 0xff;
  const b1 = color1 & 0xff;
  const r2 = (color2 >> 16) & 0xff;
  const g2 = (color2 >> 8) & 0xff;
  const b2 = color2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | b;
}

const COLOR_HIGH = 0x39ff14;
const COLOR_MID = 0xffdd00;
const COLOR_LOW = 0xff2200;

function getHpColor(percent: number): number {
  const clamped = Math.max(0, Math.min(1, percent));
  if (clamped >= 0.6) {
    const t = (clamped - 0.6) / 0.4;
    return lerpColor(COLOR_MID, COLOR_HIGH, t);
  } else if (clamped >= 0.3) {
    const t = (clamped - 0.3) / 0.3;
    return lerpColor(COLOR_LOW, COLOR_MID, t);
  } else {
    const t = clamped / 0.3;
    return lerpColor(0x8b0000, COLOR_LOW, t);
  }
}

interface PlayerState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  isMoving: boolean;
}

interface MonsterData {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  defeated: boolean;
  sprite?: Phaser.GameObjects.Container;
}

interface ChestData {
  x: number;
  y: number;
  opened: boolean;
  sprite?: Phaser.GameObjects.Container;
}

export class GameScene extends Phaser.Scene {
  private maze!: MazeData;
  private player!: PlayerState;
  private monsters: MonsterData[] = [];
  private chests: ChestData[] = [];
  private playerSprite!: Phaser.GameObjects.Container;
  private fogTiles: Phaser.GameObjects.Rectangle[][] = [];
  private mapOffsetX = 0;
  private mapOffsetY = 0;
  private keys!: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  };
  private moveRepeatTimer: Phaser.Time.TimerEvent | null = null;
  private currentMoveDir: { dx: number; dy: number } | null = null;
  private particleTexture: Phaser.Textures.CanvasTexture | null = null;
  private floorParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private mazeContainer!: Phaser.GameObjects.Container;
  private inBattle = false;
  private currentMonster: MonsterData | null = null;
  private currentMonsterIndex = -1;

  private hpBar!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private atkText!: Phaser.GameObjects.Text;

  constructor() {
    super('GameScene');
  }

  preload(): void {
    const g = this.add.graphics();
    g.fillStyle(0x39ff14, 1);
    g.fillRect(0, 0, 4, 4);
    g.generateTexture('particle', 4, 4);
    g.destroy();
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#2a0a3e');

    const { width, height } = this.scale;
    this.mapOffsetX = (width - MAZE_SIZE * TILE_SIZE) / 2;
    this.mapOffsetY = (height - MAZE_SIZE * TILE_SIZE) / 2;

    this.maze = generateMaze(MAZE_SIZE, MAZE_SIZE);

    this.player = {
      x: this.maze.startPos.x,
      y: this.maze.startPos.y,
      hp: 100,
      maxHp: 100,
      attack: 15,
      isMoving: false
    };

    this.monsters = this.maze.monsterPositions.map((pos) => ({
      x: pos.x,
      y: pos.y,
      hp: 50 + Math.floor(Math.random() * 30),
      maxHp: 80,
      attack: 8 + Math.floor(Math.random() * 5),
      defeated: false
    }));

    this.chests = this.maze.chestPositions.map((pos) => ({
      x: pos.x,
      y: pos.y,
      opened: false
    }));

    this.mazeContainer = this.add.container(this.mapOffsetX, this.mapOffsetY);

    this.renderMaze();
    this.renderPlayer();
    this.renderFog();
    this.updateFog();

    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as {
      w: Phaser.Input.Keyboard.Key;
      a: Phaser.Input.Keyboard.Key;
      s: Phaser.Input.Keyboard.Key;
      d: Phaser.Input.Keyboard.Key;
    };

    this.keys.w.on('down', () => this.handleMoveStart(0, -1));
    this.keys.s.on('down', () => this.handleMoveStart(0, 1));
    this.keys.a.on('down', () => this.handleMoveStart(-1, 0));
    this.keys.d.on('down', () => this.handleMoveStart(1, 0));

    this.keys.w.on('up', () => this.handleMoveEnd(0, -1));
    this.keys.s.on('up', () => this.handleMoveEnd(0, 1));
    this.keys.a.on('up', () => this.handleMoveEnd(-1, 0));
    this.keys.d.on('up', () => this.handleMoveEnd(1, 0));

    this.createFloorParticles();
    this.createUI();

    this.events.on('battleEnd', this.onBattleEnd, this);
    this.events.on('chestOpened', this.onChestOpened, this);
  }

  private renderMaze(): void {
    const floorGroup = this.add.container(0, 0);
    const wallGroup = this.add.container(0, 0);
    const objectGroup = this.add.container(0, 0);

    for (let y = 0; y < this.maze.height; y++) {
      for (let x = 0; x < this.maze.width; x++) {
        const cell = this.maze.cells[y][x];
        const px = x * TILE_SIZE + TILE_SIZE / 2;
        const py = y * TILE_SIZE + TILE_SIZE / 2;

        if (cell.type !== CellType.WALL) {
          const floor = this.add.rectangle(
            px,
            py,
            TILE_SIZE - 2,
            TILE_SIZE - 2,
            0x1a0528
          );
          floor.setStrokeStyle(1, 0x3d1252);
          floorGroup.add(floor);
        }

        if (cell.type === CellType.WALL) {
          const wall = this.add.rectangle(
            px,
            py,
            TILE_SIZE - 1,
            TILE_SIZE - 1,
            0x120220
          );
          wall.setStrokeStyle(2, 0x4a1870);
          wallGroup.add(wall);
        } else if (cell.type === CellType.START) {
          const startMarker = this.add.rectangle(
            px,
            py,
            TILE_SIZE - 8,
            TILE_SIZE - 8,
            0x1a5c1a
          );
          startMarker.setStrokeStyle(2, 0x39ff14);
          objectGroup.add(startMarker);

          const startText = this.add
            .text(px, py, 'S', {
              fontFamily: 'monospace',
              fontSize: '20px',
              color: '#39ff14',
              fontStyle: 'bold'
            })
            .setOrigin(0.5);
          objectGroup.add(startText);
        } else if (cell.type === CellType.END) {
          const endMarker = this.add.rectangle(
            px,
            py,
            TILE_SIZE - 8,
            TILE_SIZE - 8,
            0x5c1a5c
          );
          endMarker.setStrokeStyle(2, 0xff33ff);
          objectGroup.add(endMarker);

          const endText = this.add
            .text(px, py, 'E', {
              fontFamily: 'monospace',
              fontSize: '20px',
              color: '#ff33ff',
              fontStyle: 'bold'
            })
            .setOrigin(0.5);
          objectGroup.add(endText);
        }
      }
    }

    this.chests.forEach((chest) => {
      const px = chest.x * TILE_SIZE + TILE_SIZE / 2;
      const py = chest.y * TILE_SIZE + TILE_SIZE / 2;

      const chestContainer = this.add.container(px, py);

      const chestBody = this.add.rectangle(0, 2, 28, 22, 0x8b4513);
      chestBody.setStrokeStyle(2, 0x654321);
      chestContainer.add(chestBody);

      const chestLid = this.add.rectangle(0, -8, 30, 10, 0xa0522d);
      chestLid.setStrokeStyle(2, 0x654321);
      chestContainer.add(chestLid);

      const lock = this.add.rectangle(0, -2, 6, 8, 0xffd700);
      chestContainer.add(lock);

      chest.sprite = chestContainer;
      objectGroup.add(chestContainer);
    });

    this.monsters.forEach((monster) => {
      const px = monster.x * TILE_SIZE + TILE_SIZE / 2;
      const py = monster.y * TILE_SIZE + TILE_SIZE / 2;

      const monsterContainer = this.add.container(px, py);

      const body = this.add.rectangle(0, 0, 30, 32, 0x8b0000);
      body.setStrokeStyle(2, 0xff4444);
      monsterContainer.add(body);

      const eye1 = this.add.rectangle(-8, -6, 6, 6, 0xffff00);
      const eye2 = this.add.rectangle(8, -6, 6, 6, 0xffff00);
      monsterContainer.add([eye1, eye2]);

      const mouth = this.add.rectangle(0, 8, 14, 4, 0x000000);
      monsterContainer.add(mouth);

      const horn1 = this.add.rectangle(-10, -18, 4, 8, 0x2f0000);
      const horn2 = this.add.rectangle(10, -18, 4, 8, 0x2f0000);
      monsterContainer.add([horn1, horn2]);

      monster.sprite = monsterContainer;
      objectGroup.add(monsterContainer);
    });

    this.mazeContainer.add(floorGroup);
    this.mazeContainer.add(wallGroup);
    this.mazeContainer.add(objectGroup);
  }

  private renderPlayer(): void {
    const px = this.player.x * TILE_SIZE + TILE_SIZE / 2;
    const py = this.player.y * TILE_SIZE + TILE_SIZE / 2;

    this.playerSprite = this.add.container(px, py);

    const body = this.add.rectangle(0, 0, 24, 28, 0x4169e1);
    body.setStrokeStyle(2, 0x1e90ff);
    this.playerSprite.add(body);

    const head = this.add.rectangle(0, -14, 18, 14, 0xffdbac);
    head.setStrokeStyle(2, 0x8b7355);
    this.playerSprite.add(head);

    const eye1 = this.add.rectangle(-5, -14, 3, 4, 0x000000);
    const eye2 = this.add.rectangle(5, -14, 3, 4, 0x000000);
    this.playerSprite.add([eye1, eye2]);

    const hair = this.add.rectangle(0, -22, 20, 6, 0x4a2511);
    this.playerSprite.add(hair);

    const sword = this.add.rectangle(16, -4, 4, 24, 0xc0c0c0);
    sword.setStrokeStyle(1, 0x808080);
    this.playerSprite.add(sword);

    const hilt = this.add.rectangle(16, 12, 8, 6, 0x8b4513);
    this.playerSprite.add(hilt);

    this.mazeContainer.add(this.playerSprite);
  }

  private renderFog(): void {
    const fogGroup = this.add.container(0, 0);
    fogGroup.setDepth(10);

    for (let y = 0; y < this.maze.height; y++) {
      this.fogTiles[y] = [];
      for (let x = 0; x < this.maze.width; x++) {
        const fog = this.add.rectangle(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE,
          TILE_SIZE,
          0x0a0015,
          0.95
        );
        this.fogTiles[y][x] = fog;
        fogGroup.add(fog);
      }
    }

    this.mazeContainer.add(fogGroup);
  }

  private updateFog(): void {
    for (let y = 0; y < this.maze.height; y++) {
      for (let x = 0; x < this.maze.width; x++) {
        const dist = Math.abs(x - this.player.x) + Math.abs(y - this.player.y);
        const fog = this.fogTiles[y][x];

        if (dist <= VISION_RANGE) {
          fog.setAlpha(0);
        } else if (dist <= VISION_RANGE + 1) {
          fog.setAlpha(0.5);
        } else {
          fog.setAlpha(0.95);
        }
      }
    }
  }

  private createFloorParticles(): void {
    const particles = this.add.particles(0, 0, 'particle', {
      speed: { min: 5, max: 15 },
      angle: { min: -120, max: -60 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 300,
      quantity: 0,
      tint: 0x39ff14
    });

    this.floorParticles = particles;
    particles.setDepth(5);
    this.mazeContainer.add(particles);
  }

  private emitMoveParticles(): void {
    if (this.floorParticles) {
      const px = this.playerSprite.x;
      const py = this.playerSprite.y + 10;
      this.floorParticles.setPosition(px, py);
      this.floorParticles.explode(5);
    }
  }

  private createUI(): void {
    const { width } = this.scale;

    const hpBarBg = this.add.rectangle(20, 20, 200, 30, 0x1a0528);
    hpBarBg.setOrigin(0, 0);
    hpBarBg.setStrokeStyle(2, 0x39ff14);
    hpBarBg.setScrollFactor(0);
    hpBarBg.setDepth(100);

    this.hpBar = this.add.rectangle(23, 23, 194, 24, 0x39ff14);
    this.hpBar.setOrigin(0, 0);
    this.hpBar.setScrollFactor(0);
    this.hpBar.setDepth(101);

    this.hpText = this.add
      .text(120, 35, 'HP: 100/100', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(102);

    this.atkText = this.add
      .text(20, 60, `攻击力: ${this.player.attack}`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#39ff14'
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(100);

    const hintText = this.add
      .text(width - 20, 20, 'WASD 移动', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#39ff14'
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);
  }

  private updateUI(): void {
    const hpPercent = this.player.hp / this.player.maxHp;
    const maxWidth = 194;
    this.hpBar.width = Math.max(0, maxWidth * hpPercent);

    this.hpBar.setFillStyle(getHpColor(hpPercent));

    this.hpText.setText(`HP: ${Math.max(0, this.player.hp)}/${this.player.maxHp}`);
    this.atkText.setText(`攻击力: ${this.player.attack}`);
  }

  update(): void {
  }

  private handleMoveStart(dx: number, dy: number): void {
    if (this.inBattle) return;

    this.currentMoveDir = { dx, dy };
    this.tryMove(dx, dy);

    if (!this.moveRepeatTimer) {
      this.moveRepeatTimer = this.time.addEvent({
        delay: MOVE_DURATION,
        loop: true,
        callback: () => {
          if (this.currentMoveDir && !this.player.isMoving && !this.inBattle) {
            this.tryMove(this.currentMoveDir.dx, this.currentMoveDir.dy);
          }
        }
      });
    }
  }

  private handleMoveEnd(dx: number, dy: number): void {
    if (
      this.currentMoveDir &&
      this.currentMoveDir.dx === dx &&
      this.currentMoveDir.dy === dy
    ) {
      this.currentMoveDir = null;
      if (this.moveRepeatTimer) {
        this.moveRepeatTimer.remove();
        this.moveRepeatTimer = null;
      }
    }
  }

  private tryMove(dx: number, dy: number): void {
    const newX = this.player.x + dx;
    const newY = this.player.y + dy;

    if (
      newX < 0 ||
      newX >= this.maze.width ||
      newY < 0 ||
      newY >= this.maze.height
    ) {
      return;
    }

    if (this.maze.cells[newY][newX].type === CellType.WALL) {
      return;
    }

    this.player.isMoving = true;
    this.player.x = newX;
    this.player.y = newY;

    const targetX = newX * TILE_SIZE + TILE_SIZE / 2;
    const targetY = newY * TILE_SIZE + TILE_SIZE / 2;

    this.playerSprite.x = targetX;
    this.playerSprite.y = targetY;

    this.updateFog();
    this.emitMoveParticles();
    this.checkCurrentCell();

    this.time.delayedCall(MOVE_DURATION, () => {
      this.player.isMoving = false;
    });
  }

  private checkCurrentCell(): void {
    const cell = this.maze.cells[this.player.y][this.player.x];

    if (cell.type === CellType.END) {
      this.showVictory();
      return;
    }

    if (cell.type === CellType.CHEST) {
      const chest = this.chests.find(
        (c) => c.x === this.player.x && c.y === this.player.y
      );
      if (chest && !chest.opened) {
        this.openChest(chest);
      }
    }

    this.checkNearbyMonsters();
  }

  private checkNearbyMonsters(): void {
    for (let i = 0; i < this.monsters.length; i++) {
      const monster = this.monsters[i];
      if (monster.defeated) continue;

      const dist =
        Math.abs(monster.x - this.player.x) +
        Math.abs(monster.y - this.player.y);

      if (dist <= 2) {
        this.startBattle(i);
        return;
      }
    }
  }

  private startBattle(monsterIndex: number): void {
    const monster = this.monsters[monsterIndex];
    if (monster.defeated) return;

    this.inBattle = true;
    this.currentMonster = monster;
    this.currentMonsterIndex = monsterIndex;

    this.scene.launch('BattleScene', {
      playerHp: this.player.hp,
      playerMaxHp: this.player.maxHp,
      playerAttack: this.player.attack,
      monsterHp: monster.hp,
      monsterMaxHp: monster.maxHp,
      monsterAttack: monster.attack,
      monsterIndex: monsterIndex
    });

    this.scene.pause();
  }

  private onBattleEnd(data: {
    victory: boolean;
    playerHp: number;
    monsterIndex: number;
  }): void {
    this.scene.resume();
    this.scene.stop('BattleScene');

    this.player.hp = data.playerHp;
    this.updateUI();

    if (data.victory) {
      const monster = this.monsters[data.monsterIndex];
      monster.defeated = true;
      if (monster.sprite) {
        monster.sprite.setVisible(false);
      }

      this.maze.cells[monster.y][monster.x].type = CellType.FLOOR;

      this.showMessage('战斗胜利！获得宝箱奖励');
      this.grantRandomReward();
    } else {
      this.showMessage('战斗失败...');
      this.time.delayedCall(1500, () => {
        this.scene.start('MenuScene');
      });
    }

    this.inBattle = false;
    this.currentMonster = null;
    this.currentMonsterIndex = -1;
  }

  private grantRandomReward(): void {
    if (Math.random() > 0.5) {
      const heal = 20 + Math.floor(Math.random() * 20);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
      this.showMessage(`恢复 ${heal} 点生命！`);
    } else {
      const atkUp = 2 + Math.floor(Math.random() * 4);
      this.player.attack += atkUp;
      this.showMessage(`攻击力 +${atkUp}！`);
    }
    this.updateUI();
  }

  private openChest(chest: ChestData): void {
    chest.opened = true;

    if (chest.sprite) {
      chest.sprite.setAlpha(0.4);
    }

    this.maze.cells[chest.y][chest.x].type = CellType.FLOOR;

    if (Math.random() > 0.5) {
      const heal = 15 + Math.floor(Math.random() * 25);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
      this.showMessage(`宝箱：恢复 ${heal} 点生命！`);
    } else {
      const atkUp = 3 + Math.floor(Math.random() * 5);
      this.player.attack += atkUp;
      this.showMessage(`宝箱：攻击力 +${atkUp}！`);
    }

    this.updateUI();
  }

  private onChestOpened(): void {
    this.updateUI();
  }

  private showMessage(msg: string): void {
    const { width, height } = this.scale;

    const message = this.add
      .text(width / 2, height / 2 - 50, msg, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#39ff14',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);

    message.setStroke('#2a0a3e', 6);

    this.tweens.add({
      targets: message,
      y: height / 2 - 100,
      alpha: 0,
      duration: 1500,
      ease: 'Power2.out',
      onComplete: () => {
        message.destroy();
      }
    });
  }

  private showVictory(): void {
    const { width, height } = this.scale;

    const overlay = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.7
    );
    overlay.setScrollFactor(0);
    overlay.setDepth(300);

    this.add
      .text(width / 2, height / 2 - 40, '恭喜通关！', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#39ff14',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(301)
      .setStroke('#2a0a3e', 8);

    this.add
      .text(width / 2, height / 2 + 30, '按任意键返回主菜单', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#39ff14'
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(301);

    this.input.keyboard!.once('keydown', () => {
      this.scene.start('MenuScene');
    });

    this.input.once('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }
}
