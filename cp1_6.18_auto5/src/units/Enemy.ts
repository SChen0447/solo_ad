import { EnemyType, ENEMY_CONFIGS, Point } from '../config';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class Enemy {
  x: number;
  y: number;
  type: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  damage: number;
  reward: number;
  color: string;
  size: number;
  pathIndex: number;
  dead: boolean;
  reachedWall: boolean;
  slowTimer: number;
  slowFactor: number;
  animFrame: number;
  animTimer: number;
  hitFlash: number;

  constructor(type: EnemyType, path: Point[]) {
    const config = ENEMY_CONFIGS[type];
    this.type = type;
    this.x = path[0].x;
    this.y = path[0].y;
    this.hp = config.hp;
    this.maxHp = config.hp;
    this.speed = config.speed;
    this.baseSpeed = config.speed;
    this.damage = config.damage;
    this.reward = config.reward;
    this.color = config.color;
    this.size = config.size;
    this.pathIndex = 0;
    this.dead = false;
    this.reachedWall = false;
    this.slowTimer = 0;
    this.slowFactor = 1;
    this.animFrame = 0;
    this.animTimer = 0;
    this.hitFlash = 0;
  }

  update(dt: number, path: Point[]): void {
    if (this.dead || this.reachedWall) return;

    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) {
        this.slowFactor = 1;
      }
    }

    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
    }

    this.animTimer += dt;
    if (this.animTimer > 150) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    const currentSpeed = this.baseSpeed * this.slowFactor * (dt / 16.67);
    const target = path[this.pathIndex + 1];

    if (!target) {
      this.reachedWall = true;
      return;
    }

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < currentSpeed) {
      this.x = target.x;
      this.y = target.y;
      this.pathIndex++;
      if (this.pathIndex >= path.length - 1) {
        this.reachedWall = true;
      }
    } else {
      this.x += (dx / dist) * currentSpeed;
      this.y += (dy / dist) * currentSpeed;
    }
  }

  takeDamage(damage: number): boolean {
    this.hp -= damage;
    this.hitFlash = 150;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      return true;
    }
    return false;
  }

  applySlow(factor: number, duration: number): void {
    this.slowFactor = Math.min(this.slowFactor, factor);
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  createDeathParticles(): Particle[] {
    const particles: Particle[] = [];
    const count = this.type === 'siege' ? 20 : 12;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 1 + Math.random() * 3;
      particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 500 + Math.random() * 300,
        maxLife: 800,
        color: this.color,
        size: 3 + Math.random() * 4
      });
    }
    return particles;
  }

  createHitParticles(): Particle[] {
    const particles: Particle[] = [];
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 200 + Math.random() * 200,
        maxLife: 400,
        color: this.hitFlash > 0 ? '#FFFFFF' : this.color,
        size: 2 + Math.random() * 2
      });
    }
    return particles;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    if (this.hitFlash > 0) {
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 15;
    }

    if (this.type === 'infantry') {
      this.drawInfantry(ctx);
    } else if (this.type === 'cavalry') {
      this.drawCavalry(ctx);
    } else {
      this.drawSiege(ctx);
    }

    ctx.restore();

    this.drawHealthBar(ctx);
  }

  private drawInfantry(ctx: CanvasRenderingContext2D): void {
    const bobY = Math.sin(this.animFrame * Math.PI / 2) * 2;
    ctx.fillStyle = this.hitFlash > 0 ? '#FFFFFF' : this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y - 8 + bobY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.hitFlash > 0 ? '#FFFFFF' : '#654321';
    ctx.fillRect(this.x - 6, this.y + bobY, 12, 14);

    ctx.strokeStyle = '#C0C0C0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x + 6, this.y - 5 + bobY);
    ctx.lineTo(this.x + 12, this.y - 12 + bobY);
    ctx.stroke();

    if (this.slowFactor < 1) {
      ctx.fillStyle = 'rgba(153, 50, 204, 0.3)';
      ctx.beginPath();
      ctx.arc(this.x, this.y + bobY, this.size + 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawCavalry(ctx: CanvasRenderingContext2D): void {
    const bobY = Math.sin(this.animFrame * Math.PI / 2) * 3;
    ctx.fillStyle = this.hitFlash > 0 ? '#FFFFFF' : '#2F1810';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 2 + bobY, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.hitFlash > 0 ? '#FFFFFF' : this.color;
    ctx.beginPath();
    ctx.arc(this.x - 2, this.y - 10 + bobY, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#2F1810';
    ctx.lineWidth = 3;
    const legOffset = Math.sin(this.animFrame * Math.PI / 2) * 4;
    ctx.beginPath();
    ctx.moveTo(this.x - 8, this.y + 8 + bobY);
    ctx.lineTo(this.x - 10 + legOffset, this.y + 16 + bobY);
    ctx.moveTo(this.x + 8, this.y + 8 + bobY);
    ctx.lineTo(this.x + 10 - legOffset, this.y + 16 + bobY);
    ctx.stroke();

    if (this.slowFactor < 1) {
      ctx.fillStyle = 'rgba(153, 50, 204, 0.3)';
      ctx.beginPath();
      ctx.arc(this.x, this.y + bobY, this.size + 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawSiege(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.hitFlash > 0 ? '#FFFFFF' : '#3D2914';
    ctx.fillRect(this.x - 20, this.y - 15, 40, 28);

    ctx.fillStyle = this.hitFlash > 0 ? '#FFFFFF' : this.color;
    ctx.fillRect(this.x - 25, this.y + 8, 50, 8);

    ctx.fillStyle = '#1a1a1a';
    const wheelRot = this.animFrame * 0.3;
    for (let i = -1; i <= 1; i += 2) {
      ctx.save();
      ctx.translate(this.x + i * 15, this.y + 16);
      ctx.rotate(wheelRot);
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(5, 0);
      ctx.moveTo(0, -5);
      ctx.lineTo(0, 5);
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = '#8B0000';
    ctx.beginPath();
    ctx.moveTo(this.x + 20, this.y - 15);
    ctx.lineTo(this.x + 30, this.y);
    ctx.lineTo(this.x + 20, this.y + 13);
    ctx.closePath();
    ctx.fill();

    if (this.slowFactor < 1) {
      ctx.fillStyle = 'rgba(153, 50, 204, 0.3)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size + 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawHealthBar(ctx: CanvasRenderingContext2D): void {
    const barWidth = this.size * 1.8;
    const barHeight = 4;
    const barX = this.x - barWidth / 2;
    const barY = this.y - this.size - 10;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const hpPercent = this.hp / this.maxHp;
    const hpColor = hpPercent > 0.6 ? '#22C55E' : hpPercent > 0.3 ? '#EAB308' : '#EF4444';
    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }
}
