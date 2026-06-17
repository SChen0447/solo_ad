import Phaser from 'phaser';

const GROUND_Y = 420;
const PLAYER_X = 120;
const INITIAL_SPEED = 200;
const MAX_SPEED = 500;
const SPEED_INCREMENT = 15;
const SPEED_INTERVAL = 10;
const CRYSTAL_SHIELD_THRESHOLD = 20;
const SHIELD_DURATION = 5000;
const SHIELD_PENALTY = 3000;
const GRAVITY = 800;
const JUMP_VELOCITY = -380;
const MAX_CHARGE_VELOCITY = -580;
const CHARGE_RATE = 80;
const PARTICLE_COUNT = 65;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.GameObjects.Arc;
  private playerGlow!: Phaser.GameObjects.Arc;
  private ground!: Phaser.Physics.Arcade.StaticGroup;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private crystals!: Phaser.Physics.Arcade.Group;
  private lavaBg!: Phaser.GameObjects.TileSprite;

  private score = 0;
  private distance = 0;
  private crystalCount = 0;
  private totalCrystalsCollected = 0;
  private scrollSpeed = INITIAL_SPEED;
  private speedTimer = 0;
  private distanceSinceLastHundred = 0;
  private obstacleFrequency = 1.0;
  private obstacleTimer = 0;
  private crystalTimer = 0;

  private isCharging = false;
  private chargeStart = 0;
  private isAlive = true;
  private isShielded = false;
  private shieldTimer = 0;
  private shieldFlashTween: Phaser.Tweens.Tween | null = null;
  private scoreMultiplier = 1.0;

  private scoreText!: Phaser.GameObjects.Text;
  private distText!: Phaser.GameObjects.Text;
  private crystalText!: Phaser.GameObjects.Text;
  private shieldBar!: Phaser.GameObjects.Graphics;
  private shieldBarBg!: Phaser.GameObjects.Graphics;

  private groundSegments: Phaser.GameObjects.Rectangle[] = [];
  private bgElements: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.resetState();

    const { width, height } = this.scale;

    this.createLavaTileBackground(width, height);
    this.createBackgroundElements(width, height);
    this.createGround(width, height);
    this.createPlayer();
    this.setupGroups();
    this.setupCollisions();
    this.setupInput();
    this.createHUD(width);

    this.physics.world.setBounds(0, 0, width, height);
  }

  private resetState(): void {
    this.score = 0;
    this.distance = 0;
    this.crystalCount = 0;
    this.totalCrystalsCollected = 0;
    this.scrollSpeed = INITIAL_SPEED;
    this.speedTimer = 0;
    this.distanceSinceLastHundred = 0;
    this.obstacleFrequency = 1.0;
    this.obstacleTimer = 0;
    this.crystalTimer = 0;
    this.isCharging = false;
    this.chargeStart = 0;
    this.isAlive = true;
    this.isShielded = false;
    this.shieldTimer = 0;
    this.scoreMultiplier = 1.0;
  }

  private createLavaTileBackground(w: number, h: number): void {
    if (!this.textures.exists('lavaTile')) {
      const gfx = this.add.graphics();
      gfx.fillGradientStyle(0x3a0a00, 0x5a1a00, 0x1a0500, 0x3a0a00, 1);
      gfx.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 12; i++) {
        const x = Math.random() * 64;
        const y = Math.random() * 64;
        gfx.fillStyle(0xff4500, 0.15 + Math.random() * 0.1);
        gfx.fillCircle(x, y, 3 + Math.random() * 6);
      }
      gfx.generateTexture('lavaTile', 64, 64);
      gfx.destroy();
    }

    this.lavaBg = this.add.tileSprite(w / 2, h / 2, w, h, 'lavaTile');
    this.lavaBg.setDepth(0);
  }

  private createBackgroundElements(w: number, h: number): void {
    this.bgElements = [];
    const colors = [0x2a0a00, 0x3a1500, 0x4a1a00];
    for (let i = 0; i < 5; i++) {
      const stalactite = this.add.triangle(
        100 + i * (w / 5),
        0,
        0, 0,
        15, 40 + Math.random() * 60,
        30, 0,
        colors[i % 3], 0.4
      ).setDepth(1);
      this.bgElements.push(stalactite);
    }
  }

  private createGround(w: number, h: number): void {
    this.ground = this.physics.add.staticGroup();
    this.groundSegments = [];

    const groundHeight = h - GROUND_Y;
    const ground = this.add.rectangle(w / 2, GROUND_Y + groundHeight / 2, w + 200, groundHeight, 0x2a1000);
    this.physics.add.existing(ground, true);
    this.ground.add(ground);

    const surfaceLine = this.add.rectangle(w / 2, GROUND_Y, w + 200, 4, 0xff4500);
    this.physics.add.existing(surfaceLine, true);
    this.ground.add(surfaceLine);
  }

  private createPlayer(): void {
    this.player = this.add.container(PLAYER_X, GROUND_Y - 20);

    this.playerGlow = this.add.circle(0, 0, 18, 0xff6b35, 0.15);
    this.playerBody = this.add.circle(0, 0, 14, 0xe67e22);
    this.playerBody.setStrokeStyle(2, 0xffd700, 0.7);

    const eyeL = this.add.circle(-5, -4, 3, 0xffffff);
    const pupilL = this.add.circle(-4, -4, 1.5, 0x000000);
    const eyeR = this.add.circle(5, -4, 3, 0xffffff);
    const pupilR = this.add.circle(6, -4, 1.5, 0x000000);

    this.player.add([this.playerGlow, this.playerBody, eyeL, pupilL, eyeR, pupilR]);
    this.player.setDepth(10);

    this.physics.world.enable(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCircle(14, -14, -14);
    body.setCollideWorldBounds(true);
    body.setBounce(0);
  }

  private setupGroups(): void {
    this.obstacles = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    this.crystals = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.ground);

    this.physics.add.overlap(this.player, this.obstacles, (_player, obstacle) => {
      this.handleObstacleHit(obstacle as Phaser.Physics.Arcade.Sprite);
    }, undefined, this);

    this.physics.add.overlap(this.player, this.crystals, (_player, crystal) => {
      this.collectCrystal(crystal as Phaser.Physics.Arcade.Sprite);
    }, undefined, this);
  }

  private setupInput(): void {
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (!this.isAlive) return;
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      if (body.touching.down || body.blocked.down) {
        this.isCharging = true;
        this.chargeStart = this.time.now;
        body.setVelocityY(0);
      }
    });

    this.input.keyboard?.on('keyup-SPACE', () => {
      if (!this.isAlive || !this.isCharging) return;
      this.performJump();
    });

    this.input.on('pointerdown', () => {
      if (!this.isAlive) return;
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      if (body.touching.down || body.blocked.down) {
        this.isCharging = true;
        this.chargeStart = this.time.now;
        body.setVelocityY(0);
      }
    });

    this.input.on('pointerup', () => {
      if (!this.isAlive || !this.isCharging) return;
      this.performJump();
    });
  }

  private performJump(): void {
    this.isCharging = false;
    const chargeDuration = Math.min((this.time.now - this.chargeStart) / 1000, 1.0);
    const velocity = JUMP_VELOCITY - chargeDuration * CHARGE_RATE;
    const clampedVelocity = Math.max(velocity, MAX_CHARGE_VELOCITY);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(clampedVelocity);
  }

  private createHUD(w: number): void {
    const hudStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '16px',
      fontFamily: 'Courier New, monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    };

    this.scoreText = this.add.text(16, 12, '分数: 0', hudStyle).setDepth(100).setScrollFactor(0);
    this.distText = this.add.text(16, 34, '距离: 0m', hudStyle).setDepth(100).setScrollFactor(0);
    this.crystalText = this.add.text(16, 56, '水晶: 0/20', hudStyle).setDepth(100).setScrollFactor(0);

    this.shieldBarBg = this.add.graphics().setDepth(100).setScrollFactor(0);
    this.shieldBar = this.add.graphics().setDepth(100).setScrollFactor(0);
  }

  update(_time: number, delta: number): void {
    if (!this.isAlive) return;

    const dt = delta / 1000;
    const speedPx = this.scrollSpeed;

    this.lavaBg.tilePositionX += speedPx * dt * 0.3;

    this.bgElements.forEach((el, i) => {
      const go = el as Phaser.GameObjects.GameObject & { x: number };
      go.x -= speedPx * dt * 0.2;
      if (go.x < -50) {
        go.x = this.scale.width + 50 + Math.random() * 100;
      }
    });

    this.distance += speedPx * dt;
    this.distanceSinceLastHundred += speedPx * dt;
    this.score = Math.floor(this.distance / 10);

    if (this.distanceSinceLastHundred >= 100) {
      this.distanceSinceLastHundred -= 100;
      this.obstacleFrequency += 0.1;
      this.scoreMultiplier += 0.1;
    }

    this.speedTimer += dt;
    if (this.speedTimer >= SPEED_INTERVAL) {
      this.speedTimer -= SPEED_INTERVAL;
      this.scrollSpeed = Math.min(this.scrollSpeed + SPEED_INCREMENT, MAX_SPEED);
    }

    this.obstacleTimer += dt;
    this.spawnObstacles();

    this.crystalTimer += dt;
    this.spawnCrystals();

    this.updateObstacles(dt);
    this.updateCrystals(dt);

    if (this.isShielded) {
      this.shieldTimer -= delta;
      if (this.shieldTimer <= 0) {
        this.deactivateShield();
      }
      this.drawShieldBar();
    }

    this.animatePlayer(dt);
    this.updateHUD();
  }

  private spawnObstacles(): void {
    const interval = Math.max(0.6, 2.0 / this.obstacleFrequency);
    if (this.obstacleTimer < interval) return;
    this.obstacleTimer = 0;

    const { width } = this.scale;
    const type = Phaser.Math.Between(0, 2);

    let obstacle: Phaser.Physics.Arcade.Sprite;

    if (type === 0) {
      obstacle = this.createSpike(width);
    } else if (type === 1) {
      obstacle = this.createLavaColumn(width);
    } else {
      obstacle = this.createCrack(width);
    }

    this.obstacles.add(obstacle);
    obstacle.setDepth(5);
  }

  private createSpike(x: number): Phaser.Physics.Arcade.Sprite {
    const spike = this.add.triangle(x, GROUND_Y - 16, 0, 16, 10, -8, 20, 16, 0xff0000);
    spike.setStrokeStyle(1, 0xcc0000);
    this.physics.add.existing(spike, true);
    const body = spike.body as Phaser.Physics.Arcade.Body;
    body.setSize(16, 22);
    body.setOffset(2, -4);
    body.setImmovable(true);
    body.setAllowGravity(false);
    return spike as unknown as Phaser.Physics.Arcade.Sprite;
  }

  private createLavaColumn(x: number): Phaser.Physics.Arcade.Sprite {
    const h = 40 + Phaser.Math.Between(0, 40);
    const col = this.add.rectangle(x, GROUND_Y - h / 2, 24, h, 0xcc3300);
    col.setStrokeStyle(2, 0xff4500);
    this.physics.add.existing(col, true);
    const body = col.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setAllowGravity(false);
    return col as unknown as Phaser.Physics.Arcade.Sprite;
  }

  private createCrack(x: number): Phaser.Physics.Arcade.Sprite {
    const crack = this.add.rectangle(x, GROUND_Y - 4, 50, 10, 0x440000);
    crack.setStrokeStyle(1, 0xff2200, 0.6);
    this.physics.add.existing(crack, true);
    const body = crack.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(true);
    body.setAllowGravity(false);
    return crack as unknown as Phaser.Physics.Arcade.Sprite;
  }

  private spawnCrystals(): void {
    if (this.crystalTimer < 1.5) return;
    this.crystalTimer = 0;

    const { width } = this.scale;
    const yPos = GROUND_Y - 50 - Phaser.Math.Between(0, 100);

    const crystal = this.add.container(width + 30, yPos);

    if (!this.textures.exists('hexCrystal')) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0x00aaff, 1);
      gfx.beginPath();
      gfx.moveTo(8, 0);
      gfx.lineTo(16, 5);
      gfx.lineTo(16, 15);
      gfx.lineTo(8, 20);
      gfx.lineTo(0, 15);
      gfx.lineTo(0, 5);
      gfx.closePath();
      gfx.fillPath();
      gfx.generateTexture('hexCrystal', 16, 20);
      gfx.destroy();
    }

    const crystalImg = this.add.image(0, 0, 'hexCrystal');
    const crystalGlow = this.add.circle(0, 0, 14, 0x00aaff, 0.2);

    crystal.add([crystalGlow, crystalImg]);
    crystal.setDepth(6);

    this.tweens.add({
      targets: crystalImg,
      angle: 360,
      duration: 2000,
      repeat: -1,
    });

    this.tweens.add({
      targets: crystalGlow,
      alpha: 0.05,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.physics.add.existing(crystal);
    const body = crystal.body as Phaser.Physics.Arcade.Body;
    body.setSize(16, 20);
    body.setOffset(-8, -10);
    body.setImmovable(true);
    body.setAllowGravity(false);
    this.crystals.add(crystal);
  }

  private updateObstacles(dt: number): void {
    const children = this.obstacles.getChildren();
    for (let i = children.length - 1; i >= 0; i--) {
      const obj = children[i];
      const go = obj as Phaser.GameObjects.GameObject & { x: number; destroy: () => void };
      go.x -= this.scrollSpeed * dt;
      if (go.x < -60) {
        this.obstacles.remove(obj, true, true);
      }
    }
  }

  private updateCrystals(dt: number): void {
    const children = this.crystals.getChildren();
    for (let i = children.length - 1; i >= 0; i--) {
      const obj = children[i];
      const go = obj as Phaser.GameObjects.GameObject & { x: number; destroy: () => void };
      go.x -= this.scrollSpeed * dt;
      if (go.x < -60) {
        this.crystals.remove(obj, true, true);
      }
    }
  }

  private handleObstacleHit(_obstacle: Phaser.Physics.Arcade.Sprite): void {
    if (this.isShielded) {
      this.shieldTimer -= SHIELD_PENALTY;
      if (this.shieldTimer <= 0) {
        this.deactivateShield();
      }
      this.playShieldFlash();
      this.obstacles.remove(_obstacle, true, true);
      return;
    }

    this.killPlayer();
  }

  private collectCrystal(crystal: Phaser.Physics.Arcade.Sprite): void {
    this.crystals.remove(crystal, true, true);
    this.crystalCount++;
    this.totalCrystalsCollected++;
    this.score += Math.floor(10 * this.scoreMultiplier);

    if (this.crystalCount >= CRYSTAL_SHIELD_THRESHOLD && !this.isShielded) {
      this.crystalCount -= CRYSTAL_SHIELD_THRESHOLD;
      this.activateShield();
    }
  }

  private activateShield(): void {
    this.isShielded = true;
    this.shieldTimer = SHIELD_DURATION;

    this.playerBody.setFillStyle(0xffd700);
    this.playerBody.setStrokeStyle(3, 0xffffff, 0.9);
    this.playerGlow.setFillStyle(0xffd700, 0.3);
  }

  private deactivateShield(): void {
    this.isShielded = false;
    this.shieldTimer = 0;

    this.playerBody.setFillStyle(0xe67e22);
    this.playerBody.setStrokeStyle(2, 0xffd700, 0.7);
    this.playerGlow.setFillStyle(0xff6b35, 0.15);

    if (this.shieldFlashTween) {
      this.shieldFlashTween.stop();
      this.shieldFlashTween = null;
    }
    this.player.setAlpha(1);

    this.shieldBar.clear();
  }

  private playShieldFlash(): void {
    if (this.shieldFlashTween) {
      this.shieldFlashTween.stop();
    }
    this.shieldFlashTween = this.tweens.add({
      targets: this.player,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        this.player.setAlpha(1);
        this.shieldFlashTween = null;
      },
    });
  }

  private drawShieldBar(): void {
    const x = 16;
    const y = 80;
    const w = 100;
    const h = 8;
    const pct = Math.max(0, this.shieldTimer / SHIELD_DURATION);

    this.shieldBarBg.clear();
    this.shieldBarBg.fillStyle(0x333333, 0.5);
    this.shieldBarBg.fillRoundedRect(x, y, w, h, 3);

    this.shieldBar.clear();
    this.shieldBar.fillStyle(0xffd700, 0.9);
    this.shieldBar.fillRoundedRect(x, y, w * pct, h, 3);
  }

  private animatePlayer(dt: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (this.isCharging && (body.touching.down || body.blocked.down)) {
      const pulse = 0.9 + Math.sin(this.time.now / 80) * 0.1;
      this.player.setScale(pulse, 2 - pulse);
    } else if (!body.touching.down && !body.blocked.down) {
      this.player.setScale(1, 0.9);
    } else {
      this.player.setScale(1, 1);
    }

    if (!this.isShielded) {
      this.playerGlow.setAlpha(0.1 + Math.sin(this.time.now / 300) * 0.05);
    }

    void dt;
  }

  private updateHUD(): void {
    this.scoreText.setText('分数: ' + this.score);
    this.distText.setText('距离: ' + Math.floor(this.distance) + 'm');
    this.crystalText.setText('水晶: ' + this.crystalCount + '/' + CRYSTAL_SHIELD_THRESHOLD);

    if (this.isShielded) {
      this.crystalText.setColor('#FFD700');
    } else {
      this.crystalText.setColor('#ffffff');
    }
  }

  private killPlayer(): void {
    this.isAlive = false;

    const px = this.player.x;
    const py = this.player.y;

    this.player.setVisible(false);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.enable = false;

    this.spawnDeathParticles(px, py);

    this.time.delayedCall(800, () => {
      this.scene.start('GameOverScene', {
        score: this.score,
        crystals: this.totalCrystalsCollected,
        distance: Math.floor(this.distance),
      });
    });
  }

  private spawnDeathParticles(x: number, y: number): void {
    if (!this.textures.exists('deathParticle')) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0xffffff, 1);
      gfx.fillRect(0, 0, 4, 4);
      gfx.generateTexture('deathParticle', 4, 4);
      gfx.destroy();
    }

    const emitter = this.add.particles(x, y, 'deathParticle', {
      speed: { min: 80, max: 300 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.5, end: 0 },
      lifespan: 800,
      gravityY: 300,
      quantity: PARTICLE_COUNT,
      tint: [0xff6b35, 0xff4500, 0xff0000, 0xffaa00],
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      emitting: false,
    });

    emitter.explode(PARTICLE_COUNT);

    this.time.delayedCall(1000, () => {
      emitter.destroy();
    });
  }
}
