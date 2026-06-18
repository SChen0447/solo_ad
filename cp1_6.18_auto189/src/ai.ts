export type AIState = 'patrol' | 'search' | 'chase';

export interface Vector2 {
  x: number;
  y: number;
}

export interface PathPoint {
  x: number;
  y: number;
}

export interface AIParams {
  patrolSpeed: number;
  fovAngle: number;
  fovRadius: number;
  alertTime: number;
}

const DEFAULT_PARAMS: AIParams = {
  patrolSpeed: 3,
  fovAngle: 90,
  fovRadius: 150,
  alertTime: 3
};

const FRAMES_PER_SECOND = 60;

abstract class EnemyBase {
  public x: number;
  public y: number;
  public state: AIState = 'patrol';
  public stateTimer: number = 0;
  public spawnTime: number = 0;
  public spawnDuration: number = 0.3 * FRAMES_PER_SECOND;
  public rotation: number = 0;

  protected params: AIParams;
  protected originalX: number;
  protected originalY: number;

  constructor(x: number, y: number, params: AIParams) {
    this.x = x;
    this.y = y;
    this.originalX = x;
    this.originalY = y;
    this.params = { ...params };
  }

  public updateParams(params: Partial<AIParams>): void {
    Object.assign(this.params, params);
  }

  public abstract update(playerPos: Vector2, enemies: EnemyBase[]): void;
  public abstract draw(ctx: CanvasRenderingContext2D): void;

  protected getSpawnScale(): number {
    if (this.spawnTime < this.spawnDuration) {
      const t = this.spawnTime / this.spawnDuration;
      const s = 1 - Math.pow(1 - t, 3);
      return 0.2 + s * 1.1;
    }
    return 1;
  }
}

export class PatrolEnemy extends EnemyBase {
  public radius: number = 15;
  public pathPoints: PathPoint[] = [];
  public currentPathIndex: number = 0;
  public pauseTimer: number = 0;
  public isPaused: boolean = false;
  public chaseTimer: number = 0;
  public maxChaseTime: number = 3 * FRAMES_PER_SECOND;
  public maxChaseDistance: number = 200;
  public detectionRadius: number = 120;
  public glowPulse: number = 0;

  constructor(x: number, y: number, pathPoints: PathPoint[], params: AIParams) {
    super(x, y, params);
    this.pathPoints = [...pathPoints];
    if (this.pathPoints.length > 0) {
      const dx = this.pathPoints[0].x - this.x;
      const dy = this.pathPoints[0].y - this.y;
      this.rotation = Math.atan2(dy, dx);
    }
  }

  public update(playerPos: Vector2, _enemies: EnemyBase[]): void {
    if (this.spawnTime < this.spawnDuration) {
      this.spawnTime++;
      return;
    }

    this.glowPulse = (this.glowPulse + 0.15) % (Math.PI * 2);

    const distToPlayer = this.distance(this.x, this.y, playerPos.x, playerPos.y);
    const canSeePlayer = distToPlayer < this.detectionRadius;

    switch (this.state) {
      case 'patrol':
        if (canSeePlayer) {
          this.state = 'search';
          this.stateTimer = 0;
        } else {
          this.updatePatrol();
        }
        break;

      case 'search':
        this.stateTimer++;
        if (canSeePlayer) {
          if (this.stateTimer >= this.params.alertTime * FRAMES_PER_SECOND) {
            this.state = 'chase';
            this.chaseTimer = 0;
          }
        } else {
          if (this.stateTimer > 30) {
            this.state = 'patrol';
            this.stateTimer = 0;
          }
        }
        this.updateSearch(playerPos);
        break;

      case 'chase':
        this.chaseTimer++;
        const distFromOrigin = this.distance(this.x, this.y, this.originalX, this.originalY);

        if (this.chaseTimer >= this.maxChaseTime || distFromOrigin > this.maxChaseDistance) {
          this.state = 'patrol';
          this.chaseTimer = 0;
          this.stateTimer = 0;
        } else if (!canSeePlayer) {
          this.state = 'search';
          this.stateTimer = 0;
        } else {
          this.updateChase(playerPos);
        }
        break;
    }
  }

  private updatePatrol(): void {
    if (this.pathPoints.length === 0) return;

    if (this.isPaused) {
      this.pauseTimer++;
      if (this.pauseTimer >= FRAMES_PER_SECOND) {
        this.isPaused = false;
        this.pauseTimer = 0;
        this.currentPathIndex = (this.currentPathIndex + 1) % this.pathPoints.length;
      }
      return;
    }

    const target = this.pathPoints[this.currentPathIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.params.patrolSpeed) {
      this.x = target.x;
      this.y = target.y;
      this.isPaused = true;
      this.pauseTimer = 0;
    } else {
      this.rotation = Math.atan2(dy, dx);
      this.x += (dx / dist) * this.params.patrolSpeed;
      this.y += (dy / dist) * this.params.patrolSpeed;
    }
  }

  private updateSearch(playerPos: Vector2): void {
    const dx = playerPos.x - this.x;
    const dy = playerPos.y - this.y;
    this.rotation = Math.atan2(dy, dx);
  }

  private updateChase(playerPos: Vector2): void {
    const dx = playerPos.x - this.x;
    const dy = playerPos.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      this.rotation = Math.atan2(dy, dx);
      const speed = this.params.patrolSpeed * 1.5;
      this.x += (dx / dist) * speed;
      this.y += (dy / dist) * speed;
    }
  }

  private distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const scale = this.getSpawnScale();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(scale, scale);

    if (this.state === 'chase') {
      const glowSize = this.radius + 8 + Math.sin(this.glowPulse) * 4;
      const gradient = ctx.createRadialGradient(0, 0, this.radius, 0, 0, glowSize);
      gradient.addColorStop(0, 'rgba(255, 80, 80, 0.6)');
      gradient.addColorStop(1, 'rgba(255, 80, 80, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#4a7acc';
    ctx.strokeStyle = '#2a5a9a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.radius * 0.4, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (this.state === 'search') {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 200, 80, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.detectionRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  public drawPath(ctx: CanvasRenderingContext2D): void {
    if (this.pathPoints.length < 2) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(230, 230, 74, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(this.pathPoints[0].x, this.pathPoints[0].y);
    for (let i = 1; i < this.pathPoints.length; i++) {
      ctx.lineTo(this.pathPoints[i].x, this.pathPoints[i].y);
    }
    ctx.lineTo(this.pathPoints[0].x, this.pathPoints[0].y);
    ctx.stroke();
    ctx.restore();

    for (const point of this.pathPoints) {
      ctx.save();
      ctx.fillStyle = '#e6e64a';
      ctx.strokeStyle = '#b8b82a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
}

export class SniperEnemy extends EnemyBase {
  public size: number = 25;
  public fovAngle: number;
  public fovRadius: number;

  constructor(x: number, y: number, params: AIParams, rotation: number = -Math.PI / 2) {
    super(x, y, params);
    this.fovAngle = (params.fovAngle * Math.PI) / 180;
    this.fovRadius = params.fovRadius;
    this.rotation = rotation;
  }

  public updateParams(params: Partial<AIParams>): void {
    super.updateParams(params);
    if (params.fovAngle !== undefined) {
      this.fovAngle = (params.fovAngle * Math.PI) / 180;
    }
    if (params.fovRadius !== undefined) {
      this.fovRadius = params.fovRadius;
    }
  }

  public update(playerPos: Vector2, _enemies: EnemyBase[]): void {
    if (this.spawnTime < this.spawnDuration) {
      this.spawnTime++;
      return;
    }

    const canSeePlayer = this.isInFOV(playerPos);

    switch (this.state) {
      case 'patrol':
        if (canSeePlayer) {
          this.state = 'search';
          this.stateTimer = 0;
        }
        break;

      case 'search':
        this.stateTimer++;
        if (canSeePlayer) {
          if (this.stateTimer >= this.params.alertTime * FRAMES_PER_SECOND) {
            this.state = 'chase';
          }
        } else {
          if (this.stateTimer > 30) {
            this.state = 'patrol';
            this.stateTimer = 0;
          }
        }
        break;

      case 'chase':
        if (!canSeePlayer) {
          this.state = 'search';
          this.stateTimer = 0;
        }
        break;
    }
  }

  private isInFOV(target: Vector2): boolean {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.fovRadius) return false;

    const angleToTarget = Math.atan2(dy, dx);
    let angleDiff = angleToTarget - this.rotation;

    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    return Math.abs(angleDiff) <= this.fovAngle / 2;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const scale = this.getSpawnScale();

    ctx.save();
    ctx.translate(this.x, this.y);

    const startAngle = this.rotation - this.fovAngle / 2;
    const endAngle = this.rotation + this.fovAngle / 2;

    let fovAlpha = 0.15;
    let borderColor = 'rgba(180, 40, 40, 0.6)';
    if (this.state === 'search') {
      fovAlpha = 0.25;
      borderColor = 'rgba(220, 60, 60, 0.8)';
    } else if (this.state === 'chase') {
      fovAlpha = 0.35;
      borderColor = 'rgba(255, 50, 50, 1)';
    }

    ctx.fillStyle = `rgba(255, 120, 120, ${fovAlpha})`;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, this.fovRadius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, this.fovRadius, startAngle, endAngle);
    ctx.closePath();
    ctx.stroke();

    ctx.scale(scale, scale);
    ctx.rotate(this.rotation);

    ctx.fillStyle = '#cc4a4a';
    ctx.strokeStyle = '#9a2a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.size * 0.7, 0);
    ctx.lineTo(-this.size * 0.5, -this.size * 0.5);
    ctx.lineTo(-this.size * 0.3, 0);
    ctx.lineTo(-this.size * 0.5, this.size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

export class AIManager {
  public enemies: EnemyBase[] = [];
  private params: AIParams;

  constructor(params?: Partial<AIParams>) {
    this.params = { ...DEFAULT_PARAMS, ...params };
  }

  public setParams(params: Partial<AIParams>): void {
    Object.assign(this.params, params);
    for (const enemy of this.enemies) {
      enemy.updateParams(params);
    }
  }

  public getParams(): AIParams {
    return { ...this.params };
  }

  public addPatrol(x: number, y: number, pathPoints: PathPoint[]): PatrolEnemy | null {
    if (this.enemies.length >= 20) return null;
    const enemy = new PatrolEnemy(x, y, pathPoints, this.params);
    this.enemies.push(enemy);
    return enemy;
  }

  public addSniper(x: number, y: number, rotation?: number): SniperEnemy | null {
    if (this.enemies.length >= 20) return null;
    const enemy = new SniperEnemy(x, y, this.params, rotation);
    this.enemies.push(enemy);
    return enemy;
  }

  public update(playerPos: Vector2): void {
    for (const enemy of this.enemies) {
      enemy.update(playerPos, this.enemies);
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    for (const enemy of this.enemies) {
      if (enemy instanceof PatrolEnemy) {
        enemy.drawPath(ctx);
      }
    }

    for (const enemy of this.enemies) {
      enemy.draw(ctx);
    }
  }

  public getStats(): { total: number; patrol: number; search: number; chase: number } {
    let patrol = 0;
    let search = 0;
    let chase = 0;

    for (const enemy of this.enemies) {
      switch (enemy.state) {
        case 'patrol':
          patrol++;
          break;
        case 'search':
          search++;
          break;
        case 'chase':
          chase++;
          break;
      }
    }

    return {
      total: this.enemies.length,
      patrol,
      search,
      chase
    };
  }

  public clear(): void {
    this.enemies = [];
  }

  public getEnemyCount(): number {
    return this.enemies.length;
  }
}
