import { Grid, MAP_WIDTH, MAP_HEIGHT } from './map';
import {
  EntityManager,
  Tower,
  TowerType,
  Monster,
  Projectile,
  ProjectileType,
  TOWER_UPGRADE_COSTS,
  PROJECTILE_COLORS
} from './entity';

export interface GameCallbacks {
  onGoldChange?: (amount: number) => void;
  onBaseDamage?: (damage: number) => void;
  onWaveComplete?: (wave: number) => void;
}

export class Game {
  grid: Grid;
  entities: EntityManager;
  callbacks: GameCallbacks;

  running: boolean = false;
  paused: boolean = false;
  gameTime: number = 0;
  lastFrameTime: number = 0;
  frameCount: number = 0;
  fps: number = 60;
  fpsTimer: number = 0;

  gold: number = 100;
  baseHp: number = 100;
  maxBaseHp: number = 100;
  wave: number = 0;
  waveTimer: number = 0;
  waveSpawnCount: number = 0;
  waveTotalSpawn: number = 0;
  waveSpawnInterval: number = 0;
  waveSpawnTimer: number = 0;
  waveActive: boolean = false;
  waveInProgress: boolean = false;

  projectilesToSpawn: Projectile[] = [];

  constructor(callbacks: GameCallbacks = {}) {
    this.grid = new Grid();
    this.entities = new EntityManager();
    this.callbacks = callbacks;
  }

  start(): void {
    this.running = true;
    this.paused = false;
    this.lastFrameTime = performance.now();
    this.startWave();
    this.loop();
  }

  stop(): void {
    this.running = false;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.lastFrameTime = performance.now();
  }

  reset(): void {
    this.entities.clear();
    this.gold = 100;
    this.baseHp = 100;
    this.maxBaseHp = 100;
    this.wave = 0;
    this.waveTimer = 0;
    this.waveActive = false;
    this.waveInProgress = false;
    this.gameTime = 0;
    this.grid = new Grid();
  }

  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    let dt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    if (dt > 0.1) dt = 0.1;

    if (!this.paused) {
      this.update(dt);
    }

    this.frameCount++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    requestAnimationFrame(this.loop);
  };

  update(dt: number): void {
    this.gameTime += dt;

    this.updateWave(dt);

    this.entities.updateTowers(dt);
    this.entities.updateMonsters(dt, this.grid);
    this.entities.updateProjectiles(dt);
    this.entities.updateParticles(dt);

    this.processTowerActions();
    this.processProjectileCollisions();

    this.processBaseReached();

    this.entities.cleanup();
  }

  private updateWave(dt: number): void {
    if (!this.waveInProgress) {
      this.waveTimer += dt;
      if (this.waveTimer >= 5) {
        this.waveTimer = 0;
        this.startWave();
      }
    } else {
      if (this.waveSpawnCount < this.waveTotalSpawn) {
        this.waveSpawnTimer += dt;
        if (this.waveSpawnTimer >= this.waveSpawnInterval) {
          this.waveSpawnTimer = 0;
          this.spawnMonster();
          this.waveSpawnCount++;
        }
      } else {
        if (this.entities.monsters.size === 0) {
          this.waveInProgress = false;
          this.waveTimer = 0;
          if (this.callbacks.onWaveComplete) {
            this.callbacks.onWaveComplete(this.wave);
          }
        }
      }
    }
  }

  private startWave(): void {
    this.wave++;
    this.waveInProgress = true;
    this.waveSpawnCount = 0;
    this.waveTotalSpawn = 3 + (this.wave - 1) * 2;
    this.waveSpawnInterval = 1.0;
    this.waveSpawnTimer = 0;
    this.waveActive = true;
  }

  private getWaveMonsterHp(): number {
    return 20 + (this.wave - 1) * 5;
  }

  private spawnMonster(): void {
    const spawn = this.grid.getSpawnWorldPosition();
    const hp = this.getWaveMonsterHp();
    const monster = this.entities.addMonster(spawn.x, spawn.y, hp);
    monster.pathIndex = 0;
  }

  private processTowerActions(): void {
    for (const tower of this.entities.towers.values()) {
      if (tower.type === 'collector') {
        this.processCollector(tower);
      } else {
        this.processCombatTower(tower);
      }
    }
  }

  private processCombatTower(tower: Tower): void {
    if (!tower.canFire()) {
      if (tower.state === 'firing' && tower.fireCooldown < (1.0 / tower.stats.fireRate) * 0.5) {
        tower.state = 'idle';
      }
      return;
    }

    const target = this.findTargetForTower(tower);
    if (!target) {
      tower.state = 'idle';
      tower.target = null;
      return;
    }

    tower.target = target;
    tower.startFire();

    const pType: ProjectileType = tower.type as ProjectileType;
    this.entities.addProjectile(
      pType,
      tower.x,
      tower.y - 10,
      target.id,
      target.x,
      target.y,
      tower.stats.damage,
      tower.stats.splashRange,
      tower.stats.slowDuration,
      tower.stats.slowAmount
    );
  }

  private findTargetForTower(tower: Tower): Monster | null {
    let bestTarget: Monster | null = null;
    let bestProgress = -1;

    for (const monster of this.entities.monsters.values()) {
      if (!monster.alive) continue;

      const dist = Math.hypot(monster.x - tower.x, monster.y - tower.y);
      if (dist > tower.stats.range) continue;

      const progress = monster.pathIndex;
      if (progress > bestProgress) {
        bestProgress = progress;
        bestTarget = monster;
      }
    }

    return bestTarget;
  }

  private processCollector(tower: Tower): void {
    if (!tower.canCollect()) return;

    const nearest = this.grid.findNearestResource(tower.x, tower.y);
    if (!nearest) return;
    if (nearest.distance > tower.stats.range) return;

    const collected = this.grid.collectResource(nearest.gridX, nearest.gridY, 5);
    if (collected > 0) {
      tower.startCollect();
      this.addGold(collected);
    }
  }

  private processProjectileCollisions(): void {
    for (const p of Array.from(this.entities.projectiles.values())) {
      if (p.alive) continue;

      const color = PROJECTILE_COLORS[p.type] || '#FFFFFF';

      if (p.splashRange && p.splashRange > 0) {
        this.applySplashDamage(p);
        this.entities.addExplosion(p.targetX, p.targetY, color);
      } else {
        const target = this.entities.monsters.get(p.targetId);
        if (target && target.alive) {
          this.hitMonster(target, p);
          this.entities.addExplosion(target.x, target.y, color);
        } else {
          this.entities.addExplosion(p.targetX, p.targetY, color);
        }
      }

      this.entities.removeProjectile(p.id);
    }
  }

  private applySplashDamage(p: Projectile): void {
    for (const monster of this.entities.monsters.values()) {
      if (!monster.alive) continue;

      const dist = Math.hypot(monster.x - p.targetX, monster.y - p.targetY);
      if (dist <= p.splashRange!) {
        const falloff = 1 - (dist / p.splashRange!) * 0.5;
        const dmg = Math.max(1, Math.round(p.damage * falloff));
        monster.takeDamage(dmg);
        monster.applyKnockback(p.targetX, p.targetY, 3);
      }
    }
  }

  private hitMonster(monster: Monster, p: Projectile): void {
    monster.takeDamage(p.damage);
    monster.applyKnockback(p.startX, p.startY, 4);

    if (p.slowDuration && p.slowAmount) {
      monster.applySlow(p.slowDuration, p.slowAmount);
    }
  }

  private processBaseReached(): void {
    for (const monster of this.entities.monsters.values()) {
      if (monster.reachedBase) {
        this.damageBase(10);
        monster.alive = false;
      }
    }
  }

  addGold(amount: number): void {
    this.gold += amount;
    if (this.callbacks.onGoldChange) {
      this.callbacks.onGoldChange(amount);
    }
  }

  spendGold(amount: number): boolean {
    if (this.gold < amount) return false;
    this.gold -= amount;
    return true;
  }

  damageBase(amount: number): void {
    this.baseHp = Math.max(0, this.baseHp - amount);
    if (this.callbacks.onBaseDamage) {
      this.callbacks.onBaseDamage(amount);
    }
    if (this.baseHp <= 0) {
      this.gameOver();
    }
  }

  private gameOver(): void {
    this.paused = true;
  }

  isGameOver(): boolean {
    return this.baseHp <= 0;
  }

  buildTower(type: TowerType, gridX: number, gridY: number): Tower | null {
    const costs: Record<TowerType, number> = {
      arrow: 30,
      cannon: 60,
      magic: 80,
      collector: 40
    };
    const cost = costs[type];
    if (!this.spendGold(cost)) return null;

    const tower = this.entities.addTower(type, gridX, gridY, this.grid);
    if (!tower) {
      this.addGold(cost);
      return null;
    }
    return tower;
  }

  canBuildAt(gridX: number, gridY: number): boolean {
    if (!this.grid.isBuildable(gridX, gridY)) return false;
    return this.entities.getTowerAt(gridX, gridY) === null;
  }

  getTowerAt(gridX: number, gridY: number): Tower | null {
    return this.entities.getTowerAt(gridX, gridY);
  }

  upgradeTower(towerId: number): boolean {
    const tower = this.entities.towers.get(towerId);
    if (!tower || !tower.canUpgrade()) return false;

    const cost = tower.getUpgradeCost();
    if (!this.spendGold(cost)) return false;

    tower.upgrade();
    return true;
  }

  getBuildingList(): { id: number; type: TowerType; level: number }[] {
    const list: { id: number; type: TowerType; level: number }[] = [];
    for (const tower of this.entities.towers.values()) {
      list.push({ id: tower.id, type: tower.type, level: tower.level });
    }
    return list;
  }

  getRenderState(extra: {
    goldBounceTimer: number;
    hoveredGrid: { gridX: number; gridY: number } | null;
    buildMenu: { visible: boolean; x: number; y: number; gridX: number; gridY: number; hoveredBtn: number };
    upgradePanel: { visible: boolean; x: number; y: number; towerId: number; hoveredBtn: boolean };
    selectedBuildingId: number | null;
    canvasWidth: number;
    canvasHeight: number;
  }) {
    return {
      time: this.gameTime,
      gold: this.gold,
      goldBounceTimer: extra.goldBounceTimer,
      baseHp: this.baseHp,
      maxBaseHp: this.maxBaseHp,
      wave: this.wave,
      waveTimer: this.waveTimer,
      hoveredGrid: extra.hoveredGrid,
      buildMenu: extra.buildMenu,
      upgradePanel: extra.upgradePanel,
      buildingList: this.getBuildingList(),
      selectedBuildingId: extra.selectedBuildingId,
      canvasWidth: extra.canvasWidth,
      canvasHeight: extra.canvasHeight
    };
  }
}

export { MAP_WIDTH, MAP_HEIGHT, TOWER_UPGRADE_COSTS };
