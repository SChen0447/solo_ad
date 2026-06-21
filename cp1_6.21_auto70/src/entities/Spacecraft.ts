import Phaser from 'phaser';

export type TractorState = 'idle' | 'charging' | 'active' | 'depleted';

export class Spacecraft {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public scene: Phaser.Scene;

  private beamGraphics!: Phaser.GameObjects.Graphics;
  private beamGlow!: Phaser.GameObjects.Graphics;
  private thrusterParticles!: Phaser.GameObjects.Particles.ParticleEmitter;

  private tractorState: TractorState = 'idle';
  private beamLength = 450;
  private beamAngle = 0.18;

  private mouseX = 0;
  private mouseY = 0;

  public energy = 100;
  public maxEnergy = 100;
  public energyDrainPerSec = 18;
  public energyRegenPerSec = 5;
  public minEnergyToFire = 20;

  public lives = 5;
  public maxLives = 5;
  public invincible = false;
  private invincibleTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.createProceduralTexture();
    this.sprite = scene.physics.add.sprite(x, y, 'spacecraft');
    this.sprite.setCollideWorldBounds(false);
    this.sprite.setBounce(0.3);
    this.sprite.setDamping(true);
    this.sprite.setDrag(0.92, 0.92);
    this.sprite.setAngularDrag(100);
    this.sprite.setCircle(22);

    this.beamGraphics = scene.add.graphics();
    this.beamGlow = scene.add.graphics();
    this.beamGraphics.setDepth(5);
    this.beamGlow.setDepth(4);

    this.setupThrusters();

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.mouseX = pointer.worldX;
      this.mouseY = pointer.worldY;
    });
  }

  private createProceduralTexture(): void {
    const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
    const cx = 64, cy = 64;

    const wingGrad = g.createLinearGradient(cx - 50, cy, cx + 50, cy);
    wingGrad.addColorStop(0, 0x37474f);
    wingGrad.addColorStop(0.5, 0x78909c);
    wingGrad.addColorStop(1, 0x37474f);

    g.fillGradientStyle(0x37474f, 0x78909c, 0x37474f, 0x78909c, 1);
    g.fillPoints([
      new Phaser.Geom.Point(cx - 5, cy - 8),
      new Phaser.Geom.Point(cx - 38, cy + 20),
      new Phaser.Geom.Point(cx - 42, cy + 35),
      new Phaser.Geom.Point(cx - 18, cy + 18),
      new Phaser.Geom.Point(cx - 5, cy + 10),
    ], true);

    g.fillGradientStyle(0x78909c, 0x37474f, 0x78909c, 0x37474f, 1);
    g.fillPoints([
      new Phaser.Geom.Point(cx + 5, cy - 8),
      new Phaser.Geom.Point(cx + 38, cy + 20),
      new Phaser.Geom.Point(cx + 42, cy + 35),
      new Phaser.Geom.Point(cx + 18, cy + 18),
      new Phaser.Geom.Point(cx + 5, cy + 10),
    ], true);

    const bodyGrad = g.createLinearGradient(cx, cy - 60, cx, cy + 30);
    bodyGrad.addColorStop(0, 0xcecece);
    bodyGrad.addColorStop(0.3, 0xe0e0e0);
    bodyGrad.addColorStop(0.6, 0xb0bec5);
    bodyGrad.addColorStop(1, 0x546e7a);

    g.fillGradientStyle(0x90a4ae, 0xe0e0e0, 0x90a4ae, 0xe0e0e0, 1);
    g.fillPoints([
      new Phaser.Geom.Point(cx, cy - 55),
      new Phaser.Geom.Point(cx + 12, cy - 10),
      new Phaser.Geom.Point(cx + 10, cy + 25),
      new Phaser.Geom.Point(cx - 10, cy + 25),
      new Phaser.Geom.Point(cx - 12, cy - 10),
    ], true);

    g.fillStyle(0x4fc3f7, 0.9);
    g.fillCircle(cx, cy - 18, 9);
    g.fillStyle(0x81d4fa, 0.7);
    g.fillCircle(cx - 2, cy - 20, 4);

    g.fillStyle(0xff5722, 1);
    g.fillRoundedRect(cx - 8, cy + 22, 16, 10, 3);
    g.fillStyle(0xff9800, 1);
    g.fillRoundedRect(cx - 5, cy + 24, 10, 8, 2);

    g.lineStyle(1.5, 0x455a64, 0.8);
    g.strokePoints([
      new Phaser.Geom.Point(cx, cy - 55),
      new Phaser.Geom.Point(cx + 12, cy - 10),
      new Phaser.Geom.Point(cx + 10, cy + 25),
      new Phaser.Geom.Point(cx - 10, cy + 25),
      new Phaser.Geom.Point(cx - 12, cy - 10),
    ], true);

    g.generateTexture('spacecraft', 128, 128);
    g.destroy();
  }

  private setupThrusters(): void {
    const particleGfx = this.scene.make.graphics({ x: 0, y: 0, add: false });
    for (let i = 0; i < 8; i++) {
      const r = 4 - i * 0.4;
      const alpha = 1 - i * 0.12;
      const colors = [0xffeb3b, 0xff9800, 0xff5722, 0xe65100, 0xffffff];
      particleGfx.fillStyle(colors[i % colors.length], alpha);
      particleGfx.fillCircle(i * 0.3, 0, r);
    }
    particleGfx.generateTexture('thruster_particle', 16, 16);
    particleGfx.destroy();

    this.thrusterParticles = this.scene.add.particles(0, 0, 'thruster_particle', {
      x: 0,
      y: 0,
      speed: { min: 50, max: 150 },
      angle: { min: 80, max: 100 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 350,
      quantity: 2,
      blendMode: Phaser.BlendModes.ADD,
      frequency: 25,
    });
    this.thrusterParticles.setDepth(3);
    this.thrusterParticles.startFollow(this.sprite);
  }

  update(delta: number): void {
    this.updateRotation();
    this.updateEnergy(delta);
    this.updateThrusters();
    this.updateInvincibility(delta);

    if (this.tractorState === 'active') {
      this.drawBeam();
    } else {
      this.beamGraphics.clear();
      this.beamGlow.clear();
    }
  }

  private updateRotation(): void {
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y,
      this.mouseX, this.mouseY
    );
    this.sprite.setRotation(angle + Math.PI / 2);

    const dist = Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this.mouseX, this.mouseY
    );
    if (dist > 60) {
      const speed = Math.min(dist * 0.8, 350);
      this.scene.physics.velocityFromRotation(
        angle,
        speed * 0.3,
        this.sprite.body!.velocity
      );
    }
  }

  private updateEnergy(delta: number): void {
    const dtSec = delta / 1000;
    if (this.tractorState === 'active') {
      this.energy = Math.max(0, this.energy - this.energyDrainPerSec * dtSec);
      if (this.energy <= 0) {
        this.setTractorState('depleted');
      }
    } else {
      this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegenPerSec * dtSec);
      if (this.tractorState === 'depleted' && this.energy >= this.minEnergyToFire) {
        this.setTractorState('idle');
      }
    }
  }

  private updateThrusters(): void {
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y,
      this.mouseX, this.mouseY
    );
    const followOffsetX = Math.cos(angle + Math.PI) * 28;
    const followOffsetY = Math.sin(angle + Math.PI) * 28;

    this.thrusterParticles.followOffset = new Phaser.Math.Vector2(
      followOffsetX, followOffsetY
    );
    this.thrusterParticles.emitAngle = (angle + Math.PI) * Phaser.Math.RAD_TO_DEG;
  }

  private updateInvincibility(delta: number): void {
    if (this.invincible) {
      this.invincibleTimer -= delta;
      this.sprite.alpha = Math.floor(this.invincibleTimer / 100) % 2 === 0 ? 0.4 : 1;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
        this.sprite.alpha = 1;
      }
    }
  }

  public fireTractorBeam(): boolean {
    if (this.tractorState === 'depleted') return false;
    if (this.energy < this.minEnergyToFire && this.tractorState === 'idle') return false;
    this.setTractorState('active');
    return true;
  }

  public releaseTractorBeam(): void {
    if (this.tractorState === 'active') {
      this.setTractorState('idle');
    }
  }

  private setTractorState(state: TractorState): void {
    this.tractorState = state;
    if (state !== 'active') {
      this.beamGraphics.clear();
      this.beamGlow.clear();
    }
  }

  public getTractorState(): TractorState {
    return this.tractorState;
  }

  private drawBeam(): void {
    this.beamGraphics.clear();
    this.beamGlow.clear();

    const angle = this.sprite.rotation - Math.PI / 2;
    const startX = this.sprite.x + Math.cos(angle) * 30;
    const startY = this.sprite.y + Math.sin(angle) * 30;
    const endX = this.sprite.x + Math.cos(angle) * this.beamLength;
    const endY = this.sprite.y + Math.sin(angle) * this.beamLength;

    const perpX = Math.cos(angle + Math.PI / 2);
    const perpY = Math.sin(angle + Math.PI / 2);

    const nearWidth = 8;
    const farWidth = 55;

    const tl = { x: startX - perpX * nearWidth, y: startY - perpY * nearWidth };
    const tr = { x: startX + perpX * nearWidth, y: startY + perpY * nearWidth };
    const bl = { x: endX - perpX * farWidth, y: endY - perpY * farWidth };
    const br = { x: endX + perpX * farWidth, y: endY + perpY * farWidth };

    this.beamGlow.fillStyle(0x29b6f6, 0.12);
    this.beamGlow.fillPoints([
      new Phaser.Geom.Point(tl.x, tl.y),
      new Phaser.Geom.Point(tr.x, tr.y),
      new Phaser.Geom.Point(br.x, br.y),
      new Phaser.Geom.Point(bl.x, bl.y),
    ], true);

    this.beamGlow.fillStyle(0x4fc3f7, 0.08);
    this.beamGlow.fillCircle(endX, endY, farWidth * 1.2);

    for (let layer = 0; layer < 3; layer++) {
      const alpha = 0.35 - layer * 0.1;
      const widthOffset = layer * 3;

      const tlp = { x: startX - perpX * (nearWidth - widthOffset), y: startY - perpY * (nearWidth - widthOffset) };
      const trp = { x: startX + perpX * (nearWidth - widthOffset), y: startY + perpY * (nearWidth - widthOffset) };
      const blp = { x: endX - perpX * (farWidth - widthOffset * 6), y: endY - perpY * (farWidth - widthOffset * 6) };
      const brp = { x: endX + perpX * (farWidth - widthOffset * 6), y: endY + perpY * (farWidth - widthOffset * 6) };

      this.beamGraphics.lineStyle(1.5, 0x81d4fa, alpha);

      const cp1x = (startX + endX) / 3 + (Math.sin(Date.now() / 200 + layer) * 8);
      const cp1y = (startY + endY) / 3 + (Math.cos(Date.now() / 200 + layer) * 8);
      const cp2x = (startX + endX) * 2 / 3 + (Math.cos(Date.now() / 250 + layer * 2) * 10);
      const cp2y = (startY + endY) * 2 / 3 + (Math.sin(Date.now() / 250 + layer * 2) * 10);

      this.beamGraphics.beginPath();
      this.beamGraphics.moveTo(tlp.x, tlp.y);
      this.beamGraphics.bezierCurveTo(cp1x - perpX * 15, cp1y - perpY * 15, cp2x - perpX * 35, cp2y - perpY * 35, blp.x, blp.y);
      this.beamGraphics.strokePath();

      this.beamGraphics.beginPath();
      this.beamGraphics.moveTo(trp.x, trp.y);
      this.beamGraphics.bezierCurveTo(cp1x + perpX * 15, cp1y + perpY * 15, cp2x + perpX * 35, cp2y + perpY * 35, brp.x, brp.y);
      this.beamGraphics.strokePath();

      if (layer === 0) {
        this.beamGraphics.fillStyle(0x4fc3f7, 0.15);
        this.beamGraphics.fillPoints([
          new Phaser.Geom.Point(tlp.x, tlp.y),
          new Phaser.Geom.Point(trp.x, trp.y),
          new Phaser.Geom.Point(brp.x, brp.y),
          new Phaser.Geom.Point(blp.x, blp.y),
        ], true);
      }
    }

    const coreAlpha = 0.6 + Math.sin(Date.now() / 80) * 0.2;
    this.beamGraphics.lineStyle(3, 0xe1f5fe, coreAlpha);
    this.beamGraphics.beginPath();
    this.beamGraphics.moveTo(startX, startY);
    this.beamGraphics.lineTo(endX, endY);
    this.beamGraphics.strokePath();

    const pulseSize = farWidth * (0.7 + Math.sin(Date.now() / 120) * 0.3);
    this.beamGlow.fillStyle(0xffffff, 0.2 + Math.sin(Date.now() / 150) * 0.1);
    this.beamGlow.fillCircle(endX, endY, pulseSize * 0.6);
    this.beamGlow.fillStyle(0x4fc3f7, 0.3);
    this.beamGlow.fillCircle(endX, endY, pulseSize * 0.35);
    this.beamGlow.fillStyle(0x81d4fa, 0.5);
    this.beamGlow.fillCircle(endX, endY, pulseSize * 0.18);
  }

  public getBeamEnd(): { x: number; y: number } {
    const angle = this.sprite.rotation - Math.PI / 2;
    return {
      x: this.sprite.x + Math.cos(angle) * this.beamLength,
      y: this.sprite.y + Math.sin(angle) * this.beamLength,
    };
  }

  public getBeamInfo(): {
    start: { x: number; y: number };
    end: { x: number; y: number };
    angle: number;
    length: number;
    halfAngle: number;
    active: boolean;
  } {
    const angle = this.sprite.rotation - Math.PI / 2;
    return {
      start: {
        x: this.sprite.x + Math.cos(angle) * 30,
        y: this.sprite.y + Math.sin(angle) * 30,
      },
      end: this.getBeamEnd(),
      angle,
      length: this.beamLength,
      halfAngle: this.beamAngle,
      active: this.tractorState === 'active',
    };
  }

  public takeDamage(amount = 1): boolean {
    if (this.invincible) return false;
    this.lives = Math.max(0, this.lives - amount);
    this.invincible = true;
    this.invincibleTimer = 1500;

    this.scene.cameras.main.shake(300, 0.008);

    this.scene.tweens.add({
      targets: this.sprite,
      scale: { from: 1.3, to: 1 },
      duration: 300,
      ease: 'Elastic.easeOut',
    });

    return true;
  }

  public isDead(): boolean {
    return this.lives <= 0;
  }

  public destroy(): void {
    this.beamGraphics.destroy();
    this.beamGlow.destroy();
    this.thrusterParticles.destroy();
    this.sprite.destroy();
  }
}
