import { Grid, TileType } from './map';
import {
  EntityManager,
  Tower,
  TowerType,
  ProjectileType,
  Monster,
  Projectile,
  TOWER_CONFIGS
} from './entity';

export interface GameState {
  gold: number;
  baseHealth: number;
  maxBaseHealth: number;
  wave: number;
  isPlaying: boolean;
  isPaused: boolean;
  gameOver: boolean;
  goldBounceTime: number;
  goldBounceValue: number;
}

export class Game {
  grid: Grid;
  entityManager: EntityManager;
  state: GameState;
  private lastTime: number;
  private waveTimer: number;
  private waveDelay: number;
  private monstersToSpawn: number;
  private spawnTimer: number;
  private spawnInterval: number;
  private collectorTimers: Map<number, number>;
  onGoldChange?: (amount: number) => void;
  onBaseHealthChange?: (health: number) => void;
  onWaveChange?: (wave: number) => void;
  onGameOver?: () => void;

  constructor() {
    this.grid = new Grid(20, 20, 40);
    this.entityManager = new EntityManager();
    this.state = {
      gold: 200,
      baseHealth: 100,
      maxBaseHealth: 100,
      wave: 0,
      isPlaying: true,
      isPaused: false,
      gameOver: false,
      goldBounceTime: 0,
      goldBounceValue: 0
    };
    this.lastTime = 0;
    this.waveTimer = 3000;
    this.waveDelay = 5000;
    this.monstersToSpawn = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 800;
    this.collectorTimers = new Map();
  }

  start(): void {
    this.state.isPlaying = true;
    this.lastTime = performance.now();
  }

  pause(): void {
    this.state.isPaused = true;
  }

  resume(): void {
    this.state.isPaused = false;
    this.lastTime = performance.now();
  }

  reset(): void {
    this.entityManager.clear();
    this.state = {
      gold: 200,
      baseHealth: 100,
      maxBaseHealth: 100,
      wave: 0,
      isPlaying: true,
      isPaused: false,
      gameOver: false,
      goldBounceTime: 0,
      goldBounceValue: 0
    };
    this.waveTimer = 3000;
    this.monstersToSpawn = 0;
    this.collectorTimers.clear();
    this.grid = new Grid(20, 20, 40);
  }

  update(currentTime: number): void {
    if (this.state.isPaused || this.state.gameOver) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    if (deltaTime > 100) {
      return;
    }

    this.grid.updateResourcePulses(deltaTime);

    if (this.state.goldBounceTime > 0) {
      this.state.goldBounceTime -= deltaTime;
    }

    this.updateWave(deltaTime);
    this.entityManager.updateTowers(deltaTime);
    this.entityManager.updateMonsters(deltaTime, this.grid.path, currentTime);
    this.entityManager.updateProjectiles(deltaTime);
    this.updateTowerAI(currentTime);
    this.updateCollectors(deltaTime);
    this.checkCollisions(currentTime);
    this.checkReachedBase();
    this.entityManager.removeDeadProjectiles();
    this.entityManager.removeDeadMonsters();
  }

  private updateWave(deltaTime: number): void {
    if (this.monstersToSpawn > 0) {
      this.spawnTimer -= deltaTime;
      if (this.spawnTimer <= 0) {
        this.spawnMonster();
        this.monstersToSpawn--;
        this.spawnTimer = this.spawnInterval;
      }
      return;
    }

    if (this.entityManager.monsters.length === 0) {
      this.waveTimer -= deltaTime;
      if (this.waveTimer <= 0) {
        this.startNextWave();
      }
    }
  }

  private startNextWave(): void {
    this.state.wave++;
    this.monstersToSpawn = 3 + (this.state.wave - 1) * 2;
    this.spawnTimer = 0;
    this.waveTimer = this.waveDelay;

    if (this.onWaveChange) {
      this.onWaveChange(this.state.wave);
    }
  }

  private spawnMonster(): void {
    const startPos = this.grid.getPathStart();
    const health = 20 + (this.state.wave - 1) * 5;
    this.entityManager.addMonster(startPos.x, startPos.y, health);
  }

  private updateTowerAI(currentTime: number): void {
    for (const tower of this.entityManager.towers) {
      if (tower.type === TowerType.COLLECTOR) continue;
      if (!tower.canFire()) continue;

      const config = tower.getConfig();
      let target = this.findTarget(tower, config.range);

      if (target) {
        tower.target = target;
        this.fireProjectile(tower, target, currentTime);
        tower.fire();
      } else {
        tower.target = null;
      }
    }
  }

  private findTarget(tower: Tower, range: number): Monster | null {
    let closestMonster: Monster | null = null;
    let closestProgress = -1;

    for (const monster of this.entityManager.monsters) {
      if (monster.isDead()) continue;

      const dx = monster.x - tower.x;
      const dy = monster.y - tower.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= range) {
        if (monster.pathIndex > closestProgress) {
          closestProgress = monster.pathIndex;
          closestMonster = monster;
        }
      }
    }

    return closestMonster;
  }

  private fireProjectile(tower: Tower, target: Monster, currentTime: number): void {
    const config = tower.getConfig();
    let projectileType: ProjectileType;

    switch (tower.type) {
      case TowerType.ARROW:
        projectileType = ProjectileType.ARROW;
        break;
      case TowerType.CANNON:
        projectileType = ProjectileType.CANNON;
        break;
      case TowerType.MAGIC:
        projectileType = ProjectileType.MAGIC;
        break;
      default:
        return;
    }

    this.entityManager.addProjectile(
      projectileType,
      tower.x,
      tower.y - 20,
      target.id,
      target.x,
      target.y,
      config.damage,
      config.splashRadius,
      config.slowDuration,
      config.slowAmount
    );
  }

  private updateCollectors(deltaTime: number): void {
    for (const tower of this.entityManager.towers) {
      if (tower.type !== TowerType.COLLECTOR) continue;

      const timerId = tower.id;
      let timer = this.collectorTimers.get(timerId) || 0;
      timer -= deltaTime;

      if (timer <= 0) {
        const config = tower.getConfig();
        const resource = this.findNearestResource(tower, config.range);

        if (resource) {
          this.collectResource(tower, resource);
          timer = 1000 / config.fireRate;
        } else {
          timer = 1000;
        }
      }

      this.collectorTimers.set(timerId, timer);
    }
  }

  private findNearestResource(
    tower: Tower,
    range: number
  ): { col: number; row: number } | null {
    let nearest: { col: number; row: number } | null = null;
    let nearestDist = Infinity;

    for (const pos of this.grid.resourcePoints) {
      const tile = this.grid.tiles[pos.row][pos.col];
      if (tile.type !== TileType.RESOURCE || tile.resourceDepleted) continue;

      const rx = pos.col * this.grid.tileSize + this.grid.tileSize / 2;
      const ry = pos.row * this.grid.tileSize + this.grid.tileSize / 2;
      const dx = rx - tower.x;
      const dy = ry - tower.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= range && dist < nearestDist) {
        nearestDist = dist;
        nearest = pos;
      }
    }

    return nearest;
  }

  private collectResource(tower: Tower, resource: { col: number; row: number }): void {
    const tile = this.grid.tiles[resource.row][resource.col];
    if (tile.resourceDepleted) return;

    const goldAmount = 5 + tower.level * 3;
    this.addGold(goldAmount);

    if (tile.resourceAmount !== undefined) {
      tile.resourceAmount -= 5;
      if (tile.resourceAmount <= 0) {
        tile.resourceDepleted = true;
      }
    }
  }

  private checkCollisions(currentTime: number): void {
    for (const projectile of this.entityManager.projectiles) {
      if (!projectile.dead) continue;

      if (projectile.splashRadius) {
        this.applySplashDamage(projectile);
      } else {
        const target = this.entityManager.monsters.find(
          (m) => m.id === projectile.targetId
        );
        if (target && !target.isDead()) {
          target.takeDamage(projectile.damage);
        }
      }

      if (projectile.slowDuration && projectile.slowAmount) {
        const target = this.entityManager.monsters.find(
          (m) => m.id === projectile.targetId
        );
        if (target && !target.isDead()) {
          target.applySlow(projectile.slowDuration, projectile.slowAmount, currentTime);
        }
      }
    }
  }

  private applySplashDamage(projectile: Projectile): void {
    const splashRadius = projectile.splashRadius || 40;

    for (const monster of this.entityManager.monsters) {
      if (monster.isDead()) continue;

      const dx = monster.x - projectile.x;
      const dy = monster.y - projectile.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= splashRadius) {
        const damage =
          monster.id === projectile.targetId
            ? projectile.damage
            : projectile.damage * 0.5;
        monster.takeDamage(damage);
      }
    }
  }

  private checkReachedBase(): void {
    for (const monster of this.entityManager.monsters) {
      if (monster.reachedEnd) {
        this.state.baseHealth -= monster.damage;
        if (this.onBaseHealthChange) {
          this.onBaseHealthChange(this.state.baseHealth);
        }

        if (this.state.baseHealth <= 0) {
          this.state.baseHealth = 0;
          this.state.gameOver = true;
          if (this.onGameOver) {
            this.onGameOver();
          }
        }
      }
    }

    this.entityManager.monsters = this.entityManager.monsters.filter(
      (m) => !m.reachedEnd
    );
  }

  buildTower(type: TowerType, col: number, row: number): boolean {
    if (!this.grid.isBuildable(col, row)) return false;
    if (this.entityManager.getTowerAt(col, row)) return false;

    const cost = TOWER_CONFIGS[type].baseCost;
    if (this.state.gold < cost) return false;

    this.state.gold -= cost;

    const x = col * this.grid.tileSize + this.grid.tileSize / 2;
    const y = row * this.grid.tileSize + this.grid.tileSize / 2;
    this.entityManager.addTower(type, x, y, col, row);

    return true;
  }

  upgradeTower(towerId: number): boolean {
    const tower = this.entityManager.towers.find((t) => t.id === towerId);
    if (!tower || !tower.canUpgrade()) return false;

    const cost = tower.getUpgradeCost();
    if (this.state.gold < cost) return false;

    this.state.gold -= cost;
    tower.upgrade();

    return true;
  }

  addGold(amount: number): void {
    this.state.gold += amount;
    this.state.goldBounceTime = 300;
    this.state.goldBounceValue = amount;

    if (this.onGoldChange) {
      this.onGoldChange(amount);
    }
  }

  getTowerAt(col: number, row: number): Tower | undefined {
    return this.entityManager.getTowerAt(col, row);
  }
}
