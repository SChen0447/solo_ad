import {
  Ship, ShipType, Side, Formation, Position, Projectile, Particle, GameState,
  CANVAS_WIDTH, CANVAS_HEIGHT, SHIP_SPEED, FIRE_RANGE, NORMAL_FIRE_RATE,
  FOCUS_FIRE_RATE, FOCUS_FIRE_DURATION, FORMATION_TRANSITION_TIME,
  WAKE_PARTICLE_LIFE, SHIP_SINK_DURATION, PROJECTILE_SPEED, PROJECTILE_DAMAGE,
  SHIP_HEALTH, SHIP_SIZES
} from './types';

let shipIdCounter = 0;
let projectileIdCounter = 0;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function getFormationOffsets(formation: Formation): Position[] {
  switch (formation) {
    case Formation.ARROW:
      return [
        { x: 0, y: 0 },
        { x: -60, y: 50 },
        { x: 60, y: 50 },
        { x: -100, y: 100 },
        { x: 100, y: 100 }
      ];
    case Formation.LINE:
      return [
        { x: -80, y: 0 },
        { x: -40, y: 0 },
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 80, y: 0 }
      ];
    case Formation.CIRCLE:
      const offsets: Position[] = [];
      for (let i = 0; i < 5; i++) {
        const angle = (i * 72 - 90) * Math.PI / 180;
        offsets.push({
          x: Math.cos(angle) * 80,
          y: Math.sin(angle) * 80
        });
      }
      return offsets;
  }
}

function createShip(type: ShipType, side: Side, x: number, y: number, formationOffset: Position): Ship {
  const maxHealth = SHIP_HEALTH[type];
  return {
    id: shipIdCounter++,
    type,
    side,
    x,
    y,
    targetX: x,
    targetY: y,
    rotation: side === Side.PLAYER ? 0 : Math.PI,
    targetRotation: side === Side.PLAYER ? 0 : Math.PI,
    health: maxHealth,
    maxHealth,
    fireRate: NORMAL_FIRE_RATE,
    lastFireTime: 0,
    isSinking: false,
    sinkStartTime: 0,
    formationOffset,
    transitionStartX: x,
    transitionStartY: y,
    transitionStartTime: 0,
    isTransitioning: false
  };
}

export function createFleet(side: Side, centerX: number, centerY: number, formation: Formation): Ship[] {
  const shipTypes: ShipType[] = [
    ShipType.DESTROYER,
    ShipType.CRUISER,
    ShipType.CRUISER,
    ShipType.BATTLESHIP,
    ShipType.BATTLESHIP
  ];

  const offsets = getFormationOffsets(formation);
  const fleet: Ship[] = [];

  for (let i = 0; i < 5; i++) {
    const offset = offsets[i];
    const x = centerX + (side === Side.PLAYER ? offset.x : -offset.x);
    const y = centerY + offset.y;
    fleet.push(createShip(shipTypes[i], side, x, y, offset));
  }

  return fleet;
}

export function createEnemyFleet(): Ship[] {
  const fleet: Ship[] = [];
  const shipTypes: ShipType[] = [
    ShipType.DESTROYER,
    ShipType.CRUISER,
    ShipType.CRUISER,
    ShipType.BATTLESHIP,
    ShipType.BATTLESHIP
  ];

  for (let i = 0; i < 5; i++) {
    const x = CANVAS_WIDTH * 0.6 + Math.random() * (CANVAS_WIDTH * 0.35);
    const y = 80 + Math.random() * (CANVAS_HEIGHT - 160);
    fleet.push(createShip(shipTypes[i], Side.ENEMY, x, y, { x: 0, y: 0 }));
  }

  return fleet;
}

export function moveFleet(state: GameState, targetX: number, targetY: number): void {
  state.fleetTargetX = Math.max(50, Math.min(CANVAS_WIDTH - 50, targetX));
  state.fleetTargetY = Math.max(50, Math.min(CANVAS_HEIGHT - 50, targetY));

  const dx = targetX - state.fleetCenterX;
  const dy = targetY - state.fleetCenterY;
  const fleetRotation = Math.atan2(dy, dx);

  const offsets = getFormationOffsets(state.currentFormation);

  state.playerShips.forEach((ship, index) => {
    if (ship.isSinking) return;
    const offset = offsets[index];
    const rotatedX = offset.x * Math.cos(fleetRotation) - offset.y * Math.sin(fleetRotation);
    const rotatedY = offset.x * Math.sin(fleetRotation) + offset.y * Math.cos(fleetRotation);
    ship.targetX = state.fleetTargetX + rotatedX;
    ship.targetY = state.fleetTargetY + rotatedY;
    ship.targetRotation = fleetRotation;
  });
}

export function switchFormation(state: GameState, formation: Formation): void {
  if (state.currentFormation === formation) return;

  state.currentFormation = formation;
  const offsets = getFormationOffsets(formation);
  const now = performance.now();

  state.playerShips.forEach((ship, index) => {
    if (ship.isSinking) return;
    ship.formationOffset = offsets[index];
    ship.transitionStartX = ship.x;
    ship.transitionStartY = ship.y;
    ship.transitionStartTime = now;
    ship.isTransitioning = true;
  });

  moveFleet(state, state.fleetTargetX, state.fleetTargetY);
}

export function activateFocusFire(state: GameState): void {
  const now = performance.now();
  state.isFocusFire = true;
  state.focusFireEndTime = now + FOCUS_FIRE_DURATION;

  let closestEnemy: Ship | null = null;
  let closestDist = Infinity;

  for (const enemy of state.enemyShips) {
    if (enemy.isSinking) continue;
    const dx = enemy.x - state.fleetCenterX;
    const dy = enemy.y - state.fleetCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < closestDist) {
      closestDist = dist;
      closestEnemy = enemy;
    }
  }

  if (closestEnemy) {
    state.targetShipId = closestEnemy.id;
  }
}

function fireProjectile(ship: Ship, targetShip: Ship, isFocusFire: boolean): Projectile {
  const dx = targetShip.x - ship.x;
  const dy = targetShip.y - ship.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const vx = (dx / dist) * PROJECTILE_SPEED;
  const vy = (dy / dist) * PROJECTILE_SPEED;

  return {
    id: projectileIdCounter++,
    x: ship.x,
    y: ship.y,
    vx,
    vy,
    damage: PROJECTILE_DAMAGE,
    ownerSide: ship.side,
    isFocusFire,
    trail: []
  };
}

function createWakeParticle(ship: Ship): Particle {
  const angle = ship.rotation + Math.PI;
  const offsetDist = SHIP_SIZES[ship.type].height / 2;
  return {
    x: ship.x + Math.cos(angle) * offsetDist + (Math.random() - 0.5) * 8,
    y: ship.y + Math.sin(angle) * offsetDist + (Math.random() - 0.5) * 8,
    vx: Math.cos(angle) * 10 + (Math.random() - 0.5) * 20,
    vy: Math.sin(angle) * 10 + (Math.random() - 0.5) * 20,
    life: WAKE_PARTICLE_LIFE,
    maxLife: WAKE_PARTICLE_LIFE,
    color: 'rgba(255, 255, 255, 0.6)',
    size: 2 + Math.random() * 3,
    type: 'wake'
  };
}

function createExplosionParticles(x: number, y: number): Particle[] {
  const particles: Particle[] = [];
  const colors = ['#ff4444', '#ff8800', '#ffcc00', '#ff6600'];

  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 80;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 300,
      maxLife: 300,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 5,
      type: 'explosion'
    });
  }

  return particles;
}

function getTargetForShip(ship: Ship, state: GameState): Ship | null {
  const enemies = ship.side === Side.PLAYER ? state.enemyShips : state.playerShips;

  if (ship.side === Side.PLAYER && state.isFocusFire && state.targetShipId !== null) {
    const target = enemies.find(e => e.id === state.targetShipId && !e.isSinking);
    if (target) return target;
  }

  let closest: Ship | null = null;
  let closestDist = Infinity;

  for (const enemy of enemies) {
    if (enemy.isSinking) continue;
    const dx = enemy.x - ship.x;
    const dy = enemy.y - ship.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < closestDist && dist <= FIRE_RANGE) {
      closestDist = dist;
      closest = enemy;
    }
  }

  return closest;
}

function isInRange(ship: Ship, enemies: Ship[]): boolean {
  for (const enemy of enemies) {
    if (enemy.isSinking) continue;
    const dx = enemy.x - ship.x;
    const dy = enemy.y - ship.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= FIRE_RANGE) return true;
  }
  return false;
}

export function updateShips(state: GameState, dt: number, now: number): void {
  if (state.isFocusFire && now > state.focusFireEndTime) {
    state.isFocusFire = false;
    state.targetShipId = null;
  }

  let centerX = 0;
  let centerY = 0;
  let aliveCount = 0;

  for (const ship of state.playerShips) {
    if (ship.isSinking) continue;

    if (ship.isTransitioning) {
      const t = Math.min(1, (now - ship.transitionStartTime) / FORMATION_TRANSITION_TIME);
      const easedT = easeInOut(t);
      ship.x = ship.transitionStartX + (ship.targetX - ship.transitionStartX) * easedT;
      ship.y = ship.transitionStartY + (ship.targetY - ship.transitionStartY) * easedT;
      if (t >= 1) ship.isTransitioning = false;
    } else {
      const dx = ship.targetX - ship.x;
      const dy = ship.targetY - ship.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 1) {
        const moveDist = Math.min(dist, SHIP_SPEED * dt);
        ship.x += (dx / dist) * moveDist;
        ship.y += (dy / dist) * moveDist;
      }
    }

    let rotDiff = ship.targetRotation - ship.rotation;
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    ship.rotation += rotDiff * Math.min(1, dt * 5);

    centerX += ship.x;
    centerY += ship.y;
    aliveCount++;

    if (Math.random() < 0.3) {
      state.particles.push(createWakeParticle(ship));
    }
  }

  if (aliveCount > 0) {
    state.fleetCenterX = centerX / aliveCount;
    state.fleetCenterY = centerY / aliveCount;
  }

  for (const ship of state.enemyShips) {
    if (ship.isSinking) continue;

    const target = getTargetForShip(ship, state);
    if (target) {
      ship.targetRotation = Math.atan2(target.y - ship.y, target.x - ship.x);
    }

    let rotDiff = ship.targetRotation - ship.rotation;
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    ship.rotation += rotDiff * Math.min(1, dt * 3);
  }

  for (const ship of [...state.playerShips, ...state.enemyShips]) {
    if (ship.isSinking) continue;

    const fireRate = (ship.side === Side.PLAYER && state.isFocusFire) ? FOCUS_FIRE_RATE : NORMAL_FIRE_RATE;
    const enemies = ship.side === Side.PLAYER ? state.enemyShips : state.playerShips;

    if (now - ship.lastFireTime >= fireRate && isInRange(ship, enemies)) {
      const target = getTargetForShip(ship, state);
      if (target) {
        state.projectiles.push(fireProjectile(ship, target, ship.side === Side.PLAYER && state.isFocusFire));
        ship.lastFireTime = now;
      }
    }
  }

  for (const ship of [...state.playerShips, ...state.enemyShips]) {
    if (ship.isSinking) {
      const sinkProgress = (now - ship.sinkStartTime) / SHIP_SINK_DURATION;
      if (sinkProgress >= 1) {
        if (ship.side === Side.PLAYER) {
          state.shatterAnimationTime = now;
        } else {
          state.sinkCount++;
        }
      }
    }
  }

  state.playerShips = state.playerShips.filter(s => !s.isSinking || (now - s.sinkStartTime) < SHIP_SINK_DURATION);
  state.enemyShips = state.enemyShips.filter(s => !s.isSinking || (now - s.sinkStartTime) < SHIP_SINK_DURATION);
}

export function updateProjectiles(state: GameState, dt: number, now: number): void {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const proj = state.projectiles[i];

    proj.trail.unshift({ x: proj.x, y: proj.y });
    if (proj.trail.length > 8) proj.trail.pop();

    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;

    if (proj.x < 0 || proj.x > CANVAS_WIDTH || proj.y < 0 || proj.y > CANVAS_HEIGHT) {
      state.projectiles.splice(i, 1);
      continue;
    }

    const targets = proj.ownerSide === Side.PLAYER ? state.enemyShips : state.playerShips;
    let hit = false;

    for (const target of targets) {
      if (target.isSinking) continue;
      const dx = proj.x - target.x;
      const dy = proj.y - target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = SHIP_SIZES[target.type].radius + 4;

      if (dist < hitRadius) {
        target.health -= proj.damage;
        state.particles.push(...createExplosionParticles(proj.x, proj.y));
        hit = true;

        if (target.health <= 0) {
          target.health = 0;
          target.isSinking = true;
          target.sinkStartTime = now;
        }
        break;
      }
    }

    if (hit) {
      state.projectiles.splice(i, 1);
    }
  }
}

export function updateParticles(state: GameState, dt: number, _now: number): void {
  const dtMs = dt * 1000;

  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dtMs;
    p.vx *= 0.98;
    p.vy *= 0.98;

    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }
}

export function getFleetHealthPercent(state: GameState): number {
  let totalHealth = 0;
  let totalMaxHealth = 0;

  for (const ship of state.playerShips) {
    if (!ship.isSinking) {
      totalHealth += ship.health;
    }
    totalMaxHealth += ship.maxHealth;
  }

  return totalMaxHealth > 0 ? (totalHealth / totalMaxHealth) * 100 : 0;
}

export function getHealthBarColor(percent: number): string {
  if (percent >= 70) return '#22c55e';
  if (percent >= 40) return '#eab308';
  return '#ef4444';
}

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
