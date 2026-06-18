import {
  Tower as TowerType,
  TowerConfig,
  Position,
  Enemy,
  Projectile,
  TOWER_CONFIGS,
  TowerType as TowerTypeEnum,
} from './types';

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

export class Tower {
  private tower: TowerType;
  private config: TowerConfig;

  constructor(
    type: TowerTypeEnum,
    gridX: number,
    gridY: number,
    position: Position,
    level: number = 1
  ) {
    this.config = TOWER_CONFIGS[type];

    const damageMultiplier = 1 + 0.2 * (level - 1);
    const rangeMultiplier = 1 + 0.05 * (level - 1);

    this.tower = {
      id: generateId(),
      type,
      position: { ...position },
      gridX,
      gridY,
      level,
      damage: Math.floor(this.config.damage * damageMultiplier),
      range: Math.floor(this.config.range * rangeMultiplier),
      fireRate: this.config.fireRate,
      lastFireTime: 0,
      targetId: null,
      angle: 0,
    };
  }

  public getId(): string {
    return this.tower.id;
  }

  public getTowerData(): TowerType {
    return { ...this.tower };
  }

  public getType(): TowerTypeEnum {
    return this.tower.type;
  }

  public getPosition(): Position {
    return { ...this.tower.position };
  }

  public getGridX(): number {
    return this.tower.gridX;
  }

  public getGridY(): number {
    return this.tower.gridY;
  }

  public getLevel(): number {
    return this.tower.level;
  }

  public getDamage(): number {
    return this.tower.damage;
  }

  public getRange(): number {
    return this.tower.range;
  }

  public getFireRate(): number {
    return this.tower.fireRate;
  }

  public getConfig(): TowerConfig {
    return { ...this.config };
  }

  public upgrade(): void {
    if (this.tower.level >= 3) return;

    this.tower.level++;
    const damageMultiplier = 1 + 0.2 * (this.tower.level - 1);
    const rangeMultiplier = 1 + 0.05 * (this.tower.level - 1);

    this.tower.damage = Math.floor(this.config.damage * damageMultiplier);
    this.tower.range = Math.floor(this.config.range * rangeMultiplier);
  }

  public findTarget(enemies: Enemy[]): Enemy | null {
    let closestEnemy: Enemy | null = null;
    let closestDistance = Infinity;

    for (const enemy of enemies) {
      if (enemy.health <= 0) continue;

      const dx = enemy.position.x - this.tower.position.x;
      const dy = enemy.position.y - this.tower.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= this.tower.range && distance < closestDistance) {
        closestDistance = distance;
        closestEnemy = enemy;
      }
    }

    return closestEnemy;
  }

  public canFire(currentTime: number): boolean {
    return currentTime - this.tower.lastFireTime >= this.tower.fireRate;
  }

  public fire(target: Enemy, currentTime: number): Projectile | null {
    if (!this.canFire(currentTime)) return null;

    this.tower.lastFireTime = currentTime;

    const dx = target.position.x - this.tower.position.x;
    const dy = target.position.y - this.tower.position.y;
    this.tower.angle = Math.atan2(dy, dx);

    this.tower.targetId = target.id;

    let projectileSpeed = 12;
    if (this.tower.type === 'laser') projectileSpeed = 20;
    if (this.tower.type === 'rocket') projectileSpeed = 8;
    if (this.tower.type === 'electromagnetic') projectileSpeed = 15;

    return {
      id: generateId(),
      type: this.config.projectileType,
      position: { ...this.tower.position },
      targetId: target.id,
      targetPosition: { ...target.position },
      damage: this.tower.damage,
      speed: projectileSpeed,
      color: this.config.color,
      isActive: true,
    };
  }

  public setAngle(angle: number): void {
    this.tower.angle = angle;
  }

  public getAngle(): number {
    return this.tower.angle;
  }

  public getUpgradeCost(): number {
    return Math.floor(this.config.cost * 0.6 * this.tower.level);
  }

  public getSellValue(): number {
    return Math.floor(this.config.cost * 0.5 * this.tower.level);
  }
}
