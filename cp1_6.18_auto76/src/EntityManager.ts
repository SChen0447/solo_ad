import type { TowerType } from './InputParser';

export interface Tower {
  id: string;
  type: TowerType;
  gridX: number;
  gridY: number;
  level: number;
  attackInterval: number;
  range: number;
  damage: number;
  lastAttackTime: number;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
  totalCost: number;
}

export type EnemyType = 'normal' | 'fast' | 'heavy';

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  baseSpeed: number;
  reward: number;
  pathIndex: number;
  slowTimer: number;
  slowFactor: number;
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  targetId: string;
  speed: number;
  damage: number;
  towerType: TowerType;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface TowerConfig {
  cost: number;
  attackInterval: number;
  range: number;
  damage: number;
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
}

export interface EnemyConfig {
  health: number;
  speed: number;
  reward: number;
  size: number;
  color: string;
}

const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  arrow: {
    cost: 50,
    attackInterval: 500,
    range: 120,
    damage: 15
  },
  cannon: {
    cost: 100,
    attackInterval: 1500,
    range: 100,
    damage: 40,
    splashRadius: 40
  },
  frost: {
    cost: 75,
    attackInterval: 800,
    range: 100,
    damage: 5,
    slowFactor: 0.5,
    slowDuration: 2000
  }
};

const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  normal: {
    health: 50,
    speed: 40,
    reward: 10,
    size: 12,
    color: '#ffffff'
  },
  fast: {
    health: 30,
    speed: 80,
    reward: 15,
    size: 10,
    color: '#ffeb3b'
  },
  heavy: {
    health: 150,
    speed: 25,
    reward: 25,
    size: 16,
    color: '#ff5252'
  }
};

let nextId = 0;
function generateId(prefix: string): string {
  nextId++;
  return `${prefix}_${nextId}_${Date.now().toString(36)}`;
}

export class EntityManager {
  towers: Map<string, Tower> = new Map();
  enemies: Map<string, Enemy> = new Map();
  bullets: Map<string, Bullet> = new Map();
  particles: Map<string, Particle> = new Map();

  getTowerConfig(type: TowerType, level: number = 1): TowerConfig {
    const base = TOWER_CONFIGS[type];
    const multiplier = 1 + (level - 1) * 0.3;
    return {
      cost: base.cost,
      attackInterval: base.attackInterval / (1 + (level - 1) * 0.2),
      range: base.range * (1 + (level - 1) * 0.1),
      damage: base.damage * multiplier,
      splashRadius: base.splashRadius ? base.splashRadius * (1 + (level - 1) * 0.15) : undefined,
      slowFactor: base.slowFactor,
      slowDuration: base.slowDuration ? base.slowDuration * (1 + (level - 1) * 0.2) : undefined
    };
  }

  getUpgradeCost(type: TowerType, currentLevel: number): number {
    const base = TOWER_CONFIGS[type].cost;
    return Math.floor(base * currentLevel * 0.8);
  }

  getSellValue(tower: Tower): number {
    return Math.floor(tower.totalCost * 0.6);
  }

  createTower(type: TowerType, gridX: number, gridY: number): Tower {
    const config = this.getTowerConfig(type, 1);
    const tower: Tower = {
      id: generateId('tower'),
      type,
      gridX,
      gridY,
      level: 1,
      attackInterval: config.attackInterval,
      range: config.range,
      damage: config.damage,
      lastAttackTime: 0,
      splashRadius: config.splashRadius,
      slowFactor: config.slowFactor,
      slowDuration: config.slowDuration,
      totalCost: config.cost
    };
    this.towers.set(tower.id, tower);
    return tower;
  }

  upgradeTower(tower: Tower): Tower {
    const newLevel = tower.level + 1;
    const config = this.getTowerConfig(tower.type, newLevel);
    const upgradeCost = this.getUpgradeCost(tower.type, tower.level);
    tower.level = newLevel;
    tower.attackInterval = config.attackInterval;
    tower.range = config.range;
    tower.damage = config.damage;
    tower.splashRadius = config.splashRadius;
    tower.slowFactor = config.slowFactor;
    tower.slowDuration = config.slowDuration;
    tower.totalCost += upgradeCost;
    return tower;
  }

  removeTower(towerId: string): boolean {
    return this.towers.delete(towerId);
  }

  getTowerAt(gridX: number, gridY: number): Tower | undefined {
    for (const tower of this.towers.values()) {
      if (tower.gridX === gridX && tower.gridY === gridY) {
        return tower;
      }
    }
    return undefined;
  }

  createEnemy(type: EnemyType, startX: number, startY: number): Enemy {
    const config = ENEMY_CONFIGS[type];
    const enemy: Enemy = {
      id: generateId('enemy'),
      type,
      x: startX,
      y: startY,
      health: config.health,
      maxHealth: config.health,
      speed: config.speed,
      baseSpeed: config.speed,
      reward: config.reward,
      pathIndex: 0,
      slowTimer: 0,
      slowFactor: 1
    };
    this.enemies.set(enemy.id, enemy);
    return enemy;
  }

  removeEnemy(enemyId: string): boolean {
    return this.enemies.delete(enemyId);
  }

  createBullet(
    x: number,
    y: number,
    targetId: string,
    damage: number,
    towerType: TowerType,
    splashRadius?: number,
    slowFactor?: number,
    slowDuration?: number
  ): Bullet {
    const bullet: Bullet = {
      id: generateId('bullet'),
      x,
      y,
      targetId,
      speed: 400,
      damage,
      towerType,
      splashRadius,
      slowFactor,
      slowDuration
    };
    this.bullets.set(bullet.id, bullet);
    return bullet;
  }

  removeBullet(bulletId: string): boolean {
    return this.bullets.delete(bulletId);
  }

  createExplosion(x: number, y: number, color: string, count: number = 15): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 50 + Math.random() * 100;
      const particle: Particle = {
        id: generateId('particle'),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        color,
        size: 3 + Math.random() * 3
      };
      this.particles.set(particle.id, particle);
    }
  }

  removeParticle(particleId: string): boolean {
    return this.particles.delete(particleId);
  }

  getEnemyConfig(type: EnemyType): EnemyConfig {
    return ENEMY_CONFIGS[type];
  }

  getTowerBaseConfig(type: TowerType): TowerConfig {
    return TOWER_CONFIGS[type];
  }

  clearAll(): void {
    this.towers.clear();
    this.enemies.clear();
    this.bullets.clear();
    this.particles.clear();
  }
}
