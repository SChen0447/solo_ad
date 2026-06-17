export interface BulletConfig {
  shape: 'circle' | 'star' | 'diamond';
  angle: number;
  count: number;
  color: string;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  shape: 'circle' | 'star' | 'diamond';
  color: string;
  radius: number;
}

export class Player {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
  color: string;
  glowRadius: number;
  lives: number;
  maxLives: number;
  invincible: boolean;
  invincibleTimer: number;
  invincibleFlashTimer: number;
  shootCooldown: number;
  shootTimer: number;
  smoothFactor: number;
  glowTimer: number;
  glowDuration: number;
  respawning: boolean;
  respawnTimer: number;
  losingLife: boolean;
  lifeLossTimer: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.size = 30;
    this.color = '#00ffff';
    this.glowRadius = 8;
    this.lives = 3;
    this.maxLives = 3;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.invincibleFlashTimer = 0;
    this.shootCooldown = 150;
    this.shootTimer = 0;
    this.smoothFactor = 0.1;
    this.glowTimer = 0;
    this.glowDuration = 300;
    this.respawning = false;
    this.respawnTimer = 0;
    this.losingLife = false;
    this.lifeLossTimer = 0;
  }

  setTarget(x: number, y: number) {
    this.targetX = x;
    this.targetY = y;
  }

  update(deltaTime: number, canvasWidth: number, canvasHeight: number) {
    this.x += (this.targetX - this.x) * this.smoothFactor;
    this.y += (this.targetY - this.y) * this.smoothFactor;

    const halfSize = this.size / 2;
    this.x = Math.max(halfSize, Math.min(canvasWidth - halfSize, this.x));
    this.y = Math.max(halfSize, Math.min(canvasHeight - halfSize, this.y));

    if (this.shootTimer > 0) {
      this.shootTimer -= deltaTime;
    }

    if (this.glowTimer > 0) {
      this.glowTimer -= deltaTime;
    }

    if (this.invincible) {
      this.invincibleTimer -= deltaTime;
      this.invincibleFlashTimer += deltaTime;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
        this.invincibleFlashTimer = 0;
      }
    }

    if (this.losingLife) {
      this.lifeLossTimer -= deltaTime;
      if (this.lifeLossTimer <= 0) {
        this.losingLife = false;
      }
    }
  }

  canShoot(): boolean {
    return this.shootTimer <= 0 && !this.losingLife;
  }

  shoot(config: BulletConfig): Bullet[] {
    this.shootTimer = this.shootCooldown;
    this.glowTimer = this.glowDuration;
    const bullets: Bullet[] = [];
    const speed = 8;

    if (config.count === 1) {
      const rad = (config.angle * Math.PI) / 180;
      bullets.push({
        x: this.x,
        y: this.y - this.size / 2,
        vx: Math.sin(rad) * speed,
        vy: -Math.cos(rad) * speed,
        shape: config.shape,
        color: config.color,
        radius: 3
      });
    } else {
      const spreadAngle = 60;
      const startAngle = config.angle - spreadAngle / 2;
      const step = spreadAngle / (config.count - 1);
      for (let i = 0; i < config.count; i++) {
        const angle = startAngle + step * i;
        const rad = (angle * Math.PI) / 180;
        bullets.push({
          x: this.x,
          y: this.y - this.size / 2,
          vx: Math.sin(rad) * speed,
          vy: -Math.cos(rad) * speed,
          shape: config.shape,
          color: config.color,
          radius: 3
        });
      }
    }

    return bullets;
  }

  hit() {
    if (this.invincible || this.losingLife) return false;
    this.lives--;
    this.losingLife = true;
    this.lifeLossTimer = 300;
    if (this.lives > 0) {
      this.invincible = true;
      this.invincibleTimer = 1000;
      this.invincibleFlashTimer = 0;
    }
    return true;
  }

  isAlive(): boolean {
    return this.lives > 0;
  }

  getInvincibleAlpha(): number {
    if (!this.invincible) return 1;
    const flashPeriod = 1000 / 8;
    const phase = Math.floor(this.invincibleFlashTimer / flashPeriod) % 2;
    return phase === 0 ? 1 : 0.2;
  }

  getLifeLossScale(): number {
    if (!this.losingLife) return 1;
    const progress = 1 - this.lifeLossTimer / 300;
    return 1 - progress * 0.3;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.losingLife && this.lifeLossTimer > 0) return;

    ctx.save();
    const alpha = this.getInvincibleAlpha();
    const scale = this.getLifeLossScale();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.scale(scale, scale);

    const glowIntensity = this.glowTimer > 0 ? 1 : 0.5;
    const gradient = ctx.createRadialGradient(0, -this.size / 2, 0, 0, -this.size / 2, this.glowRadius);
    gradient.addColorStop(0, `rgba(0, 255, 255, ${glowIntensity})`);
    gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, -this.size / 2, this.glowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, -this.size / 2);
    ctx.lineTo(-this.size / 2, this.size / 2);
    ctx.lineTo(this.size / 2, this.size / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
