export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  color: string;
  sourceTowerIndex: number;
  targetEnemyId: number;
  alive: boolean;
}

export interface Tower {
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  level: number;
  range: number;
  damage: number;
  fireInterval: number;
  lastFireTime: number;
  haloAngle: number;
  flashTimer: number;
  upgradeAnimTimer: number;
  buildAnimTimer: number;
  buildX: number;
  buildY: number;
}

export interface RippleEffect {
  x: number;
  y: number;
  timer: number;
  duration: number;
}

const MAX_PROJECTILES = 100;

export class DefenseTower {
  towers: Tower[] = [];
  private _projectiles: Projectile[] = [];
  ripples: RippleEffect[] = [];

  private getTowerStats(level: number): { range: number; damage: number; fireInterval: number } {
    if (level === 1) {
      return { range: 100, damage: 25, fireInterval: 800 };
    }
    return { range: 140, damage: 40, fireInterval: 800 };
  }

  canBuildAt(gridX: number, gridY: number, coreX: number, coreY: number, gridSize: number): boolean {
    const towerCenterX = gridX * gridSize + gridSize / 2;
    const towerCenterY = gridY * gridSize + gridSize / 2;
    const dx = towerCenterX - coreX;
    const dy = towerCenterY - coreY;
    if (Math.sqrt(dx * dx + dy * dy) < gridSize) return false;
    for (const t of this.towers) {
      if (t.gridX === gridX && t.gridY === gridY) return false;
    }
    return true;
  }

  buildTower(gridX: number, gridY: number, gridSize: number): Tower | null {
    const stats = this.getTowerStats(1);
    const tower: Tower = {
      gridX,
      gridY,
      x: gridX * gridSize + gridSize / 2,
      y: gridY * gridSize + gridSize / 2,
      level: 1,
      range: stats.range,
      damage: stats.damage,
      fireInterval: stats.fireInterval,
      lastFireTime: 0,
      haloAngle: 0,
      flashTimer: 0,
      upgradeAnimTimer: 0,
      buildAnimTimer: 150,
      buildX: gridX * gridSize + gridSize / 2,
      buildY: gridY * gridSize + gridSize / 2,
    };
    this.towers.push(tower);
    this.ripples.push({
      x: tower.x,
      y: tower.y,
      timer: 0,
      duration: 300,
    });
    return tower;
  }

  upgradeTower(index: number): boolean {
    if (index < 0 || index >= this.towers.length) return false;
    const tower = this.towers[index];
    if (tower.level >= 2) return false;
    tower.level = 2;
    const stats = this.getTowerStats(2);
    tower.range = stats.range;
    tower.damage = stats.damage;
    tower.fireInterval = stats.fireInterval;
    tower.upgradeAnimTimer = 150;
    return true;
  }

  getTowerAtGrid(gx: number, gy: number): number {
    for (let i = 0; i < this.towers.length; i++) {
      if (this.towers[i].gridX === gx && this.towers[i].gridY === gy) return i;
    }
    return -1;
  }

  getProjectiles(): Projectile[] {
    return this._projectiles;
  }

  update(timestamp: number, deltaMs: number, enemies: { id: number; x: number; y: number; hp: number; alive: boolean; speed: number; vx: number; vy: number }[]): Projectile[] {
    const newProjectiles: Projectile[] = [];

    for (const tower of this.towers) {
      if (tower.buildAnimTimer > 0) {
        tower.buildAnimTimer -= deltaMs;
        continue;
      }

      tower.haloAngle += 0.5 * (deltaMs / 16);
      if (tower.flashTimer > 0) tower.flashTimer -= deltaMs;
      if (tower.upgradeAnimTimer > 0) tower.upgradeAnimTimer -= deltaMs;

      if (timestamp - tower.lastFireTime < tower.fireInterval) continue;

      let closestEnemy: { id: number; x: number; y: number; hp: number; alive: boolean } | null = null;
      let closestDist = Infinity;

      for (const e of enemies) {
        if (!e.alive || e.hp <= 0) continue;
        const dx = e.x - tower.x;
        const dy = e.y - tower.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= tower.range && dist < closestDist) {
          closestDist = dist;
          closestEnemy = e;
        }
      }

      if (closestEnemy) {
        const dx = closestEnemy.x - tower.x;
        const dy = closestEnemy.y - tower.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 6;
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;

        const isLevel2 = tower.level >= 2;
        const proj: Projectile = {
          x: tower.x,
          y: tower.y,
          vx,
          vy,
          damage: tower.damage,
          radius: isLevel2 ? 5 : 4,
          color: isLevel2 ? '#ff3333' : '#ffdd00',
          sourceTowerIndex: this.towers.indexOf(tower),
          targetEnemyId: closestEnemy.id,
          alive: true,
        };
        newProjectiles.push(proj);
        tower.lastFireTime = timestamp;
        tower.flashTimer = 100;
      }
    }

    if (this._projectiles.length + newProjectiles.length > MAX_PROJECTILES) {
      const excess = this._projectiles.length + newProjectiles.length - MAX_PROJECTILES;
      for (let i = 0; i < excess && i < this._projectiles.length; i++) {
        this._projectiles[i].alive = false;
      }
    }

    this._projectiles.push(...newProjectiles.filter(p => p.alive));

    const dtFactor = deltaMs / 16;
    for (const p of this._projectiles) {
      if (!p.alive) continue;
      p.x += p.vx * dtFactor;
      p.y += p.vy * dtFactor;
      if (p.x < -20 || p.x > 820 || p.y < -20 || p.y > 620) {
        p.alive = false;
      }
    }

    this.ripples = this.ripples.filter(r => {
      r.timer += deltaMs;
      return r.timer < r.duration;
    });

    return newProjectiles;
  }

  cleanupProjectiles(): void {
    this._projectiles = this._projectiles.filter(p => p.alive);
  }
}
