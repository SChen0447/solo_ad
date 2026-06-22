export enum TowerType {
  ARROW = 'arrow',
  CANNON = 'cannon',
  MAGIC = 'magic',
  COLLECTOR = 'collector'
}

export enum ProjectileType {
  ARROW = 'arrow',
  CANNON = 'cannon',
  MAGIC = 'magic'
}

export interface TowerLevelConfig {
  damage: number;
  fireRate: number;
  range: number;
  splashRadius?: number;
  slowDuration?: number;
  slowAmount?: number;
}

export const TOWER_CONFIGS: Record<TowerType, {
  baseCost: number;
  upgradeCosts: number[];
  levels: TowerLevelConfig[];
  color: string;
  name: string;
}> = {
  [TowerType.ARROW]: {
    baseCost: 30,
    upgradeCosts: [50, 120],
    levels: [
      { damage: 10, fireRate: 1, range: 200 },
      { damage: 14, fireRate: 1.2, range: 210 },
      { damage: 18, fireRate: 1.5, range: 220 }
    ],
    color: '#065F46',
    name: '箭塔'
  },
  [TowerType.CANNON]: {
    baseCost: 50,
    upgradeCosts: [50, 120],
    levels: [
      { damage: 15, fireRate: 1, range: 150, splashRadius: 40 },
      { damage: 22, fireRate: 1, range: 160, splashRadius: 55 },
      { damage: 30, fireRate: 1.1, range: 170, splashRadius: 70 }
    ],
    color: '#991B1B',
    name: '炮塔'
  },
  [TowerType.MAGIC]: {
    baseCost: 45,
    upgradeCosts: [50, 120],
    levels: [
      { damage: 12, fireRate: 1, range: 180, slowDuration: 300, slowAmount: 0.2 },
      { damage: 16, fireRate: 1.1, range: 190, slowDuration: 450, slowAmount: 0.25 },
      { damage: 22, fireRate: 1.2, range: 200, slowDuration: 600, slowAmount: 0.3 }
    ],
    color: '#5B21B6',
    name: '魔法塔'
  },
  [TowerType.COLLECTOR]: {
    baseCost: 40,
    upgradeCosts: [50, 120],
    levels: [
      { damage: 0, fireRate: 1 / 3, range: 150 },
      { damage: 0, fireRate: 1 / 2.5, range: 170 },
      { damage: 0, fireRate: 1 / 2, range: 200 }
    ],
    color: '#78350F',
    name: '采集站'
  }
};

export class Tower {
  id: number;
  type: TowerType;
  x: number;
  y: number;
  col: number;
  row: number;
  level: number;
  cooldown: number;
  target: Monster | null;
  recoilTime: number;
  flashTime: number;
  upgradeFlashTime: number;

  constructor(id: number, type: TowerType, x: number, y: number, col: number, row: number) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.col = col;
    this.row = row;
    this.level = 0;
    this.cooldown = 0;
    this.target = null;
    this.recoilTime = 0;
    this.flashTime = 0;
    this.upgradeFlashTime = 0;
  }

  getConfig(): TowerLevelConfig {
    return TOWER_CONFIGS[this.type].levels[this.level];
  }

  getBaseConfig() {
    return TOWER_CONFIGS[this.type];
  }

  canUpgrade(): boolean {
    return this.level < 2;
  }

  getUpgradeCost(): number {
    if (!this.canUpgrade()) return 0;
    return TOWER_CONFIGS[this.type].upgradeCosts[this.level];
  }

  upgrade(): void {
    if (this.canUpgrade()) {
      this.level++;
      this.upgradeFlashTime = 500;
    }
  }

  update(deltaTime: number): void {
    if (this.cooldown > 0) {
      this.cooldown -= deltaTime;
    }
    if (this.recoilTime > 0) {
      this.recoilTime -= deltaTime;
    }
    if (this.flashTime > 0) {
      this.flashTime -= deltaTime;
    }
    if (this.upgradeFlashTime > 0) {
      this.upgradeFlashTime -= deltaTime;
    }
  }

  canFire(): boolean {
    return this.cooldown <= 0;
  }

  fire(): void {
    const config = this.getConfig();
    this.cooldown = 1000 / config.fireRate;
    this.recoilTime = 100;
    this.flashTime = 100;
  }
}

export class Monster {
  id: number;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  baseSpeed: number;
  pathIndex: number;
  slowEndTime: number;
  slowAmount: number;
  radius: number;
  reachedEnd: boolean;
  damage: number;

  constructor(id: number, x: number, y: number, health: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.health = health;
    this.maxHealth = health;
    this.baseSpeed = 1.5;
    this.speed = this.baseSpeed;
    this.pathIndex = 0;
    this.slowEndTime = 0;
    this.slowAmount = 0;
    this.radius = 16;
    this.reachedEnd = false;
    this.damage = 10;
  }

  update(deltaTime: number, path: { x: number; y: number }[], currentTime: number): void {
    if (currentTime < this.slowEndTime) {
      this.speed = this.baseSpeed * (1 - this.slowAmount);
    } else {
      this.speed = this.baseSpeed;
      this.slowAmount = 0;
    }

    if (this.pathIndex >= path.length - 1) {
      this.reachedEnd = true;
      return;
    }

    const target = path[this.pathIndex + 1];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.speed) {
      this.x = target.x;
      this.y = target.y;
      this.pathIndex++;
    } else {
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;
    }
  }

  takeDamage(amount: number): void {
    this.health -= amount;
  }

  applySlow(duration: number, amount: number, currentTime: number): void {
    const newEndTime = currentTime + duration;
    if (newEndTime > this.slowEndTime || amount > this.slowAmount) {
      this.slowEndTime = newEndTime;
      this.slowAmount = Math.max(this.slowAmount, amount);
    }
  }

  isDead(): boolean {
    return this.health <= 0;
  }
}

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
  speed: number;
  damage: number;
  splashRadius?: number;
  slowDuration?: number;
  slowAmount?: number;
  arcProgress: number;
  arcHeight: number;
  dead: boolean;

  constructor(
    id: number,
    type: ProjectileType,
    x: number,
    y: number,
    targetId: number,
    targetX: number,
    targetY: number,
    damage: number,
    splashRadius?: number,
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
    this.speed = 8;
    this.damage = damage;
    this.splashRadius = splashRadius;
    this.slowDuration = slowDuration;
    this.slowAmount = slowAmount;
    this.arcProgress = 0;
    this.arcHeight = 40;
    this.dead = false;
  }

  update(deltaTime: number, monsters: Monster[]): void {
    const target = monsters.find((m) => m.id === this.targetId && !m.isDead());

    if (this.type === ProjectileType.ARROW) {
      const tx = target ? target.x : this.targetX;
      const ty = target ? target.y : this.targetY;
      const dx = tx - this.x;
      const dy = ty - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.speed) {
        this.x = tx;
        this.y = ty;
        this.dead = true;
      } else {
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
      }
    } else if (this.type === ProjectileType.CANNON) {
      const totalDist = Math.sqrt(
        Math.pow(this.targetX - this.startX, 2) + Math.pow(this.targetY - this.startY, 2)
      );
      const currentDist = Math.sqrt(
        Math.pow(this.x - this.startX, 2) + Math.pow(this.y - this.startY, 2)
      );

      if (totalDist > 0) {
        this.arcProgress = currentDist / totalDist;
      }

      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.speed) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.dead = true;
      } else {
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
      }
    } else if (this.type === ProjectileType.MAGIC) {
      if (target) {
        this.targetX = target.x;
        this.targetY = target.y;
      }

      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.speed) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.dead = true;
      } else {
        const angle = Math.atan2(dy, dx);
        const curveOffset = Math.sin(this.arcProgress * Math.PI) * 30;
        const perpAngle = angle + Math.PI / 2;

        this.x += Math.cos(angle) * this.speed + Math.cos(perpAngle) * curveOffset * 0.1;
        this.y += Math.sin(angle) * this.speed + Math.sin(perpAngle) * curveOffset * 0.1;
        this.arcProgress += 0.05;
      }
    }
  }

  getY(): number {
    if (this.type === ProjectileType.CANNON) {
      const arcOffset = Math.sin(this.arcProgress * Math.PI) * this.arcHeight;
      return this.y - arcOffset;
    }
    return this.y;
  }
}

export class EntityManager {
  towers: Tower[];
  monsters: Monster[];
  projectiles: Projectile[];
  private nextTowerId: number;
  private nextMonsterId: number;
  private nextProjectileId: number;

  constructor() {
    this.towers = [];
    this.monsters = [];
    this.projectiles = [];
    this.nextTowerId = 1;
    this.nextMonsterId = 1;
    this.nextProjectileId = 1;
  }

  addTower(type: TowerType, x: number, y: number, col: number, row: number): Tower {
    const tower = new Tower(this.nextTowerId++, type, x, y, col, row);
    this.towers.push(tower);
    return tower;
  }

  removeTower(id: number): boolean {
    const index = this.towers.findIndex((t) => t.id === id);
    if (index !== -1) {
      this.towers.splice(index, 1);
      return true;
    }
    return false;
  }

  getTowerAt(col: number, row: number): Tower | undefined {
    return this.towers.find((t) => t.col === col && t.row === row);
  }

  addMonster(x: number, y: number, health: number): Monster {
    const monster = new Monster(this.nextMonsterId++, x, y, health);
    this.monsters.push(monster);
    return monster;
  }

  removeDeadMonsters(): Monster[] {
    const dead = this.monsters.filter((m) => m.isDead());
    this.monsters = this.monsters.filter((m) => !m.isDead() && !m.reachedEnd);
    return dead;
  }

  addProjectile(
    type: ProjectileType,
    x: number,
    y: number,
    targetId: number,
    targetX: number,
    targetY: number,
    damage: number,
    splashRadius?: number,
    slowDuration?: number,
    slowAmount?: number
  ): Projectile {
    const projectile = new Projectile(
      this.nextProjectileId++,
      type,
      x,
      y,
      targetId,
      targetX,
      targetY,
      damage,
      splashRadius,
      slowDuration,
      slowAmount
    );
    this.projectiles.push(projectile);
    return projectile;
  }

  removeDeadProjectiles(): void {
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  updateTowers(deltaTime: number): void {
    for (const tower of this.towers) {
      tower.update(deltaTime);
    }
  }

  updateMonsters(deltaTime: number, path: { x: number; y: number }[], currentTime: number): void {
    for (const monster of this.monsters) {
      monster.update(deltaTime, path, currentTime);
    }
  }

  updateProjectiles(deltaTime: number): void {
    for (const projectile of this.projectiles) {
      projectile.update(deltaTime, this.monsters);
    }
  }

  clear(): void {
    this.towers = [];
    this.monsters = [];
    this.projectiles = [];
  }
}
