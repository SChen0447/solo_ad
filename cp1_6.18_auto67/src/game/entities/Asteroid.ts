import { ASTEROID_SIZE, CANVAS_W } from '../../types';

export class Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number = 0;
  rotationSpeed: number;
  alive: boolean = true;
  vertices: number[];

  constructor(x: number, y: number, vx: number, vy: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.rotationSpeed = (Math.random() - 0.5) * 3;
    this.vertices = [];
    for (let i = 0; i < 6; i++) {
      const r = ASTEROID_SIZE * (0.75 + Math.random() * 0.5);
      this.vertices.push(r);
    }
  }

  static spawn(speed: number): Asteroid {
    const side = Math.random();
    let x: number, y: number;
    if (side < 0.6) {
      x = 20 + Math.random() * (CANVAS_W - 40);
      y = -ASTEROID_SIZE;
    } else if (side < 0.8) {
      x = -ASTEROID_SIZE;
      y = 40 + Math.random() * 200;
    } else {
      x = CANVAS_W + ASTEROID_SIZE;
      y = 40 + Math.random() * 200;
    }
    const targetX = CANVAS_W * 0.2 + Math.random() * CANVAS_W * 0.6;
    const targetY = 300 + Math.random() * 200;
    const dx = targetX - x;
    const dy = targetY - y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const arcFactor = 0.3 + Math.random() * 0.5;
    const vx = (dx / len) * speed + (Math.random() - 0.5) * speed * arcFactor;
    const vy = (dy / len) * speed;
    return new Asteroid(x, y, vx, vy);
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotationSpeed * dt;

    if (this.y > 640 || this.x < -40 || this.x > CANVAS_W + 40) {
      this.alive = false;
    }
  }

  collidesWith(px: number, py: number, pr: number): boolean {
    const dx = this.x - px;
    const dy = this.y - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < ASTEROID_SIZE + pr;
  }
}
