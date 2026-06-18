import { FragmentColor, CANVAS_W, FRAGMENT_RADIUS, Vec2 } from '../../types';

const COLORS: FragmentColor[] = ['red', 'blue', 'green'];

export class Fragment {
  x: number;
  y: number;
  color: FragmentColor;
  rotationSpeed: number;
  rotation: number = 0;
  glowPhase: number;
  arcVx: number;
  vy: number;
  alive: boolean = true;
  greyed: boolean = false;
  greyTimer: number = 0;

  constructor(x: number, y: number, color?: FragmentColor) {
    this.x = x;
    this.y = y;
    this.color = color ?? COLORS[Math.floor(Math.random() * 3)];
    this.rotationSpeed = (Math.random() - 0.5) * 4;
    this.glowPhase = Math.random() * Math.PI * 2;
    this.vy = 60 + Math.random() * 40;
    this.arcVx = (Math.random() - 0.5) * 30;
  }

  static spawnFromEdge(): Fragment {
    const side = Math.random();
    let x: number, y: number;
    if (side < 0.6) {
      x = 20 + Math.random() * (CANVAS_W - 40);
      y = -FRAGMENT_RADIUS;
    } else if (side < 0.8) {
      x = -FRAGMENT_RADIUS;
      y = 40 + Math.random() * 200;
    } else {
      x = CANVAS_W + FRAGMENT_RADIUS;
      y = 40 + Math.random() * 200;
    }
    return new Fragment(x, y);
  }

  update(dt: number) {
    this.x += this.arcVx * dt;
    this.y += this.vy * dt;
    this.rotation += this.rotationSpeed * dt;
    this.glowPhase += dt * 2;

    if (this.greyed) {
      this.greyTimer -= dt;
      if (this.greyTimer <= 0) {
        this.alive = false;
      }
    }

    if (this.y > 620 || this.x < -30 || this.x > CANVAS_W + 30) {
      this.alive = false;
    }
  }

  makeGrey() {
    this.greyed = true;
    this.greyTimer = 0.3;
  }

  getGlowRadius(): number {
    const base = 10;
    const pulse = Math.sin(this.glowPhase) * 3;
    return base + pulse;
  }

  getGlowColor(): string {
    if (this.greyed) return 'rgba(128,128,128,0.3)';
    switch (this.color) {
      case 'red': return 'rgba(255,150,180,0.4)';
      case 'blue': return 'rgba(150,200,255,0.4)';
      case 'green': return 'rgba(150,255,180,0.4)';
    }
  }

  getCoreColor(): string {
    if (this.greyed) return '#888888';
    switch (this.color) {
      case 'red': return '#ff4466';
      case 'blue': return '#4488ff';
      case 'green': return '#44ff88';
    }
  }
}
