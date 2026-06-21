import Phaser from 'phaser';
import { GlobalSettings } from '../main';
import { LightManager } from '../utils/LightManager';
import { v4 as uuidv4 } from 'uuid';

export interface Footprint {
  id: string;
  x: number;
  y: number;
  angle: number;
  createdAt: number;
}

export interface NoiseDecoy {
  id: string;
  x: number;
  y: number;
  createdAt: number;
  duration: number;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  private lightManager: LightManager;
  private isCrouching: boolean = false;
  private lightExposure: number = 0;
  private isAlerted: boolean = false;
  private alertFlashTimer: number = 0;
  private footprints: Footprint[] = [];
  private noiseDecoys: NoiseDecoy[] = [];
  private lastFootprintTime: number = 0;
  private keys: { [key: string]: Phaser.Input.Keyboard.Key } = {};
  private playerGraphics: Phaser.GameObjects.Graphics | null = null;
  private footprintGraphics: Phaser.GameObjects.Graphics | null = null;
  private noiseGraphics: Phaser.GameObjects.Graphics | null = null;
  private glowGraphics: Phaser.GameObjects.Graphics | null = null;
  private facingAngle: number = 0;
  private isMoving: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, lightManager: LightManager) {
    super(scene, x, y, '');
    this.lightManager = lightManager;

    scene.physics.world.enable(this);
    scene.add.existing(this);

    this.setBodySize(16, 16);
    this.setCollideWorldBounds(true);

    this.initInput(scene);
    this.initGraphics(scene);
  }

  private initInput(scene: Phaser.Scene): void {
    this.keys = {
      up: scene.input.keyboard!.addKey('W'),
      down: scene.input.keyboard!.addKey('S'),
      left: scene.input.keyboard!.addKey('A'),
      right: scene.input.keyboard!.addKey('D'),
      crouch: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      noise: scene.input.keyboard!.addKey('E')
    };

    scene.input.keyboard!.on('keydown-E', () => {
      this.throwNoiseDecoy();
    });
  }

  private initGraphics(scene: Phaser.Scene): void {
    this.playerGraphics = scene.add.graphics();
    this.footprintGraphics = scene.add.graphics();
    this.noiseGraphics = scene.add.graphics();
    this.glowGraphics = scene.add.graphics();
  }

  update(delta: number, time: number): void {
    this.handleMovement(delta);
    this.updateLightExposure(delta);
    this.updateFootprints(time);
    this.updateNoiseDecoys(time);
    this.updateAlertFlash(delta);
    this.render();
  }

  private handleMovement(delta: number): void {
    const speed = this.isCrouching ? GlobalSettings.PLAYER_CROUCH_SPEED : GlobalSettings.PLAYER_SPEED;
    let vx = 0;
    let vy = 0;

    if (this.keys.up?.isDown) vy -= 1;
    if (this.keys.down?.isDown) vy += 1;
    if (this.keys.left?.isDown) vx -= 1;
    if (this.keys.right?.isDown) vx += 1;

    this.isCrouching = this.keys.crouch?.isDown || false;

    this.isMoving = vx !== 0 || vy !== 0;

    if (this.isMoving) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx = (vx / len) * speed;
      vy = (vy / len) * speed;
      this.facingAngle = Math.atan2(vy, vx);
    }

    this.setVelocity(vx, vy);
  }

  private updateLightExposure(delta: number): void {
    const exposure = this.lightManager.isPointLit(this.x, this.y);

    if (exposure > 0.1) {
      this.lightExposure += delta / 1000;
    } else {
      this.lightExposure = Math.max(0, this.lightExposure - delta / 1000 * 0.5);
    }

    if (this.lightExposure >= GlobalSettings.LIGHT_EXPOSURE_THRESHOLD) {
      if (!this.isAlerted) {
        this.isAlerted = true;
        this.scene.events.emit('playerAlerted', this.x, this.y);
      }
    } else if (this.lightExposure <= 0.5 && this.isAlerted) {
      this.isAlerted = false;
    }
  }

  private updateFootprints(time: number): void {
    const footprintInterval = this.isCrouching ? 500 : 300;

    if (this.isMoving && time - this.lastFootprintTime > footprintInterval) {
      this.footprints.push({
        id: uuidv4(),
        x: this.x,
        y: this.y,
        angle: this.facingAngle,
        createdAt: time
      });
      this.lastFootprintTime = time;
    }

    this.footprints = this.footprints.filter(
      f => time - f.createdAt < GlobalSettings.FOOTPRINT_DURATION
    );
  }

  private updateNoiseDecoys(time: number): void {
    this.noiseDecoys = this.noiseDecoys.filter(
      n => time - n.createdAt < n.duration
    );
  }

  private updateAlertFlash(delta: number): void {
    if (this.isAlerted) {
      this.alertFlashTimer += delta;
    }
  }

  private throwNoiseDecoy(): void {
    const throwDistance = 150;
    const targetX = this.x + Math.cos(this.facingAngle) * throwDistance;
    const targetY = this.y + Math.sin(this.facingAngle) * throwDistance;

    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 300,
      onUpdate: (tween) => {
        const value = tween.getValue();
      },
      onComplete: () => {
        this.noiseDecoys.push({
          id: uuidv4(),
          x: targetX,
          y: targetY,
          createdAt: this.scene.time.now,
          duration: GlobalSettings.NOISE_DURATION
        });
        this.scene.events.emit('noiseThrown', targetX, targetY);
      }
    });
  }

  private render(): void {
    if (!this.playerGraphics || !this.footprintGraphics || !this.noiseGraphics || !this.glowGraphics) return;

    this.footprintGraphics.clear();
    for (const footprint of this.footprints) {
      const age = (this.scene.time.now - footprint.createdAt) / GlobalSettings.FOOTPRINT_DURATION;
      const alpha = (1 - age) * 0.4;

      this.footprintGraphics.save();
      this.footprintGraphics.fillStyle(0x888888, alpha);
      this.footprintGraphics.fillEllipse(footprint.x, footprint.y, 8, 6, 0);
      this.footprintGraphics.restore();
    }

    this.noiseGraphics.clear();
    for (const decoy of this.noiseDecoys) {
      const age = (this.scene.time.now - decoy.createdAt) / decoy.duration;
      const pulseRadius = (GlobalSettings.NOISE_RADIUS * 2) * age;
      const alpha = (1 - age) * 0.6;

      this.noiseGraphics.save();
      this.noiseGraphics.lineStyle(2, 0x66aaff, alpha);
      this.noiseGraphics.strokeCircle(decoy.x, decoy.y, pulseRadius);
      this.noiseGraphics.restore();

      this.noiseGraphics.save();
      this.noiseGraphics.lineStyle(1, 0x88ccff, alpha * 0.5);
      this.noiseGraphics.strokeCircle(decoy.x, decoy.y, pulseRadius * 0.7);
      this.noiseGraphics.restore();
    }

    const exposure = this.lightManager.isPointLit(this.x, this.y);
    const baseAlpha = Phaser.Math.Linear(1, 0.2, exposure);

    this.glowGraphics.clear();
    if (exposure > 0.1) {
      const glowAlpha = exposure * 0.6;
      this.glowGraphics.save();
      this.glowGraphics.lineStyle(3, 0x66aaff, glowAlpha);
      this.glowGraphics.strokeCircle(this.x, this.y, 18);
      this.glowGraphics.restore();
    }

    this.playerGraphics.clear();

    if (this.isAlerted) {
      const flash = Math.sin(this.alertFlashTimer * 0.01) * 0.5 + 0.5;
      this.playerGraphics.save();
      this.playerGraphics.fillStyle(0xff4444, 0.3 + flash * 0.5);
      this.playerGraphics.fillCircle(this.x, this.y, 20);
      this.playerGraphics.restore();
    }

    const bodyColor = this.isAlerted ? 0xff6666 : 0x4488ff;
    const finalAlpha = this.isAlerted ? 1 : baseAlpha;

    this.playerGraphics.save();
    this.playerGraphics.fillStyle(bodyColor, finalAlpha);
    this.playerGraphics.fillCircle(this.x, this.y, 10);
    this.playerGraphics.restore();

    this.playerGraphics.save();
    this.playerGraphics.fillStyle(0xffffff, finalAlpha * 0.8);
    const eyeX = this.x + Math.cos(this.facingAngle) * 6;
    const eyeY = this.y + Math.sin(this.facingAngle) * 6;
    this.playerGraphics.fillCircle(eyeX, eyeY, 3);
    this.playerGraphics.restore();

    if (this.isCrouching) {
      this.playerGraphics.save();
      this.playerGraphics.lineStyle(1, 0x88ff88, finalAlpha * 0.6);
      this.playerGraphics.strokeCircle(this.x, this.y, 14);
      this.playerGraphics.restore();
    }
  }

  public getLightExposure(): number {
    return this.lightExposure;
  }

  public getIsAlerted(): boolean {
    return this.isAlerted;
  }

  public getIsCrouching(): boolean {
    return this.isCrouching;
  }

  public getNoiseDecoys(): NoiseDecoy[] {
    return this.noiseDecoys;
  }

  public getFacingAngle(): number {
    return this.facingAngle;
  }

  destroy(fromScene?: boolean): void {
    if (this.playerGraphics) this.playerGraphics.destroy();
    if (this.footprintGraphics) this.footprintGraphics.destroy();
    if (this.noiseGraphics) this.noiseGraphics.destroy();
    if (this.glowGraphics) this.glowGraphics.destroy();
    super.destroy(fromScene);
  }
}

export default Player;
