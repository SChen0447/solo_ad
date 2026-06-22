export interface PathPoint {
  x: number;
  y: number;
  stayTime: number;
}

export type BulletPattern = 'linear' | 'fan' | 'spiral';
export type BulletColor = 'red' | 'blue' | 'yellow' | 'white';

export interface BulletConfig {
  pattern: BulletPattern;
  speed: number;
  fireInterval: number;
  color: BulletColor;
  offsetAngle: number;
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: BulletColor;
  angle: number;
  createdAt: number;
}

export interface EnemyConfig {
  id: string;
  active: boolean;
  pathPoints: PathPoint[];
  bulletConfig: BulletConfig;
  color: string;
}

const COLOR_MAP: Record<BulletColor, string> = {
  red: '#ff4757',
  blue: '#3742fa',
  yellow: '#ffa502',
  white: '#ffffff',
};

function cubicBezier(p0: PathPoint, p1: PathPoint, p2: PathPoint, p3: PathPoint, t: number): { x: number; y: number } {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

function getPointOnPath(points: PathPoint[], progress: number): { x: number; y: number; currentIndex: number; localT: number } {
  if (points.length < 2) return { x: points[0]?.x || 0, y: points[0]?.y || 0, currentIndex: 0, localT: 0 };
  if (progress <= 0) return { x: points[0].x, y: points[0].y, currentIndex: 0, localT: 0 };
  if (progress >= 1) return { x: points[points.length - 1].x, y: points[points.length - 1].y, currentIndex: points.length - 2, localT: 1 };

  const totalSegments = points.length - 1;
  const segProgress = progress * totalSegments;
  const segIndex = Math.floor(segProgress);
  const localT = segProgress - segIndex;

  const clampedIndex = Math.min(segIndex, totalSegments - 1);

  const p0 = points[Math.max(0, clampedIndex - 1)];
  const p1 = points[clampedIndex];
  const p2 = points[clampedIndex + 1];
  const p3 = points[Math.min(points.length - 1, clampedIndex + 2)];

  const cp1x = p1.x + (p2.x - p0.x) / 6;
  const cp1y = p1.y + (p2.y - p0.y) / 6;
  const cp2x = p2.x - (p3.x - p1.x) / 6;
  const cp2y = p2.y - (p3.y - p1.y) / 6;

  const bezierP0 = { x: p1.x, y: p1.y, stayTime: 0 };
  const bezierP1 = { x: cp1x, y: cp1y, stayTime: 0 };
  const bezierP2 = { x: cp2x, y: cp2y, stayTime: 0 };
  const bezierP3 = { x: p2.x, y: p2.y, stayTime: 0 };

  const pos = cubicBezier(bezierP0, bezierP1, bezierP2, bezierP3, localT);
  return { x: pos.x, y: pos.y, currentIndex: clampedIndex, localT };
}

export function getPathPosition(points: PathPoint[], progress: number): { x: number; y: number } {
  const pos = getPointOnPath(points, progress);
  return { x: pos.x, y: pos.y };
}

export function generatePathSamples(points: PathPoint[], count: number = 100): { x: number; y: number }[] {
  const samples: { x: number; y: number }[] = [];
  for (let i = 0; i <= count; i++) {
    samples.push(getPathPosition(points, i / count));
  }
  return samples;
}

export class Enemy {
  id: string;
  active: boolean;
  pathPoints: PathPoint[];
  bulletConfig: BulletConfig;
  color: string;
  progress: number = 0;
  x: number = 0;
  y: number = 0;
  private fireTimer: number = 0;
  private stayTimer: number = 0;
  private currentStayIndex: number = -1;
  private spiralAngle: number = 0;
  private speed: number = 0.3;

  constructor(config: EnemyConfig) {
    this.id = config.id;
    this.active = config.active;
    this.pathPoints = [...config.pathPoints];
    this.bulletConfig = { ...config.bulletConfig };
    this.color = config.color;
    if (this.pathPoints.length > 0) {
      this.x = this.pathPoints[0].x;
      this.y = this.pathPoints[0].y;
    }
  }

  update(dt: number, bullets: Bullet[], maxBullets: number = 500): Bullet[] {
    if (!this.active || this.pathPoints.length < 2) return bullets;

    if (this.currentStayIndex >= 0) {
      this.stayTimer -= dt;
      if (this.stayTimer <= 0) {
        this.currentStayIndex = -1;
      }
    } else {
      this.progress += this.speed * dt;

      if (this.progress >= 1) {
        this.progress = 1;
      }

      const posInfo = getPointOnPath(this.pathPoints, this.progress);
      this.x = posInfo.x;
      this.y = posInfo.y;

      if (this.progress < 1 && posInfo.localT >= 0.98) {
        const nextIndex = posInfo.currentIndex + 1;
        if (nextIndex < this.pathPoints.length && nextIndex !== this.currentStayIndex) {
          const stayTime = this.pathPoints[nextIndex].stayTime;
          if (stayTime > 0) {
            this.currentStayIndex = nextIndex;
            this.stayTimer = stayTime;
          }
        }
      }

      if (this.progress >= 1) {
        this.progress = 0;
        this.currentStayIndex = -1;
      }
    }

    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && this.active) {
      this.fireTimer = this.bulletConfig.fireInterval;
      const newBullets = this.fire();
      for (const b of newBullets) {
        if (bullets.length >= maxBullets) {
          bullets.shift();
        }
        bullets.push(b);
      }
    }

    return bullets;
  }

  private fire(): Bullet[] {
    const bullets: Bullet[] = [];
    const baseAngle = (90 + this.bulletConfig.offsetAngle) * Math.PI / 180;
    const speed = this.bulletConfig.speed;
    const color = this.bulletConfig.color;
    const now = performance.now();

    switch (this.bulletConfig.pattern) {
      case 'linear': {
        bullets.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(baseAngle) * speed,
          vy: Math.sin(baseAngle) * speed,
          color,
          angle: baseAngle,
          createdAt: now,
        });
        break;
      }
      case 'fan': {
        const fanCount = 5;
        const fanSpread = 60 * Math.PI / 180;
        const startAngle = baseAngle - fanSpread / 2;
        for (let i = 0; i < fanCount; i++) {
          const angle = startAngle + (fanSpread / (fanCount - 1)) * i;
          bullets.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color,
            angle,
            createdAt: now,
          });
        }
        break;
      }
      case 'spiral': {
        this.spiralAngle += 30 * Math.PI / 180;
        const angle = baseAngle + this.spiralAngle;
        bullets.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          angle,
          createdAt: now,
        });
        break;
      }
    }

    return bullets;
  }

  draw(ctx: CanvasRenderingContext2D, isSelected: boolean = false, time: number = 0): void {
    if (!this.active) return;

    if (isSelected) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 4);
      ctx.save();
      ctx.shadowColor = '#58a6ff';
      ctx.shadowBlur = 10 + 10 * pulse;
      ctx.strokeStyle = `rgba(88, 166, 255, ${0.6 + 0.4 * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - 12);
    ctx.lineTo(this.x + 10, this.y + 10);
    ctx.lineTo(this.x - 10, this.y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawPath(ctx: CanvasRenderingContext2D, samples: { x: number; y: number }[]): void {
    if (samples.length < 2) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(88, 166, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(samples[0].x, samples[0].y);
    for (let i = 1; i < samples.length; i++) {
      ctx.lineTo(samples[i].x, samples[i].y);
    }
    ctx.stroke();
    ctx.restore();

    for (const point of this.pathPoints) {
      ctx.save();
      ctx.fillStyle = 'rgba(88, 166, 255, 0.3)';
      ctx.strokeStyle = '#58a6ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  updateConfig(config: Partial<EnemyConfig>): void {
    if (config.active !== undefined) this.active = config.active;
    if (config.pathPoints) {
      this.pathPoints = [...config.pathPoints];
      if (this.pathPoints.length > 0 && this.progress === 0) {
        this.x = this.pathPoints[0].x;
        this.y = this.pathPoints[0].y;
      }
    }
    if (config.bulletConfig) this.bulletConfig = { ...config.bulletConfig };
    if (config.color) this.color = config.color;
  }

  reset(): void {
    this.progress = 0;
    this.currentStayIndex = -1;
    this.stayTimer = 0;
    this.fireTimer = 0;
    this.spiralAngle = 0;
    if (this.pathPoints.length > 0) {
      this.x = this.pathPoints[0].x;
      this.y = this.pathPoints[0].y;
    }
  }
}

export function updateBullets(bullets: Bullet[], dt: number, canvasWidth: number, canvasHeight: number): Bullet[] {
  const margin = 50;
  const result: Bullet[] = [];
  for (const bullet of bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    if (
      bullet.x > -margin &&
      bullet.x < canvasWidth + margin &&
      bullet.y > -margin &&
      bullet.y < canvasHeight + margin
    ) {
      result.push(bullet);
    }
  }
  return result;
}

export function drawBullets(ctx: CanvasRenderingContext2D, bullets: Bullet[]): void {
  ctx.save();
  for (const bullet of bullets) {
    ctx.fillStyle = COLOR_MAP[bullet.color];
    ctx.shadowColor = COLOR_MAP[bullet.color];
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function createEnemy(config: EnemyConfig): Enemy {
  return new Enemy(config);
}

export function updateAll(
  enemies: Enemy[],
  bullets: Bullet[],
  dt: number,
  canvasWidth: number,
  canvasHeight: number,
  maxBullets: number = 500
): { enemies: Enemy[]; bullets: Bullet[] } {
  let currentBullets = bullets;
  for (const enemy of enemies) {
    currentBullets = enemy.update(dt, currentBullets, maxBullets);
  }
  currentBullets = updateBullets(currentBullets, dt, canvasWidth, canvasHeight);
  return { enemies, bullets: currentBullets };
}

export function renderAll(
  ctx: CanvasRenderingContext2D,
  enemies: Enemy[],
  bullets: Bullet[],
  selectedEnemyId: string | null,
  time: number,
  pathSamplesMap: Map<string, { x: number; y: number }[]>
): void {
  for (const enemy of enemies) {
    if (!enemy.active) continue;
    const samples = pathSamplesMap.get(enemy.id);
    if (samples) {
      enemy.drawPath(ctx, samples);
    }
  }

  drawBullets(ctx, bullets);

  for (const enemy of enemies) {
    if (!enemy.active) continue;
    enemy.draw(ctx, enemy.id === selectedEnemyId, time);
  }
}

export { COLOR_MAP };
