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

export type WaveType = 'line' | 'v' | 'diamond';

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

  constructor(waveType: WaveType, canvasWidth: number) {
    this.waveType = waveType;
    this.waveTimer = 0;
    this.allSpawned = false;
    this.destroyedCount = 0;
    this.centerX = canvasWidth / 2;
    this.centerY = -50;

    switch (waveType) {
      case 'line':
        this.speed = 1.5;
        this.color = '#ff3366';
        this.size = 25;
        this.createLineFormation();
        break;
      case 'v':
        this.speed = 2;
        this.color = '#ff9933';
        this.size = 25;
        this.createVFormation();
        break;
      case 'diamond':
        this.speed = 2.5;
        this.color = '#ffff33';
        this.size = 25;
        this.createDiamondFormation();
        break;
    }
  }

  createLineFormation() {
    const count = 5;
    const spacing = 60;
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
        spawnDelay: i * 200,
        spawned: false
      });
    }
  }

  createVFormation() {
    const count = 7;
    const spacing = 50;
    let idx = 0;
    for (let row = 0; row < 4; row++) {
      const rowCount = row === 0 ? 1 : 2;
      for (let col = 0; col < rowCount; col++) {
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
          spawnDelay: idx * 150,
          spawned: false
        });
        idx++;
      }
    }
  }

  createDiamondFormation() {
    const count = 9;
    const spacing = 50;
    const positions: { x: number; y: number }[] = [];
    positions.push({ x: 0, y: -2 * spacing });
    for (let i = -1; i <= 1; i++) {
      positions.push({ x: i * spacing, y: -spacing });
    }
    for (let i = -2; i <= 2; i++) {
      positions.push({ x: i * spacing, y: 0 });
    }
    for (let i = -1; i <= 1; i++) {
      positions.push({ x: i * spacing, y: spacing });
    }
    positions.push({ x: 0, y: 2 * spacing });

    for (let i = 0; i < positions.length && i < count; i++) {
      this.enemies.push({
        x: 0,
        y: 0,
        size: this.size,
        color: this.color,
        speed: this.speed,
        alive: true,
        formationOffsetX: positions[i].x,
        formationOffsetY: positions[i].y,
        spawnDelay: i * 100,
        spawned: false
      });
    }
  }

  update(deltaTime: number, canvasHeight: number) {
    this.waveTimer += deltaTime;
    this.centerY += this.speed * (deltaTime / 16);

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
      p.x += p.vx * (deltaTime / 16);
      p.y += p.vy * (deltaTime / 16);
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
