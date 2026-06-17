export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface Enemy {
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  alive: boolean;
  formationOffsetX: number;
  formationOffsetY: number;
  spawnDelay: number;
  spawned: boolean;
}

export type WaveType = 'line' | 'v' | 'diamond' | 'circle' | 'scatter';

const RANDOM_COLORS = ['#ff3366', '#ff9933', '#ffff33', '#cc66ff', '#ff66cc'];

export class EnemyWave {
  enemies: Enemy[] = [];
  particles: Particle[] = [];
  waveType: WaveType;
  centerX: number;
  centerY: number;
  speed: number;
  color: string;
  size: number;
  waveTimer: number;
  allSpawned: boolean;
  destroyedCount: number;
  isRandom: boolean;
  scorePerEnemy: number;

  constructor(
    waveType: WaveType,
    canvasWidth: number,
    options?: {
      count?: number;
      color?: string;
      speed?: number;
      size?: number;
      isRandom?: boolean;
      scorePerEnemy?: number;
    }
  ) {
    this.waveType = waveType;
    this.waveTimer = 0;
    this.allSpawned = false;
    this.destroyedCount = 0;
    this.centerX = canvasWidth / 2;
    this.centerY = -80;
    this.isRandom = options?.isRandom ?? false;
    this.scorePerEnemy = options?.scorePerEnemy ?? 100;

    const count = options?.count;
    this.color = options?.color ?? '#ff3366';
    this.speed = options?.speed ?? 1.5;
    this.size = options?.size ?? 25;

    switch (waveType) {
      case 'line':
        this.createLineFormation(count ?? 5);
        break;
      case 'v':
        this.createVFormation(count ?? 7);
        break;
      case 'diamond':
        this.createDiamondFormation(count ?? 9);
        break;
      case 'circle':
        this.createCircleFormation(count ?? 8);
        break;
      case 'scatter':
        this.createScatterFormation(count ?? 6, canvasWidth);
        break;
    }
  }

  static createRandom(canvasWidth: number): EnemyWave {
    const waveTypes: WaveType[] = ['line', 'v', 'diamond', 'circle', 'scatter'];
    const waveType = waveTypes[Math.floor(Math.random() * waveTypes.length)];

    let count: number;
    switch (waveType) {
      case 'line':
        count = 3 + Math.floor(Math.random() * 6);
        break;
      case 'v':
        count = 5 + Math.floor(Math.random() * 5);
        break;
      case 'diamond':
        count = 5 + Math.floor(Math.random() * 5);
        break;
      case 'circle':
        count = 6 + Math.floor(Math.random() * 7);
        break;
      case 'scatter':
      default:
        count = 4 + Math.floor(Math.random() * 7);
        break;
    }

    const color = RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];
    const speed = 1.0 + Math.random() * 2.0;
    const size = 20 + Math.random() * 10;

    return new EnemyWave(waveType, canvasWidth, {
      count,
      color,
      speed,
      size,
      isRandom: true,
      scorePerEnemy: 150
    });
  }

  createLineFormation(count: number) {
    const spacing = Math.min(60, (this.widthForCount(count) - 20) / count);
    for (let i = 0; i < count; i++) {
      this.enemies.push({
        x: 0,
        y: 0,
        size: this.size,
        color: this.color,
        speed: this.speed,
        alive: true,
        formationOffsetX: (i - (count - 1) / 2) * spacing,
        formationOffsetY: 0,
        spawnDelay: i * 150,
        spawned: false
      });
    }
  }

  createVFormation(count: number) {
    const spacing = 45;
    const rows = Math.ceil((-1 + Math.sqrt(1 + 8 * count)) / 2);
    let idx = 0;
    for (let row = 0; row < rows && idx < count; row++) {
      const rowCount = row === 0 ? 1 : 2;
      for (let col = 0; col < rowCount && idx < count; col++) {
        const offsetX = row === 0 ? 0 : (col === 0 ? -1 : 1) * row * spacing;
        this.enemies.push({
          x: 0,
          y: 0,
          size: this.size,
          color: this.color,
          speed: this.speed,
          alive: true,
          formationOffsetX: offsetX,
          formationOffsetY: row * spacing,
          spawnDelay: idx * 120,
          spawned: false
        });
        idx++;
      }
    }
  }

  createDiamondFormation(count: number) {
    const spacing = 45;
    const half = Math.floor(Math.sqrt(count));
    const positions: { x: number; y: number }[] = [];

    for (let i = -half; i <= half; i++) {
      for (let j = -half; j <= half; j++) {
        if (Math.abs(i) + Math.abs(j) <= half) {
          positions.push({ x: i * spacing, y: j * spacing });
        }
      }
    }

    const sorted = positions.sort((a, b) => Math.abs(a.x) + Math.abs(a.y) - (Math.abs(b.x) + Math.abs(b.y)));

    for (let i = 0; i < Math.min(sorted.length, count); i++) {
      this.enemies.push({
        x: 0,
        y: 0,
        size: this.size,
        color: this.color,
        speed: this.speed,
        alive: true,
        formationOffsetX: sorted[i].x,
        formationOffsetY: sorted[i].y,
        spawnDelay: i * 80,
        spawned: false
      });
    }
  }

  createCircleFormation(count: number) {
    const radius = Math.min(120, 40 + count * 8);
    const offset = this.size / 2;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
      this.enemies.push({
        x: 0,
        y: 0,
        size: this.size,
        color: this.color,
        speed: this.speed,
        alive: true,
        formationOffsetX: Math.cos(angle) * (radius + offset),
        formationOffsetY: Math.sin(angle) * (radius + offset),
        spawnDelay: i * 100,
        spawned: false
      });
    }
  }

  createScatterFormation(count: number, canvasWidth: number) {
    const positions: { x: number; y: number }[] = [];
    const minDist = 40;
    const maxGlobalRetries = 3;
    const maxAttemptsPerPoint = 300;
    const spreadWidth = Math.min(canvasWidth * 0.7, 300 + count * 20);
    const spreadHeight = 80 + count * 8;

    for (let globalRetry = 0; globalRetry < maxGlobalRetries; globalRetry++) {
      positions.length = 0;

      for (let i = 0; i < count; i++) {
        let placed = false;
        for (let attempts = 0; attempts < maxAttemptsPerPoint; attempts++) {
          const x = (Math.random() - 0.5) * spreadWidth;
          const y = (Math.random() - 0.5) * spreadHeight;

          let valid = true;
          for (const p of positions) {
            const dx = x - p.x;
            const dy = y - p.y;
            if (dx * dx + dy * dy < minDist * minDist) {
              valid = false;
              break;
            }
          }

          if (valid) {
            positions.push({ x, y });
            placed = true;
            break;
          }
        }

        if (!placed) {
          break;
        }
      }

      if (positions.length === count) {
        break;
      }
    }

    for (let i = 0; i < positions.length; i++) {
      this.enemies.push({
        x: 0,
        y: 0,
        size: this.size,
        color: this.color,
        speed: this.speed,
        alive: true,
        formationOffsetX: positions[i].x,
        formationOffsetY: positions[i].y,
        spawnDelay: i * 180,
        spawned: false
      });
    }
  }

  private widthForCount(count: number): number {
    return 600;
  }

  update(deltaTime: number, canvasHeight: number) {
    this.waveTimer += deltaTime;
    this.centerY += this.speed * (deltaTime / 16.67);

    this.allSpawned = true;
    for (const enemy of this.enemies) {
      if (!enemy.spawned) {
        if (this.waveTimer >= enemy.spawnDelay) {
          enemy.spawned = true;
        } else {
          this.allSpawned = false;
          continue;
        }
      }
      if (enemy.alive) {
        enemy.x = this.centerX + enemy.formationOffsetX;
        enemy.y = this.centerY + enemy.formationOffsetY;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * (deltaTime / 16.67);
      p.y += p.vy * (deltaTime / 16.67);
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  createExplosion(x: number, y: number, color: string) {
    const particleCount = 6;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3 + Math.random() * 2,
        color,
        life: 2000,
        maxLife: 2000
      });
    }
  }

  hitEnemy(index: number): boolean {
    const enemy = this.enemies[index];
    if (!enemy || !enemy.alive || !enemy.spawned) return false;
    enemy.alive = false;
    this.destroyedCount++;
    this.createExplosion(enemy.x, enemy.y, enemy.color);
    return true;
  }

  isCompletelyOffScreen(canvasHeight: number): boolean {
    if (!this.allSpawned) return false;
    const aliveEnemies = this.enemies.filter(e => e.alive);
    if (aliveEnemies.length === 0) return true;
    return aliveEnemies.every(e => e.y > canvasHeight + 50);
  }

  allDestroyed(): boolean {
    return this.enemies.every(e => !e.alive);
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const enemy of this.enemies) {
      if (!enemy.alive || !enemy.spawned) continue;
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.fillStyle = enemy.color;
      ctx.shadowColor = enemy.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, enemy.size / 2);
      ctx.lineTo(-enemy.size / 2, -enemy.size / 2);
      ctx.lineTo(enemy.size / 2, -enemy.size / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
