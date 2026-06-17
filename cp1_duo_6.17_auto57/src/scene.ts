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

interface Footprint {
  sprite: Phaser.GameObjects.Arc;
  life: number;
  maxLife: number;
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
  private minimapRenderTexture!: Phaser.GameObjects.RenderTexture;
  private minimapGraphics!: Phaser.GameObjects.Graphics;
  private minimapContainer!: Phaser.GameObjects.Container;
  private minimapBorder!: Phaser.GameObjects.Rectangle;
  private minimapGlow!: Phaser.GameObjects.Rectangle;
  private minimapScale: number = 0.25;
  private minimapDirty: boolean = true;

  private explored: boolean[][] = [];
  private visible: boolean[][] = [];
  private exploredTiles: number = 0;
  private totalFloorTiles: number = 0;
  private lastMilestone: number = 0;

  private chests: Chest[] = [];
  private particles: Particle[] = [];
  private footprints: Footprint[] = [];

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

  private victoryModalElement: HTMLDivElement | null = null;

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
    this.createMinimap();
    this.createHaloEffect();
    this.generateMapWithSeed(Date.now());
  }

  private createUI(): void {
    const barHeight = 50;
    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;

    const uiContainer = this.add.dom(gameWidth / 2, gameHeight - barHeight / 2).createFromHTML(`
      <div id="game-ui-bar" style="
        width: ${gameWidth}px;
        height: ${barHeight}px;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        padding: 0 20px;
        gap: 35px;
        font-family: 'Segoe UI', sans-serif;
        position: relative;
        z-index: 100;
      ">
        <input type="text" id="seed-input" placeholder="输入种子值"
          style="
            padding: 8px;
            border-radius: 8px;
            border: 2px solid white;
            background: rgba(255,255,255,0.1);
            color: white;
            font-family: 'Segoe UI', sans-serif;
            width: 150px;
            outline: none;
          "
        />
        <button id="generate-btn"
          style="
            padding: 8px 20px;
            background: #1a5276;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-family: 'Segoe UI', sans-serif;
            transition: all 0.2s ease;
          "
        >生成地图</button>
        <span id="progress-label"
          style="
            color: white;
            font-family: 'Segoe UI', sans-serif;
          "
        >探索进度: 0%</span>
      </div>
    `);
    uiContainer.setDepth(100);

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
    this.generateBtn.addEventListener('mousedown', () => {
      this.generateBtn.style.transform = 'scale(0.95)';
    });
    this.generateBtn.addEventListener('mouseup', () => {
      this.generateBtn.style.transform = 'scale(1.05)';
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
      .setDepth(101);
  }

  private createMinimap(): void {
    const gameWidth = this.scale.width;

    const minimapDisplayWidth = this.worldWidth * this.minimapScale;
    const minimapDisplayHeight = this.worldHeight * this.minimapScale;
    const centerX = gameWidth - minimapDisplayWidth / 2 - 15;
    const centerY = minimapDisplayHeight / 2 + 15;

    this.minimapGlow = this.add
      .rectangle(
        centerX,
        centerY,
        minimapDisplayWidth + 20,
        minimapDisplayHeight + 20,
        0xffd700,
        0
      )
      .setScrollFactor(0)
      .setDepth(88);
    this.minimapGlow.setStrokeStyle(3, 0xffd700, 0);
    this.minimapGlow.setAlpha(0);

    this.minimapBorder = this.add
      .rectangle(
        centerX,
        centerY,
        minimapDisplayWidth + 4,
        minimapDisplayHeight + 4,
        0xffffff,
        0.3
      )
      .setScrollFactor(0)
      .setDepth(90);

    this.minimapRenderTexture = this.add
      .renderTexture(centerX, centerY, minimapDisplayWidth, minimapDisplayHeight)
      .setScrollFactor(0)
      .setDepth(91);

    this.minimapContainer = this.add.container(centerX, centerY, [
      this.minimapRenderTexture,
    ]);
    this.minimapContainer.setDepth(95);
    this.minimapContainer.setScrollFactor(0);

    this.minimapGraphics = this.add.graphics();
    this.minimapGraphics.setVisible(false);

    this.minimapBorder.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, minimapDisplayWidth + 4, minimapDisplayHeight + 4),
      Phaser.Geom.Rectangle.Contains
    );

    this.minimapBorder.on('pointerover', () => {
      this.tweens.add({
        targets: this.minimapContainer,
        scale: 1.5,
        duration: 200,
        ease: 'Cubic.easeOut',
      });
      this.tweens.add({
        targets: this.minimapBorder,
        scale: 1.5,
        duration: 200,
        ease: 'Cubic.easeOut',
      });
      this.tweens.add({
        targets: this.minimapGlow,
        scale: 1.5,
        alpha: 0.6,
        duration: 200,
        ease: 'Cubic.easeOut',
        onUpdate: (tween) => {
          const progress = tween.progress;
          this.minimapGlow.setStrokeStyle(3 + progress * 5, 0xffd700, progress * 0.8);
          this.minimapGlow.setFillStyle(0xffd700, progress * 0.1);
        },
      });
    });
    this.minimapBorder.on('pointerout', () => {
      this.tweens.add({
        targets: this.minimapContainer,
        scale: 1,
        duration: 200,
        ease: 'Cubic.easeOut',
      });
      this.tweens.add({
        targets: this.minimapBorder,
        scale: 1,
        duration: 200,
        ease: 'Cubic.easeOut',
      });
      this.tweens.add({
        targets: this.minimapGlow,
        scale: 1,
        alpha: 0,
        duration: 200,
        ease: 'Cubic.easeOut',
        onUpdate: (tween) => {
          const progress = 1 - tween.progress;
          this.minimapGlow.setStrokeStyle(3 + progress * 5, 0xffd700, progress * 0.8);
          this.minimapGlow.setFillStyle(0xffd700, progress * 0.1);
        },
        onComplete: () => {
          this.minimapGlow.setStrokeStyle(3, 0xffd700, 0);
          this.minimapGlow.setFillStyle(0xffd700, 0);
        },
      });
    });
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

    this.haloGraphics.clear();

    const gradientTexture = this.textures.createCanvas(
      'halo-gradient-' + this.time.now,
      gameWidth,
      gameHeight
    );
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

    const halo = this.add.image(gameWidth / 2, gameHeight / 2, gradientTexture);
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
    let attempts = 0;
    while (
      (!verifyConnectivity(this.mapData) || this.mapData.rooms.length < 6) &&
      attempts < 10
    ) {
      this.mapData = generateDungeon(++seed);
      attempts++;
    }

    this.initExploredArray();
    this.calculateTotalFloorTiles();
    this.placeChests();

    for (const fp of this.footprints) {
      fp.sprite.destroy();
    }
    this.footprints = [];

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

    this.updateVisibility(this.playerGridX, this.playerGridY, 4);
    this.markExploredFromVisible();

    this.minimapDirty = true;
    this.renderMinimap();

    const endTime = performance.now();
    console.log(`地图生成耗时: ${(endTime - startTime).toFixed(2)}ms, 房间数: ${this.mapData.rooms.length}`);

    this.hideVictoryModal();
  }

  private initExploredArray(): void {
    this.explored = [];
    this.visible = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      this.explored[y] = [];
      this.visible[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        this.explored[y][x] = false;
        this.visible[y][x] = false;
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

  private updateVisibility(centerX: number, centerY: number, viewRadius: number): void {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        this.visible[y][x] = false;
      }
    }

    for (let angle = 0; angle < 360; angle += 1) {
      const rad = (angle * Math.PI) / 180;
      const dx = Math.cos(rad);
      const dy = Math.sin(rad);

      for (let dist = 0; dist <= viewRadius; dist += 0.5) {
        const x = Math.floor(centerX + dx * dist + 0.5);
        const y = Math.floor(centerY + dy * dist + 0.5);

        if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) break;

        this.visible[y][x] = true;

        if (this.mapData.tiles[y][x] === TILE.WALL) {
          break;
        }
      }
    }

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
          this.visible[y][x] = true;
        }
      }
    }
  }

  private markExploredFromVisible(): void {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (this.visible[y][x] && !this.explored[y][x]) {
          if (this.mapData.tiles[y][x] === TILE.FLOOR) {
            this.explored[y][x] = true;
            this.exploredTiles++;
            this.minimapDirty = true;
          } else if (this.mapData.tiles[y][x] === TILE.WALL) {
            let hasFloorNeighbor = false;
            const dirs = [
              [-1, 0], [1, 0], [0, -1], [0, 1],
            ];
            for (const [ndx, ndy] of dirs) {
              const nx = x + ndx;
              const ny = y + ndy;
              if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
                if (this.mapData.tiles[ny][nx] === TILE.FLOOR && this.explored[ny][nx]) {
                  hasFloorNeighbor = true;
                  break;
                }
              }
            }
            if (hasFloorNeighbor) {
              this.explored[y][x] = true;
              this.minimapDirty = true;
            }
          }
        }
      }
    }
    this.updateProgress();
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
            Math.abs(x - this.mapData.rooms[0].centerX) +
            Math.abs(y - this.mapData.rooms[0].centerY);
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

  private updateProgress(): void {
    const percentage =
      this.totalFloorTiles > 0
        ? Math.round((this.exploredTiles / this.totalFloorTiles) * 100)
        : 0;
    this.progressText.setText(`探索进度: ${percentage}%`);

    const progressLabel = document.getElementById('progress-label');
    if (progressLabel) {
      progressLabel.textContent = `探索进度: ${percentage}%`;
    }

    const currentMilestone = Math.floor(percentage / 10);
    if (currentMilestone > this.lastMilestone && currentMilestone < 10) {
      this.lastMilestone = currentMilestone;
      this.showHaloEffect();
    }

    if (percentage >= 100) {
      this.time.delayedCall(300, () => {
        this.showVictoryModal();
      });
    }
  }

  private showVictoryModal(): void {
    if (this.victoryModalElement) return;
    if (document.getElementById('victory-modal')) return;

    const gameWidth = this.scale.width;
    const gameHeight = this.scale.height;

    const modalHTML = `
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
        z-index: 9999;
        pointer-events: auto;
      ">
        <div id="victory-modal-content" style="
          background: rgba(26, 26, 46, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-radius: 16px;
          padding: 40px 60px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        ">
          <h1 style="color: #ffd700; font-size: 32px; margin: 0 0 20px 0; font-weight: bold;">🎉 探索完成！</h1>
          <p style="color: #ffffff; font-size: 18px; margin: 0 0 30px 0;">你已探索完整个地牢！</p>
          <div style="display: flex; gap: 15px; justify-content: center;">
            <button id="victory-restart-btn" style="
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
            <button id="victory-close-btn" style="
              padding: 12px 30px;
              background: transparent;
              color: #aaa;
              border: 1px solid #555;
              border-radius: 6px;
              cursor: pointer;
              font-family: 'Segoe UI', sans-serif;
              font-size: 16px;
              transition: all 0.2s ease;
            ">关闭</button>
          </div>
        </div>
      </div>
    `;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = modalHTML;
    const modalEl = tempDiv.firstElementChild as HTMLDivElement;
    document.body.appendChild(modalEl);

    this.victoryModalElement = modalEl;

    requestAnimationFrame(() => {
      modalEl.style.opacity = '1';
    });

    const restartBtn = document.getElementById('victory-restart-btn') as HTMLButtonElement;
    if (restartBtn) {
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
        this.hideVictoryModal();
        this.generateMapWithSeed(seed);
      });
    }

    const closeBtn = document.getElementById('victory-close-btn') as HTMLButtonElement;
    if (closeBtn) {
      closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.color = '#fff';
        closeBtn.style.borderColor = '#888';
      });
      closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.color = '#aaa';
        closeBtn.style.borderColor = '#555';
      });
      closeBtn.addEventListener('click', () => {
        this.hideVictoryModal();
      });
    }

    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) {
        this.hideVictoryModal();
      }
    });
  }

  private hideVictoryModal(): void {
    if (this.victoryModalElement) {
      this.victoryModalElement.style.opacity = '0';
      const el = this.victoryModalElement;
      setTimeout(() => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      }, 300);
      this.victoryModalElement = null;
    } else {
      const existingEl = document.getElementById('victory-modal');
      if (existingEl) {
        existingEl.style.opacity = '0';
        setTimeout(() => {
          if (existingEl.parentNode) {
            existingEl.parentNode.removeChild(existingEl);
          }
        }, 300);
      }
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
        this.showChestPlusOne(chest.sprite.x, chest.sprite.y);
        this.minimapDirty = true;
      }
    }
  }

  private showChestPlusOne(worldX: number, worldY: number): void {
    const cam = this.camera;
    const screenX = (worldX - cam.scrollX) * cam.zoom;
    const screenY = (worldY - cam.scrollY) * cam.zoom;

    const plusOne = this.add
      .text(screenX, screenY - 20, '+1', {
        fontFamily: "'Segoe UI', sans-serif",
        fontSize: '24px',
        color: '#ffd700',
        fontStyle: 'bold',
        stroke: '#b8860b',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setScrollFactor(0);

    const targetX = this.scale.width - 60;
    const targetY = 60;

    this.tweens.add({
      targets: plusOne,
      x: targetX,
      y: targetY,
      scale: { from: 1, to: 0.6 },
      alpha: { from: 1, to: 0 },
      duration: 1200,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        plusOne.destroy();
      },
    });
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

  private renderMinimap(): void {
    if (!this.mapData) return;

    const minimapDisplayWidth = this.worldWidth * this.minimapScale;
    const minimapDisplayHeight = this.worldHeight * this.minimapScale;
    const tileDisplayWidth = minimapDisplayWidth / MAP_WIDTH;
    const tileDisplayHeight = minimapDisplayHeight / MAP_HEIGHT;

    this.minimapRenderTexture.clear();
    this.minimapGraphics.clear();

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const px = (x - MAP_WIDTH / 2) * tileDisplayWidth;
        const py = (y - MAP_HEIGHT / 2) * tileDisplayHeight;

        let color: number;

        if (this.explored[y][x]) {
          if (this.mapData.tiles[y][x] === TILE.FLOOR) {
            color = 0xaaaaaa;
          } else {
            color = 0x555555;
          }
        } else {
          color = 0x2a2a2a;
        }

        this.minimapGraphics.fillStyle(color);
        this.minimapGraphics.fillRect(px, py, tileDisplayWidth + 0.5, tileDisplayHeight + 0.5);
      }
    }

    for (const chest of this.chests) {
      if (!chest.collected && this.explored[chest.y][chest.x]) {
        const cx = (chest.x - MAP_WIDTH / 2 + 0.5) * tileDisplayWidth;
        const cy = (chest.y - MAP_HEIGHT / 2 + 0.5) * tileDisplayHeight;
        this.minimapGraphics.fillStyle(0xffd700);
        this.minimapGraphics.fillCircle(cx, cy, Math.max(tileDisplayWidth * 0.8, 1.5));
      }
    }

    const playerX = (this.playerGridX - MAP_WIDTH / 2 + 0.5) * tileDisplayWidth;
    const playerY = (this.playerGridY - MAP_HEIGHT / 2 + 0.5) * tileDisplayHeight;

    const blinkScale = 1 + Math.sin(this.time.now * 0.01 * Math.PI) * 0.3;
    this.minimapGraphics.fillStyle(0x00ff00);
    this.minimapGraphics.fillCircle(playerX, playerY, Math.max(tileDisplayWidth * 0.8, 2));
    this.minimapGraphics.fillStyle(0x00ff00, 0.5);
    this.minimapGraphics.fillCircle(
      playerX,
      playerY,
      Math.max(tileDisplayWidth * 1.2 * blinkScale, 3)
    );

    this.minimapRenderTexture.draw(
      this.minimapGraphics,
      minimapDisplayWidth / 2,
      minimapDisplayHeight / 2
    );
  }

  update(time: number, delta: number): void {
    if (!this.mapData) return;

    this.handleInput();
    this.updatePlayerMovement(delta);
    this.updateParticles(delta);
    this.updateFootprints(delta);

    if (this.minimapDirty) {
      this.renderMinimap();
      this.minimapDirty = false;
    }
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
      this.tryStartMove(dx, dy);
    }
  }

  private tryStartMove(dx: number, dy: number): void {
    const newX = this.playerGridX + dx;
    const newY = this.playerGridY + dy;

    if (!this.canMoveTo(newX, newY)) return;

    const checkX = this.playerGridX + (dx !== 0 ? Math.sign(dx) : 0);
    const checkY = this.playerGridY + (dy !== 0 ? Math.sign(dy) : 0);
    if (!this.canMoveTo(checkX, checkY)) return;

    if (dx !== 0 && dy !== 0) {
      if (!this.canMoveTo(this.playerGridX + dx, this.playerGridY) &&
          !this.canMoveTo(this.playerGridX, this.playerGridY + dy)) {
        return;
      }
    }

    this.targetGridX = newX;
    this.targetGridY = newY;
    this.isMoving = true;
    this.moveProgress = 0;
    this.createStepParticles();
    this.createFootprint(this.playerGridX, this.playerGridY);
  }

  private createFootprint(gridX: number, gridY: number): void {
    const px = gridX * TILE_SIZE + TILE_SIZE / 2;
    const py = gridY * TILE_SIZE + TILE_SIZE / 2;

    const fpSprite = this.add.arc(
      px,
      py,
      TILE_SIZE * 0.2,
      0,
      360,
      false,
      0xe94560
    );
    fpSprite.setDepth(8);
    fpSprite.setAlpha(0.5);

    this.footprints.push({
      sprite: fpSprite,
      life: 0,
      maxLife: 3000,
    });
  }

  private updateFootprints(delta: number): void {
    for (let i = this.footprints.length - 1; i >= 0; i--) {
      const fp = this.footprints[i];
      fp.life += delta;

      if (fp.life >= fp.maxLife) {
        fp.sprite.destroy();
        this.footprints.splice(i, 1);
        continue;
      }

      const progress = fp.life / fp.maxLife;
      const alpha = 0.5 * (1 - progress);
      fp.sprite.setAlpha(alpha);
      fp.sprite.setScale(1 - progress * 0.5);
    }
  }

  private canMoveTo(x: number, y: number): boolean {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return false;
    if (this.mapData.tiles[y][x] !== TILE.FLOOR) return false;
    return true;
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

      this.updateVisibility(this.playerGridX, this.playerGridY, 4);
      this.markExploredFromVisible();
      this.checkChestPickup();
    }

    const startX = (this.isMoving ? this.playerGridX : this.targetGridX) * TILE_SIZE + TILE_SIZE / 2;
    const startY = (this.isMoving ? this.playerGridY : this.targetGridY) * TILE_SIZE + TILE_SIZE / 2;
    const endX = this.targetGridX * TILE_SIZE + TILE_SIZE / 2;
    const endY = this.targetGridY * TILE_SIZE + TILE_SIZE / 2;

    const easedProgress = Phaser.Math.Easing.Sine.InOut(this.moveProgress);
    const currentX = Phaser.Math.Linear(startX, endX, easedProgress);
    const currentY = Phaser.Math.Linear(startY, endY, easedProgress);

    this.player.setPosition(currentX, currentY);
  }
}
