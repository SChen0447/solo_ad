import Phaser from 'phaser';
import {
  generateDungeon,
  verifyConnectivity,
  TILE,
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  MapData,
} from './mapGen';

interface Chest {
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Rectangle;
  collected: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  sprite: Phaser.GameObjects.Arc;
}

export class GameScene extends Phaser.Scene {
  private mapData!: MapData;
  private player!: Phaser.GameObjects.Arc;
  private playerGridX: number = 0;
  private playerGridY: number = 0;
  private targetGridX: number = 0;
  private targetGridY: number = 0;
  private isMoving: boolean = false;
  private moveSpeed: number = 3;
  private moveProgress: number = 0;

  private graphics!: Phaser.GameObjects.Graphics;
  private minimapGraphics!: Phaser.GameObjects.Graphics;
  private minimapContainer!: Phaser.GameObjects.Container;
  private minimapScale: number = 0.25;

  private explored: boolean[][] = [];
  private exploredTiles: number = 0;
  private totalFloorTiles: number = 0;
  private lastMilestone: number = 0;

  private chests: Chest[] = [];
  private particles: Particle[] = [];

  private keys!: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  };

  private seedInput!: HTMLInputElement;
  private generateBtn!: HTMLButtonElement;
  private progressText!: Phaser.GameObjects.Text;

  private mapFadeTween!: Phaser.Tweens.Tween | null;
  private haloGraphics!: Phaser.GameObjects.Graphics;

  private victoryModal!: Phaser.GameObjects.Container | null;

  private camera!: Phaser.Cameras.Scene2D.Camera;
  private worldWidth: number = MAP_WIDTH * TILE_SIZE;
  private worldHeight: number = MAP_HEIGHT * TILE_SIZE;

  constructor() {
    super('GameScene');
  }

  preload(): void {}

  create(): void {
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor('#1a1a2e');
    this.camera.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.keys = {
      w: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.createUI();
    this.generateMapWithSeed(Date.now());
    this.createMinimap();
    this.createHaloEffect();
  }

  private createUI(): void {
    const barHeight = 50;
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;

    this.add.dom(gameWidth / 2, gameHeight - barHeight / 2).createFromHTML(`
      <div style="width: ${gameWidth}px; height: ${barHeight}px; background: rgba(0,0,0,0.6); display: flex; align-items: center; padding: 0 20px; gap: 15px; font-family: 'Segoe UI', sans-serif;">
        <input type="text" id="seed-input" placeholder="输入种子值" style="padding: 8px; border-radius: 8px; border: 2px solid white; background: rgba(255,255,255,0.1); color: white; font-family: 'Segoe UI', sans-serif; width: 150px; outline: none;">
        <button id="generate-btn" style="padding: 8px 20px; background: #1a5276; color: white; border: none; border-radius: 6px; cursor: pointer; font-family: 'Segoe UI', sans-serif; transition: all 0.2s ease;">生成地图</button>
        <span id="progress-label" style="color: white; font-family: 'Segoe UI', sans-serif;">探索进度: 0%</span>
      </div>
    `);

    this.seedInput = document.getElementById('seed-input') as HTMLInputElement;
    this.generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;

    this.generateBtn.addEventListener('mouseenter', () => {
      this.generateBtn.style.background = '#2980b9';
      this.generateBtn.style.transform = 'scale(1.05)';
    });
    this.generateBtn.addEventListener('mouseleave', () => {
      this.generateBtn.style.background = '#1a5276';
      this.generateBtn.style.transform = 'scale(1)';
    });
    this.generateBtn.addEventListener('click', () => {
      const seed = this.seedInput.value ? parseInt(this.seedInput.value) : Date.now();
      this.generateMapWithSeed(seed);
    });

    this.seedInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const seed = this.seedInput.value ? parseInt(this.seedInput.value) : Date.now();
        this.generateMapWithSeed(seed);
      }
    });

    this.progressText = this.add
      .text(gameWidth - 20, gameHeight - barHeight / 2, '探索进度: 0%', {
        fontFamily: "'Segoe UI', sans-serif",
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(100);
  }

  private createMinimap(): void {
    const gameWidth = this.scale.width;
    const minimapWidth = this.worldWidth * this.minimapScale;
    const minimapHeight = this.worldHeight * this.minimapScale;

    this.minimapGraphics = this.add.graphics();
    this.minimapGraphics.setScrollFactor(0);

    const border = this.add
      .rectangle(
        gameWidth - minimapWidth / 2 - 15,
        minimapHeight / 2 + 15,
        minimapWidth + 4,
        minimapHeight + 4,
        0xffffff,
        0.3
      )
      .setScrollFactor(0)
      .setDepth(90);

    border.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, minimapWidth + 4, minimapHeight + 4),
      Phaser.Geom.Rectangle.Contains
    );

    border.on('pointerover', () => {
      this.minimapContainer.setScale(1.2);
    });
    border.on('pointerout', () => {
      this.minimapContainer.setScale(1);
    });

    this.minimapContainer = this.add.container(
      gameWidth - minimapWidth / 2 - 15,
      minimapHeight / 2 + 15,
      [this.minimapGraphics]
    );
    this.minimapContainer.setDepth(95);
    this.minimapContainer.setScrollFactor(0);
  }

  private createHaloEffect(): void {
    this.haloGraphics = this.add.graphics();
    this.haloGraphics.setScrollFactor(0);
    this.haloGraphics.setDepth(200);
    this.haloGraphics.setAlpha(0);
  }

  private showHaloEffect(): void {
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;
    const thickness = 50;

    this.haloGraphics.clear();

    const gradientTexture = this.textures.createCanvas('halo-gradient', gameWidth, gameHeight);
    const ctx = gradientTexture.getContext();

    const gradient = ctx.createRadialGradient(
      gameWidth / 2,
      gameHeight / 2,
      Math.min(gameWidth, gameHeight) * 0.3,
      gameWidth / 2,
      gameHeight / 2,
      Math.max(gameWidth, gameHeight) * 0.7
    );
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0)');
    gradient.addColorStop(0.7, 'rgba(255, 215, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0.8)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    gradientTexture.refresh();

    const halo = this.add.image(gameWidth / 2, gameHeight / 2, 'halo-gradient');
    halo.setScrollFactor(0);
    halo.setDepth(200);
    halo.setAlpha(0);

    this.tweens.add({
      targets: halo,
      alpha: { from: 0.8, to: 0 },
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        halo.destroy();
        gradientTexture.destroy();
      },
    });
  }

  private generateMapWithSeed(seed: number): void {
    const startTime = performance.now();

    this.mapData = generateDungeon(seed);
    while (!verifyConnectivity(this.mapData) || this.mapData.rooms.length < 6) {
      this.mapData = generateDungeon(++seed);
    }

    this.initExploredArray();
    this.calculateTotalFloorTiles();
    this.placeChests();

    if (this.graphics) {
      this.graphics.destroy();
    }
    this.graphics = this.add.graphics();
    this.graphics.setAlpha(0);
    this.renderMap();

    this.spawnPlayer();

    if (this.mapFadeTween) {
      this.mapFadeTween.stop();
    }
    this.mapFadeTween = this.tweens.add({
      targets: this.graphics,
      alpha: { from: 0, to: 1 },
      duration: 500,
      ease: 'Cubic.easeIn',
    });

    this.exploredTiles = 0;
    this.lastMilestone = 0;
    this.updateProgress();

    this.exploreArea(this.playerGridX, this.playerGridY, 3);

    const endTime = performance.now();
    console.log(`地图生成耗时: ${(endTime - startTime).toFixed(2)}ms`);

    this.hideVictoryModal();
  }

  private initExploredArray(): void {
    this.explored = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      this.explored[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        this.explored[y][x] = false;
      }
    }
  }

  private calculateTotalFloorTiles(): void {
    this.totalFloorTiles = 0;
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (this.mapData.tiles[y][x] === TILE.FLOOR) {
          this.totalFloorTiles++;
        }
      }
    }
  }

  private placeChests(): void {
    for (const chest of this.chests) {
      chest.sprite.destroy();
    }
    this.chests = [];

    const numChests = Phaser.Math.Between(3, 5);
    const floorTiles: { x: number; y: number }[] = [];

    for (let y = 1; y < MAP_HEIGHT - 1; y++) {
      for (let x = 1; x < MAP_WIDTH - 1; x++) {
        if (this.mapData.tiles[y][x] === TILE.FLOOR) {
          if (this.mapData.rooms[0].centerX === x && this.mapData.rooms[0].centerY === y) continue;

          const distFromStart =
            Math.abs(x - this.mapData.rooms[0].centerX) + Math.abs(y - this.mapData.rooms[0].centerY);
          if (distFromStart > 5) {
            floorTiles.push({ x, y });
          }
        }
      }
    }

    Phaser.Utils.Array.Shuffle(floorTiles);

    for (let i = 0; i < Math.min(numChests, floorTiles.length); i++) {
      const pos = floorTiles[i];
      const chestSprite = this.add.rectangle(
        pos.x * TILE_SIZE + TILE_SIZE / 2,
        pos.y * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE * 0.7,
        TILE_SIZE * 0.7,
        0xffd700
      );
      chestSprite.setDepth(10);

      this.chests.push({
        x: pos.x,
        y: pos.y,
        sprite: chestSprite,
        collected: false,
      });
    }
  }

  private renderMap(): void {
    this.graphics.clear();

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = this.mapData.tiles[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (tile === TILE.WALL) {
          const isCorner = this.isWallCorner(x, y);

          this.graphics.fillStyle(0x16213e);

          if (isCorner) {
            this.graphics.fillRoundedRect(px, py, TILE_SIZE, TILE_SIZE, 2);
          } else {
            this.graphics.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          }
        } else {
          this.graphics.fillStyle(0x0f3460);
          this.graphics.fillRect(px, py, TILE_SIZE, TILE_SIZE);

          this.graphics.lineStyle(1, 0x1a1a2e, 0.3);
          this.graphics.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  private isWallCorner(x: number, y: number): boolean {
    if (this.mapData.tiles[y][x] !== TILE.WALL) return false;

    const dirs = [
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
    ];

    let floorNeighbors = 0;
    for (const dir of dirs) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
        if (this.mapData.tiles[ny][nx] === TILE.FLOOR) {
          floorNeighbors++;
        }
      }
    }

    return floorNeighbors >= 2;
  }

  private spawnPlayer(): void {
    if (this.player) {
      this.player.destroy();
    }

    const startRoom = this.mapData.rooms[0];
    this.playerGridX = startRoom.centerX;
    this.playerGridY = startRoom.centerY;
    this.targetGridX = this.playerGridX;
    this.targetGridY = this.playerGridY;

    this.player = this.add.arc(
      this.playerGridX * TILE_SIZE + TILE_SIZE / 2,
      this.playerGridY * TILE_SIZE + TILE_SIZE / 2,
      TILE_SIZE * 0.4,
      0,
      360,
      false,
      0xe94560
    );
    this.player.setDepth(50);

    this.camera.startFollow(this.player, true, 0.1, 0.1);
  }

  private exploreArea(centerX: number, centerY: number, radius: number): void {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
          if (!this.explored[y][x] && this.mapData.tiles[y][x] === TILE.FLOOR) {
            this.explored[y][x] = true;
            this.exploredTiles++;
          }
        }
      }
    }
    this.updateProgress();
  }

  private updateProgress(): void {
    const percentage = this.totalFloorTiles > 0 ? Math.round((this.exploredTiles / this.totalFloorTiles) * 100) : 0;
    this.progressText.setText(`探索进度: ${percentage}%`);

    const currentMilestone = Math.floor(percentage / 10);
    if (currentMilestone > this.lastMilestone && currentMilestone < 10) {
      this.lastMilestone = currentMilestone;
      this.showHaloEffect();
    }

    if (percentage >= 100) {
      this.showVictoryModal();
    }
  }

  private showVictoryModal(): void {
    if (this.victoryModal) return;

    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;

    const modalDOM = this.add.dom(gameWidth / 2, gameHeight / 2).createFromHTML(`
      <div id="victory-modal" style="
        position: fixed;
        top: 0;
        left: 0;
        width: ${gameWidth}px;
        height: ${gameHeight}px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        font-family: 'Segoe UI', sans-serif;
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: 1000;
      ">
        <div style="
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-radius: 16px;
          padding: 40px 60px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.2);
        ">
          <h1 style="color: #ffd700; font-size: 32px; margin: 0 0 20px 0; font-weight: bold;">🎉 探索完成！</h1>
          <p style="color: #ffffff; font-size: 18px; margin: 0 0 30px 0;">你已探索完整个地牢！</p>
          <button id="restart-btn" style="
            padding: 12px 30px;
            background: #1a5276;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-family: 'Segoe UI', sans-serif;
            font-size: 16px;
            transition: all 0.2s ease;
          ">开始新地图</button>
        </div>
      </div>
    `);
    modalDOM.setScrollFactor(0);
    modalDOM.setDepth(500);

    const modalElement = document.getElementById('victory-modal') as HTMLDivElement;
    requestAnimationFrame(() => {
      modalElement.style.opacity = '1';
    });

    const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
    restartBtn.addEventListener('mouseenter', () => {
      restartBtn.style.background = '#2980b9';
      restartBtn.style.transform = 'scale(1.05)';
    });
    restartBtn.addEventListener('mouseleave', () => {
      restartBtn.style.background = '#1a5276';
      restartBtn.style.transform = 'scale(1)';
    });
    restartBtn.addEventListener('click', () => {
      const seed = this.seedInput.value ? parseInt(this.seedInput.value) + 1 : Date.now();
      this.seedInput.value = seed.toString();
      this.generateMapWithSeed(seed);
    });

    this.victoryModal = this.add.container(0, 0, [modalDOM]);
  }

  private hideVictoryModal(): void {
    if (this.victoryModal) {
      this.victoryModal.destroy();
      this.victoryModal = null;
    }
  }

  private checkChestPickup(): void {
    for (const chest of this.chests) {
      if (chest.collected) continue;

      const dist =
        Math.abs(this.playerGridX - chest.x) + Math.abs(this.playerGridY - chest.y);
      if (dist <= 1) {
        chest.collected = true;

        this.tweens.add({
          targets: chest.sprite,
          scale: { from: 1, to: 0 },
          rotation: { from: 0, to: Math.PI * 2 },
          alpha: { from: 1, to: 0 },
          duration: 300,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            chest.sprite.destroy();
          },
        });

        this.showPickupToast();
      }
    }
  }

  private showPickupToast(): void {
    const toast = this.add
      .text(this.player.x, this.player.y - TILE_SIZE, '📦 +1 宝箱', {
        fontFamily: "'Segoe UI', sans-serif",
        fontSize: '16px',
        color: '#ffd700',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(100);

    this.tweens.add({
      targets: toast,
      y: toast.y - 30,
      alpha: { from: 1, to: 0 },
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        toast.destroy();
      },
    });
  }

  private createStepParticles(): void {
    const numParticles = Phaser.Math.Between(3, 5);

    for (let i = 0; i < numParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.FloatBetween(20, 50);

      const particleSprite = this.add.arc(
        this.player.x,
        this.player.y,
        Phaser.Math.FloatBetween(2, 4),
        0,
        360,
        false,
        0x888888
      );
      particleSprite.setDepth(5);

      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 200,
        sprite: particleSprite,
      });
    }
  }

  private updateParticles(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        p.sprite.destroy();
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * (delta / 1000);
      p.y += p.vy * (delta / 1000);
      p.vx *= 0.95;
      p.vy *= 0.95;

      const alpha = 1 - p.life / p.maxLife;
      p.sprite.setPosition(p.x, p.y);
      p.sprite.setAlpha(alpha);
    }
  }

  private updateMinimap(): void {
    this.minimapGraphics.clear();

    const tileScale = TILE_SIZE * this.minimapScale;

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const px = (x - MAP_WIDTH / 2) * tileScale;
        const py = (y - MAP_HEIGHT / 2) * tileScale;

        if (this.explored[y][x]) {
          if (this.mapData.tiles[y][x] === TILE.FLOOR) {
            this.minimapGraphics.fillStyle(0xaaaaaa);
          } else {
            this.minimapGraphics.fillStyle(0x666666);
          }
        } else {
          this.minimapGraphics.fillStyle(0x333333);
        }

        this.minimapGraphics.fillRect(px, py, tileScale, tileScale);
      }
    }

    for (const chest of this.chests) {
      if (!chest.collected && this.explored[chest.y][chest.x]) {
        const cx = (chest.x - MAP_WIDTH / 2) * tileScale + tileScale / 2;
        const cy = (chest.y - MAP_HEIGHT / 2) * tileScale + tileScale / 2;
        this.minimapGraphics.fillStyle(0xffd700);
        this.minimapGraphics.fillCircle(cx, cy, tileScale * 0.6);
      }
    }

    const playerX = (this.playerGridX - MAP_WIDTH / 2) * tileScale + tileScale / 2;
    const playerY = (this.playerGridY - MAP_HEIGHT / 2) * tileScale + tileScale / 2;

    const blinkAlpha = Math.sin(this.time.now * 0.01) > 0 ? 1 : 0.3;
    this.minimapGraphics.fillStyle(0x00ff00);
    this.minimapGraphics.fillCircle(playerX, playerY, tileScale * 0.8);
    this.minimapGraphics.fillStyle(0x00ff00, blinkAlpha);
    this.minimapGraphics.fillCircle(playerX, playerY, tileScale * 1.2);
  }

  update(time: number, delta: number): void {
    if (!this.mapData) return;

    this.handleInput();
    this.updatePlayerMovement(delta);
    this.updateParticles(delta);
    this.updateMinimap();
  }

  private handleInput(): void {
    if (this.isMoving) return;

    let dx = 0;
    let dy = 0;

    if (this.keys.w.isDown) dy = -1;
    else if (this.keys.s.isDown) dy = 1;
    else if (this.keys.a.isDown) dx = -1;
    else if (this.keys.d.isDown) dx = 1;

    if (dx !== 0 || dy !== 0) {
      const newX = this.playerGridX + dx;
      const newY = this.playerGridY + dy;

      if (this.canMoveTo(newX, newY)) {
        this.targetGridX = newX;
        this.targetGridY = newY;
        this.isMoving = true;
        this.moveProgress = 0;
        this.createStepParticles();
      }
    }
  }

  private canMoveTo(x: number, y: number): boolean {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
    return this.mapData.tiles[y][x] === TILE.FLOOR;
  }

  private updatePlayerMovement(delta: number): void {
    if (!this.isMoving) return;

    const moveDuration = 1000 / this.moveSpeed;
    this.moveProgress += delta / moveDuration;

    if (this.moveProgress >= 1) {
      this.moveProgress = 1;
      this.isMoving = false;
      this.playerGridX = this.targetGridX;
      this.playerGridY = this.targetGridY;

      this.exploreArea(this.playerGridX, this.playerGridY, 3);
      this.checkChestPickup();
    }

    const startX = this.playerGridX * TILE_SIZE + TILE_SIZE / 2;
    const startY = this.playerGridY * TILE_SIZE + TILE_SIZE / 2;
    const endX = this.targetGridX * TILE_SIZE + TILE_SIZE / 2;
    const endY = this.targetGridY * TILE_SIZE + TILE_SIZE / 2;

    const easedProgress = Phaser.Math.Easing.Sine.InOut(this.moveProgress);
    const currentX = Phaser.Math.Linear(startX, endX, easedProgress);
    const currentY = Phaser.Math.Linear(startY, endY, easedProgress);

    this.player.setPosition(currentX, currentY);
  }
}
