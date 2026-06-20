import {
  Tower,
  TowerType,
  GridPos,
  Position,
  Enemy,
  Projectile,
  RippleEffect,
  TOWER_CONFIGS,
  getUpgradeCost,
  getSellValue,
  gridToPixel,
  distance,
  EnemyType
} from '../types';
import { MapGrid } from '../map/mapGrid';
import { PathFinder } from '../ai/pathFinder';
import _ from 'lodash';

// 数据流向：接收 mapGrid 网格信息 + 用户操作 → 放置/升级/出售炮塔
//          → 炮塔数据给 renderer 绘制
//          → 炮塔位置给 decisionTree 分析权重
//          → 攻击逻辑生成 projectile 给 renderer

export type TowerAction = 'place' | 'upgrade' | 'sell';

export interface TowerActionResult {
  success: boolean;
  goldDelta: number;
  towerId?: number;
  message?: string;
}

export class TowerManager {
  private towers: Map<number, Tower> = new Map();
  private mapGrid: MapGrid;
  private pathFinder: PathFinder;
  private nextTowerId: number = 1;
  private nextProjectileId: number = 1;
  private nextRippleId: number = 1;
  private projectiles: Projectile[] = [];
  private ripples: RippleEffect[] = [];

  constructor(mapGrid: MapGrid, pathFinder: PathFinder) {
    this.mapGrid = mapGrid;
    this.pathFinder = pathFinder;
  }

  placeTower(type: TowerType, gridPos: GridPos, gold: number): TowerActionResult {
    const config = TOWER_CONFIGS[type];

    if (gold < config.cost) {
      return { success: false, goldDelta: 0, message: '金币不足' };
    }

    if (!this.mapGrid.canPlaceTower(gridPos.gx, gridPos.gy)) {
      return { success: false, goldDelta: 0, message: '无法在此放置' };
    }

    this.mapGrid.setObstacle(gridPos.gx, gridPos.gy, true);

    const start = this.mapGrid.getStart();
    const end = this.mapGrid.getEnd();
    if (!this.pathFinder.pathExists(start, end)) {
      this.mapGrid.setObstacle(gridPos.gx, gridPos.gy, false);
      return { success: false, goldDelta: 0, message: '放置将阻断路径' };
    }

    const tower: Tower = {
      id: this.nextTowerId++,
      type,
      gridPos: { ...gridPos },
      pixelPos: gridToPixel(gridPos),
      level: 1,
      cooldown: 0,
      targetId: null,
      totalCost: config.cost
    };

    this.towers.set(tower.id, tower);

    this.ripples.push({
      id: this.nextRippleId++,
      pos: gridToPixel(gridPos),
      radius: 0,
      maxRadius: config.range[0],
      alpha: 1.0
    });

    return {
      success: true,
      goldDelta: -config.cost,
      towerId: tower.id
    };
  }

  upgradeTower(towerId: number, gold: number): TowerActionResult {
    const tower = this.towers.get(towerId);
    if (!tower) {
      return { success: false, goldDelta: 0, message: '炮塔不存在' };
    }

    const cost = getUpgradeCost(tower);
    if (cost < 0) {
      return { success: false, goldDelta: 0, message: '已达最高等级' };
    }

    if (gold < cost) {
      return { success: false, goldDelta: 0, message: '金币不足' };
    }

    tower.level++;
    tower.totalCost += cost;

    return {
      success: true,
      goldDelta: -cost,
      towerId: tower.id
    };
  }

  sellTower(towerId: number): TowerActionResult {
    const tower = this.towers.get(towerId);
    if (!tower) {
      return { success: false, goldDelta: 0, message: '炮塔不存在' };
    }

    const refund = getSellValue(tower);

    this.mapGrid.setObstacle(tower.gridPos.gx, tower.gridPos.gy, false);
    this.towers.delete(towerId);

    return {
      success: true,
      goldDelta: refund
    };
  }

  getTower(towerId: number): Tower | undefined {
    return this.towers.get(towerId);
  }

  getTowerAt(gridPos: GridPos): Tower | undefined {
    for (const tower of this.towers.values()) {
      if (tower.gridPos.gx === gridPos.gx && tower.gridPos.gy === gridPos.gy) {
        return tower;
      }
    }
    return undefined;
  }

  getAllTowers(): Tower[] {
    return Array.from(this.towers.values());
  }

  getTowersList(): readonly Tower[] {
    return Array.from(this.towers.values());
  }

  update(dt: number, enemies: Enemy[]): {
    enemiesDamaged: Map<number, number>;
    projectilesFired: Projectile[];
    aoeImpacts: { pos: Position; radius: number; damage: number }[];
  } {
    const enemiesDamaged = new Map<number, number>();
    const projectilesFired: Projectile[] = [];
    const aoeImpacts: { pos: Position; radius: number; damage: number }[] = [];

    for (const proj of this.projectiles) {
      proj.progress += dt * 3.5;
      if (proj.progress >= 1.0) {
        const targetEnemy = enemies.find(e => e.id === proj.targetId && e.alive);
        const impactPos = targetEnemy ? { ...targetEnemy.pos } : { ...proj.toPos };

        if (proj.type === 'cannon' && proj.aoeRadius > 0) {
          for (const enemy of enemies) {
            if (!enemy.alive) continue;
            const d = distance(enemy.pos, impactPos);
            if (d <= proj.aoeRadius) {
              const falloff = 1 - (d / proj.aoeRadius) * 0.5;
              const currentDamage = enemiesDamaged.get(enemy.id) ?? 0;
              enemiesDamaged.set(enemy.id, currentDamage + proj.damage * falloff);
            }
          }
          aoeImpacts.push({ pos: impactPos, radius: proj.aoeRadius, damage: proj.damage });
        } else {
          if (targetEnemy) {
            const currentDamage = enemiesDamaged.get(targetEnemy.id) ?? 0;
            enemiesDamaged.set(targetEnemy.id, currentDamage + proj.damage);
          }
        }
      }
    }

    this.projectiles = this.projectiles.filter(p => p.progress < 1.0);

    for (const tower of this.towers.values()) {
      tower.cooldown = Math.max(0, tower.cooldown - dt);

      const config = TOWER_CONFIGS[tower.type];
      const range = config.range[tower.level - 1];
      const damage = config.damage[tower.level - 1];
      const attackSpeed = config.attackSpeed[tower.level - 1];

      let target: Enemy | null = null;
      if (tower.targetId !== null) {
        const existing = enemies.find(e => e.id === tower.targetId && e.alive);
        if (existing && distance(existing.pos, tower.pixelPos) <= range) {
          target = existing;
        }
      }

      if (!target) {
        let bestScore = -Infinity;
        for (const enemy of enemies) {
          if (!enemy.alive) continue;
          const d = distance(enemy.pos, tower.pixelPos);
          if (d <= range) {
            const score = enemy.pathIndex * 1000 - d;
            if (score > bestScore) {
              bestScore = score;
              target = enemy;
            }
          }
        }
        tower.targetId = target ? target.id : null;
      }

      if (target && tower.cooldown <= 0) {
        const projectile: Projectile = {
          id: this.nextProjectileId++,
          fromPos: { ...tower.pixelPos },
          toPos: { ...target.pos },
          progress: 0,
          damage,
          color: config.projectileColor,
          targetId: target.id,
          type: tower.type,
          aoeRadius: config.aoeRadius ?? 0
        };
        this.projectiles.push(projectile);
        projectilesFired.push(projectile);
        tower.cooldown = attackSpeed;
      }
    }

    for (const ripple of this.ripples) {
      const speed = ripple.maxRadius / 0.5;
      ripple.radius += speed * dt;
      ripple.alpha = Math.max(0, 1 - ripple.radius / ripple.maxRadius);
    }
    this.ripples = this.ripples.filter(r => r.alpha > 0);

    return { enemiesDamaged, projectilesFired, aoeImpacts };
  }

  getProjectiles(): Projectile[] {
    return [...this.projectiles];
  }

  getRipples(): RippleEffect[] {
    return [...this.ripples];
  }

  reset(): void {
    for (const tower of this.towers.values()) {
      this.mapGrid.setObstacle(tower.gridPos.gx, tower.gridPos.gy, false);
    }
    this.towers.clear();
    this.projectiles = [];
    this.ripples = [];
  }
}
