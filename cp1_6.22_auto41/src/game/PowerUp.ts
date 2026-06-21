export type PowerUpType = 'speed' | 'shield';

export class PowerUp {
  public x: number;
  public y: number;
  public width: number = 16;
  public height: number = 16;
  public type: PowerUpType;
  public speed: number = 100;
  public active: boolean = true;
  public collected: boolean = false;
  public bobOffset: number = 0;
  public bobTimer: number = 0;

  constructor(canvasWidth: number, canvasHeight: number, type?: PowerUpType) {
    this.type = type || (Math.random() < 0.5 ? 'speed' : 'shield');
    this.x = canvasWidth;
    this.y = Math.random() * (canvasHeight - this.height);
    this.bobOffset = Math.random() * Math.PI * 2;
  }

  public update(dt: number): void {
    this.x -= this.speed * dt;
    this.bobTimer += dt;
    if (this.x + this.width < 0) {
      this.active = false;
    }
  }

  public getRenderY(): number {
    return this.y + Math.sin(this.bobTimer * 3 + this.bobOffset) * 3;
  }

  public getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  public getScoreValue(): number {
    return this.type === 'speed' ? 50 : 30;
  }
}

export class ShieldParticle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public life: number;
  public maxLife: number;
  public size: number;
  public active: boolean = true;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 120;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.maxLife = 0.5 + Math.random() * 0.5;
    this.life = this.maxLife;
    this.size = 2 + Math.random() * 3;
  }

  public update(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
    }
  }

  public getAlpha(): number {
    return Math.max(0, this.life / this.maxLife);
  }
}
