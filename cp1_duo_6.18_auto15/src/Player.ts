import { Obstacle } from './Scene';

export interface FirePulseEvent {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export class Player {
  private width: number;
  private height: number;
  private x: number;
  private y: number;
  private radius: number = 8;
  private speed: number = 3;
  private energy: number = 100;
  private keys: Set<string> = new Set();
  private lastMoveX: number = 1;
  private lastMoveY: number = 0;
  private fireCallback: ((event: FirePulseEvent) => void) | null = null;
  private lowEnergyFlash: number = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.x = 60;
    this.y = height / 2;
  }

  public setFireCallback(cb: (event: FirePulseEvent) => void): void {
    this.fireCallback = cb;
  }

  public handleKeyDown(key: string): void {
    this.keys.add(key.toLowerCase());
    if (key === ' ') {
      this.tryFire();
    }
  }

  public handleKeyUp(key: string): void {
    this.keys.delete(key.toLowerCase());
  }

  private tryFire(): void {
    if (this.energy < 15) {
      this.lowEnergyFlash = 0.3;
      return;
    }
    this.energy -= 15;
    if (this.fireCallback) {
      const len = Math.sqrt(this.lastMoveX * this.lastMoveX + this.lastMoveY * this.lastMoveY);
      let dx = this.lastMoveX;
      let dy = this.lastMoveY;
      if (len > 0) {
        dx /= len;
        dy /= len;
      } else {
        dx = 1;
        dy = 0;
      }
      this.fireCallback({
        x: this.x,
        y: this.y,
        vx: dx * 5,
        vy: dy * 5
      });
    }
  }

  public update(dt: number, obstacles: Obstacle[]): void {
    let dx = 0;
    let dy = 0;

    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
      this.lastMoveX = dx;
      this.lastMoveY = dy;
    }

    const newX = this.x + dx * this.speed;
    const newY = this.y + dy * this.speed;

    if (!this.checkCollision(newX, this.y, obstacles)) {
      this.x = newX;
    }
    if (!this.checkCollision(this.x, newY, obstacles)) {
      this.y = newY;
    }

    this.x = Math.max(this.radius, Math.min(this.width - this.radius, this.x));
    this.y = Math.max(80 + this.radius, Math.min(this.height - this.radius, this.y));

    if (this.energy < 100) {
      this.energy = Math.min(100, this.energy + 0.5);
    }

    if (this.lowEnergyFlash > 0) {
      this.lowEnergyFlash -= dt;
      if (this.lowEnergyFlash < 0) this.lowEnergyFlash = 0;
    }
  }

  private checkCollision(x: number, y: number, obstacles: Obstacle[]): boolean {
    for (const obs of obstacles) {
      const closestX = Math.max(obs.x, Math.min(x, obs.x + obs.width));
      const closestY = Math.max(obs.y, Math.min(y, obs.y + obs.height));
      const distX = x - closestX;
      const distY = y - closestY;
      if (distX * distX + distY * distY < this.radius * this.radius) {
        return true;
      }
    }
    return false;
  }

  public reclaimEnergy(amount: number = 8): void {
    this.energy = Math.min(100, this.energy + amount);
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const barX = this.width - 50;
    const barY = this.height / 2 - 100;
    const barW = 20;
    const barH = 200;

    ctx.save();
    if (this.lowEnergyFlash > 0 && Math.floor(this.lowEnergyFlash * 20) % 2 === 0) {
      ctx.shadowColor = '#ff3355';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = '#ff3355';
    } else {
      ctx.shadowColor = '#00bfff';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = '#00bfff';
    }
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.restore();

    const fillH = (this.energy / 100) * barH;
    ctx.save();
    ctx.shadowColor = '#00bfff';
    ctx.shadowBlur = 10;
    const gradient = ctx.createLinearGradient(barX, barY + barH, barX, barY);
    gradient.addColorStop(0, '#0044aa');
    gradient.addColorStop(1, '#00bfff');
    ctx.fillStyle = gradient;
    ctx.fillRect(barX, barY + (barH - fillH), barW, fillH);
    ctx.restore();

    ctx.save();
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff8dc';
    ctx.beginPath();
    ctx.arc(this.x - 2, this.y - 2, this.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + this.lastMoveX * 18, this.y + this.lastMoveY * 18);
    ctx.stroke();
    ctx.restore();
  }

  public getEnergy(): number {
    return this.energy;
  }

  public getX(): number {
    return this.x;
  }

  public getY(): number {
    return this.y;
  }
}
