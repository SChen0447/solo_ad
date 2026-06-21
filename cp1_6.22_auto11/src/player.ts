import Phaser from 'phaser';

export type PlayerState = 'idle' | 'running' | 'jumping' | 'sliding' | 'hit';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private playerState: PlayerState = 'idle';
  private jumpDuration: number = 600;
  private slideDuration: number = 400;
  private jumpTimer: number = 0;
  private slideTimer: number = 0;
  private isJumping: boolean = false;
  private isSliding: boolean = false;
  private hitFlashTimer: number = 0;
  private hitFlashDuration: number = 500;
  private originalWidth: number = 32;
  private originalHeight: number = 32;
  private slideWidth: number = 32;
  private slideHeight: number = 16;
  private groundY: number = 0;
  private dustParticles: any = null;
  private sparkParticles: any = null;
  private dustEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private sparkEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private stateChangeCallback: ((state: PlayerState) => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    
    this.groundY = y;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setOrigin(0.5, 1);
    this.setCollideWorldBounds(false);
    this.setGravityY(0);
    
    this.createAnimations();
    this.createParticles();
    
    this.play('run');
    this.playerState = 'running';
  }

  private createAnimations(): void {
    const frameRate = 12;
    
    if (!this.scene.anims.exists('run')) {
      this.scene.anims.create({
        key: 'run',
        frames: this.scene.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
        frameRate: frameRate,
        repeat: -1
      });
    }
    
    if (!this.scene.anims.exists('jump')) {
      this.scene.anims.create({
        key: 'jump',
        frames: this.scene.anims.generateFrameNumbers('player', { start: 4, end: 5 }),
        frameRate: frameRate / 2,
        repeat: 0
      });
    }
    
    if (!this.scene.anims.exists('slide')) {
      this.scene.anims.create({
        key: 'slide',
        frames: this.scene.anims.generateFrameNumbers('player', { start: 6, end: 7 }),
        frameRate: frameRate,
        repeat: 0
      });
    }
  }

  private createParticles(): void {
    this.dustParticles = this.scene.add.particles(0, 0, 'dust', {
      lifespan: 300,
      speed: { min: -20, max: 20 },
      angle: { min: -90, max: -45 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      quantity: 0,
      emitting: false
    });
    this.dustEmitter = this.dustParticles.createEmitter();
    
    this.sparkParticles = this.scene.add.particles(0, 0, 'spark', {
      lifespan: 400,
      speed: { min: 50, max: 150 },
      angle: { min: -30, max: 30 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 0,
      emitting: false
    });
    this.sparkEmitter = this.sparkParticles.createEmitter();
  }

  public override update(_time: number, delta: number): void {
    const adjustedDelta = delta * (this.scene.game.loop.actualFps / 60);
    
    if (this.isJumping) {
      this.jumpTimer -= adjustedDelta;
      const progress = 1 - (this.jumpTimer / this.jumpDuration);
      const jumpHeight = 120;
      const height = jumpHeight * Math.sin(progress * Math.PI);
      this.y = this.groundY - height;
      
      if (this.jumpTimer <= 0) {
        this.onJumpComplete();
      }
    }
    
    if (this.isSliding) {
      this.slideTimer -= adjustedDelta;
      
      if (this.sparkEmitter) {
        this.sparkEmitter.setPosition(this.x - 10, this.y - 2);
        this.sparkEmitter.emitParticle(1);
      }
      
      if (this.slideTimer <= 0) {
        this.onSlideComplete();
      }
    }
    
    if (this.playerState === 'hit') {
      this.hitFlashTimer -= adjustedDelta;
      
      const flashPhase = Math.floor(this.hitFlashTimer / 80) % 2;
      this.setTint(flashPhase === 0 ? 0xff4444 : 0xffffff);
      
      if (this.hitFlashTimer <= 0) {
        this.clearTint();
        this.playerState = 'running';
        this.play('run');
        this.notifyStateChange();
      }
    }
    
    if (this.playerState === 'running' && this.dustEmitter && Math.random() < 0.3) {
      this.dustEmitter.setPosition(this.x - 5, this.y - 2);
      this.dustEmitter.emitParticle(1);
    }
  }

  public jump(): boolean {
    if (this.playerState !== 'running' || this.isJumping || this.isSliding) {
      return false;
    }
    
    this.isJumping = true;
    this.jumpTimer = this.jumpDuration;
    this.playerState = 'jumping';
    this.play('jump');
    this.notifyStateChange();
    
    if (this.dustEmitter) {
      this.dustEmitter.setPosition(this.x, this.y);
      this.dustEmitter.emitParticle(5);
    }
    
    return true;
  }

  public slide(): boolean {
    if (this.playerState !== 'running' || this.isJumping || this.isSliding) {
      return false;
    }
    
    this.isSliding = true;
    this.slideTimer = this.slideDuration;
    this.playerState = 'sliding';
    this.play('slide');
    this.notifyStateChange();
    
    this.setSize(this.slideWidth, this.slideHeight);
    this.setDisplaySize(this.slideWidth, this.slideHeight);
    this.y = this.groundY;
    
    return true;
  }

  private onJumpComplete(): void {
    this.isJumping = false;
    this.y = this.groundY;
    this.playerState = 'running';
    this.play('run');
    this.notifyStateChange();
    
    if (this.dustEmitter) {
      this.dustEmitter.setPosition(this.x, this.y);
      this.dustEmitter.emitParticle(3);
    }
  }

  private onSlideComplete(): void {
    this.isSliding = false;
    this.playerState = 'running';
    this.play('run');
    this.notifyStateChange();
    
    this.setSize(this.originalWidth, this.originalHeight);
    this.setDisplaySize(this.originalWidth, this.originalHeight);
  }

  public onHit(): void {
    if (this.playerState === 'hit') return;
    
    this.playerState = 'hit';
    this.hitFlashTimer = this.hitFlashDuration;
    
    if (this.isJumping) {
      this.isJumping = false;
      this.y = this.groundY;
    }
    
    if (this.isSliding) {
      this.isSliding = false;
      this.setSize(this.originalWidth, this.originalHeight);
      this.setDisplaySize(this.originalWidth, this.originalHeight);
    }
    
    this.scene.tweens.add({
      targets: this,
      x: this.x - 16,
      duration: 200,
      ease: 'Quad.easeOut',
      yoyo: true,
      hold: 100
    });
    
    this.notifyStateChange();
  }

  public onScore(): void {
    this.scene.tweens.add({
      targets: this,
      scale: 1.1,
      duration: 100,
      ease: 'Quad.easeOut',
      yoyo: true
    });
  }

  public getState(): PlayerState {
    return this.playerState;
  }

  public isInvulnerable(): boolean {
    return this.playerState === 'hit';
  }

  public setGroundY(y: number): void {
    this.groundY = y;
    if (!this.isJumping) {
      this.y = y;
    }
  }

  public setStateChangeCallback(callback: (state: PlayerState) => void): void {
    this.stateChangeCallback = callback;
  }

  private notifyStateChange(): void {
    if (this.stateChangeCallback) {
      this.stateChangeCallback(this.playerState);
    }
  }

  public getHitbox(): Phaser.Geom.Rectangle {
    if (this.isSliding) {
      return new Phaser.Geom.Rectangle(
        this.x - this.slideWidth / 2,
        this.y - this.slideHeight,
        this.slideWidth,
        this.slideHeight
      );
    }
    return new Phaser.Geom.Rectangle(
      this.x - this.originalWidth / 2 + 4,
      this.y - this.originalHeight + 2,
      this.originalWidth - 8,
      this.originalHeight - 4
    );
  }

  public override destroy(fromScene?: boolean): void {
    if (this.dustParticles) {
      this.dustParticles.destroy();
    }
    if (this.sparkParticles) {
      this.sparkParticles.destroy();
    }
    super.destroy(fromScene);
  }
}
