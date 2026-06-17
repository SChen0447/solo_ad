import {
  Rect,
  Circle,
  Submarine,
  Enemy,
  Boss,
  Bullet,
  Obstacle,
  Collectible,
  Particle,
  BossProjectile,
  GameState,
} from './entities';
import { v4 as uuidv4 } from 'uuid';

export function aabbCollision(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function circleCollision(a: Circle, b: Circle): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < a.radius + b.radius;
}

export function circleRectCollision(circle: Circle, rect: Rect): boolean {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

function spawnExplosion(state: GameState, x: number, y: number, count: number = 12, color: string = 'rgba(255, 200, 50, ALPHA)') {
  for (let i = 0; i < count; i++) {
    if (state.particles.length >= 300) break;
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const speed = 1 + Math.random() * 3;
    state.particles.push(
      new Particle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        20 + Math.random() * 15,
        2 + Math.random() * 3,
        color,
        'explosion',
        uuidv4(),
      ),
    );
  }
  for (let i = 0; i < 6; i++) {
    if (state.particles.length >= 300) break;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 2;
    state.particles.push(
      new Particle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 1,
        30 + Math.random() * 20,
        3 + Math.random() * 4,
        'rgba(100, 100, 100, ALPHA)',
        'debris',
        uuidv4(),
      ),
    );
  }
}

function spawnBubbles(state: GameState, x: number, y: number, count: number = 5) {
  for (let i = 0; i < count; i++) {
    if (state.particles.length >= 300) break;
    state.particles.push(
      new Particle(
        x + (Math.random() - 0.5) * 20,
        y + (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 0.5,
        -0.5 - Math.random() * 1,
        40 + Math.random() * 30,
        2 + Math.random() * 4,
        '',
        'bubble',
        uuidv4(),
      ),
    );
  }
}

function spawnDrop(state: GameState, x: number, y: number, isBoss: boolean = false) {
  if (isBoss) {
    state.collectibles.push(new Collectible(x, y, 'relic', uuidv4()));
    for (let i = 0; i < 5; i++) {
      state.collectibles.push(
        new Collectible(
          x + (Math.random() - 0.5) * 80,
          y + (Math.random() - 0.5) * 80,
          'coin',
          uuidv4(),
        ),
      );
    }
    return;
  }
  const rand = Math.random();
  if (rand < 0.5) {
    state.collectibles.push(new Collectible(x, y, 'coin', uuidv4()));
  } else if (rand < 0.75) {
    state.collectibles.push(new Collectible(x, y, 'relicFragment', uuidv4()));
  } else if (rand < 0.9) {
    state.collectibles.push(new Collectible(x, y, 'oxygenBubble', uuidv4()));
  }
}

export function checkBulletEnemyCollisions(state: GameState): void {
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const bullet = state.bullets[i];
    if (!bullet.active) continue;

    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const enemy = state.enemies[j];
      if (!enemy.active) continue;
      if (circleRectCollision(bullet.getCollisionCircle(), enemy.getCollisionRect())) {
        bullet.active = false;
        enemy.health--;
        enemy.hitFlash = 8;
        spawnExplosion(state, bullet.position.x, bullet.position.y, 6, 'rgba(255, 220, 100, ALPHA)');
        state.screenShake = Math.max(state.screenShake, 3);

        if (enemy.health <= 0) {
          enemy.active = false;
          spawnExplosion(state, enemy.position.x, enemy.position.y, 18, 'rgba(255, 150, 50, ALPHA)');
          spawnBubbles(state, enemy.position.x, enemy.position.y, 10);
          spawnDrop(state, enemy.position.x, enemy.position.y);
          state.screenShake = Math.max(state.screenShake, 6);
        }
        break;
      }
    }

    if (bullet.active && state.boss && state.boss.active) {
      const boss = state.boss;
      if (circleRectCollision(bullet.getCollisionCircle(), boss.getCollisionRect())) {
        bullet.active = false;
        boss.health--;
        boss.hitFlash = 6;
        spawnExplosion(state, bullet.position.x, bullet.position.y, 5, 'rgba(255, 200, 100, ALPHA)');
        state.screenShake = Math.max(state.screenShake, 2);

        if (boss.health <= 0) {
          boss.active = false;
          state.bossActive = false;
          for (let k = 0; k < 5; k++) {
            setTimeout(() => {
              if (state.boss) {
                spawnExplosion(
                  state,
                  state.boss.position.x + (Math.random() - 0.5) * 100,
                  state.boss.position.y + (Math.random() - 0.5) * 100,
                  25,
                  'rgba(255, 100, 50, ALPHA)',
                );
              }
            }, k * 150);
          }
          spawnBubbles(state, boss.position.x, boss.position.y, 30);
          spawnDrop(state, boss.position.x, boss.position.y, true);
          state.screenShake = 20;
          state.boss = null;
        }
      }
    }
  }

  state.bullets = state.bullets.filter((b) => b.active);
  state.enemies = state.enemies.filter((e) => e.active);
}

export function checkSubmarineCollisions(state: GameState): void {
  const sub = state.submarine;
  if (sub.invincible > 0) return;

  for (const enemy of state.enemies) {
    if (!enemy.active) continue;
    if (aabbCollision(sub.getCollisionRect(), enemy.getCollisionRect())) {
      sub.health -= 15;
      sub.invincible = 60;
      state.screenShake = 10;
      spawnBubbles(state, sub.position.x, sub.position.y, 8);
      break;
    }
  }

  for (const obstacle of state.obstacles) {
    if (!obstacle.active) continue;
    if (aabbCollision(sub.getCollisionRect(), obstacle.getCollisionRect())) {
      sub.health -= 8;
      sub.invincible = 40;
      state.screenShake = 6;
      const dx = sub.position.x - obstacle.position.x;
      const dy = sub.position.y - obstacle.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      sub.velocity.x = (dx / dist) * 4;
      sub.velocity.y = (dy / dist) * 4;
      break;
    }
  }

  if (state.boss && state.boss.active) {
    const boss = state.boss;
    if (aabbCollision(sub.getCollisionRect(), boss.getCollisionRect())) {
      sub.health -= 25;
      sub.invincible = 90;
      state.screenShake = 15;
      const dx = sub.position.x - boss.position.x;
      const dy = sub.position.y - boss.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      sub.velocity.x = (dx / dist) * 6;
      sub.velocity.y = (dy / dist) * 6;
    } else {
      for (const tentacleRect of boss.getTentacleRects()) {
        if (aabbCollision(sub.getCollisionRect(), tentacleRect)) {
          sub.health -= 15;
          sub.invincible = 60;
          state.screenShake = 10;
          break;
        }
      }
    }
  }

  for (let i = state.bossProjectiles.length - 1; i >= 0; i--) {
    const proj = state.bossProjectiles[i];
    if (!proj.active) continue;
    if (circleRectCollision(proj.getCollisionCircle(), sub.getCollisionRect())) {
      proj.active = false;
      if (proj.projectileType === 'ink') {
        sub.health -= 12;
      } else {
        sub.health -= 8;
        const dx = sub.position.x - proj.position.x;
        const dy = sub.position.y - proj.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        sub.velocity.x += (dx / dist) * -3;
        sub.velocity.y += (dy / dist) * -3;
      }
      sub.invincible = 45;
      state.screenShake = 8;
    }
  }
  state.bossProjectiles = state.bossProjectiles.filter((p) => p.active);

  for (let i = state.collectibles.length - 1; i >= 0; i--) {
    const c = state.collectibles[i];
    if (!c.active) continue;
    if (aabbCollision(sub.getCollisionRect(), c.getCollisionRect())) {
      c.active = false;
      spawnBubbles(state, c.position.x, c.position.y, 6);
      if (c.collectibleType === 'coin') {
        sub.coins += 10;
      } else if (c.collectibleType === 'relicFragment') {
        sub.relicFragments++;
        if (sub.relicFragments >= 3) {
          sub.relicFragments = 0;
          sub.relics++;
        }
      } else if (c.collectibleType === 'relic') {
        sub.relics++;
      } else if (c.collectibleType === 'oxygenBubble') {
        sub.oxygen = Math.min(sub.maxOxygen, sub.oxygen + 35);
      }
    }
  }
  state.collectibles = state.collectibles.filter((c) => c.active);

  if (sub.health <= 0) {
    sub.health = 0;
    state.gameOver = true;
    spawnExplosion(state, sub.position.x, sub.position.y, 40, 'rgba(255, 100, 50, ALPHA)');
    spawnBubbles(state, sub.position.x, sub.position.y, 30);
  }
}

export function updateCollisions(state: GameState): void {
  checkBulletEnemyCollisions(state);
  checkSubmarineCollisions(state);
}
