export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Prism {
  x: number;
  y: number;
  size: number;
  angle: number;
}

export interface Receiver {
  x: number;
  y: number;
  radius: number;
  hit: boolean;
  hitAnim: number;
}

export class Scene {
  private width: number;
  private height: number;
  private obstacles: Obstacle[] = [];
  private prisms: Prism[] = [];
  private receiver: Receiver;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.generateObstacles();
    this.generatePrisms();
    this.receiver = this.generateReceiver();
  }

  private generateObstacles(): void {
    this.obstacles = [];
    const count = 6 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const w = 40 + Math.random() * 40;
      const h = 40 + Math.random() * 40;
      let x = 0, y = 0;
      let valid = false;
      let attempts = 0;

      while (!valid && attempts < 50) {
        x = 100 + Math.random() * (this.width - 250 - w);
        y = 80 + Math.random() * (this.height - 160 - h);
        valid = true;

        for (const obs of this.obstacles) {
          if (
            x < obs.x + obs.width + 30 &&
            x + w + 30 > obs.x &&
            y < obs.y + obs.height + 30 &&
            y + h + 30 > obs.y
          ) {
            valid = false;
            break;
          }
        }
        attempts++;
      }

      if (valid) {
        this.obstacles.push({ x, y, width: w, height: h });
      }
    }
  }

  private generatePrisms(): void {
    this.prisms = [];
    for (let i = 0; i < 3; i++) {
      let x = 0, y = 0;
      let valid = false;
      let attempts = 0;

      while (!valid && attempts < 50) {
        x = 150 + Math.random() * (this.width - 300);
        y = 120 + Math.random() * (this.height - 240);
        valid = true;

        for (const obs of this.obstacles) {
          if (
            x - 40 < obs.x + obs.width &&
            x + 40 > obs.x &&
            y - 40 < obs.y + obs.height &&
            y + 40 > obs.y
          ) {
            valid = false;
            break;
          }
        }

        for (const prism of this.prisms) {
          const dx = x - prism.x;
          const dy = y - prism.y;
          if (Math.sqrt(dx * dx + dy * dy) < 120) {
            valid = false;
            break;
          }
        }
        attempts++;
      }

      if (valid) {
        this.prisms.push({
          x,
          y,
          size: 50,
          angle: Math.random() * Math.PI * 2
        });
      }
    }
  }

  private generateReceiver(): Receiver {
    let x = 0, y = 0;
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 50) {
      x = this.width - 120 + Math.random() * 80;
      y = this.height - 100 + Math.random() * 50;
      valid = true;

      for (const obs of this.obstacles) {
        if (
          x - 30 < obs.x + obs.width &&
          x + 30 > obs.x &&
          y - 30 < obs.y + obs.height &&
          y + 30 > obs.y
        ) {
          valid = false;
          break;
        }
      }
      attempts++;
    }

    return { x, y, radius: 30, hit: false, hitAnim: 0 };
  }

  public update(dt: number): void {
    for (const prism of this.prisms) {
      prism.angle += (1.5 * Math.PI / 180);
    }

    if (this.receiver.hit) {
      this.receiver.hitAnim += dt;
      if (this.receiver.hitAnim >= 0.8) {
        this.receiver = this.generateReceiver();
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    for (const obs of this.obstacles) {
      ctx.save();
      ctx.shadowColor = 'rgba(58, 58, 74, 0.6)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#3a3a4a';
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      ctx.strokeStyle = '#5a5a6a';
      ctx.lineWidth = 1;
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
      ctx.restore();
    }

    for (const prism of this.prisms) {
      ctx.save();
      ctx.translate(prism.x, prism.y);
      ctx.rotate(prism.angle);
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = '#00d4ff';
      ctx.fillStyle = 'rgba(0, 212, 255, 0.15)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const h = prism.size * Math.sqrt(3) / 2;
      ctx.moveTo(0, -h * 2 / 3);
      ctx.lineTo(-prism.size / 2, h / 3);
      ctx.lineTo(prism.size / 2, h / 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    const rec = this.receiver;
    ctx.save();
    if (rec.hit) {
      const progress = rec.hitAnim / 0.8;
      const r = 30 + 90 * progress;
      const alpha = 1 - progress;
      ctx.beginPath();
      ctx.arc(rec.x, rec.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 255, 136, ${alpha * 0.6})`;
      ctx.fill();
    }
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(rec.x, rec.y, rec.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f0f1a';
    ctx.beginPath();
    ctx.arc(rec.x, rec.y, rec.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(rec.x, rec.y, rec.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  public getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  public getPrisms(): Prism[] {
    return this.prisms;
  }

  public getReceiver(): Receiver {
    return this.receiver;
  }

  public hitReceiver(): void {
    if (!this.receiver.hit) {
      this.receiver.hit = true;
      this.receiver.hitAnim = 0;
    }
  }

  public isReceiverHitAnimating(): boolean {
    return this.receiver.hit;
  }

  public getPrismVertices(prism: Prism): { x: number; y: number }[] {
    const h = prism.size * Math.sqrt(3) / 2;
    const cos = Math.cos(prism.angle);
    const sin = Math.sin(prism.angle);
    const local = [
      { x: 0, y: -h * 2 / 3 },
      { x: -prism.size / 2, y: h / 3 },
      { x: prism.size / 2, y: h / 3 }
    ];
    return local.map(p => ({
      x: prism.x + p.x * cos - p.y * sin,
      y: prism.y + p.x * sin + p.y * cos
    }));
  }
}
