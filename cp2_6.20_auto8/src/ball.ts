export interface TrailParticle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

export interface BallInput {
  tiltX: number;
  tiltY: number;
}

export class Ball {
  public x: number = 0;
  public y: number = 0;
  public vx: number = 0;
  public vy: number = 0;
  public radius: number = 0;
  public baseSpeed: number = 180;
  public trail: TrailParticle[] = [];
  public squish: number = 0;
  public squishTime: number = 0;
  public shakeAmount: number = 0;
  public shakeTime: number = 0;
  public rotation: number = 0;

  private keys: { [key: string]: boolean } = {};
  private tiltX: number = 0;
  private tiltY: number = 0;

  constructor() {
    this.setupInput();
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keys[e.code] = false;
    });

    if (typeof window.DeviceOrientationEvent !== 'undefined') {
      const requestPermission = (DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>;
      }).requestPermission;
      if (typeof requestPermission === 'function') {
        window.addEventListener('click', () => {
          requestPermission().catch(() => {});
        }, { once: true });
      }
      window.addEventListener('deviceorientation', (e: DeviceOrientationEvent) => {
        if (e.beta !== null && e.gamma !== null) {
          this.tiltY = Math.max(-1, Math.min(1, e.beta / 45));
          this.tiltX = Math.max(-1, Math.min(1, e.gamma / 45));
        }
      });
    }
  }

  public getInput(): BallInput {
    let ix = this.tiltX;
    let iy = this.tiltY;

    if (this.keys['ArrowLeft'] || this.keys['KeyA']) ix -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) ix += 1;
    if (this.keys['ArrowUp'] || this.keys['KeyW']) iy -= 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) iy += 1;

    const len = Math.sqrt(ix * ix + iy * iy);
    if (len > 1) {
      ix /= len;
      iy /= len;
    }

    return { tiltX: ix, tiltY: iy };
  }

  public update(dt: number, maze: { isWallAt: (px: number, py: number, r: number) => { collision: boolean; normalX: number; normalY: number } }): void {
    const input = this.getInput();
    const targetVx = input.tiltX * this.baseSpeed;
    const targetVy = input.tiltY * this.baseSpeed;

    const accel = 8;
    this.vx += (targetVx - this.vx) * Math.min(1, accel * dt);
    this.vy += (targetVy - this.vy) * Math.min(1, accel * dt);

    const friction = 0.98;
    this.vx *= friction;
    this.vy *= friction;

    let newX = this.x + this.vx * dt;
    let newY = this.y + this.vy * dt;

    const checkX = maze.isWallAt(newX, this.y, this.radius);
    if (checkX.collision) {
      this.vx *= -0.5;
      this.squish = 1;
      this.squishTime = 0.1;
      this.shakeAmount = 5;
      this.shakeTime = 0.15;
      newX = this.x;
    }

    const checkY = maze.isWallAt(newX, newY, this.radius);
    if (checkY.collision) {
      this.vy *= -0.5;
      this.squish = 1;
      this.squishTime = 0.1;
      this.shakeAmount = 5;
      this.shakeTime = 0.15;
      newY = this.y;
    }

    this.x = newX;
    this.y = newY;

    this.rotation += (Math.abs(this.vx) + Math.abs(this.vy)) * dt * 0.01;

    if (this.squishTime > 0) {
      this.squishTime -= dt;
      if (this.squishTime <= 0) {
        this.squish = 0;
      } else {
        const t = 1 - this.squishTime / 0.1;
        this.squish = 1 - t;
      }
    }

    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      if (this.shakeTime <= 0) this.shakeAmount = 0;
    }

    if (Math.abs(this.vx) > 5 || Math.abs(this.vy) > 5) {
      if (this.trail.length < 30) {
        this.trail.push({
          x: this.x,
          y: this.y,
          life: 0.3,
          maxLife: 0.3
        });
      }
    }

    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].life -= dt;
      if (this.trail[i].life <= 0) {
        this.trail.splice(i, 1);
      }
    }
  }

  public reset(x: number, y: number, radius: number): void {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.vx = 0;
    this.vy = 0;
    this.trail = [];
    this.squish = 0;
    this.squishTime = 0;
    this.shakeAmount = 0;
    this.shakeTime = 0;
  }

  public getShake(): { x: number; y: number } {
    if (this.shakeAmount <= 0) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * this.shakeAmount * 2,
      y: (Math.random() - 0.5) * this.shakeAmount * 2
    };
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.trail) {
      const t = p.life / p.maxLife;
      const r = this.radius * (0.3 + t * 0.7);
      const startR = 255, startG = 215, startB = 0;
      const endR = 255, endG = 140, endB = 0;
      const pr = Math.floor(startR + (endR - startR) * (1 - t));
      const pg = Math.floor(startG + (endG - startG) * (1 - t));
      const pb = Math.floor(startB + (endB - startB) * (1 - t));
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${pr}, ${pg}, ${pb}, ${t * 0.6})`;
      ctx.fill();
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    const squishX = 1 - this.squish * 0.2;
    const squishY = 1 + this.squish * 0.2;
    ctx.scale(squishX, squishY);

    const gradient = ctx.createRadialGradient(
      -this.radius * 0.3, -this.radius * 0.3, this.radius * 0.1,
      0, 0, this.radius
    );
    gradient.addColorStop(0, '#fff8a0');
    gradient.addColorStop(0.3, '#ffdd44');
    gradient.addColorStop(0.7, '#ffaa00');
    gradient.addColorStop(1, '#cc6600');

    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffcc00';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(-this.radius * 0.3, -this.radius * 0.3, this.radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();

    ctx.restore();
  }
}
