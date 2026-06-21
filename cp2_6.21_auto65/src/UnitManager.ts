import { PathPoint } from './PathManager';

export interface Unit {
  id: number;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  pathIndex: number;
  isAlive: boolean;
  hasReachedEnd: boolean;
  flashTimer: number;
  colorTweenTimer: number;
}

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

export interface UnitManagerState {
  activeUnits: number;
  killedUnits: number;
  leakedUnits: number;
}

export class UnitManager {
  private units: Unit[] = [];
  private particles: Particle[] = [];
  private nextUnitId: number = 0;
  private path: PathPoint[] = [];
  public onUnitKilled: ((unit: Unit) => void) | null = null;
  public onUnitLeaked: ((unit: Unit) => void) | null = null;

  public setPath(path: PathPoint[]): void {
    this.path = path;
  }

  public spawnUnit(startX: number, startY: number): void {
    this.units.push({
      id: this.nextUnitId++,
      x: startX,
      y: startY,
      radius: 12,
      hp: 100,
      maxHp: 100,
      speed: 40,
      pathIndex: 0,
      isAlive: true,
      hasReachedEnd: false,
      flashTimer: 0,
      colorTweenTimer: 0
    });
  }

  public getUnits(): Unit[] {
    return this.units.filter(u => u.isAlive && !u.hasReachedEnd);
  }

  public getState(): UnitManagerState {
    const active = this.units.filter(u => u.isAlive && !u.hasReachedEnd).length;
    const killed = this.units.filter(u => !u.isAlive).length;
    const leaked = this.units.filter(u => u.hasReachedEnd).length;
    return {
      activeUnits: active,
      killedUnits: killed,
      leakedUnits: leaked
    };
  }

  public clearUnits(): void {
    this.units = [];
    this.particles = [];
    this.nextUnitId = 0;
  }

  public damageUnit(unitId: number, damage: number): void {
    const unit = this.units.find(u => u.id === unitId);
    if (!unit || !unit.isAlive) return;

    unit.hp -= damage;
    unit.flashTimer = 0.1;
    unit.colorTweenTimer = 0.2;

    if (unit.hp <= 0) {
      unit.hp = 0;
      unit.isAlive = false;
      this.createDeathParticles(unit);
      if (this.onUnitKilled) {
        this.onUnitKilled(unit);
      }
    }
  }

  private createDeathParticles(unit: Unit): void {
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 60 + Math.random() * 80;
      this.particles.push({
        x: unit.x,
        y: unit.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
        color: '#DC2626',
        life: 0.5,
        maxLife: 0.5
      });
    }
  }

  public update(dt: number): void {
    for (const unit of this.units) {
      if (!unit.isAlive || unit.hasReachedEnd) continue;

      if (unit.flashTimer > 0) {
        unit.flashTimer -= dt;
      }
      if (unit.colorTweenTimer > 0) {
        unit.colorTweenTimer -= dt;
      }

      if (this.path.length === 0) continue;

      const targetIndex = unit.pathIndex + 1;
      if (targetIndex >= this.path.length) {
        unit.hasReachedEnd = true;
        if (this.onUnitLeaked) {
          this.onUnitLeaked(unit);
        }
        continue;
      }

      const target = this.path[targetIndex];
      const dx = target.x - unit.x;
      const dy = target.y - unit.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 2) {
        unit.x = target.x;
        unit.y = target.y;
        unit.pathIndex = targetIndex;
      } else {
        const moveDist = unit.speed * dt;
        unit.x += (dx / dist) * moveDist;
        unit.y += (dy / dist) * moveDist;
      }
    }

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const unit of this.units) {
      if (!unit.isAlive) continue;

      const hpRatio = unit.hp / unit.maxHp;
      let bodyColor = '#DC2626';
      if (unit.flashTimer > 0) {
        bodyColor = '#FFFFFF';
      } else if (unit.colorTweenTimer > 0) {
        const t = unit.colorTweenTimer / 0.2;
        bodyColor = this.lerpColor('#DC2626', '#FFFFFF', t);
      }

      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(unit.x, unit.y, unit.radius, 0, Math.PI * 2);
      ctx.fill();

      const hpBarWidth = 30;
      const hpBarHeight = 4;
      const hpBarX = unit.x - hpBarWidth / 2;
      const hpBarY = unit.y - unit.radius - 10;

      ctx.fillStyle = '#E5E7EB';
      ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

      const hpColor = this.lerpColor('#EF4444', '#10B981', hpRatio);
      ctx.fillStyle = hpColor;
      ctx.fillRect(hpBarX, hpBarY, hpBarWidth * hpRatio, hpBarHeight);
    }
  }

  private lerpColor(a: string, b: string, t: number): string {
    const ah = parseInt(a.replace('#', ''), 16);
    const bh = parseInt(b.replace('#', ''), 16);
    const ar = (ah >> 16) & 255, ag = (ah >> 8) & 255, ab = ah & 255;
    const br = (bh >> 16) & 255, bg = (bh >> 8) & 255, bb = bh & 255;
    const rr = Math.round(ar + (br - ar) * t);
    const rg = Math.round(ag + (bg - ag) * t);
    const rb = Math.round(ab + (bb - ab) * t);
    return `#${((rr << 16) | (rg << 8) | rb).toString(16).padStart(6, '0')}`;
  }
}
