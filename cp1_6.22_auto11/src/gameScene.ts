import Phaser from 'phaser';
import { Player } from './player';
import { AudioManager, BeatData } from './audioManager';

export type ObstacleType = 'spike' | 'bar';

export interface Obstacle {
  sprite: Phaser.GameObjects.Container;
  type: ObstacleType;
  passed: boolean;
  hitbox: Phaser.Geom.Rectangle;
}

export interface GameState {
  score: number;
  isPlaying: boolean;
  speed: number;
  currentSong: string;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private audioManager!: AudioManager;
  private obstacles: Obstacle[] = [];
  private groundTiles: Phaser.GameObjects.TileSprite[] = [];
  private background!: Phaser.GameObjects.Graphics;
  private ground!: Phaser.GameObjects.Graphics;
  private groundY: number = 0;
  private scrollSpeed: number = 4;
  private speedMultiplier: number = 1;
  private lastObstacleX: number = 0;
  private minObstacleSpacing: number = 150;
  private score: number = 0;
  private hitFlash: Phaser.GameObjects.Rectangle | null = null;
  private stateChangeCallback: ((state: GameState) => void) | null = null;
  private isPaused: boolean = true;
  private nextObstacleType: ObstacleType = 'spike';
  private gameWidth: number = 0;
  private gameHeight: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(): void {
    this.audioManager = new AudioManager();
    this.gameWidth = this.cameras.main.width;
    this.gameHeight = this.cameras.main.height;
    this.groundY = this.gameHeight - 80;
  }

  preload(): void {
    this.createPlayerSpriteSheet();
    this.createParticleTextures();
    this.createObstacleTextures();
  }

  private createPlayerSpriteSheet(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    
    const colors = {
      body: '#FFD93D',
      bodyDark: '#E6B800',
      outline: '#333333',
      eye: '#FFFFFF',
      pupil: '#333333',
      shoe: '#8B4513',
      skin: '#FFDBAC'
    };
    
    for (let frame = 0; frame < 8; frame++) {
      const offsetX = frame * 32;
      
      if (frame < 4) {
        this.drawRunFrame(ctx, offsetX, frame, colors);
      } else if (frame < 6) {
        this.drawJumpFrame(ctx, offsetX, frame - 4, colors);
      } else {
        this.drawSlideFrame(ctx, offsetX, frame - 6, colors);
      }
    }
    
    this.textures.addSpriteSheet('player', canvas as unknown as HTMLImageElement, { frameWidth: 32, frameHeight: 32 });
  }

  private drawRunFrame(ctx: CanvasRenderingContext2D, offsetX: number, frame: number, colors: { body: string; bodyDark: string; outline: string; eye: string; pupil: string; shoe: string; skin: string }): void {
    const legOffset = Math.sin(frame * Math.PI / 2) * 6;
    const armOffset = Math.cos(frame * Math.PI / 2) * 4;
    const bodyBob = Math.abs(Math.sin(frame * Math.PI / 2)) * 2;
    
    ctx.fillStyle = colors.outline;
    ctx.fillRect(offsetX + 9, 6 - bodyBob, 14, 16);
    
    ctx.fillStyle = colors.body;
    ctx.fillRect(offsetX + 10, 7 - bodyBob, 12, 14);
    
    ctx.fillStyle = colors.bodyDark;
    ctx.fillRect(offsetX + 10, 18 - bodyBob, 12, 3);
    
    ctx.fillStyle = colors.outline;
    ctx.fillRect(offsetX + 8, 0 - bodyBob, 16, 10);
    
    ctx.fillStyle = colors.skin;
    ctx.fillRect(offsetX + 9, 1 - bodyBob, 14, 8);
    
    ctx.fillStyle = colors.eye;
    ctx.fillRect(offsetX + 12, 3 - bodyBob, 3, 3);
    ctx.fillRect(offsetX + 18, 3 - bodyBob, 3, 3);
    
    ctx.fillStyle = colors.pupil;
    ctx.fillRect(offsetX + 13, 4 - bodyBob, 2, 2);
    ctx.fillRect(offsetX + 19, 4 - bodyBob, 2, 2);
    
    ctx.fillStyle = colors.outline;
    ctx.fillRect(offsetX + 6, 19 - bodyBob + legOffset, 6, 8);
    ctx.fillRect(offsetX + 20, 19 - bodyBob - legOffset, 6, 8);
    
    ctx.fillStyle = colors.body;
    ctx.fillRect(offsetX + 7, 20 - bodyBob + legOffset, 4, 6);
    ctx.fillRect(offsetX + 21, 20 - bodyBob - legOffset, 4, 6);
    
    ctx.fillStyle = colors.shoe;
    ctx.fillRect(offsetX + 6, 26 - bodyBob + legOffset, 6, 2);
    ctx.fillRect(offsetX + 20, 26 - bodyBob - legOffset, 6, 2);
    
    ctx.fillStyle = colors.outline;
    ctx.fillRect(offsetX + 4, 10 - bodyBob + armOffset, 5, 10);
    ctx.fillRect(offsetX + 23, 10 - bodyBob - armOffset, 5, 10);
    
    ctx.fillStyle = colors.skin;
    ctx.fillRect(offsetX + 5, 11 - bodyBob + armOffset, 3, 8);
    ctx.fillRect(offsetX + 24, 11 - bodyBob - armOffset, 3, 8);
  }

  private drawJumpFrame(ctx: CanvasRenderingContext2D, offsetX: number, frame: number, colors: { body: string; bodyDark: string; outline: string; eye: string; pupil: string; shoe: string; skin: string }): void {
    const height = frame === 0 ? 4 : 0;
    
    ctx.fillStyle = colors.outline;
    ctx.fillRect(offsetX + 9, 6 + height, 14, 16);
    
    ctx.fillStyle = colors.body;
    ctx.fillRect(offsetX + 10, 7 + height, 12, 14);
    
    ctx.fillStyle = colors.bodyDark;
    ctx.fillRect(offsetX + 10, 18 + height, 12, 3);
    
    ctx.fillStyle = colors.outline;
    ctx.fillRect(offsetX + 8, 0 + height, 16, 10);
    
    ctx.fillStyle = colors.skin;
    ctx.fillRect(offsetX + 9, 1 + height, 14, 8);
    
    ctx.fillStyle = colors.eye;
    ctx.fillRect(offsetX + 12, 3 + height, 3, 3);
    ctx.fillRect(offsetX + 18, 3 + height, 3, 3);
    
    ctx.fillStyle = colors.pupil;
    ctx.fillRect(offsetX + 13, 4 + height, 2, 2);
    ctx.fillRect(offsetX + 19, 4 + height, 2, 2);
    
    ctx.fillStyle = colors.outline;
    ctx.fillRect(offsetX + 7, 21 + height, 7, 6);
    ctx.fillRect(offsetX + 18, 21 + height, 7, 6);
    
    ctx.fillStyle = colors.body;
    ctx.fillRect(offsetX + 8, 22 + height, 5, 4);
    ctx.fillRect(offsetX + 19, 22 + height, 5, 4);
    
    ctx.fillStyle = colors.shoe;
    ctx.fillRect(offsetX + 6, 26 + height, 8, 2);
    ctx.fillRect(offsetX + 18, 26 + height, 8, 2);
    
    ctx.fillStyle = colors.outline;
    ctx.fillRect(offsetX + 2, 8 + height, 6, 5);
    ctx.fillRect(offsetX + 24, 8 + height, 6, 5);
    
    ctx.fillStyle = colors.skin;
    ctx.fillRect(offsetX + 3, 9 + height, 4, 3);
    ctx.fillRect(offsetX + 25, 9 + height, 4, 3);
  }

  private drawSlideFrame(ctx: CanvasRenderingContext2D, offsetX: number, frame: number, colors: { body: string; bodyDark: string; outline: string; eye: string; pupil: string; shoe: string; skin: string }): void {
    const lean = frame * 2;
    
    ctx.fillStyle = colors.outline;
    ctx.fillRect(offsetX + 6, 18 + lean, 20, 10);
    
    ctx.fillStyle = colors.body;
    ctx.fillRect(offsetX + 7, 19 + lean, 18, 8);
    
    ctx.fillStyle = colors.bodyDark;
    ctx.fillRect(offsetX + 7, 25 + lean, 18, 2);
    
    ctx.fillStyle = colors.outline;
    ctx.fillRect(offsetX + 20, 14 + lean, 10, 10);
    
    ctx.fillStyle = colors.skin;
    ctx.fillRect(offsetX + 21, 15 + lean, 8, 8);
    
    ctx.fillStyle = colors.eye;
    ctx.fillRect(offsetX + 22, 17 + lean, 3, 3);
    ctx.fillRect(offsetX + 26, 17 + lean, 3, 3);
    
    ctx.fillStyle = colors.pupil;
    ctx.fillRect(offsetX + 23, 18 + lean, 2, 2);
    ctx.fillRect(offsetX + 27, 18 + lean, 2, 2);
    
    ctx.fillStyle = colors.outline;
    ctx.fillRect(offsetX + 2, 20 + lean, 8, 4);
    
    ctx.fillStyle = colors.skin;
    ctx.fillRect(offsetX + 3, 21 + lean, 6, 2);
    
    ctx.fillStyle = colors.shoe;
    ctx.fillRect(offsetX + 2, 26 + lean, 10, 2);
  }

  private createParticleTextures(): void {
    const dustCanvas = document.createElement('canvas');
    dustCanvas.width = 8;
    dustCanvas.height = 8;
    const dustCtx = dustCanvas.getContext('2d')!;
    
    dustCtx.fillStyle = 'rgba(139, 119, 101, 0.8)';
    dustCtx.beginPath();
    dustCtx.arc(4, 4, 3, 0, Math.PI * 2);
    dustCtx.fill();
    
    this.textures.addCanvas('dust', dustCanvas);
    
    const sparkCanvas = document.createElement('canvas');
    sparkCanvas.width = 8;
    sparkCanvas.height = 8;
    const sparkCtx = sparkCanvas.getContext('2d')!;
    
    sparkCtx.fillStyle = '#FFA500';
    sparkCtx.fillRect(0, 2, 8, 4);
    sparkCtx.fillStyle = '#FFFF00';
    sparkCtx.fillRect(2, 3, 4, 2);
    
    this.textures.addCanvas('spark', sparkCanvas);
  }

  private createObstacleTextures(): void {
    const spikeCanvas = document.createElement('canvas');
    spikeCanvas.width = 32;
    spikeCanvas.height = 32;
    const spikeCtx = spikeCanvas.getContext('2d')!;
    spikeCtx.imageSmoothingEnabled = false;
    
    spikeCtx.fillStyle = '#333333';
    spikeCtx.fillRect(2, 30, 28, 2);
    
    spikeCtx.fillStyle = '#FF4444';
    spikeCtx.beginPath();
    spikeCtx.moveTo(16, 4);
    spikeCtx.lineTo(28, 30);
    spikeCtx.lineTo(4, 30);
    spikeCtx.closePath();
    spikeCtx.fill();
    
    spikeCtx.fillStyle = '#FF6666';
    spikeCtx.beginPath();
    spikeCtx.moveTo(16, 8);
    spikeCtx.lineTo(22, 28);
    spikeCtx.lineTo(10, 28);
    spikeCtx.closePath();
    spikeCtx.fill();
    
    spikeCtx.fillStyle = '#FFAAAA';
    spikeCtx.fillRect(14, 10, 2, 8);
    
    this.textures.addCanvas('spike', spikeCanvas);
    
    const barCanvas = document.createElement('canvas');
    barCanvas.width = 64;
    barCanvas.height = 24;
    const barCtx = barCanvas.getContext('2d')!;
    barCtx.imageSmoothingEnabled = false;
    
    barCtx.fillStyle = '#333333';
    barCtx.fillRect(0, 0, 64, 24);
    
    barCtx.fillStyle = '#4488FF';
    barCtx.fillRect(2, 2, 60, 20);
    
    barCtx.fillStyle = '#66AAFF';
    barCtx.fillRect(2, 2, 60, 6);
    
    barCtx.fillStyle = '#2266DD';
    barCtx.fillRect(2, 16, 60, 6);
    
    barCtx.fillStyle = '#FFFFFF';
    barCtx.fillRect(6, 5, 4, 2);
    barCtx.fillRect(16, 5, 4, 2);
    barCtx.fillRect(26, 5, 4, 2);
    barCtx.fillRect(36, 5, 4, 2);
    barCtx.fillRect(46, 5, 4, 2);
    barCtx.fillRect(56, 5, 4, 2);
    
    this.textures.addCanvas('bar', barCanvas);
  }

  create(): void {
    this.createBackground();
    this.createGround();
    this.createPlayer();
    this.createInput();
    this.createUI();
    
    this.audioManager.setOnBeatCallback((beat: BeatData) => {
      this.onBeatDetected(beat);
    });
    
    this.audioManager.setSong('song1');
    
    this.game.events.on('resize', this.onResize, this);
  }

  private createBackground(): void {
    this.background = this.add.graphics();
    this.drawBackground();
  }

  private drawBackground(): void {
    this.background.clear();
    
    this.background.fillGradientStyle(0x1a1a4e, 0x2d1b4e, 0x1a0a2e, 0x1a0a2e, 1);
    this.background.fillRect(0, 0, this.gameWidth, this.gameHeight);
    
    for (let i = 0; i < 50; i++) {
      const x = (i * 37) % this.gameWidth;
      const y = (i * 23) % (this.gameHeight * 0.6);
      const size = (i % 3) + 1;
      const alpha = 0.3 + (i % 5) * 0.1;
      this.background.fillStyle(0xffffff, alpha);
      this.background.fillRect(x, y, size, size);
    }
  }

  private createGround(): void {
    this.ground = this.add.graphics();
    this.drawGround();
    
    const groundTextureCanvas = document.createElement('canvas');
    groundTextureCanvas.width = 64;
    groundTextureCanvas.height = 80;
    const gctx = groundTextureCanvas.getContext('2d')!;
    gctx.imageSmoothingEnabled = false;
    
    gctx.fillStyle = '#228B22';
    gctx.fillRect(0, 0, 64, 20);
    
    for (let i = 0; i < 30; i++) {
      const gx = Math.random() * 64;
      const gy = Math.random() * 15;
      gctx.fillStyle = i % 2 === 0 ? '#32CD32' : '#006400';
      gctx.fillRect(gx, gy, 2, 4);
    }
    
    gctx.fillStyle = '#8B4513';
    gctx.fillRect(0, 20, 64, 60);
    
    for (let i = 0; i < 20; i++) {
      const gx = Math.random() * 64;
      const gy = 20 + Math.random() * 55;
      gctx.fillStyle = i % 2 === 0 ? '#A0522D' : '#654321';
      gctx.fillRect(gx, gy, 3, 3);
    }
    
    this.textures.addCanvas('groundTexture', groundTextureCanvas);
    
    const groundTile = this.add.tileSprite(0, this.groundY, this.gameWidth * 2, 80, 'groundTexture');
    groundTile.setOrigin(0, 0);
    this.groundTiles.push(groundTile);
  }

  private drawGround(): void {
    this.ground.clear();
    
    this.ground.fillStyle(0x228B22);
    this.ground.fillRect(0, this.groundY, this.gameWidth, 20);
    
    this.ground.fillStyle(0x8B4513);
    this.ground.fillRect(0, this.groundY + 20, this.gameWidth, 60);
  }

  private createPlayer(): void {
    const playerX = this.gameWidth * 0.25;
    this.player = new Player(this, playerX, this.groundY, 'player');
    this.player.setDepth(10);
    
    this.player.setStateChangeCallback(() => {
      this.updateGameState();
    });
  }

  private createInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    
    this.keys = {
      space: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    };
    
    keyboard.on('keydown-SPACE', () => {
      if (!this.isPaused) {
        this.player.jump();
      }
    });
    
    keyboard.on('keydown-DOWN', () => {
      if (!this.isPaused) {
        this.player.slide();
      }
    });
  }

  private createUI(): void {
    this.hitFlash = this.add.rectangle(
      this.gameWidth / 2,
      this.gameHeight / 2,
      this.gameWidth,
      this.gameHeight,
      0xff0000,
      0
    );
    this.hitFlash.setDepth(100);
  }

  private onBeatDetected(beat: BeatData): void {
    if (this.isPaused) return;
    
    const spawnX = this.gameWidth + 50;
    
    if (spawnX - this.lastObstacleX < this.minObstacleSpacing * this.speedMultiplier) {
      return;
    }
    
    this.spawnObstacle(spawnX, this.nextObstacleType, beat.intensity);
    this.lastObstacleX = spawnX;
    
    this.nextObstacleType = this.nextObstacleType === 'spike' ? 'bar' : 'spike';
  }

  private spawnObstacle(x: number, type: ObstacleType, _intensity: number): void {
    const container = this.add.container(x, 0);
    container.setDepth(5);
    
    let obstacleSprite: Phaser.GameObjects.Sprite;
    let hitbox: Phaser.Geom.Rectangle;
    
    if (type === 'spike') {
      obstacleSprite = this.add.sprite(0, 0, 'spike');
      obstacleSprite.setOrigin(0.5, 1);
      container.setY(this.groundY);
      hitbox = new Phaser.Geom.Rectangle(-12, -28, 24, 28);
    } else {
      obstacleSprite = this.add.sprite(0, 0, 'bar');
      obstacleSprite.setOrigin(0.5, 0.5);
      container.setY(this.groundY - 50);
      hitbox = new Phaser.Geom.Rectangle(-30, -10, 60, 20);
    }
    
    container.add(obstacleSprite);
    
    obstacleSprite.setScale(0);
    this.tweens.add({
      targets: obstacleSprite,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
    
    const flash = this.add.circle(0, 0, 40, 0xffffff, 0.8);
    flash.setOrigin(0.5);
    container.add(flash);
    
    this.tweens.add({
      targets: flash,
      scale: 2,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy()
    });
    
    const obstacle: Obstacle = {
      sprite: container,
      type: type,
      passed: false,
      hitbox: hitbox
    };
    
    this.obstacles.push(obstacle);
  }

  public override update(time: number, delta: number): void {
    if (this.isPaused) return;
    
    const adjustedDelta = Math.min(delta, 32) * (this.game.loop.actualFps / 60);
    const currentScrollSpeed = this.scrollSpeed * this.speedMultiplier;
    
    this.audioManager.update();
    
    this.player.update(time, adjustedDelta);
    
    this.groundTiles.forEach(tile => {
      tile.tilePositionX += currentScrollSpeed;
    });
    
    this.updateObstacles(adjustedDelta, currentScrollSpeed);
    
    this.checkCollisions();
  }

  private updateObstacles(delta: number, scrollSpeed: number): void {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i]!;
      obstacle.sprite.x -= scrollSpeed * (delta / 16.67);
      
      obstacle.hitbox.x = obstacle.sprite.x + obstacle.hitbox.width / -2;
      obstacle.hitbox.y = obstacle.sprite.y + (obstacle.type === 'spike' ? -28 : -10);
      
      if (!obstacle.passed && obstacle.sprite.x < this.player.x - 20) {
        obstacle.passed = true;
        this.addScore(10, obstacle.sprite.x, obstacle.sprite.y - 30);
      }
      
      if (obstacle.sprite.x < -100) {
        obstacle.sprite.destroy();
        this.obstacles.splice(i, 1);
      }
    }
  }

  private checkCollisions(): void {
    if (this.player.isInvulnerable()) return;
    
    const playerHitbox = this.player.getHitbox();
    
    for (const obstacle of this.obstacles) {
      if (obstacle.passed) continue;
      
      if (Phaser.Geom.Rectangle.Overlaps(playerHitbox, obstacle.hitbox)) {
        this.onPlayerHit();
        break;
      }
    }
  }

  private onPlayerHit(): void {
    this.player.onHit();
    
    if (this.hitFlash) {
      this.tweens.add({
        targets: this.hitFlash,
        fillAlpha: 0.3,
        duration: 100,
        ease: 'Quad.easeOut',
        yoyo: true
      });
    }
    
    this.cameras.main.shake(200, 0.01);
  }

  private addScore(points: number, x: number, y: number): void {
    this.score += points;
    this.player.onScore();
    
    const scoreText = this.add.text(x, y, `+${points}`, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#00FF00',
      fontStyle: 'bold'
    });
    scoreText.setOrigin(0.5);
    scoreText.setDepth(50);
    
    this.tweens.add({
      targets: scoreText,
      y: y - 50,
      alpha: 0,
      scale: 1.5,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => scoreText.destroy()
    });
    
    this.updateGameState();
  }

  private updateGameState(): void {
    if (this.stateChangeCallback) {
      this.stateChangeCallback({
        score: this.score,
        isPlaying: !this.isPaused,
        speed: this.speedMultiplier,
        currentSong: 'song1'
      });
    }
  }

  public play(): void {
    this.isPaused = false;
    this.audioManager.play();
    this.updateGameState();
  }

  public pause(): void {
    this.isPaused = true;
    this.audioManager.pause();
    this.updateGameState();
  }

  public togglePlay(): boolean {
    if (this.isPaused) {
      this.play();
    } else {
      this.pause();
    }
    return !this.isPaused;
  }

  public setSpeed(speed: number): void {
    this.speedMultiplier = speed;
    this.audioManager.setSpeed(speed);
    this.updateGameState();
  }

  public async setSong(songId: string): Promise<void> {
    const wasPlaying = !this.isPaused;
    this.pause();
    await this.audioManager.setSong(songId);
    if (wasPlaying) {
      this.play();
    }
    this.updateGameState();
  }

  public getScore(): number {
    return this.score;
  }

  public getAudioManager(): AudioManager {
    return this.audioManager;
  }

  public setStateChangeCallback(callback: (state: GameState) => void): void {
    this.stateChangeCallback = callback;
  }

  private onResize(width: number, height: number): void {
    this.gameWidth = width;
    this.gameHeight = height;
    this.groundY = height - 80;
    
    this.drawBackground();
    this.drawGround();
    
    this.groundTiles.forEach(tile => tile.destroy());
    this.groundTiles = [];
    
    const groundTile = this.add.tileSprite(0, this.groundY, this.gameWidth * 2, 80, 'groundTexture');
    groundTile.setOrigin(0, 0);
    this.groundTiles.push(groundTile);
    
    this.player.setGroundY(this.groundY);
    this.player.setX(this.gameWidth * 0.25);
    
    if (this.hitFlash) {
      this.hitFlash.setSize(this.gameWidth, this.gameHeight);
      this.hitFlash.setPosition(this.gameWidth / 2, this.gameHeight / 2);
    }
  }

  public destroy(): void {
    this.audioManager.destroy();
  }
}
