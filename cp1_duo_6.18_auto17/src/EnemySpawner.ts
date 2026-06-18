export interface Enemy {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  speed: number;
  size: number;
  alive: boolean;
  hitFlashTimer: number;
  entranceIndex: number;
}

export interface EnergyDrop {
  x: number;
  y: number;
  amount: number;
  timer: number;
  duration: number;
  flashPhase: number;
  collected: boolean;
}

export interface Entrance {
  x: number;
  y: number;
  arrowPhase: number;
}

const MAX_ENEMIES = 50;
const WAVE_INTERVAL = 5000;
const ENEMIES_PER_WAVE = 5;
const ENEMY_HP = 30;
const ENEMY_SPEED = 1.5;
const ENEMY_SIZE = 12;
const ENERGY_DROP_AMOUNT = 3;
const ENERGY_DROP_DURATION = 2000;
const CORE_RADIUS = 15;

export class EnemySpawner {
  enemies: Enemy[] = [];
  energyDrops: EnergyDrop[] = [];
  entrances: Entrance[] = [];
  waveNumber: number = 0;
  private waveTimer: number = WAVE_INTERVAL;
  private nextId: number = 0;
  coreX: number = 0;
  coreY: number = 0;

  constructor(mapWidth: number, mapHeight: number) {
    this.coreX = mapWidth / 2;
    this.coreY = mapHeight / 2;
    this.entrances = [
      { x: 0, y: mapHeight / 2, arrowPhase: 0 },
      { x: mapWidth, y: mapHeight / 2, arrowPhase: 0 },
      { x: mapWidth / 2, y: mapHeight, arrowPhase: 0 },
    ];
  }

  get aliveEnemyCount(): number {
    return this.enemies.filter(e => e.alive).length;
  }

  private spawnWave(): void {
    if (this.aliveEnemyCount >= MAX_ENEMIES) return;

    this.waveNumber++;

    const count = Math.min(ENEMIES_PER_WAVE, MAX_ENEMIES - this.aliveEnemyCount);

    for (let i = 0; i < count; i++) {
      const entranceIdx = i % this.entrances.length;
      const entrance = this.entrances[entranceIdx];
      const enemy: Enemy = {
        id: this.nextId++,
        x: entrance.x,
        y: entrance.y,
        vx: 0,
        vy: 0,
        hp: ENEMY_HP,
        maxHp: ENEMY_HP,
        speed: ENEMY_SPEED,
        size: ENEMY_SIZE,
        alive: true,
        hitFlashTimer: 0,
        entranceIndex: entranceIdx,
      };
      this.enemies.push(enemy);
    }
  }

  update(deltaMs: number): { hitCore: boolean } {
    let hitCore = false;

    this.waveTimer += deltaMs;
    if (this.waveTimer >= WAVE_INTERVAL) {
      this.waveTimer -= WAVE_INTERVAL;
      this.spawnWave();
    }

    const dtFactor = deltaMs / 16;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      if (enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer -= deltaMs;
      }

      const dx = this.coreX - enemy.x;
      const dy = this.coreY - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= CORE_RADIUS + enemy.size) {
        enemy.alive = false;
        hitCore = true;
        continue;
      }

      if (dist > 0) {
        enemy.vx = (dx / dist) * enemy.speed;
        enemy.vy = (dy / dist) * enemy.speed;
        enemy.x += enemy.vx * dtFactor;
        enemy.y += enemy.vy * dtFactor;
      }
    }

    for (const entrance of this.entrances) {
      entrance.arrowPhase += 0.03 * (deltaMs / 16);
    }

    for (const drop of this.energyDrops) {
      if (drop.collected) continue;
      drop.timer += deltaMs;
      drop.flashPhase += 0.1 * (deltaMs / 16);
    }

    this.energyDrops = this.energyDrops.filter(d => !d.collected && d.timer < d.duration);

    return { hitCore };
  }

  damageEnemy(enemyId: number, damage: number): boolean {
    const enemy = this.enemies.find(e => e.id === enemyId);
    if (!enemy || !enemy.alive) return false;

    enemy.hp -= damage;
    enemy.hitFlashTimer = 50;

    if (enemy.hp <= 0) {
      enemy.alive = false;
      this.energyDrops.push({
        x: enemy.x,
        y: enemy.y,
        amount: ENERGY_DROP_AMOUNT,
        timer: 0,
        duration: ENERGY_DROP_DURATION,
        flashPhase: 0,
        collected: false,
      });
      return true;
    }
    return false;
  }

  tryCollectDrop(mx: number, my: number): number {
    let total = 0;
    for (const drop of this.energyDrops) {
      if (drop.collected) continue;
      const dx = mx - drop.x;
      const dy = my - drop.y;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        drop.collected = true;
        total += drop.amount;
      }
    }
    return total;
  }

  cleanupEnemies(): void {
    this.enemies = this.enemies.filter(e => e.alive);
  }
}
