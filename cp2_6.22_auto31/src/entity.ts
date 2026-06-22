import { Grid } from './map';

export type TowerType = 'arrow' | 'cannon' | 'magic' | 'collector';
export type TowerState = 'idle' | 'firing' | 'collecting' | 'upgrading';

export interface TowerStats {
  damage: number;
  range: number;
  fireRate: number;
  splashRange?: number;
  slowDuration?: number;
  slowAmount?: number;
}

export const TOWER_BASE_STATS: Record<TowerType, TowerStats> = {
  arrow: { damage: 10, range: 200, fireRate: 1.0 },
  cannon: { damage: 15, range: 150, fireRate: 1.0, splashRange: 40 },
  magic: { damage: 12, range: 180, fireRate: 1.0, slowDuration: 0.3, slowAmount: 0.2 },
  collector: { damage: 0, range: 200, fireRate: 1.0 / 3.0 }
};

export const TOWER_UPGRADE_COSTS = [50, 120];

export const TOWER_COLORS: Record<TowerType, string> = {
  arrow: '#065F46',
  cannon: '#991B1B',
  magic: '#5B21B6',
  collector: '#78350F'
};

export const TOWER_NAMES: Record<TowerType, string> = {
  arrow: '箭塔',
  cannon: '炮塔',
  magic: '魔法塔',
  collector: '采集站'
};

export const PROJECTILE_COLORS: Record<string, string> = {
  arrow: '#22C55E',
  cannon: '#EF4444',
  magic: '#A855F7'
};

export class Tower {
  id: number;
  type: TowerType;
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  level: number = 1;
  state: TowerState = 'idle';
  stats: TowerStats;
  fireCooldown: number = 0;
  collectCooldown: number = 0;
  flashTimer: number = 0;
  recoilOffset: number = 0;
  upgradeFlashTimer: number = 0;
  particleAngle: number = 0;
  target: Monster | null = null;

  constructor(id: number, type: TowerType, gridX: number, gridY: number, grid: Grid) {
    this.id = id;
    this.type = type;
    this.gridX = gridX;
    this.gridY = gridY;
    const center = grid.gridToWorldCenter(gridX, gridY);
    this.x = center.x;
    this.y = center.y;
    this.stats = { ...TOWER_BASE_STATS[type] };
  }

  getStatsForLevel(level: number): TowerStats {
    const base = TOWER_BASE_STATS[this.type];
    if (this.type === 'arrow') {
      if (level === 2) return { ...base, damage: 14, fireRate: 1.2 };
      if (level === 3) return { ...base, damage: 18, fireRate: 1.5 };
    } else if (this.type === 'cannon') {
      if (level === 2) return { ...base, damage: 22, splashRange: 55 };
      if (level === 3) return { ...base, damage: 30, splashRange: 70 };
    } else if (this.type === 'magic') {
      if (level === 2) return { ...base, damage: 18, slowDuration: 0.5 };
      if (level === 3) return { ...base, damage: 25, slowDuration: 0.8, slowAmount: 0.3 };
    } else if (this.type === 'collector') {
      return { ...base };
    }
    return base;
  }

  upgrade(): void {
    if (this.level >= 3) return;
    this.level++;
    this.stats = this.getStatsForLevel(this.level);
    this.upgradeFlashTimer = 0.5;
  }

  canUpgrade(): boolean {
    return this.level < 3;
  }

  getUpgradeCost(): number {
    if (this.level >= 3) return 0;
    return TOWER_UPGRADE_COSTS[this.level - 1];
  }

  update(dt: number): void {
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.collectCooldown > 0) this.collectCooldown -= dt;
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.recoilOffset = Math.max(0, this.recoilOffset - dt * 40);
    }
    if (this.upgradeFlashTimer > 0) this.upgradeFlashTimer -= dt;
    if (this.type === 'magic') {
      this.particleAngle += dt * Math.PI * 2;
    }
  }

  canFire(): boolean {
    return this.type !== 'collector' && this.fireCooldown <= 0;
  }

  startFire(): void {
    this.fireCooldown = 1.0 / this.stats.fireRate;
    this.flashTimer = 0.1;
    this.recoilOffset = 4;
    this.state = 'firing';
  }

  canCollect(): boolean {
    return this.type === 'collector' && this.collectCooldown <= 0;
  }

  startCollect(): void {
    this.collectCooldown = 3.0;
    this.state = 'collecting';
  }
}

export class Monster {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  baseSpeed: number = 1.5;
  speed: number = 1.5;
  pathIndex: number = 0;
  slowTimer: number = 0;
  slowAmount: number = 0;
  alive: boolean = true;
  reachedBase: boolean = false;

  constructor(id: number, x: number, y: number, hp: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.hp = hp;
    this.maxHp = hp;
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  applySlow(duration: number, amount: number): void {
    this.slowTimer = Math.max(this.slowTimer, duration);
    this.slowAmount = Math.max(this.slowAmount, amount);
  }

  update(dt: number, grid: Grid): void {
    if (!this.alive) return;

    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      this.speed = this.baseSpeed * (1 - this.slowAmount);
      if (this.slowTimer <= 0) {
        this.slowAmount = 0;
        this.speed = this.baseSpeed;
      }
    }

    const targetPoint = grid.getPathPoint(this.pathIndex + 1);
    if (!targetPoint) {
      this.reachedBase = true;
      this.alive = false;
      return;
    }

    const dx = targetPoint.x - this.x;
    const dy = targetPoint.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < this.speed * 60 * dt) {
      this.x = targetPoint.x;
      this.y = targetPoint.y;
      this.pathIndex++;
    } else {
      this.x += (dx / dist) * this.speed * 60 * dt;
      this.y += (dy / dist) * this.speed * 60 * dt;
    }
  }
}

export type ProjectileType = 'arrow' | 'cannon' | 'magic';

export class Projectile {
  id: number;
  type: ProjectileType;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetId: number;
  targetX: number;
  targetY: number;
  damage: number;
  speed: number = 8;
  alive: boolean = true;
  splashRange?: number;
  slowDuration?: number;
  slowAmount?: number;
  progress: number = 0;
  totalDist: number;

  constructor(
    id: number,
    type: ProjectileType,
    x: number,
    y: number,
    targetId: number,
    targetX: number,
    targetY: number,
    damage: number,
    splashRange?: number,
    slowDuration?: number,
    slowAmount?: number
  ) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;
    this.targetId = targetId;
    this.targetX = targetX;
    this.targetY = targetY;
    this.damage = damage;
    this.splashRange = splashRange;
    this.slowDuration = slowDuration;
    this.slowAmount = slowAmount;
    this.totalDist = Math.hypot(targetX - x, targetY - y);
  }

  update(dt: number, monsters: Map<number, Monster>): void {
    if (!this.alive) return;

    if (this.type === 'magic') {
      const target = monsters.get(this.targetId);
      if (target && target.alive) {
        this.targetX = target.x;
        this.targetY = target.y;
      }
    }

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < this.speed * 60 * dt) {
      this.x = this.targetX;
      this.y = this.targetY;
      this.alive = false;
      return;
    }

    this.x += (dx / dist) * this.speed * 60 * dt;
    this.y += (dy / dist) * this.speed * 60 * dt;
    this.progress = 1 - (dist / this.totalDist);

    if (this.type === 'cannon') {
      const arcHeight = 40;
      const baseProgress = this.progress;
      const arc = Math.sin(baseProgress * Math.PI) * arcHeight;
      this.y = this.startY + (this.targetY - this.startY) * baseProgress - arc;
    }
  }

  getArcY(): number {
    if (this.type !== 'cannon') return this.y;
    const arcHeight = 40;
    const baseProgress = this.progress;
    return Math.sin(baseProgress * Math.PI) * arcHeight;
  }
}

export class EntityManager {
  towers: Map<number, Tower> = new Map();
  monsters: Map<number, Monster> = new Map();
  projectiles: Map<number, Projectile> = new Map();
  private nextTowerId = 1;
  private nextMonsterId = 1;
  private nextProjectileId = 1;

  addTower(type: TowerType, gridX: number, gridY: number, grid: Grid): Tower | null {
    if (!grid.isBuildable(gridX, gridY)) return null;
    for (const tower of this.towers.values()) {
      if (tower.gridX === gridX && tower.gridY === gridY) return null;
    }
    const tower = new Tower(this.nextTowerId++, type, gridX, gridY, grid);
    this.towers.set(tower.id, tower);
    return tower;
  }

  getTowerAt(gridX: number, gridY: number): Tower | null {
    for (const tower of this.towers.values()) {
      if (tower.gridX === gridX && tower.gridY === gridY) return tower;
    }
    return null;
  }

  addMonster(x: number, y: number, hp: number): Monster {
    const monster = new Monster(this.nextMonsterId++, x, y, hp);
    this.monsters.set(monster.id, monster);
    return monster;
  }

  addProjectile(
    type: ProjectileType,
    x: number,
    y: number,
    targetId: number,
    targetX: number,
    targetY: number,
    damage: number,
    splashRange?: number,
    slowDuration?: number,
    slowAmount?: number
  ): Projectile {
    const p = new Projectile(
      this.nextProjectileId++,
      type,
      x,
      y,
      targetId,
      targetX,
      targetY,
      damage,
      splashRange,
      slowDuration,
      slowAmount
    );
    this.projectiles.set(p.id, p);
    return p;
  }

  removeMonster(id: number): void {
    this.monsters.delete(id);
  }

  removeProjectile(id: number): void {
    this.projectiles.delete(id);
  }

  updateTowers(dt: number): void {
    for (const tower of this.towers.values()) {
      tower.update(dt);
    }
  }

  updateMonsters(dt: number, grid: Grid): void {
    for (const monster of this.monsters.values()) {
      monster.update(dt, grid);
    }
  }

  updateProjectiles(dt: number): void {
    for (const p of this.projectiles.values()) {
      p.update(dt, this.monsters);
    }
  }

  cleanup(): void {
    for (const monster of this.monsters.values()) {
      if (!monster.alive) this.monsters.delete(monster.id);
    }
    for (const p of this.projectiles.values()) {
      if (!p.alive) this.projectiles.delete(p.id);
    }
  }

  clear(): void {
    this.towers.clear();
    this.monsters.clear();
    this.projectiles.clear();
    this.nextTowerId = 1;
    this.nextMonsterId = 1;
    this.nextProjectileId = 1;
  }
}
