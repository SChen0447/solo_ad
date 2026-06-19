import { JUMP_FORCE, GRAVITY, PLAYER_SIZE, PLAYER_SPEED, COLORS, Rect } from './Types';

export class Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  onGround: boolean;
  jumpsRemaining: number;
  maxJumps: number;
  jumpPressed: boolean;
  trail: Array<{ x: number; y: number; alpha: number }>;
  rotation: number;
  glowIntensity: number;
  respawnX: number;
  respawnY: number;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
    this.vx = PLAYER_SPEED;
    this.vy = 0;
    this.width = PLAYER_SIZE;
    this.height = PLAYER_SIZE;
    this.onGround = false;
    this.jumpsRemaining = 2;
    this.maxJumps = 2;
    this.jumpPressed = false;
    this.trail = [];
    this.rotation = 0;
    this.glowIntensity = 1;
    this.respawnX = startX;
    this.respawnY = startY;
  }

  setRespawn(x: number, y: number): void {
    this.respawnX = x;
    this.respawnY = y;
  }

  respawn(): void {
    this.x = this.respawnX;
    this.y = this.respawnY;
    this.vx = PLAYER_SPEED;
    this.vy = 0;
    this.jumpsRemaining = this.maxJumps;
    this.trail = [];
  }

  handleJump(): void {
    if (this.jumpsRemaining > 0) {
      this.vy = -JUMP_FORCE;
      this.jumpsRemaining--;
      this.onGround = false;
      this.glowIntensity = 2;
    }
  }

  update(dt: number, groundY: number): void {
    const d = Math.max(dt, 1);

    this.x += this.vx * d;
    this.vy += GRAVITY * d;
    this.y += this.vy * d;

    if (this.y + this.height >= groundY) {
      this.y = groundY - this.height;
      this.vy = 0;
      if (!this.onGround) {
        this.glowIntensity = 1.5;
      }
      this.onGround = true;
      this.jumpsRemaining = this.maxJumps;
    } else {
      this.onGround = false;
    }

    this.rotation += (this.onGround ? 0.02 : 0.08) * d;
    this.glowIntensity += (1 - this.glowIntensity) * 0.05 * d;

    if (this.trail.length === 0 ||
        Math.abs(this.x - this.trail[this.trail.length - 1].x) > 6 ||
        Math.abs(this.y - this.trail[this.trail.length - 1].y) > 6) {
      this.trail.push({
        x: this.x + this.width / 2,
        y: this.y + this.height / 2,
        alpha: 1
      });
      if (this.trail.length > 15) {
        this.trail.shift();
      }
    }

    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha *= 0.92;
    }
    this.trail = this.trail.filter(t => t.alpha > 0.05);
  }

  getRect(): Rect {
    return {
      x: this.x + 3,
      y: this.y + 3,
      width: this.width - 6,
      height: this.height - 6
    };
  }

  getCenter(): { x: number; y: number } {
    return {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2
    };
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const drawX = this.x - cameraX;
    const drawY = this.y;
    const cx = drawX + this.width / 2;
    const cy = drawY + this.height / 2;

    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const tdx = t.x - cameraX;
      const size = this.width * 0.6 * t.alpha;
      ctx.beginPath();
      ctx.arc(tdx, t.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 240, 255, ${t.alpha * 0.3})`;
      ctx.fill();
    }

    const glowRadius = this.width * 1.8 * this.glowIntensity;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
    gradient.addColorStop(0, 'rgba(0, 240, 255, 0.6)');
    gradient.addColorStop(0.4, 'rgba(0, 168, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 0, 255, 0)');
    ctx.beginPath();
    ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotation);

    const r = this.width / 2;
    const outerGrad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
    outerGrad.addColorStop(0, COLORS.PLAYER_CORE);
    outerGrad.addColorStop(0.6, COLORS.PLAYER_GLOW);
    outerGrad.addColorStop(1, COLORS.PLAYER_OUTER);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = outerGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.25, r * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();

    ctx.restore();
  }
}
