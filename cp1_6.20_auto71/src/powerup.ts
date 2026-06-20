import { ParticleSystem } from './particle';
import { Obstacle } from './obstacle';

export interface PowerUp {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  active: boolean;
  pulseTime: number;
  pulsePeriod: number;
}

export class PowerUpSystem {
  private pool: PowerUp[];
  private maxPowerUps: number;
  private bounds: { minX: number; maxX: number; minY: number; maxY: number };
  private spawnTimer: number;
  private spawnInterval: number;
  private particleSystem: ParticleSystem;
  private baseSpeed: number;

  constructor(
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    particleSystem: ParticleSystem
  ) {
    this.bounds = bounds;
    this.particleSystem = particleSystem;
    this.maxPowerUps = 50;
    this.pool = [];
    this.spawnTimer = 0;
    this.spawnInterval = 2;
    this.baseSpeed = 80;

    this.initializePool();
  }

  private initializePool(): void {
    for (let i = 0; i < this.maxPowerUps; i++) {
      this.pool.push({
        x: 0,
        y: 0,
        width: 8,
        height: 8,
        vy: this.baseSpeed,
        active: false,
        pulseTime: 0,
        pulsePeriod: 0.5
      });
    }
  }

  private getInactivePowerUp(): PowerUp | null {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }
    if (this.pool.length < this.maxPowerUps * 2) {
      const newPowerUp: PowerUp = {
        x: 0,
        y: 0,
        width: 8,
        height: 8,
        vy: this.baseSpeed,
        active: false,
        pulseTime: 0,
        pulsePeriod: 0.5
      };
      this.pool.push(newPowerUp);
      return newPowerUp;
    }
    return null;
  }

  private isValidPosition(x: number, y: number, obstacles: Obstacle[]): boolean {
    const minDistance = 60;
    for (const obs of obstacles) {
      if (!obs.active) continue;
      const dx = x - obs.x;
      const dy = y - obs.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < minDistance) {
        return false;
      }
    }
    return true;
  }

  spawn(obstacles: Obstacle[]): void {
    const powerUp = this.getInactivePowerUp();
    if (!powerUp) return;

    let attempts = 0;
    let validPosition = false;
    let x = 0;

    while (attempts < 10 && !validPosition) {
      x = this.bounds.minX + 60 + Math.random() * (this.bounds.maxX - this.bounds.minX - 120);
      const y = this.bounds.minY - 50;
      validPosition = this.isValidPosition(x, y, obstacles);
      attempts++;
    }

    if (!validPosition && obstacles.length > 0) {
      const freeZones = this.findFreeZones(obstacles);
      if (freeZones.length > 0) {
        const zone = freeZones[Math.floor(Math.random() * freeZones.length)];
        x = zone.x + (Math.random() - 0.5) * zone.width;
      }
    }

    powerUp.x = x;
    powerUp.y = this.bounds.minY - 50;
    powerUp.vy = this.baseSpeed;
    powerUp.active = true;
    powerUp.pulseTime = Math.random() * powerUp.pulsePeriod;
    powerUp.width = 8;
    powerUp.height = 8;
  }

  private findFreeZones(obstacles: Obstacle[]): { x: number; width: number }[] {
    const zones: { x: number; width: number }[] = [];
    const sortedObstacles = [...obstacles]
      .filter(o => o.active && o.y < this.bounds.minY + 100)
      .sort((a, b) => a.x - b.x);

    let currentX = this.bounds.minX + 40;
    const minWidth = 80;

    for (const obs of sortedObstacles) {
      const obsLeft = obs.x - obs.width / 2 - 30;
      if (obsLeft > currentX) {
        const width = obsLeft - currentX;
        if (width >= minWidth) {
          zones.push({ x: currentX + width / 2, width });
        }
      }
      currentX = Math.max(currentX, obs.x + obs.width / 2 + 30);
    }

    const remainingWidth = this.bounds.maxX - 40 - currentX;
    if (remainingWidth >= minWidth) {
      zones.push({ x: currentX + remainingWidth / 2, width: remainingWidth });
    }

    return zones;
  }

  update(dt: number, obstacles: Obstacle[], speedMultiplier: number = 1): void {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawn(obstacles);
      this.spawnTimer = this.spawnInterval + Math.random() * 0.5;
    }

    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.y += p.vy * speedMultiplier * dt;
      p.pulseTime += dt;

      if (p.y > this.bounds.maxY + 50) {
        p.active = false;
      }
    }
  }

  checkCollection(
    playerPos: { x: number; y: number },
    isBoosting: boolean
  ): boolean {
    if (isBoosting) return false;

    const collectRadius = 10;

    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      const dx = playerPos.x - p.x;
      const dy = playerPos.y - p.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < collectRadius) {
        p.active = false;
        this.particleSystem.emitCollectEffect(p.x, p.y);
        return true;
      }
    }
    return false;
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      ctx.save();

      const pulse = 0.7 + 0.3 * Math.sin((p.pulseTime / p.pulsePeriod) * Math.PI * 2);
      const size = p.width * (0.9 + pulse * 0.2);

      ctx.translate(p.x, p.y);
      ctx.rotate(Math.PI / 4);

      ctx.shadowBlur = 15 * pulse;
      ctx.shadowColor = '#2ed573';

      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
      gradient.addColorStop(0, '#7bed9f');
      gradient.addColorStop(0.5, '#2ed573');
      gradient.addColorStop(1, '#1a9c4a');

      ctx.fillStyle = gradient;
      ctx.fillRect(-size / 2, -size / 2, size, size);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(-size / 2, -size / 2, size, size);

      ctx.restore();
    }
  }

  getActivePowerUps(): PowerUp[] {
    return this.pool.filter(p => p.active);
  }

  clear(): void {
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].active = false;
    }
  }

  reset(): void {
    this.clear();
    this.spawnTimer = 0;
  }

  setBounds(bounds: { minX: number; maxX: number; minY: number; maxY: number }): void {
    this.bounds = bounds;
  }
}
