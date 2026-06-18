import {
  EnemyState,
  Fragment,
  Position,
  ElementType,
  RANDOM_COLORS
} from './types';

const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 600;
const ENEMY_SIZE = 25;
const ENEMY_SPEED = 1.5;
const FRAGMENT_SIZE = 6;
const FRAGMENT_SPEED = 0.5;
const FROZEN_DURATION = 120;
const FLASH_DURATION = 8;
const WOBBLE_MIN_INTERVAL = 90;
const WOBBLE_MAX_INTERVAL = 180;
const WOBBLE_MIN_OFFSET = 20;
const WOBBLE_MAX_OFFSET = 40;
const BOOST_SPEED = 2.2;
const BOOST_DURATION = 48;
const BOOST_TRIGGER_DISTANCE = 100;

export class EnemyManager {
  private enemies: EnemyState[] = [];
  private fragments: Fragment[] = [];
  private enemyIdCounter = 0;
  private fragmentIdCounter = 0;
  private spawnTimer = 0;
  private nextSpawnTime = 180;
  private maxEnemies = 20;

  update(playerPos: Position, deltaTime: number): void {
    this.spawnTimer++;
    if (this.spawnTimer >= this.nextSpawnTime && this.enemies.length < this.maxEnemies) {
      this.spawnEnemy();
      this.spawnTimer = 0;
      this.nextSpawnTime = 180 + Math.random() * 120;
    }

    for (const enemy of this.enemies) {
      if (!enemy.active) continue;

      if (enemy.frozen) {
        enemy.frozenTimer--;
        if (enemy.frozenTimer <= 0) {
          enemy.frozen = false;
        }
        continue;
      }

      if (enemy.flashing) {
        enemy.flashTimer--;
        if (enemy.flashTimer <= 0) {
          enemy.flashCount++;
          if (enemy.flashCount >= 3) {
            enemy.active = false;
            this.spawnFragment(enemy.position, enemy.element, enemy.color);
          } else {
            enemy.flashTimer = FLASH_DURATION;
          }
        }
        continue;
      }

      const dx = playerPos.x - enemy.position.x;
      const dy = playerPos.y - enemy.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        let currentSpeed = ENEMY_SPEED;

        if (enemy.speedBoostCooldown > 0) {
          enemy.speedBoostCooldown--;
        }
        if (enemy.isSpeedBoosted) {
          enemy.speedBoostTimer--;
          if (enemy.speedBoostTimer <= 0) {
            enemy.isSpeedBoosted = false;
          } else {
            currentSpeed = BOOST_SPEED;
          }
        } else if (dist < BOOST_TRIGGER_DISTANCE && enemy.speedBoostCooldown <= 0) {
          enemy.isSpeedBoosted = true;
          enemy.speedBoostTimer = BOOST_DURATION;
          enemy.speedBoostCooldown = BOOST_DURATION + 120;
          currentSpeed = BOOST_SPEED;
        }

        enemy.wobbleTimer++;
        if (enemy.wobbleTimer >= enemy.wobbleInterval) {
          enemy.wobbleTimer = 0;
          enemy.wobbleInterval = WOBBLE_MIN_INTERVAL + Math.random() * (WOBBLE_MAX_INTERVAL - WOBBLE_MIN_INTERVAL);
          const targetOffset = (Math.random() > 0.5 ? 1 : -1) * (WOBBLE_MIN_OFFSET + Math.random() * (WOBBLE_MAX_OFFSET - WOBBLE_MIN_OFFSET));
          enemy.wobbleOffset = targetOffset;
        }

        const t = enemy.wobbleTimer / enemy.wobbleInterval;
        const wobbleAmount = enemy.wobbleOffset * Math.sin(t * Math.PI * 2);

        const forwardX = dx / dist;
        const forwardY = dy / dist;
        const perpX = -forwardY;
        const perpY = forwardX;

        enemy.position.x += forwardX * currentSpeed + perpX * (wobbleAmount * 0.02);
        enemy.position.y += forwardY * currentSpeed + perpY * (wobbleAmount * 0.02);
      }
    }

    this.enemies = this.enemies.filter(e => e.active);

    for (const fragment of this.fragments) {
      if (fragment.collected) continue;

      const dx = playerPos.x - fragment.position.x;
      const dy = playerPos.y - fragment.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        fragment.position.x += (dx / dist) * FRAGMENT_SPEED;
        fragment.position.y += (dy / dist) * FRAGMENT_SPEED;
      }
    }

    this.fragments = this.fragments.filter(f => !f.collected);
  }

  private spawnEnemy(): void {
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;

    switch (side) {
      case 0:
        x = Math.random() * ARENA_WIDTH;
        y = -ENEMY_SIZE;
        break;
      case 1:
        x = ARENA_WIDTH + ENEMY_SIZE;
        y = Math.random() * ARENA_HEIGHT;
        break;
      case 2:
        x = Math.random() * ARENA_WIDTH;
        y = ARENA_HEIGHT + ENEMY_SIZE;
        break;
      default:
        x = -ENEMY_SIZE;
        y = Math.random() * ARENA_HEIGHT;
        break;
    }

    const elements: ElementType[] = ['fire', 'ice', 'lightning'];
    const element = elements[Math.floor(Math.random() * elements.length)];
    const color = RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];

    const initialWobbleInterval = WOBBLE_MIN_INTERVAL + Math.random() * (WOBBLE_MAX_INTERVAL - WOBBLE_MIN_INTERVAL);
    const initialWobbleOffset = (Math.random() > 0.5 ? 1 : -1) * (WOBBLE_MIN_OFFSET + Math.random() * (WOBBLE_MAX_OFFSET - WOBBLE_MIN_OFFSET));

    this.enemies.push({
      id: this.enemyIdCounter++,
      position: { x, y },
      element,
      color,
      frozen: false,
      frozenTimer: 0,
      flashing: false,
      flashTimer: 0,
      flashCount: 0,
      active: true,
      wobbleTimer: 0,
      wobbleInterval: initialWobbleInterval,
      wobbleOffset: initialWobbleOffset,
      wobblePhase: 0,
      speedBoostTimer: 0,
      speedBoostCooldown: 0,
      isSpeedBoosted: false
    });
  }

  private spawnFragment(position: Position, element: ElementType, color: string): void {
    this.fragments.push({
      id: this.fragmentIdCounter++,
      position: { ...position },
      element,
      color,
      collected: false
    });
  }

  hitEnemy(enemyId: number, isLightning: boolean = false): boolean {
    const enemy = this.enemies.find(e => e.id === enemyId);
    if (!enemy || !enemy.active) return false;

    if (isLightning) {
      enemy.flashing = true;
      enemy.flashTimer = FLASH_DURATION;
      enemy.flashCount = 0;
    } else {
      enemy.active = false;
      this.spawnFragment(enemy.position, enemy.element, enemy.color);
    }
    return true;
  }

  freezeEnemy(enemyId: number): void {
    const enemy = this.enemies.find(e => e.id === enemyId);
    if (enemy && enemy.active) {
      enemy.frozen = true;
      enemy.frozenTimer = FROZEN_DURATION;
    }
  }

  checkPlayerCollision(playerPos: Position, playerRadius: number): EnemyState | null {
    for (const enemy of this.enemies) {
      if (!enemy.active || enemy.frozen || enemy.flashing) continue;

      const dx = playerPos.x - enemy.position.x;
      const dy = playerPos.y - enemy.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < playerRadius + ENEMY_SIZE / 2) {
        enemy.active = false;
        return enemy;
      }
    }
    return null;
  }

  checkFragmentCollection(playerPos: Position, playerRadius: number): Fragment | null {
    for (const fragment of this.fragments) {
      if (fragment.collected) continue;

      const dx = playerPos.x - fragment.position.x;
      const dy = playerPos.y - fragment.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < playerRadius + FRAGMENT_SIZE) {
        fragment.collected = true;
        return fragment;
      }
    }
    return null;
  }

  getEnemies(): EnemyState[] {
    return this.enemies.filter(e => e.active);
  }

  getFragments(): Fragment[] {
    return this.fragments.filter(f => !f.collected);
  }

  getEnemySize(): number {
    return ENEMY_SIZE;
  }

  getFragmentSize(): number {
    return FRAGMENT_SIZE;
  }

  getSpawnTimer(): number {
    return this.spawnTimer;
  }

  getNextSpawnTime(): number {
    return this.nextSpawnTime;
  }

  reset(): void {
    this.enemies = [];
    this.fragments = [];
    this.spawnTimer = 0;
    this.nextSpawnTime = 180;
  }
}
