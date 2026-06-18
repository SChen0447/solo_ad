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
const MOVE_MIN_INTERVAL = 90;
const MOVE_MAX_INTERVAL = 180;
const OFFSET_MIN = 20;
const OFFSET_MAX = 40;
const OFFSET_SMOOTHING = 0.05;
const ACCEL_SPEED = 2.2;
const ACCEL_DURATION = 48;
const ACCEL_COOLDOWN = 168;
const ACCEL_TRIGGER_DISTANCE = 100;

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
        const forwardX = dx / dist;
        const forwardY = dy / dist;
        const perpX = -forwardY;
        const perpY = forwardX;

        let currentSpeed = ENEMY_SPEED;

        if (enemy.accelerationCooldown > 0) {
          enemy.accelerationCooldown--;
        }

        if (enemy.isAccelerating) {
          enemy.accelerationTimer--;
          if (enemy.accelerationTimer <= 0) {
            enemy.isAccelerating = false;
          } else {
            currentSpeed = ACCEL_SPEED;
          }
        } else if (dist < ACCEL_TRIGGER_DISTANCE && enemy.accelerationCooldown <= 0) {
          enemy.isAccelerating = true;
          enemy.accelerationTimer = ACCEL_DURATION;
          enemy.accelerationCooldown = ACCEL_COOLDOWN;
          currentSpeed = ACCEL_SPEED;
        }

        enemy.moveTimer++;
        if (enemy.moveTimer >= enemy.moveInterval) {
          enemy.moveTimer = 0;
          enemy.moveInterval = MOVE_MIN_INTERVAL + Math.random() * (MOVE_MAX_INTERVAL - MOVE_MIN_INTERVAL);
          const direction = Math.random() > 0.5 ? 1 : -1;
          const offsetAmount = OFFSET_MIN + Math.random() * (OFFSET_MAX - OFFSET_MIN);
          enemy.targetOffset = direction * offsetAmount;
        }

        const offsetDiff = enemy.targetOffset - enemy.currentOffset;
        enemy.currentOffset += offsetDiff * OFFSET_SMOOTHING;

        const offsetVelocity = offsetDiff * OFFSET_SMOOTHING;

        enemy.position.x += forwardX * currentSpeed + perpX * offsetVelocity;
        enemy.position.y += forwardY * currentSpeed + perpY * offsetVelocity;
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

    const initialMoveInterval = MOVE_MIN_INTERVAL + Math.random() * (MOVE_MAX_INTERVAL - MOVE_MIN_INTERVAL);
    const initialDirection = Math.random() > 0.5 ? 1 : -1;
    const initialOffsetAmount = OFFSET_MIN + Math.random() * (OFFSET_MAX - OFFSET_MIN);
    const initialTargetOffset = initialDirection * initialOffsetAmount;

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
      moveTimer: 0,
      moveInterval: initialMoveInterval,
      targetOffset: initialTargetOffset,
      currentOffset: 0,
      isAccelerating: false,
      accelerationTimer: 0,
      accelerationCooldown: 0
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
