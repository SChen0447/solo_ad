import {
  Enemy,
  EnemyType,
  Position,
  Particle,
  generateWave,
  ENEMY_CONFIGS,
  distance,
  gridToPixel,
  Tower
} from '../types';
import { MapGrid } from '../map/mapGrid';
import { PathFinder } from '../ai/pathFinder';
import { DecisionTree } from '../ai/decisionTree';
import _ from 'lodash';

// 数据流向：接收 pathFinder 的路径点 → 计算敌人位置 + HP
//          → 敌人数据给 renderer 绘制
//          → HP变化/死亡事件通知主循环

interface SpawnQueue {
  type: EnemyType;
  remaining: number;
  timer: number;
  interval: number;
  path: Position[];
}

export class EnemyManager {
  private enemies: Map<number, Enemy> = new Map();
  private mapGrid: MapGrid;
  private pathFinder: PathFinder;
  private decisionTree: DecisionTree;
  private nextEnemyId: number = 1;
  private nextParticleId: number = 1;
  private particles: Particle[] = [];
  private spawnQueue: SpawnQueue[] = [];
  private currentWave: number = 0;
  private pathCache: Map<string, Position[]> = new Map();

  constructor(mapGrid: MapGrid, pathFinder: PathFinder, decisionTree: DecisionTree) {
    this.mapGrid = mapGrid;
    this.pathFinder = pathFinder;
    this.decisionTree = decisionTree;
  }

  getCurrentWave(): number {
    return this.currentWave;
  }

  startWave(waveNumber: number, towers: Tower[]): boolean {
    this.currentWave = waveNumber;
    this.spawnQueue = [];
    this.pathCache.clear();

    const waveConfig = generateWave(waveNumber);
    const start = this.mapGrid.getStart();
    const end = this.mapGrid.getEnd();

    const enemyTypes: EnemyType[] = ['normal', 'fast', 'heavy'];
    for (const etype of enemyTypes) {
      const weights = this.decisionTree.computeWeightMap(towers, etype);
      this.pathFinder.setWeightMap(weights);
      const path = this.pathFinder.findPath(start, end);
      if (path && path.length > 0) {
        this.pathCache.set(etype, path);
      }
    }

    if (this.pathCache.size === 0) {
      this.pathFinder.setWeightMap({});
      const defaultPath = this.pathFinder.findPath(start, end);
      if (defaultPath) {
        for (const etype of enemyTypes) {
          this.pathCache.set(etype, defaultPath);
        }
      } else {
        return false;
      }
    }

    for (const enemyCfg of waveConfig.enemies) {
      let path = this.pathCache.get(enemyCfg.type);
      if (!path) {
        path = this.pathCache.values().next().value!;
      }

      this.spawnQueue.push({
        type: enemyCfg.type,
        remaining: enemyCfg.count,
        timer: 0,
        interval: enemyCfg.interval,
        path: [...path]
      });
    }

    return true;
  }

  recalculatePathsForType(type: EnemyType, towers: Tower[]): void {
    const start = this.mapGrid.getStart();
    const end = this.mapGrid.getEnd();
    const weights = this.decisionTree.computeWeightMap(towers, type);
    this.pathFinder.setWeightMap(weights);
    const path = this.pathFinder.findPath(start, end);
    if (path) {
      this.pathCache.set(type, path);
    }
  }

  private spawnEnemy(type: EnemyType, path: Position[]): Enemy {
    const config = ENEMY_CONFIGS[type];
    const waveMultiplier = 1 + (this.currentWave - 1) * 0.12;

    const startPos = path.length > 0 ? { ...path[0] } : { x: 0, y: 0 };

    const enemy: Enemy = {
      id: this.nextEnemyId++,
      type,
      pos: startPos,
      hp: Math.floor(config.hp * waveMultiplier),
      maxHp: Math.floor(config.hp * waveMultiplier),
      speed: config.speed,
      armor: config.armor,
      reward: Math.floor(config.reward * (1 + (this.currentWave - 1) * 0.05)),
      damage: config.damage,
      pathIndex: 0,
      path: [...path],
      slowTimer: 0,
      alive: true
    };

    this.enemies.set(enemy.id, enemy);
    return enemy;
  }

  update(dt: number, _towers: Tower[]): {
    reachedEnd: Enemy[];
    killedEnemies: Enemy[];
  } {
    const reachedEnd: Enemy[] = [];
    const killedEnemies: Enemy[] = [];

    for (const sq of this.spawnQueue) {
      sq.timer -= dt;
      while (sq.remaining > 0 && sq.timer <= 0) {
        this.spawnEnemy(sq.type, sq.path);
        sq.remaining--;
        sq.timer += sq.interval;
      }
    }
    this.spawnQueue = this.spawnQueue.filter(sq => sq.remaining > 0);

    for (const enemy of this.enemies.values()) {
      if (!enemy.alive) continue;

      if (enemy.slowTimer > 0) {
        enemy.slowTimer -= dt;
      }
      const speedMult = enemy.slowTimer > 0 ? 0.6 : 1.0;
      let moveDist = enemy.speed * speedMult * dt;

      while (moveDist > 0 && enemy.pathIndex < enemy.path.length - 1) {
        const nextPoint = enemy.path[enemy.pathIndex + 1];
        const distToNext = distance(enemy.pos, nextPoint);

        if (distToNext <= moveDist) {
          enemy.pos = { ...nextPoint };
          moveDist -= distToNext;
          enemy.pathIndex++;
        } else {
          const dx = nextPoint.x - enemy.pos.x;
          const dy = nextPoint.y - enemy.pos.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          enemy.pos = {
            x: enemy.pos.x + (dx / len) * moveDist,
            y: enemy.pos.y + (dy / len) * moveDist
          };
          moveDist = 0;
        }
      }

      if (enemy.pathIndex >= enemy.path.length - 1) {
        enemy.alive = false;
        reachedEnd.push(enemy);
      }
    }

    for (const enemy of this.enemies.values()) {
      if (!enemy.alive) {
        this.spawnDeathParticles(enemy);
        killedEnemies.push(enemy);
      }
    }

    for (const killed of killedEnemies) {
      this.enemies.delete(killed.id);
    }
    for (const reached of reachedEnd) {
      this.enemies.delete(reached.id);
    }

    for (const p of this.particles) {
      p.life -= dt;
      p.pos.x += p.velocity.x * dt;
      p.pos.y += p.velocity.y * dt;
      p.velocity.x *= 0.96;
      p.velocity.y *= 0.96;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    return { reachedEnd, killedEnemies };
  }

  applyDamage(enemyId: number, damage: number): { killed: boolean; enemy: Enemy | null } {
    const enemy = this.enemies.get(enemyId);
    if (!enemy || !enemy.alive) return { killed: false, enemy: null };

    const effectiveDamage = Math.max(1, damage - enemy.armor);
    enemy.hp -= effectiveDamage;

    if (enemy.hp <= 0) {
      enemy.hp = 0;
      enemy.alive = false;
      return { killed: true, enemy };
    }

    return { killed: false, enemy };
  }

  private spawnDeathParticles(enemy: Enemy): void {
    const config = ENEMY_CONFIGS[enemy.type];
    const count = 12 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 80 + Math.random() * 60;
      this.particles.push({
        id: this.nextParticleId++,
        pos: { ...enemy.pos },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        color: config.color,
        size: 3 + Math.random() * 3
      });
    }
  }

  getEnemies(): Enemy[] {
    return Array.from(this.enemies.values());
  }

  getEnemiesList(): readonly Enemy[] {
    return Array.from(this.enemies.values());
  }

  getParticles(): Particle[] {
    return [...this.particles];
  }

  getActiveCount(): number {
    let count = 0;
    for (const sq of this.spawnQueue) count += sq.remaining;
    count += this.enemies.size;
    return count;
  }

  isWaveComplete(): boolean {
    if (this.spawnQueue.length > 0) return false;
    return this.enemies.size === 0;
  }

  reset(): void {
    this.enemies.clear();
    this.particles = [];
    this.spawnQueue = [];
    this.currentWave = 0;
    this.pathCache.clear();
    this.nextEnemyId = 1;
  }
}
