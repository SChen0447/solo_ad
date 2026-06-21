import Phaser from 'phaser';

export type DebrisState = 'floating' | 'tracted' | 'recycled' | 'destroyed';

const DEBRIS_COLORS = [
  { base: 0xe0e0e0, light: 0xfafafa, dark: 0x9e9e9e },
  { base: 0xbdbdbd, light: 0xe0e0e0, dark: 0x757575 },
  { base: 0x8d6e63, light: 0xa1887f, dark: 0x5d4037 },
  { base: 0xa1887f, light: 0xbcaaa4, dark: 0x6d4c41 },
  { base: 0x8d6e63, light: 0xbcaaa4, dark: 0x4e342e },
  { base: 0xbcaaa4, light: 0xd7ccc8, dark: 0x795548 },
  { base: 0xffcc80, light: 0xffe0b2, dark: 0xff8f00 },
  { base: 0xffb74d, light: 0xffcc80, dark: 0xf57c00 },
];

export class Debris {
  public sprite: Phaser.Physics.Arcade.Image;
  public scene: Phaser.Scene;

  public state: DebrisState = 'floating';
  public mass: number;
  public scoreValue = 100;

  private polygonPoints: Phaser.Geom.Point[] = [];
  private shapeKey: string;

  private tractedVelocity = new Phaser.Math.Vector2();
  private savedVelocity = new Phaser.Math.Vector2();
  private savedAngularVelocity = 0;

  private isFragment = false;
  private fragmentTimer = 0;
  private fragmentLifetime = 1000;

  private recycleFlash!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, config?: { isFragment?: boolean; size?: number }) {
    this.scene = scene;
    this.isFragment = config?.isFragment || false;
    this.shapeKey = `debris_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    this.createProceduralShape(config?.size);

    this.sprite = scene.physics.add.image(x, y, this.shapeKey);
    this.sprite.setActive(true);
    this.sprite.setVisible(true);

    const radius = this.isFragment ? 6 : 18;
    this.sprite.setCircle(radius);
    this.sprite.setBounce(0.6 + Math.random() * 0.3);
    this.sprite.setCollideWorldBounds(false);

    this.mass = this.isFragment ? 0.3 : (0.8 + Math.random() * 1.5);

    if (!this.isFragment) {
      const speed = 20 + Math.random() * 60;
      const angle = Math.random() * Math.PI * 2;
      this.sprite.setVelocity(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
      );
      this.sprite.setAngularVelocity((Math.random() - 0.5) * 120);
      this.sprite.rotation = Math.random() * Math.PI * 2;
    }

    this.recycleFlash = scene.add.graphics();
    this.recycleFlash.setDepth(6);
  }

  private createProceduralShape(sizeOverride?: number): void {
    const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
    const numPoints = this.isFragment ? (3 + Math.floor(Math.random() * 3)) : (5 + Math.floor(Math.random() * 5));
    const maxRadius = this.isFragment ? (sizeOverride || 6 + Math.random() * 4) : (sizeOverride || 15 + Math.random() * 18);
    const minRadius = this.isFragment ? 3 : (maxRadius * 0.4);

    const colorSet = DEBRIS_COLORS[Math.floor(Math.random() * DEBRIS_COLORS.length)];
    this.polygonPoints = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2 + Math.random() * 0.3;
      const r = minRadius + Math.random() * (maxRadius - minRadius);
      this.polygonPoints.push(new Phaser.Geom.Point(
        32 + Math.cos(angle) * r,
        32 + Math.sin(angle) * r
      ));
    }

    g.fillGradientStyle(colorSet.light, colorSet.base, colorSet.dark, colorSet.base, 1);
    g.fillPoints(this.polygonPoints, true);

    g.lineStyle(1.5, colorSet.dark, 0.9);
    g.strokePoints(this.polygonPoints, true);

    if (!this.isFragment) {
      const scratchCount = 2 + Math.floor(Math.random() * 4);
      g.lineStyle(1, colorSet.dark, 0.5);
      for (let i = 0; i < scratchCount; i++) {
        const sx = 20 + Math.random() * 24;
        const sy = 20 + Math.random() * 24;
        const len = 4 + Math.random() * 10;
        const ang = Math.random() * Math.PI;
        g.beginPath();
        g.moveTo(sx, sy);
        g.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
        g.strokePath();
      }

      if (Math.random() > 0.5) {
        const rustColors = [0x8d6e63, 0x6d4c41, 0x5d4037];
        const rustColor = rustColors[Math.floor(Math.random() * rustColors.length)];
        g.fillStyle(rustColor, 0.6);
        const rx = 20 + Math.random() * 24;
        const ry = 20 + Math.random() * 24;
        g.fillCircle(rx, ry, 2 + Math.random() * 4);
      }
    }

    g.generateTexture(this.shapeKey, 64, 64);
    g.destroy();
  }

  update(delta: number, beamInfo?: ReturnType<any>): void {
    if (this.state === 'recycled' || this.state === 'destroyed') return;

    if (this.isFragment) {
      this.fragmentTimer += delta;
      const alpha = 1 - (this.fragmentTimer / this.fragmentLifetime);
      this.sprite.alpha = Math.max(0, alpha);
      if (this.fragmentTimer >= this.fragmentLifetime) {
        this.destroySelf();
        return;
      }
    }

    if (this.state === 'tracted' && beamInfo) {
      this.updateTraction(delta, beamInfo);
    } else if (this.state === 'floating') {
      this.wrapAroundEdges();
    }
  }

  private wrapAroundEdges(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    const margin = 60;

    if (this.sprite.x < -margin) this.sprite.x = width + margin;
    if (this.sprite.x > width + margin) this.sprite.x = -margin;
    if (this.sprite.y < -margin) this.sprite.y = height + margin;
    if (this.sprite.y > height + margin) this.sprite.y = -margin;
  }

  public checkInsideBeam(beamInfo: {
    start: { x: number; y: number };
    end: { x: number; y: number };
    angle: number;
    length: number;
    halfAngle: number;
    active: boolean;
  }): boolean {
    if (!beamInfo.active) return false;
    if (this.state === 'recycled' || this.state === 'destroyed') return false;
    if (this.isFragment) return false;

    const dx = this.sprite.x - beamInfo.start.x;
    const dy = this.sprite.y - beamInfo.start.y;
    const distToStart = Math.sqrt(dx * dx + dy * dy);

    if (distToStart > beamInfo.length + 20) return false;

    const angleToDebris = Math.atan2(dy, dx);
    let angleDiff = angleToDebris - beamInfo.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const coneWidth = beamInfo.halfAngle * (distToStart / beamInfo.length);
    return Math.abs(angleDiff) < (beamInfo.halfAngle + coneWidth);
  }

  public startTraction(): void {
    if (this.state !== 'floating' || this.isFragment) return;
    this.state = 'tracted';
    this.savedVelocity.copy(this.sprite.body!.velocity);
    this.savedAngularVelocity = this.sprite.body!.angularVelocity;
  }

  private updateTraction(delta: number, beamInfo: {
    start: { x: number; y: number };
    active: boolean;
  }): void {
    if (!beamInfo.active || this.state !== 'tracted') {
      this.releaseTraction();
      return;
    }

    const dx = beamInfo.start.x - this.sprite.x;
    const dy = beamInfo.start.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 35) {
      this.recycle();
      return;
    }

    const targetSpeed = 350 + (500 - Math.min(dist, 500)) * 0.3;
    const nx = dx / dist;
    const ny = dy / dist;

    const lerpFactor = 0.15;
    this.tractedVelocity.x = this.sprite.body!.velocity.x * (1 - lerpFactor) + nx * targetSpeed * lerpFactor;
    this.tractedVelocity.y = this.sprite.body!.velocity.y * (1 - lerpFactor) + ny * targetSpeed * lerpFactor;

    this.sprite.setVelocity(this.tractedVelocity.x, this.tractedVelocity.y);
    this.sprite.setAngularVelocity(this.sprite.body!.angularVelocity * 0.9 + (Math.random() - 0.5) * 50 * 0.1);

    if (Math.random() < 0.3) {
      const flash = this.scene.add.graphics();
      flash.fillStyle(0x4fc3f7, 0.5 + Math.random() * 0.3);
      flash.fillCircle(this.sprite.x, this.sprite.y, 3 + Math.random() * 4);
      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        scale: 2,
        duration: 300,
        onComplete: () => flash.destroy(),
      });
    }
  }

  public releaseTraction(): void {
    if (this.state !== 'tracted') return;
    this.state = 'floating';
    this.sprite.setVelocity(
      this.savedVelocity.x * 0.5 + this.sprite.body!.velocity.x * 0.3,
      this.savedVelocity.y * 0.5 + this.sprite.body!.velocity.y * 0.3
    );
    this.sprite.setAngularVelocity(this.savedAngularVelocity);
  }

  public recycle(): void {
    if (this.state === 'recycled') return;
    this.state = 'recycled';

    this.sprite.body!.enable = false;

    this.recycleFlash.clear();
    this.recycleFlash.fillStyle(0x00ff88, 1);
    this.recycleFlash.fillCircle(this.sprite.x, this.sprite.y, 30);
    this.scene.tweens.add({
      targets: this.recycleFlash,
      alpha: 0,
      scale: 3,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => this.recycleFlash.clear(),
    });

    const particles = this.scene.add.particles(0, 0, null, {
      x: this.sprite.x,
      y: this.sprite.y,
      speed: { min: 80, max: 250 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      lifespan: 500,
      quantity: 15,
      tint: [0x69f0ae, 0x00e676, 0xb9f6ca, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
    });
    this.scene.time.delayedCall(500, () => particles.destroy());

    this.scene.tweens.add({
      targets: this.sprite,
      scale: { from: 1, to: 0 },
      alpha: { from: 1, to: 0 },
      duration: 350,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.sprite.setVisible(false);
      },
    });
  }

  public splitIntoFragments(): Debris[] {
    const fragments: Debris[] = [];
    if (this.isFragment) return fragments;

    const numFragments = 3 + Math.floor(Math.random() * 3);
    const baseVx = this.sprite.body!.velocity.x;
    const baseVy = this.sprite.body!.velocity.y;
    const baseAngVel = this.sprite.body!.angularVelocity;

    for (let i = 0; i < numFragments; i++) {
      const angle = (i / numFragments) * Math.PI * 2 + Math.random() * 0.5;
      const fragment = new Debris(this.scene, this.sprite.x, this.sprite.y, { isFragment: true });
      const fragSpeed = 80 + Math.random() * 150;
      fragment.sprite.setVelocity(
        baseVx * 0.3 + Math.cos(angle) * fragSpeed,
        baseVy * 0.3 + Math.sin(angle) * fragSpeed
      );
      fragment.sprite.setAngularVelocity(baseAngVel + (Math.random() - 0.5) * 300);
      fragments.push(fragment);
    }

    this.destroySelf();
    return fragments;
  }

  private destroySelf(): void {
    this.state = 'destroyed';
    this.sprite.body?.enable && (this.sprite.body.enable = false);
    this.sprite.setVisible(false);
    this.sprite.setActive(false);
  }

  public destroy(): void {
    this.recycleFlash?.destroy();
    if (this.sprite.texture) {
      this.scene.textures.removeKey(this.shapeKey);
    }
    this.sprite.destroy();
  }

  public isActive(): boolean {
    return this.state !== 'destroyed' && this.sprite.active;
  }

  public canCollide(): boolean {
    return this.isActive() && (this.state === 'floating' || this.isFragment);
  }
}
