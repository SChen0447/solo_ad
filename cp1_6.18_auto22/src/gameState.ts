export interface Vector2 {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  lives: number;
  maxLives: number;
  weaponLevel: number;
  heat: number;
  maxHeat: number;
  isOverheated: boolean;
  invincibleTime: number;
  engineFlamePhase: number;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  damage: number;
  isEnemy: boolean;
  color: string;
}

export type EnemyType = 'meteor' | 'ship';

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  score: number;
  shootCooldown: number;
  shootTimer: number;
  sPhase: number;
  sAmplitude: number;
  sSpeed: number;
  flashTime: number;
  smokeTimer: number;
}

export interface PowerUp {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  type: 'crystal';
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  type: 'debris' | 'smoke' | 'flash';
}

export interface GameState {
  width: number;
  height: number;
  player: Player;
  bullets: Bullet[];
  enemies: Enemy[];
  powerUps: PowerUp[];
  particles: Particle[];
  score: number;
  isGameOver: boolean;
  gameOverTime: number;
  spawnTimer: number;
  spawnInterval: number;
  nextId: number;
  killCount: number;
  nextUpgradeKills: number;
  keys: Set<string>;
  mouseDown: boolean;
  fireHoldTime: number;
  lastShotTime: number;
  touchLeft: boolean;
  touchRight: boolean;
  touchFire: boolean;
  stars: { x: number; y: number; speed: number; brightness: number }[];
}

const MAX_OBJECTS = 200;

function createPlayer(width: number, height: number): Player {
  return {
    x: width / 2,
    y: height - 60,
    width: 32,
    height: 24,
    speed: 4,
    lives: 3,
    maxLives: 3,
    weaponLevel: 1,
    heat: 0,
    maxHeat: 100,
    isOverheated: false,
    invincibleTime: 0,
    engineFlamePhase: 0
  };
}

function createStars(width: number, height: number, count: number = 60) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: 0.2 + Math.random() * 0.8,
      brightness: 0.3 + Math.random() * 0.7
    });
  }
  return stars;
}

export function createGameState(width: number, height: number): GameState {
  return {
    width,
    height,
    player: createPlayer(width, height),
    bullets: [],
    enemies: [],
    powerUps: [],
    particles: [],
    score: 0,
    isGameOver: false,
    gameOverTime: 0,
    spawnTimer: 0,
    spawnInterval: 3,
    nextId: 1,
    killCount: 0,
    nextUpgradeKills: 5,
    keys: new Set(),
    mouseDown: false,
    fireHoldTime: 0,
    lastShotTime: 0,
    touchLeft: false,
    touchRight: false,
    touchFire: false,
    stars: createStars(width, height)
  };
}

export function resetGameState(state: GameState): void {
  state.player = createPlayer(state.width, state.height);
  state.bullets = [];
  state.enemies = [];
  state.powerUps = [];
  state.particles = [];
  state.score = 0;
  state.isGameOver = false;
  state.gameOverTime = 0;
  state.spawnTimer = 0;
  state.spawnInterval = 3;
  state.killCount = 0;
  state.nextUpgradeKills = 5;
  state.fireHoldTime = 0;
  state.lastShotTime = 0;
  state.stars = createStars(state.width, state.height);
}

export function resizeGameState(state: GameState, width: number, height: number): void {
  state.width = width;
  state.height = height;
  state.player.y = height - 60;
  if (state.player.x > width - state.player.width / 2) {
    state.player.x = width - state.player.width / 2;
  }
  if (state.player.x < state.player.width / 2) {
    state.player.x = state.player.width / 2;
  }
  state.stars = createStars(width, height);
}

function getTotalObjectCount(state: GameState): number {
  return state.bullets.length + state.enemies.length + state.powerUps.length + state.particles.length;
}

function canAddObject(state: GameState, count: number = 1): boolean {
  return getTotalObjectCount(state) + count <= MAX_OBJECTS;
}

function nextId(state: GameState): number {
  return state.nextId++;
}

export function fireBullet(state: GameState): void {
  if (state.isGameOver) return;
  if (state.player.isOverheated) return;

  const now = performance.now() / 1000;
  const cooldown = state.fireHoldTime > 0.3 ? 0.12 : 0.2;
  if (now - state.lastShotTime < cooldown) return;

  state.lastShotTime = now;

  const p = state.player;
  const bullets: Bullet[] = [];

  if (p.weaponLevel === 1) {
    bullets.push(makePlayerBullet(state, p.x, p.y - p.height / 2, 0, -8));
  } else if (p.weaponLevel === 2) {
    bullets.push(makePlayerBullet(state, p.x - 8, p.y - p.height / 2, 0, -8));
    bullets.push(makePlayerBullet(state, p.x + 8, p.y - p.height / 2, 0, -8));
  } else {
    bullets.push(makePlayerBullet(state, p.x, p.y - p.height / 2, 0, -8));
    bullets.push(makePlayerBullet(state, p.x - 6, p.y - p.height / 2 + 4, -1.5, -7.5));
    bullets.push(makePlayerBullet(state, p.x + 6, p.y - p.height / 2 + 4, 1.5, -7.5));
  }

  if (state.fireHoldTime > 0.4 && p.heat < p.maxHeat) {
    p.heat += 8;
    if (p.heat >= p.maxHeat) {
      p.heat = p.maxHeat;
      p.isOverheated = true;
    }
  }

  if (!canAddObject(state, bullets.length)) {
    bullets.length = Math.max(0, MAX_OBJECTS - getTotalObjectCount(state));
  }

  state.bullets.push(...bullets);
}

function makePlayerBullet(state: GameState, x: number, y: number, vx: number, vy: number): Bullet {
  return {
    id: nextId(state),
    x,
    y,
    vx,
    vy,
    width: 4,
    height: 10,
    damage: 1,
    isEnemy: false,
    color: '#ffcc33'
  };
}

function fireEnemyBullet(state: GameState, enemy: Enemy): void {
  if (!canAddObject(state)) return;

  const bullet: Bullet = {
    id: nextId(state),
    x: enemy.x,
    y: enemy.y + enemy.height / 2,
    vx: 0,
    vy: 4,
    width: 4,
    height: 8,
    damage: 1,
    isEnemy: true,
    color: '#ff3366'
  };
  state.bullets.push(bullet);
}

export function spawnEnemy(state: GameState): void {
  if (!canAddObject(state)) return;
  if (state.isGameOver) return;

  const type: EnemyType = Math.random() < 0.55 ? 'meteor' : 'ship';
  const x = 30 + Math.random() * (state.width - 60);

  if (type === 'meteor') {
    const size = 16 + Math.random() * 20;
    state.enemies.push({
      id: nextId(state),
      type: 'meteor',
      x,
      y: -size,
      width: size,
      height: size,
      vx: (Math.random() - 0.5) * 0.8,
      vy: 1.5 + Math.random() * 1.5,
      hp: 1,
      maxHp: 1,
      score: 10,
      shootCooldown: 0,
      shootTimer: 0,
      sPhase: 0,
      sAmplitude: 0,
      sSpeed: 0,
      flashTime: 0,
      smokeTimer: 0
    });
  } else {
    state.enemies.push({
      id: nextId(state),
      type: 'ship',
      x,
      y: -30,
      width: 28,
      height: 24,
      vx: 0,
      vy: 1 + Math.random() * 0.5,
      hp: 2,
      maxHp: 2,
      score: 25,
      shootCooldown: 1.5 + Math.random() * 1.5,
      shootTimer: 1 + Math.random(),
      sPhase: Math.random() * Math.PI * 2,
      sAmplitude: 30 + Math.random() * 30,
      sSpeed: 1.5 + Math.random(),
      flashTime: 0,
      smokeTimer: 0
    });
  }
}

function spawnPowerUp(state: GameState, x: number, y: number): void {
  if (!canAddObject(state)) return;
  state.powerUps.push({
    id: nextId(state),
    x,
    y,
    vx: (Math.random() - 0.5) * 2,
    vy: -1,
    width: 14,
    height: 14,
    type: 'crystal'
  });
}

function spawnExplosion(state: GameState, x: number, y: number, count: number = 12, color: string = '#ffaa33'): void {
  const particles: Particle[] = [];

  particles.push({
    id: nextId(state),
    x,
    y,
    vx: 0,
    vy: 0,
    size: 20,
    life: 0.08,
    maxLife: 0.08,
    color: '#ffffff',
    type: 'flash'
  });

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    particles.push({
      id: nextId(state),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 3,
      life: 0.4 + Math.random() * 0.4,
      maxLife: 0.8,
      color,
      type: 'debris'
    });
  }

  const available = MAX_OBJECTS - getTotalObjectCount(state);
  if (particles.length > available) {
    particles.length = Math.max(0, available);
  }
  state.particles.push(...particles);
}

function spawnSmoke(state: GameState, x: number, y: number): void {
  if (!canAddObject(state)) return;
  state.particles.push({
    id: nextId(state),
    x: x + (Math.random() - 0.5) * 10,
    y,
    vx: (Math.random() - 0.5) * 0.5,
    vy: 0.3 + Math.random() * 0.5,
    size: 6 + Math.random() * 4,
    life: 0.8,
    maxLife: 0.8,
    color: 'rgba(180, 180, 200, 0.5)',
    type: 'smoke'
  });
}

function rectsOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return Math.abs(a.x - b.x) < (a.width + b.width) / 2 &&
         Math.abs(a.y - b.y) < (a.height + b.height) / 2;
}

export function updateGame(state: GameState, dt: number): void {
  if (state.isGameOver) {
    state.gameOverTime += dt;
    updateParticles(state, dt);
    updateStars(state, dt);
    return;
  }

  updatePlayer(state, dt);
  updateBullets(state, dt);
  updateEnemies(state, dt);
  updatePowerUps(state, dt);
  updateParticles(state, dt);
  checkCollisions(state);
  updateSpawner(state, dt);
  updateStars(state, dt);
  updateHeat(state, dt);
}

function updatePlayer(state: GameState, dt: number): void {
  const p = state.player;
  let dx = 0;

  if (state.keys.has('ArrowLeft') || state.keys.has('KeyA') || state.touchLeft) {
    dx -= 1;
  }
  if (state.keys.has('ArrowRight') || state.keys.has('KeyD') || state.touchRight) {
    dx += 1;
  }

  p.x += dx * p.speed * (dt * 60);

  const halfW = p.width / 2;
  if (p.x < halfW) p.x = halfW;
  if (p.x > state.width - halfW) p.x = state.width - halfW;

  if (p.invincibleTime > 0) {
    p.invincibleTime -= dt;
  }

  p.engineFlamePhase += dt * 15;

  if (state.mouseDown || state.keys.has('Space') || state.touchFire) {
    state.fireHoldTime += dt;
    fireBullet(state);
  } else {
    state.fireHoldTime = 0;
  }
}

function updateHeat(state: GameState, dt: number): void {
  const p = state.player;
  if (p.isOverheated) {
    p.heat -= dt * 30;
    if (p.heat <= 0) {
      p.heat = 0;
      p.isOverheated = false;
    }
  } else if (state.fireHoldTime <= 0.01) {
    p.heat -= dt * 20;
    if (p.heat < 0) p.heat = 0;
  }
}

function updateBullets(state: GameState, dt: number): void {
  const factor = dt * 60;
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx * factor;
    b.y += b.vy * factor;

    if (b.y < -20 || b.y > state.height + 20 || b.x < -20 || b.x > state.width + 20) {
      state.bullets.splice(i, 1);
    }
  }
}

function updateEnemies(state: GameState, dt: number): void {
  const factor = dt * 60;
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];

    if (e.type === 'ship') {
      e.sPhase += e.sSpeed * dt;
      e.x += Math.sin(e.sPhase) * e.sAmplitude * dt * 0.1;
      e.y += e.vy * factor;

      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && e.y > 20 && e.y < state.height - 100) {
        fireEnemyBullet(state, e);
        e.shootTimer = e.shootCooldown;
      }

      e.smokeTimer -= dt;
      if (e.smokeTimer <= 0 && e.hp < e.maxHp) {
        spawnSmoke(state, e.x, e.y + e.height / 2);
        e.smokeTimer = 0.15;
      }
    } else {
      e.x += e.vx * factor;
      e.y += e.vy * factor;
    }

    if (e.flashTime > 0) {
      e.flashTime -= dt;
    }

    if (e.y > state.height + 40) {
      state.enemies.splice(i, 1);
      if (e.type === 'meteor') {
        damagePlayer(state);
      }
    }
  }
}

function updatePowerUps(state: GameState, dt: number): void {
  const factor = dt * 60;
  const gravity = 0.05 * factor;
  for (let i = state.powerUps.length - 1; i >= 0; i--) {
    const p = state.powerUps[i];
    p.vy += gravity;
    p.x += p.vx * factor;
    p.y += p.vy * factor;

    if (p.vy > 2) p.vy = 2;

    if (p.x < p.width / 2 || p.x > state.width - p.width / 2) {
      p.vx *= -0.6;
      p.x = Math.max(p.width / 2, Math.min(state.width - p.width / 2, p.x));
    }

    if (p.y > state.height + 20) {
      state.powerUps.splice(i, 1);
    }
  }
}

function updateParticles(state: GameState, dt: number): void {
  const factor = dt * 60;
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * factor;
    p.y += p.vy * factor;
    p.life -= dt;

    if (p.type === 'debris') {
      p.vy += 0.1 * factor;
    }

    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }
}

function updateStars(state: GameState, dt: number): void {
  const factor = dt * 60;
  for (const s of state.stars) {
    s.y += s.speed * factor;
    if (s.y > state.height) {
      s.y = -2;
      s.x = Math.random() * state.width;
    }
  }
}

function updateSpawner(state: GameState, dt: number): void {
  state.spawnTimer += dt;
  if (state.spawnTimer >= state.spawnInterval) {
    state.spawnTimer = 0;
    spawnEnemy(state);
    state.spawnInterval = 2 + Math.random() * 3;
  }
}

function damagePlayer(state: GameState): void {
  if (state.player.invincibleTime > 0) return;

  state.player.lives--;
  state.player.invincibleTime = 2;

  if (state.player.lives <= 0) {
    state.player.lives = 0;
    state.isGameOver = true;
    state.gameOverTime = 0;
  }
}

function checkCollisions(state: GameState): void {
  const p = state.player;

  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    if (b.isEnemy) continue;

    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const e = state.enemies[j];
      if (rectsOverlap(b, e)) {
        e.hp -= b.damage;
        e.flashTime = 0.08;
        state.bullets.splice(i, 1);

        if (e.hp <= 0) {
          state.score += e.score;
          state.killCount++;

          if (e.type === 'meteor') {
            spawnExplosion(state, e.x, e.y, 10, '#cc6633');
          } else {
            spawnExplosion(state, e.x, e.y, 16, '#66ccff');
            for (let k = 0; k < 6; k++) {
              spawnSmoke(state, e.x + (Math.random() - 0.5) * e.width, e.y + (Math.random() - 0.5) * e.height);
            }
          }

          if (e.type === 'ship' && state.killCount >= state.nextUpgradeKills && p.weaponLevel < 3) {
            spawnPowerUp(state, e.x, e.y);
            state.nextUpgradeKills += 8;
          }

          state.enemies.splice(j, 1);
        }
        break;
      }
    }
  }

  if (p.invincibleTime <= 0) {
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      if (!b.isEnemy) continue;
      if (rectsOverlap(b, p)) {
        state.bullets.splice(i, 1);
        damagePlayer(state);
        break;
      }
    }
  }

  if (p.invincibleTime <= 0) {
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      if (rectsOverlap(e, p)) {
        damagePlayer(state);
        if (e.type === 'meteor') {
          spawnExplosion(state, e.x, e.y, 10, '#cc6633');
          state.enemies.splice(i, 1);
        }
        break;
      }
    }
  }

  for (let i = state.powerUps.length - 1; i >= 0; i--) {
    const pu = state.powerUps[i];
    if (rectsOverlap(pu, p)) {
      if (p.weaponLevel < 3) {
        p.weaponLevel++;
      }
      state.score += 50;
      state.powerUps.splice(i, 1);
    }
  }
}
