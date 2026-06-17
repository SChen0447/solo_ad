import { 
  InputState, Particle, Bullet, Position, AIState,
  PLAYER_SIZE, PLAYER_SPEED, PLAYER_SHOOT_COOLDOWN,
  BULLET_SPEED, CANVAS_WIDTH, CANVAS_HEIGHT,
  COLORS, ENGINE_PARTICLE_COUNT
} from './types';

export class Player {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  width: number;
  height: number;
  color: string;
  score: number;
  shootCooldown: number;
  lastShootTime: number;
  isAI: boolean;
  aiState?: AIState;
  patrolTarget?: Position;
  engineParticles: Particle[];
  name: string;

  constructor(id: number, x: number, y: number, isAI: boolean = false) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = id === 0 ? 0 : Math.PI;
    this.width = PLAYER_SIZE;
    this.height = PLAYER_SIZE;
    this.color = COLORS.primary;
    this.score = 0;
    this.shootCooldown = PLAYER_SHOOT_COOLDOWN;
    this.lastShootTime = 0;
    this.isAI = isAI;
    this.engineParticles = [];
    this.name = isAI ? 'AI' : (id === 0 ? '玩家1' : '玩家2');
  }

  update(deltaTime: number, input: InputState, currentTime: number): void {
    this.vx = 0;
    this.vy = 0;

    if (input.up) this.vy = -PLAYER_SPEED;
    if (input.down) this.vy = PLAYER_SPEED;
    if (input.left) this.vx = -PLAYER_SPEED;
    if (input.right) this.vx = PLAYER_SPEED;

    if (this.vx !== 0 && this.vy !== 0) {
      const factor = 1 / Math.sqrt(2);
      this.vx *= factor;
      this.vy *= factor;
    }

    this.x += this.vx * deltaTime / 16.67;
    this.y += this.vy * deltaTime / 16.67;

    this.x = Math.max(this.width / 2, Math.min(CANVAS_WIDTH - this.width / 2, this.x));
    this.y = Math.max(this.height / 2, Math.min(CANVAS_HEIGHT - this.height / 2, this.y));

    this.updateEngineParticles(deltaTime);
  }

  shoot(currentTime: number): Bullet | null {
    if (currentTime - this.lastShootTime < this.shootCooldown) {
      return null;
    }
    
    this.lastShootTime = currentTime;
    
    const direction = this.id === 0 ? 1 : -1;
    const vx = BULLET_SPEED * direction;
    const vy = 0;
    
    return new Bullet(
      this.x + direction * this.width / 2,
      this.y,
      vx,
      vy,
      this.id
    );
  }

  addScore(points: number): void {
    this.score += points;
  }

  getRect(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height
    };
  }

  private updateEngineParticles(deltaTime: number): void {
    for (let i = 0; i < ENGINE_PARTICLE_COUNT; i++) {
      if (Math.random() < 0.3) {
        const direction = this.id === 0 ? -1 : 1;
        const particle = new Particle(
          this.x + direction * this.width / 2,
          this.y + (Math.random() - 0.5) * 10,
          direction * (2 + Math.random() * 2),
          (Math.random() - 0.5) * 2,
          2 + Math.random() * 2,
          Math.random() > 0.5 ? '#ff9800' : '#ffeb3b',
          200 + Math.random() * 200
        );
        this.engineParticles.push(particle);
      }
    }

    this.engineParticles = this.engineParticles.filter(p => p.update(deltaTime));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const particle of this.engineParticles) {
      const alpha = particle.life / particle.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    const size = this.width / 2;
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.8, -size * 0.6);
    ctx.lineTo(-size * 0.5, 0);
    ctx.lineTo(-size * 0.8, size * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.score = 0;
    this.vx = 0;
    this.vy = 0;
    this.engineParticles = [];
    this.lastShootTime = 0;
  }
}
