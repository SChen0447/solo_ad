import { Unit } from './UnitManager';

export interface Tower {
  id: number;
  col: number;
  row: number;
  x: number;
  y: number;
  level: number;
  damage: number;
  range: number;
  fireRate: number;
  fireCooldown: number;
  borderColor: string;
  isSelected: boolean;
  fadeOutTimer: number;
  isRemoving: boolean;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  targetUnitId: number;
  speed: number;
  damage: number;
  radius: number;
}

export interface HitMarker {
  unitId: number;
  damage: number;
  onHit: (unitId: number, damage: number) => void;
}

export class TowerManager {
  private towers: Tower[] = [];
  private bullets: Bullet[] = [];
  private nextTowerId: number = 0;
  private nextBulletId: number = 0;
  private selectedTowerId: number | null = null;
  public cellSize: number = 60;
  public onDamageUnit: ((unitId: number, damage: number) => void) | null = null;
  public onTowerSold: ((score: number) => void) | null = null;
  public onUpgradeAttempt: ((tower: Tower) => boolean) | null = null;

  public placeTower(col: number, row: number): boolean {
    if (this.getTowerAtCell(col, row)) return false;
    this.towers.push({
      id: this.nextTowerId++,
      col,
      row,
      x: col * this.cellSize + this.cellSize / 2,
      y: row * this.cellSize + this.cellSize / 2,
      level: 1,
      damage: 20,
      range: 3 * this.cellSize,
      fireRate: 1.2,
      fireCooldown: 0,
      borderColor: '#374151',
      isSelected: false,
      fadeOutTimer: 0,
      isRemoving: false
    });
    return true;
  }

  public getTowerAtCell(col: number, row: number): Tower | undefined {
    return this.towers.find(t => t.col === col && t.row === row && !t.isRemoving);
  }

  public getTowerAtPixel(px: number, py: number): Tower | undefined {
    for (const tower of this.towers) {
      if (tower.isRemoving) continue;
      const dx = px - tower.x;
      const dy = py - tower.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 18) {
        return tower;
      }
    }
    return undefined;
  }

  public selectTower(towerId: number | null): void {
    this.selectedTowerId = towerId;
    for (const tower of this.towers) {
      tower.isSelected = tower.id === towerId;
    }
  }

  public getSelectedTower(): Tower | null {
    if (this.selectedTowerId === null) return null;
    return this.towers.find(t => t.id === this.selectedTowerId) || null;
  }

  public upgradeTower(towerId: number): boolean {
    const tower = this.towers.find(t => t.id === towerId);
    if (!tower || tower.level >= 2) return false;
    if (this.onUpgradeAttempt && !this.onUpgradeAttempt(tower)) return false;

    tower.level = 2;
    tower.damage = 35;
    tower.range = 4 * this.cellSize;
    tower.borderColor = '#F59E0B';
    return true;
  }

  public sellTower(towerId: number): void {
    const tower = this.towers.find(t => t.id === towerId);
    if (!tower || tower.isRemoving) return;
    tower.isRemoving = true;
    tower.fadeOutTimer = 0.3;
    if (this.selectedTowerId === towerId) {
      this.selectedTowerId = null;
    }
    if (this.onTowerSold) {
      this.onTowerSold(30);
    }
  }

  public clearTowers(): void {
    this.towers = [];
    this.bullets = [];
    this.selectedTowerId = null;
  }

  public update(dt: number, units: Unit[]): void {
    for (const tower of this.towers) {
      if (tower.isRemoving) {
        tower.fadeOutTimer -= dt;
        continue;
      }

      if (tower.fireCooldown > 0) {
        tower.fireCooldown -= dt;
      }

      if (tower.fireCooldown <= 0) {
        const target = this.findNearestUnit(tower, units);
        if (target) {
          this.fireBullet(tower, target);
          tower.fireCooldown = tower.fireRate;
        }
      }
    }

    this.towers = this.towers.filter(t => !t.isRemoving || t.fadeOutTimer > 0);

    for (const bullet of this.bullets) {
      const target = units.find(u => u.id === bullet.targetUnitId && u.isAlive && !u.hasReachedEnd);
      if (!target) {
        (bullet as any)._expired = true;
        continue;
      }

      const dx = target.x - bullet.x;
      const dy = target.y - bullet.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 6) {
        if (this.onDamageUnit) {
          this.onDamageUnit(target.id, bullet.damage);
        }
        (bullet as any)._expired = true;
      } else {
        const moveDist = bullet.speed * dt;
        bullet.x += (dx / dist) * moveDist;
        bullet.y += (dy / dist) * moveDist;
      }
    }

    this.bullets = this.bullets.filter(b => !(b as any)._expired);
  }

  private findNearestUnit(tower: Tower, units: Unit[]): Unit | null {
    let nearest: Unit | null = null;
    let nearestDist = Infinity;

    for (const unit of units) {
      if (!unit.isAlive || unit.hasReachedEnd) continue;
      const dx = unit.x - tower.x;
      const dy = unit.y - tower.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= tower.range && dist < nearestDist) {
        nearest = unit;
        nearestDist = dist;
      }
    }

    return nearest;
  }

  private fireBullet(tower: Tower, target: Unit): void {
    this.bullets.push({
      id: this.nextBulletId++,
      x: tower.x,
      y: tower.y,
      targetUnitId: target.id,
      speed: 300,
      damage: tower.damage,
      radius: 3
    });
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const tower of this.towers) {
      if (tower.isSelected || tower.isRemoving) {
        ctx.fillStyle = 'rgba(147, 197, 253, 0.2)';
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    for (const bullet of this.bullets) {
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const tower of this.towers) {
      let alpha = 1;
      if (tower.isRemoving) {
        alpha = Math.max(0, tower.fadeOutTimer / 0.3);
      }

      ctx.globalAlpha = alpha;

      const gradient = ctx.createRadialGradient(tower.x - 4, tower.y - 4, 2, tower.x, tower.y, 18);
      gradient.addColorStop(0, '#93C5FD');
      gradient.addColorStop(1, '#60A5FA');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = tower.borderColor;
      ctx.lineWidth = 3;
      ctx.stroke();

      if (tower.level >= 2) {
        ctx.fillStyle = '#F59E0B';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', tower.x, tower.y + 1);
      }

      if (tower.isSelected) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(tower.x, tower.y, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.globalAlpha = 1;
  }

  public renderPlacementPreview(ctx: CanvasRenderingContext2D, col: number, row: number, canPlace: boolean): void {
    const x = col * this.cellSize + this.cellSize / 2;
    const y = row * this.cellSize + this.cellSize / 2;
    const range = 3 * this.cellSize;

    ctx.fillStyle = canPlace ? 'rgba(147, 197, 253, 0.2)' : 'rgba(239, 68, 68, 0.2)';
    ctx.strokeStyle = canPlace ? 'rgba(147, 197, 253, 0.4)' : 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, range, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.globalAlpha = 0.6;
    const gradient = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, 18);
    gradient.addColorStop(0, '#93C5FD');
    gradient.addColorStop(1, '#60A5FA');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = canPlace ? '#374151' : '#EF4444';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
