export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export class Player {
  x: number;
  y: number;
  width: number = 16;
  height: number = 16;
  velocityY: number = 0;
  isJumping: boolean = false;
  isOnGround: boolean = false;
  animFrame: number = 0;
  animTimer: number = 0;
  animFrameDuration: number = 0.15;
  jumpVelocity: number;
  gravity: number;
  jumpHeight: number = 120;
  gravityAccel: number = 500;
  particles: Particle[] = [];

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.jumpVelocity = -Math.sqrt(2 * this.gravityAccel * this.jumpHeight);
    this.gravity = this.gravityAccel;
  }

  jump(): void {
    if (this.isOnGround) {
      this.velocityY = this.jumpVelocity;
      this.isJumping = true;
      this.isOnGround = false;
    }
  }

  spawnDustParticles(groundY: number): void {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI;
      const speed = Math.random() * 40 + 20;
      this.particles.push({
        x: this.x + this.width / 2,
        y: groundY,
        vx: Math.cos(angle) * speed - 20,
        vy: -Math.sin(angle) * speed * 0.5,
        life: 0.4,
        maxLife: 0.4
      });
    }
  }

  update(deltaTime: number, groundY: number): void {
    if (!this.isOnGround) {
      this.velocityY += this.gravity * deltaTime;
      this.y += this.velocityY * deltaTime;
    }

    if (this.y + this.height >= groundY) {
      if (!this.isOnGround && this.velocityY > 0) {
        this.spawnDustParticles(groundY);
      }
      this.y = groundY - this.height;
      this.velocityY = 0;
      this.isOnGround = true;
      this.isJumping = false;
    }

    this.animTimer += deltaTime;
    if (this.animTimer >= this.animFrameDuration) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 2;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vy += 100 * deltaTime;
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = `rgba(200, 200, 200, ${alpha})`;
      const size = 3 * alpha + 1;
      ctx.fillRect(Math.floor(p.x - size / 2), Math.floor(p.y - size / 2), Math.ceil(size), Math.ceil(size));
    }

    const px = Math.floor(this.x);
    const py = Math.floor(this.y);

    ctx.fillStyle = '#e53e3e';
    ctx.fillRect(px, py, this.width, this.height);

    ctx.fillStyle = '#fff';
    if (this.animFrame === 0) {
      ctx.fillRect(px + 4, py + 4, 3, 3);
      ctx.fillRect(px + 10, py + 4, 3, 3);
      ctx.fillRect(px + 2, py + 14, 4, 2);
      ctx.fillRect(px + 10, py + 14, 4, 2);
    } else {
      ctx.fillRect(px + 3, py + 5, 3, 3);
      ctx.fillRect(px + 11, py + 3, 3, 3);
      ctx.fillRect(px + 4, py + 14, 4, 2);
      ctx.fillRect(px + 8, py + 14, 4, 2);
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(px + 5, py + 5, 1, 1);
    ctx.fillRect(px + 11, py + 5, 1, 1);
  }
}
