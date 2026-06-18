import { Scene, Obstacle, Prism } from './Scene';
import { Player } from './Player';

interface TrailPoint {
  x: number;
  y: number;
}

interface Pulse {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isSplit: boolean;
  bouncesLeft: number;
  trail: TrailPoint[];
  alive: boolean;
  justSplit: boolean;
}

export class PulseManager {
  private pulses: Pulse[] = [];
  private width: number;
  private height: number;
  private scene: Scene;
  private player: Player;
  private onReceiverHit: (() => void) | null = null;

  constructor(width: number, height: number, scene: Scene, player: Player) {
    this.width = width;
    this.height = height;
    this.scene = scene;
    this.player = player;
  }

  public setOnReceiverHit(cb: () => void): void {
    this.onReceiverHit = cb;
  }

  public firePulse(x: number, y: number, vx: number, vy: number): void {
    this.pulses.push({
      x,
      y,
      vx,
      vy,
      radius: 6,
      color: '#00bfff',
      isSplit: false,
      bouncesLeft: 5,
      trail: [],
      alive: true,
      justSplit: false
    });
  }

  public update(dt: number): void {
    for (const pulse of this.pulses) {
      if (!pulse.alive) continue;

      pulse.trail.push({ x: pulse.x, y: pulse.y });
      if (pulse.trail.length > 30) {
        pulse.trail.shift();
      }

      pulse.justSplit = false;

      pulse.x += pulse.vx;
      pulse.y += pulse.vy;

      if (pulse.x <= pulse.radius || pulse.x >= this.width - pulse.radius) {
        pulse.vx *= -1;
        pulse.x = Math.max(pulse.radius, Math.min(this.width - pulse.radius, pulse.x));
        this.handleBounce(pulse);
      }
      if (pulse.y <= 80 + pulse.radius || pulse.y >= this.height - pulse.radius) {
        pulse.vy *= -1;
        pulse.y = Math.max(80 + pulse.radius, Math.min(this.height - pulse.radius, pulse.y));
        this.handleBounce(pulse);
      }

      this.checkObstacleCollisions(pulse);

      if (!pulse.isSplit && pulse.alive) {
        this.checkPrismCollisions(pulse);
      }

      this.checkReceiverCollision(pulse);
    }

    this.pulses = this.pulses.filter(p => p.alive);
  }

  private handleBounce(pulse: Pulse): void {
    if (pulse.justSplit) return;
    pulse.bouncesLeft--;
    this.player.reclaimEnergy(8);
    if (pulse.bouncesLeft <= 0) {
      pulse.alive = false;
    }
  }

  private checkObstacleCollisions(pulse: Pulse): void {
    const obstacles = this.scene.getObstacles();
    for (const obs of obstacles) {
      if (this.checkRectCollision(pulse, obs)) {
        return;
      }
    }
  }

  private checkRectCollision(pulse: Pulse, rect: Obstacle): boolean {
    const closestX = Math.max(rect.x, Math.min(pulse.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(pulse.y, rect.y + rect.height));
    const distX = pulse.x - closestX;
    const distY = pulse.y - closestY;
    const distSq = distX * distX + distY * distY;

    if (distSq < pulse.radius * pulse.radius) {
      const fromLeft = pulse.x < rect.x;
      const fromRight = pulse.x > rect.x + rect.width;
      const fromTop = pulse.y < rect.y;
      const fromBottom = pulse.y > rect.y + rect.height;

      if (fromLeft || fromRight) {
        pulse.vx *= -1;
        pulse.x += pulse.vx * 2;
      }
      if (fromTop || fromBottom) {
        pulse.vy *= -1;
        pulse.y += pulse.vy * 2;
      }

      this.handleBounce(pulse);
      return true;
    }
    return false;
  }

  private checkPrismCollisions(pulse: Pulse): void {
    const prisms = this.scene.getPrisms();
    for (const prism of prisms) {
      const verts = this.scene.getPrismVertices(prism);
      if (this.checkTriangleCollision(pulse, verts, prism)) {
        return;
      }
    }
  }

  private checkTriangleCollision(pulse: Pulse, verts: { x: number; y: number }[], prism: Prism): boolean {
    for (let i = 0; i < 3; i++) {
      const v1 = verts[i];
      const v2 = verts[(i + 1) % 3];
      const dist = this.pointToSegmentDist(pulse.x, pulse.y, v1.x, v1.y, v2.x, v2.y);

      if (dist < pulse.radius + 3) {
        this.splitPulse(pulse, prism);
        return true;
      }
    }

    if (this.pointInTriangle(pulse.x, pulse.y, verts[0], verts[1], verts[2])) {
      this.splitPulse(pulse, prism);
      return true;
    }

    return false;
  }

  private pointToSegmentDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = x1 + t * dx;
    const cy = y1 + t * dy;
    return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  }

  private pointInTriangle(px: number, py: number, v1: { x: number; y: number }, v2: { x: number; y: number }, v3: { x: number; y: number }): boolean {
    const d1 = (px - v2.x) * (v1.y - v2.y) - (v1.x - v2.x) * (py - v2.y);
    const d2 = (px - v3.x) * (v2.y - v3.y) - (v2.x - v3.x) * (py - v3.y);
    const d3 = (px - v1.x) * (v3.y - v1.y) - (v3.x - v1.x) * (py - v1.y);
    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    return !(hasNeg && hasPos);
  }

  private splitPulse(pulse: Pulse, prism: Prism): void {
    pulse.alive = false;
    this.player.reclaimEnergy(8);

    const verts = this.scene.getPrismVertices(prism);
    const speed = 5;

    const sides: { nx: number; ny: number }[] = [];
    for (let i = 0; i < 2; i++) {
      const v1 = verts[i];
      const v2 = verts[(i + 1) % 3];
      let sx = v2.x - v1.x;
      let sy = v2.y - v1.y;
      const slen = Math.sqrt(sx * sx + sy * sy);
      sx /= slen;
      sy /= slen;
      sides.push({ nx: -sy, ny: sx });
    }

    for (const side of sides) {
      this.pulses.push({
        x: pulse.x,
        y: pulse.y,
        vx: side.nx * speed,
        vy: side.ny * speed,
        radius: 6,
        color: '#aa66ff',
        isSplit: true,
        bouncesLeft: 3,
        trail: [{ x: pulse.x, y: pulse.y }],
        alive: true,
        justSplit: true
      });
    }
  }

  private checkReceiverCollision(pulse: Pulse): void {
    const rec = this.scene.getReceiver();
    if (rec.hit) return;
    const dx = pulse.x - rec.x;
    const dy = pulse.y - rec.y;
    if (dx * dx + dy * dy < (pulse.radius + rec.radius) * (pulse.radius + rec.radius)) {
      pulse.alive = false;
      this.scene.hitReceiver();
      if (this.onReceiverHit) {
        this.onReceiverHit();
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    for (const pulse of this.pulses) {
      if (!pulse.alive) continue;

      const trail = pulse.trail;
      for (let i = 0; i < trail.length - 1; i++) {
        const alpha = (i / trail.length) * 0.7;
        ctx.save();
        ctx.strokeStyle = pulse.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 4 * (i / trail.length);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(trail[i].x, trail[i].y);
        ctx.lineTo(trail[i + 1].x, trail[i + 1].y);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.shadowColor = pulse.color;
      ctx.shadowBlur = 20;
      ctx.fillStyle = pulse.color;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(pulse.x - 1.5, pulse.y - 1.5, pulse.radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public clearPulses(): void {
    this.pulses = [];
  }
}
