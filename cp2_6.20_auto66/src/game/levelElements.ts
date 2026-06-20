export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShadowArea {
  points: { x: number; y: number }[];
}

export interface BrickDebris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  life: number;
  maxLife: number;
  size: number;
}

export class Wall {
  x: number;
  y: number;
  w: number;
  h: number;

  constructor(x: number, y: number, w: number, h: number) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#16213E';
    ctx.fillRect(this.x, this.y, this.w, this.h);

    ctx.strokeStyle = '#0F3460';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x + 0.5, this.y + 0.5, this.w - 1, this.h - 1);

    const brickH = 20;
    const brickW = 30;
    ctx.strokeStyle = 'rgba(15, 52, 96, 0.4)';
    ctx.lineWidth = 0.5;
    for (let row = 0; row * brickH < this.h; row++) {
      const offsetX = (row % 2) * (brickW / 2);
      for (let col = -1; col * brickW + offsetX < this.w; col++) {
        const bx = this.x + col * brickW + offsetX;
        const by = this.y + row * brickH;
        ctx.strokeRect(bx, by, brickW, brickH);
      }
    }
  }

  toRect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}

export class LightSource {
  x: number;
  y: number;
  angle: number;
  spread: number;
  range: number;
  radius: number = 12;

  constructor(x: number, y: number, angle: number = Math.PI / 2, spread: number = Math.PI / 3, range: number = 250) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.spread = spread;
    this.range = range;
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    const startAngle = this.angle - this.spread / 2;
    const endAngle = this.angle + this.spread / 2;

    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.range);
    grad.addColorStop(0, 'rgba(255, 215, 0, 0.35)');
    grad.addColorStop(0.5, 'rgba(255, 215, 0, 0.15)');
    grad.addColorStop(1, 'rgba(255, 215, 0, 0)');

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.arc(this.x, this.y, this.range, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    const lineCount = 5;
    for (let i = 0; i < lineCount; i++) {
      const t = ((time * 0.5 + i / lineCount) % 1);
      const lineAngle = startAngle + (endAngle - startAngle) * ((i + 0.5) / lineCount);
      const innerR = this.radius + t * (this.range - this.radius);
      const alpha = 0.2 * (1 - t);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(
        this.x + Math.cos(lineAngle) * (this.radius + t * 10),
        this.y + Math.sin(lineAngle) * (this.radius + t * 10)
      );
      ctx.lineTo(
        this.x + Math.cos(lineAngle) * innerR,
        this.y + Math.sin(lineAngle) * innerR
      );
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    const glowGrad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius + 6);
    glowGrad.addColorStop(0, 'rgba(255, 215, 0, 0.9)');
    glowGrad.addColorStop(0.5, 'rgba(255, 215, 0, 0.4)');
    glowGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 220, 0.6)';
    ctx.beginPath();
    ctx.arc(this.x - 2, this.y - 2, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  isInLight(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.range) return false;
    const pointAngle = Math.atan2(dy, dx);
    let angleDiff = pointAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    return Math.abs(angleDiff) <= this.spread / 2;
  }

  computeShadow(block: Rect): ShadowArea | null {
    const cx = block.x + block.w / 2;
    const cy = block.y + block.h / 2;
    if (!this.isInLight(cx, cy)) return null;

    const corners = [
      { x: block.x, y: block.y },
      { x: block.x + block.w, y: block.y },
      { x: block.x + block.w, y: block.y + block.h },
      { x: block.x, y: block.y + block.h }
    ];

    const angles = corners.map(c => Math.atan2(c.y - this.y, c.x - this.x));
    let minAngle = angles[0];
    let maxAngle = angles[0];
    let minCorner = corners[0];
    let maxCorner = corners[0];

    for (let i = 1; i < corners.length; i++) {
      if (angles[i] < minAngle) { minAngle = angles[i]; minCorner = corners[i]; }
      if (angles[i] > maxAngle) { maxAngle = angles[i]; maxCorner = corners[i]; }
    }

    const shadowLen = this.range - Math.sqrt((cx - this.x) ** 2 + (cy - this.y) ** 2);
    if (shadowLen <= 0) return null;

    const extMin = {
      x: minCorner.x + Math.cos(minAngle) * shadowLen,
      y: minCorner.y + Math.sin(minAngle) * shadowLen
    };
    const extMax = {
      x: maxCorner.x + Math.cos(maxAngle) * shadowLen,
      y: maxCorner.y + Math.sin(maxAngle) * shadowLen
    };

    return {
      points: [minCorner, maxCorner, extMax, extMin]
    };
  }
}

export class ShadowBlock {
  x: number;
  y: number;
  w: number;
  h: number;
  isBeingPushed: boolean = false;

  constructor(x: number, y: number, w: number = 40, h: number = 40) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  render(ctx: CanvasRenderingContext2D, shadowAreas: ShadowArea[]): void {
    ctx.fillStyle = '#4A4A5A';
    ctx.fillRect(this.x, this.y, this.w, this.h);

    ctx.strokeStyle = '#3A3A4A';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x + 1, this.y + 1, this.w - 2, this.h - 2);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x + 4, this.y + 4);
    ctx.lineTo(this.x + this.w - 4, this.y + 4);
    ctx.lineTo(this.x + this.w - 4, this.y + this.h - 4);
    ctx.stroke();

    for (const shadow of shadowAreas) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.moveTo(shadow.points[0].x, shadow.points[0].y);
      for (let i = 1; i < shadow.points.length; i++) {
        ctx.lineTo(shadow.points[i].x, shadow.points[i].y);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(100, 50, 150, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  toRect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}

export class Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  isLit: boolean = false;
  isWeakened: boolean = false;
  isDestroyed: boolean = false;
  debris: BrickDebris[] = [];
  destroyTimer: number = 0;

  constructor(x: number, y: number, w: number = 30, h: number = 20) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.destroyTimer = 0;
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 120;
      this.debris.push({
        x: this.x + this.w / 2,
        y: this.y + this.h / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 10,
        life: 0.5,
        maxLife: 0.5,
        size: 4 + Math.random() * 6
      });
    }
  }

  update(dt: number, lightSources: LightSource[]): void {
    if (this.isDestroyed) {
      this.destroyTimer += dt;
      this.debris = this.debris.filter(d => {
        d.life -= dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.vy += 200 * dt;
        d.rotation += d.rotSpeed * dt;
        return d.life > 0;
      });
      return;
    }

    this.isLit = false;
    for (const ls of lightSources) {
      if (ls.isInLight(this.x + this.w / 2, this.y + this.h / 2)) {
        this.isLit = true;
        break;
      }
    }
    this.isWeakened = this.isLit;
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    if (this.isDestroyed) {
      for (const d of this.debris) {
        ctx.save();
        ctx.globalAlpha = d.life / d.maxLife;
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rotation);
        ctx.fillStyle = '#8B7355';
        ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size);
        ctx.restore();
      }
      return;
    }

    if (this.isWeakened) {
      const shake = Math.sin(time * 30) * 0.5;
      ctx.fillStyle = '#C4A882';
      ctx.fillRect(this.x + shake, this.y + shake, this.w, this.h);

      ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x + shake, this.y + shake, this.w, this.h);

      ctx.save();
      ctx.globalAlpha = 0.3 + 0.1 * Math.sin(time * 5);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
      ctx.fillRect(this.x + shake, this.y + shake, this.w, this.h);
      ctx.restore();
    } else {
      ctx.fillStyle = '#8B7355';
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.strokeStyle = '#6B5335';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x + 0.5, this.y + 0.5, this.w - 1, this.h - 1);
    }
  }

  toRect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}

export class Exit {
  x: number;
  y: number;
  w: number;
  h: number;

  constructor(x: number, y: number, w: number = 30, h: number = 40) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  render(ctx: CanvasRenderingContext2D, time: number): void {
    const glow = 0.5 + 0.3 * Math.sin(time * 3);

    ctx.save();
    const grad = ctx.createRadialGradient(
      this.x + this.w / 2, this.y + this.h / 2, 0,
      this.x + this.w / 2, this.y + this.h / 2, this.w
    );
    grad.addColorStop(0, `rgba(0, 255, 150, ${glow * 0.3})`);
    grad.addColorStop(1, 'rgba(0, 255, 150, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(this.x - this.w / 2, this.y - this.h / 2, this.w * 2, this.h * 2);
    ctx.restore();

    ctx.strokeStyle = `rgba(0, 255, 150, ${0.6 + glow * 0.4})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.w, this.h);

    ctx.fillStyle = `rgba(0, 255, 150, ${0.15 + glow * 0.1})`;
    ctx.fillRect(this.x, this.y, this.w, this.h);

    ctx.fillStyle = `rgba(0, 255, 150, ${0.7 + glow * 0.3})`;
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', this.x + this.w / 2, this.y + this.h / 2 + 5);
  }

  toRect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}
