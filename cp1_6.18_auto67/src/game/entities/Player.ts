import { Vec2, FragmentColor, Particle, PLAYER_SIZE, PLAYER_SPEED, CANVAS_W, CANVAS_H } from '../../types';

export class Player {
  x: number;
  y: number;
  vx: number = 0;
  vy: number = 0;
  shieldColor: FragmentColor = 'blue';
  energy: number = 100;
  alive: boolean = true;
  hitFlashTimer: number = 0;
  tailParticles: Particle[] = [];

  private keys: Set<string> = new Set();

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  handleKeyDown(e: KeyboardEvent) {
    this.keys.add(e.key.toLowerCase());
  }

  handleKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.key.toLowerCase());
  }

  move(dt: number) {
    let ax = 0;
    let ay = 0;
    if (this.keys.has('arrowleft') || this.keys.has('a')) ax -= 1;
    if (this.keys.has('arrowright') || this.keys.has('d')) ax += 1;
    if (this.keys.has('arrowup') || this.keys.has('w')) ay -= 1;
    if (this.keys.has('arrowdown') || this.keys.has('s')) ay += 1;

    const len = Math.sqrt(ax * ax + ay * ay);
    if (len > 0) {
      ax /= len;
      ay /= len;
    }

    const accel = 1200;
    const friction = 5;

    this.vx += ax * accel * dt;
    this.vy += ay * accel * dt;
    this.vx -= this.vx * friction * dt;
    this.vy -= this.vy * friction * dt;

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > PLAYER_SPEED) {
      this.vx = (this.vx / speed) * PLAYER_SPEED;
      this.vy = (this.vy / speed) * PLAYER_SPEED;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.x = Math.max(PLAYER_SIZE, Math.min(CANVAS_W - PLAYER_SIZE, this.x));
    this.y = Math.max(PLAYER_SIZE, Math.min(CANVAS_H - PLAYER_SIZE, this.y));

    this.emitTailParticles(dt);

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
    }
  }

  private emitTailParticles(dt: number) {
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const emitCount = Math.floor(speed * dt * 0.15);
    for (let i = 0; i < emitCount; i++) {
      const isOrange = Math.random() > 0.5;
      this.tailParticles.push({
        x: this.x + (Math.random() - 0.5) * 4,
        y: this.y + PLAYER_SIZE * 0.8,
        vx: (Math.random() - 0.5) * 20,
        vy: 40 + Math.random() * 30,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
        color: isOrange ? '#ff8800' : '#ffcc00',
        size: 2 + Math.random() * 2,
      });
    }

    for (let i = this.tailParticles.length - 1; i >= 0; i--) {
      const p = this.tailParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.tailParticles.splice(i, 1);
      }
    }
  }

  collect(fx: number, fy: number, fragmentColor: FragmentColor): 'match' | 'mismatch' | 'none' {
    const dx = this.x - fx;
    const dy = this.y - fy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const collectRadius = PLAYER_SIZE + 6;
    if (dist < collectRadius) {
      if (fragmentColor === this.shieldColor) {
        return 'match';
      } else {
        return 'mismatch';
      }
    }
    return 'none';
  }

  takeDamage() {
    this.energy -= 20;
    this.hitFlashTimer = 0.4;
    if (this.energy <= 0) {
      this.energy = 0;
      this.alive = false;
    }
  }

  reset() {
    this.x = CANVAS_W / 2;
    this.y = CANVAS_H - 80;
    this.vx = 0;
    this.vy = 0;
    this.energy = 100;
    this.alive = true;
    this.hitFlashTimer = 0;
    this.shieldColor = 'blue';
    this.tailParticles = [];
  }
}
