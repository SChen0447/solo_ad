import Phaser from 'phaser';

export interface PlayerConfig {
  x: number;
  y: number;
  color: number;
  controls: {
    left: string;
    right: string;
    up: string;
    down: string;
  };
  playerIndex: number;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  public playerIndex: number;
  public maxLives: number = 3;
  public lives: number = 3;
  public isInvincible: boolean = false;
  public hasShield: boolean = false;
  public speedBoost: boolean = false;
  public isDead: boolean = false;
  public deaths: number = 0;
  public baseSpeed: number = 200;
  public jumpForce: number = -350;
  public isOnGround: boolean = false;
  private shadow!: Phaser.GameObjects.Ellipse;
  private shieldRing!: Phaser.GameObjects.Arc;
  private invincibleGlow!: Phaser.GameObjects.Arc;
  private dustParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private controls: { left: string; right: string; up: string; down: string };
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
  private keyUp!: Phaser.Input.Keyboard.Key;
  private keyDown!: Phaser.Input.Keyboard.Key;
  private playerColor: number;
  private invincibleTimer: number = 0;
  private speedBoostTimer: number = 0;
  private hurtFlashTimer: number = 0;
  private isFlashing: boolean = false;

  constructor(scene: Phaser.Scene, config: PlayerConfig) {
    const textureKey = `player_${config.playerIndex}_${config.color}`;
    Player.createPlayerTexture(scene, textureKey, config.color);
    super(scene, config.x, config.y, textureKey);

    this.playerIndex = config.playerIndex;
    this.controls = config.controls;
    this.playerColor = config.color;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(false);
    this.setBounce(0);
    this.body.setSize(12, 14, true);
    this.body.setOffset(2, 2);

    this.createShadow();
    this.createEffects();
    this.setupControls();
  }

  private static createPlayerTexture(scene: Phaser.Scene, key: string, color: number): void {
    if (scene.textures.exists(key)) return;

    const g = scene.add.graphics();
    g.clear();

    g.fillStyle(color, 1);
    g.fillRect(4, 2, 8, 8);
    g.fillRect(5, 10, 2, 4);
    g.fillRect(9, 10, 2, 4);
    g.fillStyle(0xffffff, 1);
    g.fillRect(6, 4, 2, 2);
    g.fillRect(9, 4, 2, 2);
    g.fillStyle(0x000000, 1);
    g.fillRect(7, 5, 1, 1);
    g.fillRect(10, 5, 1, 1);

    g.generateTexture(key, 16, 16);
    g.destroy();
  }

  private createShadow(): void {
    this.shadow = this.scene.add.ellipse(this.x, this.y + 10, 14, 3, 0x000000, 0.4);
    this.shadow.setDepth(this.depth - 1);
  }

  private createEffects(): void {
    this.shieldRing = this.scene.add.arc(this.x, this.y, 14, 0, 360, false, 0xffffff, 0.4);
    this.shieldRing.setStrokeStyle(2, 0xffffff, 0.6);
    this.shieldRing.setVisible(false);

    this.invincibleGlow = this.scene.add.arc(this.x, this.y, 16, 0, 360, false, 0xffd700, 0);
    this.invincibleGlow.setStrokeStyle(2, 0xffd700, 0.8);
    this.invincibleGlow.setVisible(false);

    this.dustParticles = this.scene.add.particles(0, 0, undefined, {
      lifespan: 300,
      speedX: { min: -30, max: 30 },
      speedY: { min: -10, max: -5 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: 0xcccccc,
      emitting: false,
      quantity: 0
    });
  }

  private setupControls(): void {
    const kb = this.scene.input.keyboard;
    if (!kb) return;
    this.keyLeft = kb.addKey(this.controls.left);
    this.keyRight = kb.addKey(this.controls.right);
    this.keyUp = kb.addKey(this.controls.up);
    this.keyDown = kb.addKey(this.controls.down);
  }

  public update(time: number, delta: number): void {
    if (this.isDead) return;

    this.updateTimers(delta);
    this.handleMovement();
    this.updateShadow();
    this.updateEffectsPosition();
    this.updateFlashing(time);
    this.updateInvincibleGlow(time);
  }

  private updateTimers(delta: number): void {
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= delta;
      if (this.invincibleTimer <= 0) {
        this.isInvincible = false;
        this.invincibleGlow.setVisible(false);
      }
    }
    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= delta;
      if (this.speedBoostTimer <= 0) {
        this.speedBoost = false;
      }
    }
    if (this.hurtFlashTimer > 0) {
      this.hurtFlashTimer -= delta;
    }
  }

  private handleMovement(): void {
    const speed = this.speedBoost ? this.baseSpeed * 1.5 : this.baseSpeed;
    let velX = 0;
    let velY = this.body.velocity.y;

    if (this.keyLeft?.isDown) velX -= speed;
    if (this.keyRight?.isDown) velX += speed;

    if (this.keyUp?.isDown && this.isOnGround) {
      velY = this.jumpForce;
      this.isOnGround = false;
    }

    this.setVelocity(velX, velY);
  }

  private updateShadow(): void {
    this.shadow.setPosition(this.x, this.y + 10);
    const scale = this.isOnGround ? 1 : 0.7;
    this.shadow.setScale(scale, scale);
  }

  private updateEffectsPosition(): void {
    this.shieldRing.setPosition(this.x, this.y);
    this.invincibleGlow.setPosition(this.x, this.y);
  }

  private updateFlashing(time: number): void {
    if (this.hurtFlashTimer > 0) {
      this.isFlashing = Math.floor(time / 100) % 2 === 0;
      this.setAlpha(this.isFlashing ? 0.3 : 1);
    } else {
      this.setAlpha(1);
    }
  }

  private updateInvincibleGlow(time: number): void {
    if (this.isInvincible) {
      const pulse = 1 + Math.sin(time / 100) * 0.15;
      this.invincibleGlow.setScale(pulse);
    }
  }

  public playLandingDust(): void {
    this.dustParticles.emitParticleAt(this.x, this.y + 10, Phaser.Math.Between(4, 6));
  }

  public takeDamage(): boolean {
    if (this.isInvincible || this.isDead) return false;

    if (this.hasShield) {
      this.hasShield = false;
      this.shieldRing.setVisible(false);
      this.hurtFlashTimer = 500;
      return true;
    }

    this.lives--;
    this.hurtFlashTimer = 500;

    if (this.lives <= 0) {
      this.die();
    }
    return true;
  }

  private die(): void {
    this.isDead = true;
    this.deaths++;
    this.setVelocity(0, 0);
    this.setActive(false);
    this.setVisible(false);
    this.shadow.setVisible(false);
    this.shieldRing.setVisible(false);
    this.invincibleGlow.setVisible(false);
  }

  public respawn(x: number, y: number): void {
    this.lives = this.maxLives;
    this.isDead = false;
    this.hasShield = false;
    this.speedBoost = false;
    this.isInvincible = true;
    this.invincibleTimer = 2000;
    this.hurtFlashTimer = 0;
    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.setActive(true);
    this.setVisible(true);
    this.shadow.setVisible(true);
    this.invincibleGlow.setVisible(true);
  }

  public pickInvincible(): void {
    this.isInvincible = true;
    this.invincibleTimer = 3000;
    this.invincibleGlow.setVisible(true);
  }

  public pickSpeedBoost(): void {
    this.speedBoost = true;
    this.speedBoostTimer = 3000;
  }

  public pickShield(): void {
    this.hasShield = true;
    this.shieldRing.setVisible(true);
  }

  public destroy(fromScene?: boolean): void {
    this.shadow.destroy();
    this.shieldRing.destroy();
    this.invincibleGlow.destroy();
    this.dustParticles.destroy();
    super.destroy(fromScene);
  }
}
