import Phaser from 'phaser';
import { createStaticTopology, MazeTopology, TopologyNode, getAdjacencyList } from '../maze/Topology';
import { MazeGenerator, TILE_SIZE, GRID_COLS, GRID_ROWS, TILE_WALL, TILE_FLOOR, TILE_NODE } from '../maze/MazeGenerator';
import { Player } from '../entities/Player';
import { AI } from '../entities/AI';

interface Portal {
  tileX: number;
  tileY: number;
  sprite: Phaser.GameObjects.Polygon;
  particles: Phaser.GameObjects.Particles.ParticleEmitter;
  used: boolean;
}

export class GameScene extends Phaser.Scene {
  private topology!: MazeTopology;
  private mazeGenerator!: MazeGenerator;
  private tiles!: number[][];
  private nodes!: TopologyNode[];

  private player!: Player;
  private ai!: AI;
  private portals: Portal[] = [];

  private tileLayer!: Phaser.GameObjects.Group;
  private fadeOverlay!: Phaser.GameObjects.Rectangle;
  private flashOverlay!: Phaser.GameObjects.Rectangle;

  private timeLeft: number = 60;
  private score: number = 0;
  private scoreTimer: number = 0;
  private gameRunning: boolean = false;

  private timeText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private newMazeBtn!: Phaser.GameObjects.Rectangle;
  private newMazeText!: Phaser.GameObjects.Text;
  private restartBtn!: Phaser.GameObjects.Rectangle;
  private restartText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private finalScoreText!: Phaser.GameObjects.Text;

  private minimapGraphics!: Phaser.GameObjects.Graphics;
  private minimapBg!: Phaser.GameObjects.Rectangle;
  private showMinimap: boolean = true;

  private keyboard!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    w: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  };

  private mazeOffsetX: number = 0;
  private mazeOffsetY: number = 0;
  private baseWidth: number = 640;
  private baseHeight: number = 480;

  constructor() {
    super('GameScene');
  }

  public preload(): void {}

  public create(): void {
    this.cameras.main.setBackgroundColor('#1a202c');

    this.mazeOffsetX = 0;
    this.mazeOffsetY = 40;

    this.fadeOverlay = this.add.rectangle(0, 0, this.baseWidth, this.baseHeight, 0x1a202c, 1);
    this.fadeOverlay.setOrigin(0, 0);
    this.fadeOverlay.setDepth(100);

    this.flashOverlay = this.add.rectangle(0, 0, this.baseWidth, this.baseHeight, 0xffffff, 0);
    this.flashOverlay.setOrigin(0, 0);
    this.flashOverlay.setDepth(99);

    this.tileLayer = this.add.group();

    this.createUI();
    this.bindKeys();
    this.generateMaze();
    this.startGame();

    this.scale.on('resize', this.onResize, this);

    this.time.addEvent({
      delay: 100,
      callback: () => {
        this.onResize();
      },
      loop: false
    });
  }

  private bindKeys(): void {
    this.keyboard = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      w: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      s: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      a: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      d: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
  }

  private createUI(): void {
    this.titleText = this.add.text(this.baseWidth / 2, 15, '拓扑迷踪', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '18px',
      color: '#f6e05e',
      fontStyle: 'bold'
    });
    this.titleText.setOrigin(0.5, 0.5);
    this.titleText.setDepth(20);

    this.timeText = this.add.text(15, this.baseHeight - 30, '时间: 60', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '20px',
      color: '#ffffff'
    });
    this.timeText.setDepth(20);
    this.makeInteractive(this.timeText);

    this.scoreText = this.add.text(this.baseWidth - 15, 45, '得分: 0', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '20px',
      color: '#ffffff'
    });
    this.scoreText.setOrigin(1, 0);
    this.scoreText.setDepth(20);
    this.makeInteractive(this.scoreText);

    this.newMazeBtn = this.add.rectangle(150, 15, 100, 26, 0x2d3748);
    this.newMazeBtn.setStrokeStyle(2, 0x3182ce);
    this.newMazeBtn.setDepth(20);
    this.newMazeBtn.setInteractive({ useHandCursor: true });

    this.newMazeText = this.add.text(150, 15, '新迷宫', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      color: '#ffffff'
    });
    this.newMazeText.setOrigin(0.5, 0.5);
    this.newMazeText.setDepth(21);

    this.newMazeBtn.on('pointerover', () => this.onHover(this.newMazeBtn, this.newMazeText));
    this.newMazeBtn.on('pointerout', () => this.onOut(this.newMazeBtn, this.newMazeText));
    this.newMazeBtn.on('pointerdown', () => this.onNewMazeClick());
    this.newMazeText.setInteractive({ useHandCursor: true });
    this.newMazeText.on('pointerdown', () => this.onNewMazeClick());

    this.restartBtn = this.add.rectangle(this.baseWidth - 70, 15, 100, 26, 0x2d3748);
    this.restartBtn.setStrokeStyle(2, 0x3182ce);
    this.restartBtn.setDepth(20);
    this.restartBtn.setInteractive({ useHandCursor: true });

    this.restartText = this.add.text(this.baseWidth - 70, 15, '重新开始', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      color: '#ffffff'
    });
    this.restartText.setOrigin(0.5, 0.5);
    this.restartText.setDepth(21);

    this.restartBtn.on('pointerover', () => this.onHover(this.restartBtn, this.restartText));
    this.restartBtn.on('pointerout', () => this.onOut(this.restartBtn, this.restartText));
    this.restartBtn.on('pointerdown', () => this.onRestartClick());
    this.restartText.setInteractive({ useHandCursor: true });
    this.restartText.on('pointerdown', () => this.onRestartClick());

    this.minimapBg = this.add.rectangle(this.baseWidth - 10, this.baseHeight - 10, 140, 105, 0x2d3748, 0.85);
    this.minimapBg.setOrigin(1, 1);
    this.minimapBg.setStrokeStyle(1, 0x3182ce);
    this.minimapBg.setDepth(20);

    this.minimapGraphics = this.add.graphics();
    this.minimapGraphics.setDepth(21);

    this.gameOverText = this.add.text(this.baseWidth / 2, this.baseHeight / 2 - 20, '', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '32px',
      color: '#f6e05e',
      fontStyle: 'bold'
    });
    this.gameOverText.setOrigin(0.5, 0.5);
    this.gameOverText.setDepth(50);
    this.gameOverText.setVisible(false);

    this.finalScoreText = this.add.text(this.baseWidth / 2, this.baseHeight / 2 + 20, '', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '20px',
      color: '#ffffff'
    });
    this.finalScoreText.setOrigin(0.5, 0.5);
    this.finalScoreText.setDepth(50);
    this.finalScoreText.setVisible(false);
  }

  private makeInteractive(obj: Phaser.GameObjects.Text): void {
    obj.setInteractive({ useHandCursor: true });
    obj.on('pointerover', () => {
      this.tweens.add({ targets: obj, scale: 1.05, duration: 200, ease: 'Quad.Out' });
      obj.setShadow(0, 0, '#f6e05e', 8, true, true);
    });
    obj.on('pointerout', () => {
      this.tweens.add({ targets: obj, scale: 1, duration: 200, ease: 'Quad.Out' });
      obj.setShadow(0, 0, 'transparent', 0);
    });
  }

  private onHover(btn: Phaser.GameObjects.Rectangle, text: Phaser.GameObjects.Text): void {
    this.tweens.add({
      targets: [btn, text],
      scale: 1.05,
      duration: 200,
      ease: 'Quad.Out'
    });
    btn.setShadowStyle(4, 4, '#f6e05e', 0.5, true, true);
  }

  private onOut(btn: Phaser.GameObjects.Rectangle, text: Phaser.GameObjects.Text): void {
    this.tweens.add({
      targets: [btn, text],
      scale: 1,
      duration: 200,
      ease: 'Quad.Out'
    });
    btn.setShadowStyle(0, 0, 'transparent', 0, false, false);
  }

  private onNewMazeClick(): void {
    if (!this.gameRunning) return;
    this.fadeOut(() => {
      this.generateMaze();
      this.fadeIn();
    });
  }

  private onRestartClick(): void {
    this.timeLeft = 60;
    this.score = 0;
    this.scoreTimer = 0;
    this.gameOverText.setVisible(false);
    this.finalScoreText.setVisible(false);
    this.fadeOut(() => {
      this.generateMaze();
      this.fadeIn();
      this.startGame();
    });
  }

  private startGame(): void {
    this.gameRunning = true;
  }

  private endGame(caught: boolean): void {
    this.gameRunning = false;
    this.gameOverText.setText(caught ? '被抓住了!' : '时间到!');
    this.finalScoreText.setText(`最终得分: ${this.score}`);
    this.gameOverText.setVisible(true);
    this.finalScoreText.setVisible(true);
  }

  private fadeOut(callback: () => void): void {
    this.fadeOverlay.setAlpha(0);
    this.tweens.add({
      targets: this.fadeOverlay,
      alpha: 1,
      duration: 250,
      ease: 'Quad.Out',
      onComplete: callback
    });
  }

  private fadeIn(): void {
    this.fadeOverlay.setAlpha(1);
    this.tweens.add({
      targets: this.fadeOverlay,
      alpha: 0,
      duration: 500,
      ease: 'Quad.In'
    });
  }

  private triggerFlash(): void {
    this.flashOverlay.setAlpha(1);
    this.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration: 150,
      ease: 'Quad.Out'
    });
  }

  private generateMaze(): void {
    this.tileLayer.clear(true, true);
    this.portals.forEach(p => {
      p.sprite.destroy();
      if (p.particles) p.particles.destroy();
    });
    this.portals = [];

    if (this.player) this.player.destroy();
    if (this.ai) this.ai.destroy();

    this.topology = createStaticTopology();
    this.mazeGenerator = new MazeGenerator(this.topology);
    const result = this.mazeGenerator.generate();
    this.tiles = result.tiles;
    this.nodes = result.nodes;

    this.renderMaze();
    this.placeEntities();
    this.placePortals();
    this.updateMinimap();
  }

  private renderMaze(): void {
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const tile = this.tiles[y][x];
        const wx = this.mazeOffsetX + x * TILE_SIZE;
        const wy = this.mazeOffsetY + y * TILE_SIZE;

        const checker = (x + y) % 2 === 0 ? 0x2d3748 : 0x4a5568;
        const bg = this.add.rectangle(wx + TILE_SIZE / 2, wy + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, checker);
        bg.setOrigin(0.5, 0.5);
        this.tileLayer.add(bg);

        if (tile === TILE_WALL) {
          const wall = this.add.rectangle(wx + TILE_SIZE / 2, wy + TILE_SIZE / 2, TILE_SIZE - 2, TILE_SIZE - 2, 0xc53030);
          wall.setStrokeStyle(1, 0x742a2a);
          this.tileLayer.add(wall);

          const line1 = this.add.line(0, wx + TILE_SIZE / 2, wy + TILE_SIZE / 3, wx + 2, wy + TILE_SIZE / 3, wx + TILE_SIZE - 2, wy + TILE_SIZE / 3, 0x742a2a, 1);
          const line2 = this.add.line(0, wx + TILE_SIZE / 2, wy + TILE_SIZE * 2 / 3, wx + 2, wy + TILE_SIZE * 2 / 3, wx + TILE_SIZE - 2, wy + TILE_SIZE * 2 / 3, 0x742a2a, 1);
          const line3 = this.add.line(0, wx + TILE_SIZE / 3, wy + TILE_SIZE / 6, wx + TILE_SIZE / 3, wy + TILE_SIZE / 3, wx + TILE_SIZE / 3, wy + 2, 0x742a2a, 1);
          this.tileLayer.add(line1);
          this.tileLayer.add(line2);
          this.tileLayer.add(line3);
        } else if (tile === TILE_FLOOR || tile === TILE_NODE) {
          const floor = this.add.rectangle(wx + TILE_SIZE / 2, wy + TILE_SIZE / 2, TILE_SIZE - 4, TILE_SIZE - 4, 0xcbd5e1);
          floor.setStrokeStyle(1, 0x94a3b8);
          this.tileLayer.add(floor);

          if (tile === TILE_NODE) {
            const node = this.add.circle(wx + TILE_SIZE / 2, wy + TILE_SIZE / 2, 5, 0x3182ce);
            node.setAlpha(0.5);
            this.tileLayer.add(node);
          }
        }
      }
    }
  }

  private placeEntities(): void {
    const sorted = [...this.nodes].sort((a, b) => {
      const da = a.x + a.y;
      const db = b.x + b.y;
      return da - db;
    });

    const startNode = sorted[0];
    const endNode = sorted[sorted.length - 1];

    this.player = new Player(this, startNode.x, startNode.y);
    this.player.sprite.x += this.mazeOffsetX;
    this.player.sprite.y += this.mazeOffsetY;
    this.player.worldX += this.mazeOffsetX;
    this.player.worldY += this.mazeOffsetY;

    this.ai = new AI(this, endNode.x, endNode.y, this.tiles);
    this.ai.sprite.x += this.mazeOffsetX;
    this.ai.sprite.y += this.mazeOffsetY;
    this.ai.worldX += this.mazeOffsetX;
    this.ai.worldY += this.mazeOffsetY;
  }

  private placePortals(): void {
    const floorTiles: { x: number; y: number }[] = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (this.tiles[y][x] === TILE_FLOOR || this.tiles[y][x] === TILE_NODE) {
          floorTiles.push({ x, y });
        }
      }
    }

    const playerTile = { x: this.player.tileX, y: this.player.tileY };
    const aiTile = { x: this.ai.tileX, y: this.ai.tileY };

    const candidates = floorTiles.filter(t => {
      const dp = Math.abs(t.x - playerTile.x) + Math.abs(t.y - playerTile.y);
      const da = Math.abs(t.x - aiTile.x) + Math.abs(t.y - aiTile.y);
      return dp >= 3 && da >= 3;
    });

    Phaser.Utils.Array.Shuffle(candidates);
    const selected = candidates.slice(0, Math.min(3, candidates.length));

    for (const pos of selected) {
      const wx = this.mazeOffsetX + pos.x * TILE_SIZE + TILE_SIZE / 2;
      const wy = this.mazeOffsetY + pos.y * TILE_SIZE + TILE_SIZE / 2;

      const hexPoints: string = '0,-14 12,-7 12,7 0,14 -12,7 -12,-7';
      const sprite = this.add.polygon(wx, wy, hexPoints, 0x805ad5);
      sprite.setStrokeStyle(2, 0xb794f5);
      sprite.setDepth(8);

      this.tweens.add({
        targets: sprite,
        angle: 360,
        duration: 1200,
        repeat: -1,
        ease: 'Linear'
      });

      const particles = this.add.particles(wx, wy, null, {
        speed: { min: 20, max: 50 },
        scale: { start: 0.3, end: 0 },
        lifespan: 400,
        frequency: 150,
        tint: 0xb794f5,
        alpha: { start: 0.8, end: 0 }
      });
      particles.setDepth(7);

      this.portals.push({
        tileX: pos.x,
        tileY: pos.y,
        sprite,
        particles,
        used: false
      });
    }
  }

  private updateMinimap(): void {
    const mmW = 140;
    const mmH = 105;
    const mmX = this.baseWidth - 10 - mmW;
    const mmY = this.baseHeight - 10 - mmH;
    const scaleX = mmW / (GRID_COLS * TILE_SIZE);
    const scaleY = mmH / (GRID_ROWS * TILE_SIZE);
    const scale = Math.min(scaleX, scaleY);

    this.minimapGraphics.clear();

    if (!this.showMinimap) return;

    this.minimapGraphics.lineStyle(1, 0x63b3ed, 0.6);
    for (const edge of this.topology.edges) {
      const na = this.nodes[edge.a];
      const nb = this.nodes[edge.b];
      const ax = mmX + (this.mazeOffsetX + na.x * TILE_SIZE + TILE_SIZE / 2) * scale;
      const ay = mmY + (this.mazeOffsetY + na.y * TILE_SIZE + TILE_SIZE / 2) * scale;
      const bx = mmX + (this.mazeOffsetX + nb.x * TILE_SIZE + TILE_SIZE / 2) * scale;
      const by = mmY + (this.mazeOffsetY + nb.y * TILE_SIZE + TILE_SIZE / 2) * scale;
      this.minimapGraphics.lineBetween(ax, ay, bx, by);
    }

    this.minimapGraphics.fillStyle(0x3182ce, 0.8);
    for (const node of this.nodes) {
      const nx = mmX + (this.mazeOffsetX + node.x * TILE_SIZE + TILE_SIZE / 2) * scale;
      const ny = mmY + (this.mazeOffsetY + node.y * TILE_SIZE + TILE_SIZE / 2) * scale;
      this.minimapGraphics.fillCircle(nx, ny, 2.5);
    }

    if (this.player) {
      const px = mmX + this.player.sprite.x * scale;
      const py = mmY + this.player.sprite.y * scale;
      this.minimapGraphics.fillStyle(0x38a169, 1);
      this.minimapGraphics.fillCircle(px, py, 3);
    }

    if (this.ai) {
      const ax = mmX + this.ai.sprite.x * scale;
      const ay = mmY + this.ai.sprite.y * scale;
      this.minimapGraphics.fillStyle(0xe53e3e, 1);
      this.minimapGraphics.fillCircle(ax, ay, 3);
    }
  }

  public update(time: number, delta: number): void {
    if (!this.gameRunning) return;

    this.handleMovement();

    this.player.update(delta);

    const playerScreenX = this.player.sprite.x - this.mazeOffsetX;
    const playerScreenY = this.player.sprite.y - this.mazeOffsetY;
    const playerTileX = Math.round((playerScreenX - TILE_SIZE / 2) / TILE_SIZE);
    const playerTileY = Math.round((playerScreenY - TILE_SIZE / 2) / TILE_SIZE);

    this.ai.update(delta, playerTileX, playerTileY);

    this.checkPortalCollision();
    this.checkAICollision();
    this.updateTimers(delta);
    this.updateMinimap();
  }

  private handleMovement(): void {
    if (this.player.isMoving) return;

    const k = this.keyboard;
    let dx = 0;
    let dy = 0;

    if (k.up.isDown || k.w.isDown) dy = -1;
    else if (k.down.isDown || k.s.isDown) dy = 1;
    else if (k.left.isDown || k.a.isDown) dx = -1;
    else if (k.right.isDown || k.d.isDown) dx = 1;

    if (dx !== 0 || dy !== 0) {
      const newTx = this.player.tileX + dx;
      const newTy = this.player.tileY + dy;
      if (this.mazeGenerator.isWalkable(newTx, newTy)) {
        this.player.moveTo(newTx, newTy);
        this.tweens.add({
          targets: this.player.sprite,
          x: this.player.sprite.x + dx * TILE_SIZE,
          y: this.player.sprite.y + dy * TILE_SIZE,
          duration: 200,
          ease: 'Linear'
        });
      }
    }
  }

  private checkPortalCollision(): void {
    if (this.player.isMoving) return;

    for (const portal of this.portals) {
      if (portal.used) continue;
      if (this.player.tileX === portal.tileX && this.player.tileY === portal.tileY) {
        portal.used = true;
        this.triggerFlash();
        this.score += 5;
        this.scoreText.setText(`得分: ${this.score}`);

        const otherNodes = this.nodes.filter(n => {
          const dx = n.x - portal.tileX;
          const dy = n.y - portal.tileY;
          return Math.sqrt(dx * dx + dy * dy) >= 5;
        });

        if (otherNodes.length === 0) {
          portal.used = false;
          return;
        }

        const target = otherNodes[Math.floor(Math.random() * otherNodes.length)];
        this.player.teleport(target.x, target.y);
        this.player.sprite.x = this.mazeOffsetX + target.x * TILE_SIZE + TILE_SIZE / 2;
        this.player.sprite.y = this.mazeOffsetY + target.y * TILE_SIZE + TILE_SIZE / 2;

        this.time.delayedCall(5000, () => {
          portal.used = false;
        });
        break;
      }
    }
  }

  private checkAICollision(): void {
    const dx = this.player.sprite.x - this.ai.sprite.x;
    const dy = this.player.sprite.y - this.ai.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 22) {
      this.endGame(true);
    }
  }

  private updateTimers(delta: number): void {
    this.scoreTimer += delta;
    if (this.scoreTimer >= 1000) {
      this.scoreTimer -= 1000;
      this.timeLeft -= 1;
      this.score += 1;
      this.scoreText.setText(`得分: ${this.score}`);
      this.updateTimeDisplay();

      if (this.timeLeft <= 0) {
        this.endGame(false);
      }
    }
  }

  private updateTimeDisplay(): void {
    this.timeText.setText(`时间: ${this.timeLeft}`);
    if (this.timeLeft <= 10) {
      this.timeText.setColor('#ff0000');
      if (this.timeLeft % 2 === 0) {
        this.timeText.setAlpha(1);
      } else {
        this.timeText.setAlpha(0.3);
      }
    } else {
      this.timeText.setColor('#ffffff');
      this.timeText.setAlpha(1);
    }
  }

  private onResize(): void {
    const width = window.innerWidth;
    this.showMinimap = width >= 600;
    this.minimapGraphics.setVisible(this.showMinimap);
    this.minimapBg.setVisible(this.showMinimap);
  }
}
