export type ObstacleType = 'asteroid' | 'laser' | 'lightning';

export interface Obstacle {
  type: ObstacleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  active: boolean;
  vertices?: number[];
  flickerTime: number;
  sineOffset: number;
  baseX: number;
  amplitude: number;
  frequency: number;
}

export class ObstacleSystem {
  private pool: Obstacle[];
  private maxObstacles: number;
  private bounds: { minX: number; maxX: number; minY: number; maxY: number };
  private spawnTimer: number;
  private spawnInterval: number;
  private baseSpawnInterval: number;
  private baseSpeed: number;
  private maxSpeed: number;
  private acceleration: number;
  private currentSpeed: number;
  private maxSpawnCount: number;
  private difficultyLevel: number;
  private lightningUnlocked: boolean;

  constructor(
    bounds: { minX: number; maxX: number; minY: number; maxY: number }
  ) {
    this.bounds = bounds;
    this.maxObstacles = 100;
    this.pool = [];
    this.spawnTimer = 0;
    this.baseSpawnInterval = 1.5;
    this.spawnInterval = this.baseSpawnInterval;
    this.baseSpeed = 100;
    this.maxSpeed = 250;
    this.acceleration = 0.5;
    this.currentSpeed = this.baseSpeed;
    this.maxSpawnCount = 3;
    this.difficultyLevel = 1;
    this.lightningUnlocked = false;

    this.initializePool();
  }

  private initializePool(): void {
    for (let i = 0; i < this.maxObstacles; i++) {
      this.pool.push(this.createObstacle());
    }
  }

  private createObstacle(): Obstacle {
    return {
      type: 'asteroid',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      width: 0,
      height: 0,
      radius: 0,
      rotation: 0,
      rotationSpeed: 0,
      active: false,
      flickerTime: 0,
      sineOffset: 0,
      baseX: 0,
      amplitude: 30,
      frequency: 2
    };
  }

  private getInactiveObstacle(): Obstacle | null {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }
    if (this.pool.length < this.maxObstacles * 2) {
      const newObstacle = this.createObstacle();
      this.pool.push(newObstacle);
      return newObstacle;
    }
    return null;
  }

  private generateAsteroidVertices(radius: number): number[] {
    const vertices: number[] = [];
    const numVertices = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < numVertices; i++) {
      const angle = (i / numVertices) * Math.PI * 2;
      const r = radius * (0.7 + Math.random() * 0.6);
      vertices.push(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    return vertices;
  }

  spawn(): void {
    const count = Math.floor(Math.random() * this.maxSpawnCount) + 1;

    for (let i = 0; i < count; i++) {
      const obstacle = this.getInactiveObstacle();
      if (!obstacle) continue;

      const types: ObstacleType[] = ['asteroid', 'laser'];
      if (this.lightningUnlocked) {
        types.push('lightning');
      }
      const type = types[Math.floor(Math.random() * types.length)];

      obstacle.type = type;
      obstacle.active = true;
      obstacle.x = this.bounds.minX + 50 + Math.random() * (this.bounds.maxX - this.bounds.minX - 100);
      obstacle.y = this.bounds.minY - 100;
      obstacle.vy = this.currentSpeed;
      obstacle.vx = 0;
      obstacle.rotation = Math.random() * Math.PI * 2;
      obstacle.rotationSpeed = (Math.random() - 0.5) * 2;
      obstacle.flickerTime = 0;

      switch (type) {
        case 'asteroid':
          obstacle.radius = 15 + Math.random() * 15;
          obstacle.width = obstacle.radius * 2;
          obstacle.height = obstacle.radius * 2;
          obstacle.vertices = this.generateAsteroidVertices(obstacle.radius);
          break;
        case 'laser':
          obstacle.width = 20;
          obstacle.height = 60;
          obstacle.radius = Math.max(obstacle.width, obstacle.height) / 2;
          break;
        case 'lightning':
          obstacle.radius = 12;
          obstacle.width = obstacle.radius * 2;
          obstacle.height = obstacle.radius * 2;
          obstacle.baseX = obstacle.x;
          obstacle.sineOffset = Math.random() * Math.PI * 2;
          break;
      }
    }
  }

  update(dt: number, gameTime: number): void {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawn();
      this.spawnTimer = this.spawnInterval;
    }

    this.currentSpeed = Math.min(this.maxSpeed, this.baseSpeed + this.acceleration * gameTime);

    for (let i = 0; i < this.pool.length; i++) {
      const o = this.pool[i];
      if (!o.active) continue;

      o.y += o.vy * dt;
      o.rotation += o.rotationSpeed * dt;

      if (o.type === 'lightning') {
        o.sineOffset += o.frequency * dt;
        o.x = o.baseX + Math.sin(o.sineOffset) * o.amplitude;
      }

      if (o.type === 'laser') {
        o.flickerTime += dt;
      }

      if (o.y > this.bounds.maxY + 100) {
        o.active = false;
      }
    }
  }

  updateDifficulty(gameTime: number): void {
    const level = Math.floor(gameTime / 15) + 1;

    if (level !== this.difficultyLevel) {
      this.difficultyLevel = level;
      this.spawnInterval = this.baseSpawnInterval * Math.pow(0.9, level - 1);
      this.maxSpawnCount = Math.min(5, 3 + level - 1);
      this.currentSpeed = this.baseSpeed * Math.pow(1.1, level - 1);
    }

    if (gameTime >= 60 && !this.lightningUnlocked) {
      this.lightningUnlocked = true;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.pool.length; i++) {
      const o = this.pool[i];
      if (!o.active) continue;

      ctx.save();

      switch (o.type) {
        case 'asteroid':
          this.renderAsteroid(ctx, o);
          break;
        case 'laser':
          this.renderLaser(ctx, o);
          break;
        case 'lightning':
          this.renderLightning(ctx, o);
          break;
      }

      ctx.restore();
    }
  }

  private renderAsteroid(ctx: CanvasRenderingContext2D, o: Obstacle): void {
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rotation);

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, o.radius);
    gradient.addColorStop(0, '#808080');
    gradient.addColorStop(0.5, '#5a5a5a');
    gradient.addColorStop(1, '#3a3a3a');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(128, 128, 128, 0.5)';

    ctx.beginPath();
    if (o.vertices && o.vertices.length >= 4) {
      ctx.moveTo(o.vertices[0], o.vertices[1]);
      for (let i = 2; i < o.vertices.length; i += 2) {
        ctx.lineTo(o.vertices[i], o.vertices[i + 1]);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private renderLaser(ctx: CanvasRenderingContext2D, o: Obstacle): void {
    const flicker = 0.5 + 0.5 * Math.sin(o.flickerTime * 8);
    ctx.globalAlpha = 0.6 + flicker * 0.4;

    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff0000';

    const gradient = ctx.createLinearGradient(o.x - o.width / 2, o.y, o.x + o.width / 2, o.y);
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
    gradient.addColorStop(0.5, 'rgba(255, 0, 0, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(o.x - o.width / 2, o.y - o.height / 2, o.width, o.height);

    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(o.x - 2, o.y - o.height / 2, 4, o.height);
  }

  private renderLightning(ctx: CanvasRenderingContext2D, o: Obstacle): void {
    const pulse = 0.7 + 0.3 * Math.sin(o.flickerTime * 6);

    ctx.shadowBlur = 20 * pulse;
    ctx.shadowColor = '#ff0066';

    const gradient = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.radius);
    gradient.addColorStop(0, '#ff66aa');
    gradient.addColorStop(0.5, '#ff0066');
    gradient.addColorStop(1, 'rgba(255, 0, 102, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.radius * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(o.x - o.radius * 0.5, o.y - o.radius * 0.3);
    ctx.lineTo(o.x - o.radius * 0.2, o.y);
    ctx.lineTo(o.x + o.radius * 0.4, o.y - o.radius * 0.2);
    ctx.lineTo(o.x + o.radius * 0.1, o.y + o.radius * 0.4);
    ctx.lineTo(o.x - o.radius * 0.3, o.y + o.radius * 0.1);
    ctx.stroke();
  }

  checkCollision(bounds: { x: number; y: number; width: number; height: number }): boolean {
    for (let i = 0; i < this.pool.length; i++) {
      const o = this.pool[i];
      if (!o.active) continue;

      const oBounds = {
        x: o.x - o.width / 2,
        y: o.y - o.height / 2,
        width: o.width,
        height: o.height
      };

      if (
        bounds.x < oBounds.x + oBounds.width &&
        bounds.x + bounds.width > oBounds.x &&
        bounds.y < oBounds.y + oBounds.height &&
        bounds.y + bounds.height > oBounds.y
      ) {
        return true;
      }
    }
    return false;
  }

  getActiveObstacles(): Obstacle[] {
    return this.pool.filter(o => o.active);
  }

  getDifficultyLevel(): number {
    return this.difficultyLevel;
  }

  isLightningUnlocked(): boolean {
    return this.lightningUnlocked;
  }

  getCurrentSpeed(): number {
    return this.currentSpeed;
  }

  clear(): void {
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].active = false;
    }
  }

  reset(): void {
    this.clear();
    this.spawnTimer = 0;
    this.spawnInterval = this.baseSpawnInterval;
    this.currentSpeed = this.baseSpeed;
    this.maxSpawnCount = 3;
    this.difficultyLevel = 1;
    this.lightningUnlocked = false;
  }

  setBounds(bounds: { minX: number; maxX: number; minY: number; maxY: number }): void {
    this.bounds = bounds;
  }
}
