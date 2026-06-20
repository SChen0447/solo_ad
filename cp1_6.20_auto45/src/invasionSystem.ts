import { StarMap } from './starMap';
import { FleetControl, Ship } from './fleetControl';

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isEnemy: boolean;
  damage: number;
  life: number;
  maxLife: number;
}

export interface Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
}

export class InvasionSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private starMap: StarMap;
  private fleetControl: FleetControl;
  public bullets: Bullet[] = [];
  public debris: Debris[] = [];
  private lastWaveTime = 0;
  private readonly WAVE_INTERVAL = 30000;
  private readonly SHOT_INTERVAL = 500;
  private readonly COMBAT_RANGE = 80;
  private readonly BULLET_SPEED = 200;
  private readonly MAX_PARTICLES = 500;
  public waveNumber = 0;
  public nextWaveCountdown = 30;

  constructor(canvas: HTMLCanvasElement, starMap: StarMap, fleetControl: FleetControl) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
    this.starMap = starMap;
    this.fleetControl = fleetControl;
    this.lastWaveTime = performance.now();
    this.spawnWave();
  }

  private spawnWave(): void {
    this.waveNumber++;
    const count = 3 + Math.floor(Math.random() * 6);
    const cx = this.starMap.worldWidth / 2;
    const cy = this.starMap.worldHeight / 2;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const edgeDist = Math.max(this.starMap.worldWidth, this.starMap.worldHeight) * 0.45;
      const spawnX = cx + Math.cos(angle) * edgeDist;
      const spawnY = cy + Math.sin(angle) * edgeDist;
      const enemy = this.fleetControl.createShip(spawnX, spawnY, true);
      enemy.targetX = cx + (Math.random() - 0.5) * 200;
      enemy.targetY = cy + (Math.random() - 0.5) * 200;
      this.fleetControl.ships.push(enemy);
    }

    this.lastWaveTime = performance.now();
    this.nextWaveCountdown = 30;
  }

  private findNearestEnemy(ship: Ship, enemies: Ship[]): Ship | null {
    let nearest: Ship | null = null;
    let minDist = this.COMBAT_RANGE * this.COMBAT_RANGE;
    for (const enemy of enemies) {
      const dx = enemy.x - ship.x;
      const dy = enemy.y - ship.y;
      const d = dx * dx + dy * dy;
      if (d < minDist) {
        minDist = d;
        nearest = enemy;
      }
    }
    return nearest;
  }

  public update(deltaTime: number): void {
    const now = performance.now();

    const elapsed = (now - this.lastWaveTime) / 1000;
    this.nextWaveCountdown = Math.max(0, 30 - elapsed);
    if (now - this.lastWaveTime >= this.WAVE_INTERVAL) {
      this.spawnWave();
    }

    const friendly = this.fleetControl.getFriendlyShips();
    const enemies = this.fleetControl.getEnemyShips();

    for (const ship of friendly) {
      const target = this.findNearestEnemy(ship, enemies);
      if (target) {
        ship.angle = Math.atan2(target.y - ship.y, target.x - ship.x);
        if (now - ship.lastShot >= this.SHOT_INTERVAL) {
          ship.lastShot = now;
          this.fireBullet(ship, target);
        }
      }
    }

    for (const ship of enemies) {
      const target = this.findNearestEnemy(ship, friendly);
      if (target) {
        ship.angle = Math.atan2(target.y - ship.y, target.x - ship.x);
        if (!this.fleetControl.defensiveMode || true) {
          const dx = target.x - ship.x;
          const dy = target.y - ship.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > this.COMBAT_RANGE * 0.6) {
            ship.targetX = target.x;
            ship.targetY = target.y;
          } else {
            ship.targetX = null;
            ship.targetY = null;
          }
        }
        if (now - ship.lastShot >= this.SHOT_INTERVAL) {
          ship.lastShot = now;
          this.fireBullet(ship, target);
        }
      } else {
        const cx = this.starMap.worldWidth / 2;
        const cy = this.starMap.worldHeight / 2;
        if (ship.targetX === null) {
          ship.targetX = cx + (Math.random() - 0.5) * 200;
          ship.targetY = cy + (Math.random() - 0.5) * 200;
        }
      }
    }

    this.updateBullets(deltaTime);
    this.updateDebris(deltaTime);
    this.enforceParticleLimit();
  }

  private fireBullet(from: Ship, to: Ship): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    this.bullets.push({
      x: from.x,
      y: from.y,
      vx: (dx / dist) * this.BULLET_SPEED,
      vy: (dy / dist) * this.BULLET_SPEED,
      isEnemy: from.isEnemy,
      damage: from.attack,
      life: 0,
      maxLife: 1500
    });
  }

  private updateBullets(deltaTime: number): void {
    const dt = deltaTime / 1000;
    const allShips = this.fleetControl.ships;

    this.bullets = this.bullets.filter(bullet => {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life += deltaTime;

      if (bullet.life >= bullet.maxLife) return false;

      for (const ship of allShips) {
        if (ship.isEnemy === bullet.isEnemy) continue;
        if (ship.health <= 0) continue;
        const dx = ship.x - bullet.x;
        const dy = ship.y - bullet.y;
        if (dx * dx + dy * dy < 100) {
          const damage = Math.max(1, bullet.damage - ship.armor);
          ship.health -= damage;
          ship.hitFlash = 200;
          if (ship.health <= 0) {
            this.spawnDebris(ship);
          }
          return false;
        }
      }
      return true;
    });
  }

  private spawnDebris(ship: Ship): void {
    const count = 8 + Math.floor(Math.random() * 6);
    const color = ship.isEnemy ? '#ff6644' : '#66aaff';
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      this.debris.push({
        x: ship.x,
        y: ship.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.01,
        life: 0,
        maxLife: 1500 + Math.random() * 1000
      });
    }
  }

  private updateDebris(deltaTime: number): void {
    const dt = deltaTime / 1000;
    this.debris = this.debris.filter(d => {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx *= 0.98;
      d.vy *= 0.98;
      d.rotation += d.rotationSpeed * deltaTime;
      d.life += deltaTime;
      return d.life < d.maxLife;
    });
  }

  private enforceParticleLimit(): void {
    const total = this.bullets.length + this.debris.length;
    if (total > this.MAX_PARTICLES) {
      const excess = total - this.MAX_PARTICLES;
      this.bullets.splice(0, Math.min(excess, this.bullets.length));
      const remaining = excess - Math.min(excess, this.bullets.length);
      if (remaining > 0) {
        this.debris.splice(0, remaining);
      }
    }
  }

  public render(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.starMap.camera.scale, this.starMap.camera.scale);
    ctx.translate(-this.starMap.camera.x, -this.starMap.camera.y);

    for (const bullet of this.bullets) {
      ctx.fillStyle = bullet.isEnemy ? '#ff4444' : '#66ccff';
      ctx.fillRect(bullet.x - 2, bullet.y - 2, 4, 4);
      ctx.fillStyle = bullet.isEnemy ? 'rgba(255,100,100,0.5)' : 'rgba(150,200,255,0.5)';
      ctx.fillRect(bullet.x - 4, bullet.y - 4, 8, 8);
    }

    for (const d of this.debris) {
      const alpha = 1 - d.life / d.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rotation);
      ctx.fillStyle = d.color;
      ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size);
      ctx.restore();
    }

    ctx.restore();
  }
}
