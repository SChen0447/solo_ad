import { Poolable } from './objectPool';

export class Particle implements Poolable {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  active: boolean;

  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 1;
    this.size = 2;
    this.color = '#ffaa00';
    this.active = false;
  }

  reset(): void {}

  update(dt: number): boolean {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.life -= dt;
    return this.life <= 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = this.life / this.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

export class Asteroid implements Poolable {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  health: number;
  maxHealth: number;
  active: boolean;
  vertices: { x: number; y: number }[];
  sizeClass: number;
  hitFlash: number;
  trail: { x: number; y: number; alpha: number }[];
  trailTimer: number;

  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = 30;
    this.rotation = 0;
    this.rotationSpeed = 0;
    this.health = 30;
    this.maxHealth = 30;
    this.active = false;
    this.vertices = [];
    this.sizeClass = 2;
    this.hitFlash = 0;
    this.trail = [];
    this.trailTimer = 0;
  }

  reset(): void {
    this.trail = [];
    this.hitFlash = 0;
  }

  generateVertices(): void {
    const vertexCount = 8 + Math.floor(Math.random() * 5);
    this.vertices = [];
    for (let i = 0; i < vertexCount; i++) {
      const angle = (i / vertexCount) * Math.PI * 2;
      const r = this.radius * (0.7 + Math.random() * 0.4);
      this.vertices.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r
      });
    }
  }

  initLarge(canvasWidth: number, canvasHeight: number): void {
    this.sizeClass = 2;
    this.radius = 35 + Math.random() * 25;
    this.health = 40 + this.radius;
    this.maxHealth = this.health;

    const side = Math.floor(Math.random() * 4);
    switch (side) {
      case 0:
        this.x = Math.random() * canvasWidth;
        this.y = -this.radius - 20;
        break;
      case 1:
        this.x = canvasWidth + this.radius + 20;
        this.y = Math.random() * canvasHeight;
        break;
      case 2:
        this.x = Math.random() * canvasWidth;
        this.y = canvasHeight + this.radius + 20;
        break;
      case 3:
        this.x = -this.radius - 20;
        this.y = Math.random() * canvasHeight;
        break;
    }

    const speed = 30 + Math.random() * 50;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotationSpeed = (Math.random() - 0.5) * 1.5;
    this.generateVertices();
  }

  initMedium(x: number, y: number): void {
    this.sizeClass = 1;
    this.radius = 20 + Math.random() * 12;
    this.health = 20 + this.radius * 0.5;
    this.maxHealth = this.health;
    this.x = x;
    this.y = y;

    const speed = 60 + Math.random() * 80;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotationSpeed = (Math.random() - 0.5) * 3;
    this.generateVertices();
  }

  initSmall(x: number, y: number): void {
    this.sizeClass = 0;
    this.radius = 10 + Math.random() * 8;
    this.health = 10 + this.radius * 0.3;
    this.maxHealth = this.health;
    this.x = x;
    this.y = y;

    const speed = 100 + Math.random() * 100;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotationSpeed = (Math.random() - 0.5) * 5;
    this.generateVertices();
  }

  update(dt: number, canvasWidth: number, canvasHeight: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotationSpeed * dt;

    this.trailTimer += dt;
    if (this.trailTimer >= 0.05) {
      this.trailTimer = 0;
      this.trail.push({ x: this.x, y: this.y, alpha: 0.15 });
      if (this.trail.length > 8) {
        this.trail.shift();
      }
    }

    if (this.x < -this.radius * 2) this.x = canvasWidth + this.radius;
    if (this.x > canvasWidth + this.radius * 2) this.x = -this.radius;
    if (this.y < -this.radius * 2) this.y = canvasHeight + this.radius;
    if (this.y > canvasHeight + this.radius * 2) this.y = -this.radius;

    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
    }
  }

  takeDamage(amount: number): boolean {
    this.health -= amount;
    this.hitFlash = 0.08;
    return this.health <= 0;
  }

  getCoinDrop(): number {
    return Math.floor(3 + this.radius * 0.2 + this.sizeClass * 5);
  }

  getShardChance(): number {
    return 0.3 + this.sizeClass * 0.15;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const alpha = (i / this.trail.length) * 0.15;
      const scale = 0.6 + (i / this.trail.length) * 0.4;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(this.rotation * 0.8);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#4a5568';
      ctx.beginPath();
      for (let j = 0; j < this.vertices.length; j++) {
        const v = this.vertices[j];
        const px = v.x * scale;
        const py = v.y * scale;
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const flashColor = this.hitFlash > 0 ? '#dddddd' : '#6a7588';

    ctx.fillStyle = flashColor;
    ctx.strokeStyle = '#8a95a8';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#5a6a8a';
    ctx.shadowBlur = 6;

    ctx.beginPath();
    for (let i = 0; i < this.vertices.length; i++) {
      const v = this.vertices[i];
      if (i === 0) ctx.moveTo(v.x, v.y);
      else ctx.lineTo(v.x, v.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#4a5568';
    ctx.beginPath();
    ctx.arc(-this.radius * 0.3, -this.radius * 0.2, this.radius * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.radius * 0.25, this.radius * 0.3, this.radius * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-this.radius * 0.1, this.radius * 0.35, this.radius * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export class Pickup implements Poolable {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: 'coin' | 'shard' | 'ammo';
  value: number;
  life: number;
  active: boolean;
  bobPhase: number;
  rotation: number;

  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = 10;
    this.type = 'coin';
    this.value = 1;
    this.life = 15;
    this.active = false;
    this.bobPhase = 0;
    this.rotation = 0;
  }

  reset(): void {
    this.bobPhase = Math.random() * Math.PI * 2;
  }

  update(dt: number, playerX: number, playerY: number): boolean {
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 120) {
      const pull = 250 * (1 - dist / 120);
      this.vx += (dx / dist) * pull * dt;
      this.vy += (dy / dist) * pull * dt;
    }

    this.vx *= 0.97;
    this.vy *= 0.97;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.bobPhase += dt * 3;
    this.rotation += dt * 2;

    this.life -= dt;
    return this.life <= 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const bobY = Math.sin(this.bobPhase) * 3;
    const alpha = this.life < 3 ? this.life / 3 : 1;

    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(this.x, this.y + bobY);

    if (this.type === 'coin') {
      ctx.rotate(this.rotation);
      ctx.fillStyle = '#ffd700';
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ffdd00';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffee66';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0);

    } else if (this.type === 'shard') {
      ctx.rotate(this.rotation * 0.5);
      ctx.fillStyle = '#00ddff';
      ctx.strokeStyle = '#88eeff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00ddff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(0, -this.radius - 2);
      ctx.lineTo(this.radius * 0.7, 0);
      ctx.lineTo(0, this.radius + 2);
      ctx.lineTo(-this.radius * 0.7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

    } else if (this.type === 'ammo') {
      ctx.fillStyle = '#ff8800';
      ctx.strokeStyle = '#ffaa33';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = 8;
      ctx.fillRect(-6, -10, 12, 20);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffcc66';
      ctx.fillRect(-4, -8, 8, 6);
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
