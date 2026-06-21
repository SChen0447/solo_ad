import Phaser from 'phaser';
import type { BeatSequence, LevelData, LevelElement } from './types';
import { LevelGenerator } from './LevelGenerator';

interface PlatformObject {
  element: LevelElement;
  graphic: Phaser.GameObjects.Graphics;
  glow: Phaser.GameObjects.Graphics;
  baseY: number;
  phase: number;
}

interface CollectibleObject {
  element: LevelElement;
  sprite: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Arc;
  collected: boolean;
}

interface ObstacleObject {
  element: LevelElement;
  graphic: Phaser.GameObjects.Graphics;
}

export class GameScene extends Phaser.Scene {
  private track!: BeatSequence;
  private levelData!: LevelData;
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerGlow!: Phaser.GameObjects.Arc;
  private playerHalo!: Phaser.GameObjects.Arc;

  private platforms: PlatformObject[] = [];
  private collectibles: CollectibleObject[] = [];
  private obstacles: ObstacleObject[] = [];
  private particles: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  private score: number = 0;
  private displayedScore: number = 0;
  private hitNotes: number = 0;
  private perfectHits: number = 0;
  private totalNotes: number = 0;

  private scoreText!: Phaser.GameObjects.Text;
  private progressBg!: Phaser.GameObjects.Graphics;
  private progressBar!: Phaser.GameObjects.Graphics;

  private gameTime: number = 0;
  private spawnedElements: Set<string> = new Set();
  private isJumping: boolean = false;
  private jumpVelocity: number = -500;
  private moveSpeed: number = 160;
  private jumpDuration: number = 400;
  private jumpStartTime: number = 0;

  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  private cameraOffsetX: number = 0;
  private scrollSpeed: number = 0;

  private gameOver: boolean = false;
  private haloActive: boolean = false;
  private haloTimer: number = 0;

  private screenShakeT: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { track: BeatSequence }): void {
    this.track = data.track;
  }

  create(): void {
    const { width, height } = this.scale;

    this.createBackground(width, height);
    this.levelData = LevelGenerator.generate(this.track);
    this.totalNotes = this.levelData.totalNotes;

    this.createPlayer(width, height);
    this.createUI(width, height);
    this.setupInput();
    this.setupPhysics();

    this.cameras.main.startFollow(this.player, false, 0.1, 0.1);
    this.cameras.main.setFollowOffset(-200, 0);

    this.gameTime = 0;
    this.score = 0;
    this.displayedScore = 0;
    this.hitNotes = 0;
    this.perfectHits = 0;
    this.gameOver = false;
  }

  private createBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    const gradientSteps = 30;
    for (let i = 0; i < gradientSteps; i++) {
      const t = i / gradientSteps;
      const r = Math.floor(Phaser.Math.Linear(10, 20, t));
      const g = Math.floor(Phaser.Math.Linear(5, 15, t));
      const b = Math.floor(Phaser.Math.Linear(30, 50, t));
      const color = Phaser.Display.Color.GetColor(r, g, b);
      bg.fillStyle(color, 1);
      const y = t * height;
      bg.fillRect(0, y, width + 5000, height / gradientSteps + 1);
    }

    for (let i = 0; i < 80; i++) {
      const starX = Phaser.Math.Between(0, 5000);
      const starY = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.3, 0.8);
      this.add.circle(starX, starY, size, 0xffffff, alpha);
    }

    const ground = this.add.graphics();
    ground.fillStyle(0x0a0a1a, 1);
    ground.fillRect(0, height - 30, 5000, 30);
    ground.lineStyle(2, 0x2a2a5a, 0.8);
    ground.lineBetween(0, height - 30, 5000, height - 30);
  }

  private createPlayer(width: number, _height: number): void {
    const startX = 100;
    const startY = 500;

    const playerTexture = this.textures.createCanvas('playerBall', 40, 40);
    const ctx = playerTexture.getContext();
    const gradient = ctx.createRadialGradient(20, 20, 0, 20, 20, 20);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.4, '#00ffff');
    gradient.addColorStop(1, '#0066ff');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(20, 20, 18, 0, Math.PI * 2);
    ctx.fill();
    playerTexture.refresh();

    this.player = this.physics.add.sprite(startX, startY, 'playerBall');
    this.player.setCollideWorldBounds(false);
    this.player.setBounce(0);
    this.player.setGravityY(800);
    this.player.setCircle(18);

    this.playerGlow = this.add.circle(startX, startY, 28, 0x00ffff, 0.25);
    this.playerHalo = this.add.circle(startX, startY, 45, 0xffff00, 0);
  }

  private createUI(width: number, _height: number): void {
    this.scoreText = this.add.text(30, 30, 'SCORE: 0', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setScrollFactor(0).setDepth(100);

    const progressLabel = this.add.text(width - 280, 35, '进度', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '16px',
      color: '#cccccc'
    }).setScrollFactor(0).setDepth(100);

    this.progressBg = this.add.graphics();
    this.progressBg.fillStyle(0x333344, 0.8);
    this.progressBg.fillRoundedRect(width - 220, 30, 180, 24, 4);
    this.progressBg.setScrollFactor(0).setDepth(100);

    this.progressBar = this.add.graphics();
    this.progressBar.setScrollFactor(0).setDepth(100);
  }

  private setupInput(): void {
    this.leftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.rightKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.input.on('pointerdown', () => {
      this.tryJump();
    });

    this.spaceKey.on('down', () => {
      this.tryJump();
    });
  }

  private setupPhysics(): void {
    this.physics.world.setBounds(0, 0, 8000, this.scale.height);
    this.physics.world.gravity.y = 800;
  }

  private tryJump(): void {
    if (this.gameOver) return;
    if (!this.player.body!.touching.down && !this.player.body!.blocked.down) return;

    this.isJumping = true;
    this.jumpStartTime = this.gameTime;
    this.player.setVelocityY(this.jumpVelocity);
  }

  private spawnElement(element: LevelElement): void {
    if (this.spawnedElements.has(element.id)) return;
    this.spawnedElements.add(element.id);

    if (element.type === 'obstacle') {
      this.createObstacle(element);
    } else {
      this.createPlatform(element);
      if (element.hasCollectible) {
        this.createCollectible(element);
      }
    }
  }

  private createPlatform(element: LevelElement): void {
    const colors = LevelGenerator.getColorByPitch(element.pitch);
    const isMoving = element.type === 'moving';

    const glow = this.add.graphics();
    glow.lineStyle(4, colors.glow, 0.7);
    glow.strokeRoundedRect(0, 0, element.width + 8, element.height + 8, 6);
    glow.setPosition(element.x - element.width / 2 - 4, element.y - element.height / 2 - 4);

    const graphic = this.add.graphics();
    graphic.fillStyle(colors.fill, 1);
    graphic.fillRoundedRect(0, 0, element.width, element.height, 4);
    graphic.lineStyle(2, colors.glow, 1);
    graphic.strokeRoundedRect(0, 0, element.width, element.height, 4);

    const highlightGradient = graphic.createLinearGradient(0, 0, 0, element.height);
    highlightGradient.addColorStop(0, 1, 1, 1, 0.3);
    highlightGradient.addColorStop(1, 0, 0, 0, 0);
    graphic.fillGradientStyle(
      0xffffff, 0xffffff,
      0x000000, 0x000000,
      0.2, 0.2, 0, 0
    );
    graphic.fillRoundedRect(0, 0, element.width, element.height / 2, 4);

    graphic.setPosition(element.x - element.width / 2, element.y - element.height / 2);

    const platformRect = this.add.rectangle(
      element.x,
      element.y,
      element.width,
      element.height
    ).setAlpha(0);

    this.physics.add.existing(platformRect, true);
    (platformRect.body as Phaser.Physics.Arcade.StaticBody).setSize(element.width, element.height);

    this.platforms.push({
      element,
      graphic,
      glow,
      baseY: element.y,
      phase: Math.random() * Math.PI * 2
    });

    this.physics.add.collider(this.player, platformRect);
  }

  private createCollectible(element: LevelElement): void {
    const collectX = element.x;
    const collectY = element.y - element.height / 2 - 30;

    const glow = this.add.circle(collectX, collectY, 22, 0xffd700, 0.3);
    const sprite = this.add.circle(collectX, collectY, 12, 0xffd700, 1);
    sprite.setStrokeStyle(3, 0xffffff, 0.8);

    const hitCircle = this.add.circle(collectX, collectY, 20, 0x000000, 0);
    this.physics.add.existing(hitCircle, true);

    this.collectibles.push({
      element,
      sprite,
      glow,
      collected: false
    });

    const overlapCheck = (
      _player: Phaser.GameObjects.GameObject,
      _hitCircle: Phaser.GameObjects.GameObject
    ) => {
      this.onCollectibleHit(collectibleObj);
    };

    const collectibleObj = this.collectibles[this.collectibles.length - 1];
    this.physics.add.overlap(this.player, hitCircle, overlapCheck);
  }

  private createObstacle(element: LevelElement): void {
    const colors = LevelGenerator.getObstacleColor();

    const graphic = this.add.graphics();
    const spikeCount = Math.max(3, Math.floor(element.width / 20));

    for (let i = 0; i < spikeCount; i++) {
      const sx = (i / (spikeCount - 1)) * element.width;
      graphic.fillStyle(colors.fill, 1);
      graphic.lineStyle(2, colors.glow, 1);

      const spikeW = element.width / spikeCount;
      graphic.beginPath();
      graphic.moveTo(sx, 0);
      graphic.lineTo(sx + spikeW / 2, -element.height - 10);
      graphic.lineTo(sx + spikeW, 0);
      graphic.closePath();
      graphic.fillPath();
      graphic.strokePath();
    }

    graphic.setPosition(element.x - element.width / 2, element.y);

    const hitRect = this.add.rectangle(
      element.x,
      element.y - element.height / 2 - 5,
      element.width * 0.8,
      element.height + 5
    ).setAlpha(0);

    this.physics.add.existing(hitRect, true);

    this.obstacles.push({ element, graphic });

    this.physics.add.overlap(this.player, hitRect, () => {
      this.onPlayerHit();
    });
  }

  private onCollectibleHit(collectible: CollectibleObject): void {
    if (collectible.collected || this.gameOver) return;
    collectible.collected = true;

    const expectedTime = collectible.element.spawnTime;
    const timeDiff = this.gameTime - expectedTime;
    const points = LevelGenerator.calculateScore(timeDiff);

    if (points > 0) {
      this.score += points;
      this.hitNotes++;
      if (points === 3) this.perfectHits++;
      this.animateScore();
      this.triggerHalo();
      this.spawnCollectParticles(collectible.sprite.x, collectible.sprite.y);
    }

    this.tweens.add({
      targets: [collectible.sprite, collectible.glow],
      alpha: 0,
      scale: 0.3,
      duration: 200,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        collectible.sprite.destroy();
        collectible.glow.destroy();
      }
    });
  }

  private animateScore(): void {
    const startValue = this.displayedScore;
    const endValue = this.score;
    const duration = 200;

    this.tweens.addCounter({
      from: startValue,
      to: endValue,
      duration,
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => {
        this.displayedScore = Math.floor(tween.getValue());
        this.scoreText.setText(`SCORE: ${this.displayedScore}`);
      }
    });

    this.tweens.add({
      targets: this.scoreText,
      scale: 1.3,
      duration: 100,
      yoyo: true,
      ease: 'Sine.easeOut'
    });
  }

  private triggerHalo(): void {
    this.haloActive = true;
    this.haloTimer = 300;
  }

  private spawnCollectParticles(x: number, y: number): void {
    const colors = [0xffd700, 0xffaa00, 0xffff88, 0xffffff];

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 80 + Math.random() * 60;
      const size = 3 + Math.random() * 4;
      const color = Phaser.Utils.Array.GetRandom(colors);

      const particle = this.add.circle(x, y, size, color, 1);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.2,
        duration: 300,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  private onPlayerHit(): void {
    if (this.gameOver) return;
    this.endGame();
  }

  private endGame(): void {
    this.gameOver = true;
    this.player.setVelocity(0, 0);
    this.screenShakeT = 300;

    this.cameras.main.flash(200, 255, 80, 80);

    this.time.delayedCall(800, () => {
      const accuracy = this.totalNotes > 0 ? this.hitNotes / this.totalNotes : 0;
      this.scene.start('GameOverScene', {
        score: this.score,
        accuracy,
        totalNotes: this.totalNotes,
        hitNotes: this.hitNotes,
        perfectHits: this.perfectHits
      });
    });
  }

  update(time: number, delta: number): void {
    if (this.gameOver) {
      if (this.screenShakeT > 0) {
        this.screenShakeT -= delta;
        const shake = this.screenShakeT / 300;
        this.cameras.main.setScroll(
          this.cameras.main.scrollX + Phaser.Math.Between(-5, 5) * shake,
          this.cameras.main.scrollY + Phaser.Math.Between(-5, 5) * shake
        );
      }
      return;
    }

    this.gameTime += delta;

    this.updatePlayerMovement(delta);
    this.updateGlow();
    this.updateHalo(delta);
    this.updatePlatforms(delta);
    this.updateCollectibles(delta);
    this.checkElementSpawns();
    this.updateProgress();
    this.checkGameEnd();
  }

  private updatePlayerMovement(delta: number): void {
    let velocityX = 0;

    if (this.leftKey.isDown) {
      velocityX = -this.moveSpeed;
    }
    if (this.rightKey.isDown) {
      velocityX = this.moveSpeed;
    }

    this.player.setVelocityX(velocityX);

    if (this.isJumping && this.gameTime - this.jumpStartTime > this.jumpDuration) {
      this.isJumping = false;
    }

    if (this.player.y > this.scale.height + 100) {
      this.endGame();
    }
  }

  private updateGlow(): void {
    if (this.playerGlow && this.playerHalo) {
      this.playerGlow.setPosition(this.player.x, this.player.y);
      this.playerHalo.setPosition(this.player.x, this.player.y);

      const breathe = 1 + Math.sin(this.gameTime * 0.005) * 0.1;
      this.playerGlow.setScale(breathe);
    }
  }

  private updateHalo(delta: number): void {
    if (this.haloActive) {
      this.haloTimer -= delta;
      if (this.haloTimer <= 0) {
        this.haloActive = false;
        this.tweens.add({
          targets: this.playerHalo,
          alpha: 0,
          duration: 150,
          ease: 'Cubic.easeOut'
        });
      } else {
        this.playerHalo.setAlpha(0.4 * (this.haloTimer / 300));
        this.playerHalo.setScale(1 + (1 - this.haloTimer / 300) * 0.5);
      }
    }
  }

  private updatePlatforms(delta: number): void {
    this.platforms.forEach((platform) => {
      if (platform.element.type === 'moving') {
        platform.phase += delta * 0.002 * (platform.element.moveSpeed || 1);
        const range = platform.element.moveRange || 40;
        const newY = platform.baseY + Math.sin(platform.phase) * range;

        const dy = newY - platform.element.y;
        platform.element.y = newY;

        platform.graphic.y += dy;
        platform.glow.y += dy;
      }
    });
  }

  private updateCollectibles(delta: number): void {
    this.collectibles.forEach((collectible) => {
      if (!collectible.collected) {
        const bob = Math.sin(this.gameTime * 0.004 + collectible.element.spawnTime * 0.001) * 5;
        collectible.sprite.setY(collectible.element.y - collectible.element.height / 2 - 30 + bob);
        collectible.glow.setY(collectible.sprite.y);
        collectible.glow.setScale(1 + Math.sin(this.gameTime * 0.006) * 0.2);
      }
    });
  }

  private checkElementSpawns(): void {
    const spawnAheadTime = 2000;
    const viewRight = this.cameras.main.scrollX + this.scale.width + 400;

    this.levelData.elements.forEach((element) => {
      if (this.spawnedElements.has(element.id)) return;
      if (element.spawnTime <= this.gameTime + spawnAheadTime && element.x <= viewRight + 500) {
        this.spawnElement(element);
      }
    });
  }

  private updateProgress(): void {
    const lastElement = this.levelData.elements[this.levelData.elements.length - 1];
    if (!lastElement) return;

    const progress = Phaser.Math.Clamp(this.player.x / lastElement.x, 0, 1);

    this.progressBar.clear();
    this.progressBar.fillStyle(0x00ffaa, 1);
    this.progressBar.fillRoundedRect(
      this.scale.width - 220,
      30,
      180 * progress,
      24,
      4
    );

    const gradient = this.progressBar.createLinearGradient(
      this.scale.width - 220, 0,
      this.scale.width - 40, 0
    );
  }

  private checkGameEnd(): void {
    const lastElement = this.levelData.elements[this.levelData.elements.length - 1];
    if (!lastElement) return;

    if (this.player.x > lastElement.x + 300) {
      this.endGame();
    }
  }
}
