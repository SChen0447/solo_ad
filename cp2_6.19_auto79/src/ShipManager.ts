export enum ShipType {
  Destroyer = 'destroyer',
  Cruiser = 'cruiser',
  Battleship = 'battleship'
}

export enum FormationType {
  Arrow = 'arrow',
  Line = 'line',
  Circle = 'circle'
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  speed: number;
  isFocusFire: boolean;
  fromPlayer: boolean;
  trail: Particle[];
  alive: boolean;
}

export interface Ship {
  id: number;
  type: ShipType;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  angle: number;
  targetAngle: number;
  health: number;
  maxHealth: number;
  isPlayer: boolean;
  isSinking: boolean;
  sinkTimer: number;
  isDead: boolean;
  fireTimer: number;
  fireInterval: number;
  formationOffsetX: number;
  formationOffsetY: number;
  formationOffsetAngle: number;
  transitionProgress: number;
  prevOffsetX: number;
  prevOffsetY: number;
  prevOffsetAngle: number;
  trail: Particle[];
  speed: number;
  renderOffsetX: number;
  renderOffsetY: number;
  dockSwayTimer: number;
  trailSpawnAccumulator: number;
  decelerationFactor: number;
  animPhase: number;
}

const SHIP_CONFIGS: Record<ShipType, { health: number; speed: number; size: number }> = {
  [ShipType.Destroyer]: { health: 60, speed: 3.0, size: 14 },
  [ShipType.Cruiser]: { health: 100, speed: 2.2, size: 18 },
  [ShipType.Battleship]: { health: 160, speed: 1.5, size: 24 }
};

const FORMATION_NAMES: Record<FormationType, string> = {
  [FormationType.Arrow]: '箭形阵',
  [FormationType.Line]: '线形横排',
  [FormationType.Circle]: '圆形防御'
};

export function getFormationName(type: FormationType): string {
  return FORMATION_NAMES[type];
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function computeFormationOffsets(
  formation: FormationType,
  shipCount: number
): { offsetX: number; offsetY: number; angle: number }[] {
  const offsets: { offsetX: number; offsetY: number; angle: number }[] = [];

  if (formation === FormationType.Arrow) {
    offsets.push({ offsetX: 0, offsetY: -40, angle: 0 });
    const backShips = shipCount - 1;
    for (let i = 0; i < backShips; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const row = Math.floor(i / 2) + 1;
      offsets.push({
        offsetX: side * 35 * row,
        offsetY: 30 * row,
        angle: side * 0.2
      });
    }
  } else if (formation === FormationType.Line) {
    const totalWidth = (shipCount - 1) * 50;
    for (let i = 0; i < shipCount; i++) {
      offsets.push({
        offsetX: -totalWidth / 2 + i * 50,
        offsetY: 0,
        angle: 0
      });
    }
  } else if (formation === FormationType.Circle) {
    const radius = 45;
    for (let i = 0; i < shipCount; i++) {
      const a = (i / shipCount) * Math.PI * 2 - Math.PI / 2;
      offsets.push({
        offsetX: Math.cos(a) * radius,
        offsetY: Math.sin(a) * radius,
        angle: a + Math.PI / 2
      });
    }
  }

  return offsets;
}

export class ShipManager {
  playerShips: Ship[] = [];
  enemyShips: Ship[] = [];
  projectiles: Projectile[] = [];
  explosions: Particle[] = [];
  formation: FormationType = FormationType.Arrow;
  focusFireActive: boolean = false;
  focusFireTimer: number = 0;
  focusFireTarget: Ship | null = null;
  fleetTargetX: number = 200;
  fleetTargetY: number = 300;
  private nextId = 0;

  createPlayerFleet(): void {
    this.playerShips = [];
    this.nextId = 0;
    const types = [
      ShipType.Destroyer,
      ShipType.Cruiser,
      ShipType.Cruiser,
      ShipType.Battleship,
      ShipType.Battleship
    ];
    const offsets = computeFormationOffsets(this.formation, types.length);
    for (let i = 0; i < types.length; i++) {
      const cfg = SHIP_CONFIGS[types[i]];
      const ship: Ship = {
        id: this.nextId++,
        type: types[i],
        x: 200 + offsets[i].offsetX,
        y: 300 + offsets[i].offsetY,
        targetX: 200 + offsets[i].offsetX,
        targetY: 300 + offsets[i].offsetY,
        angle: 0,
        targetAngle: 0,
        health: cfg.health,
        maxHealth: cfg.health,
        isPlayer: true,
        isSinking: false,
        sinkTimer: 0,
        isDead: false,
        fireTimer: 0,
        fireInterval: 2.0,
        formationOffsetX: offsets[i].offsetX,
        formationOffsetY: offsets[i].offsetY,
        formationOffsetAngle: offsets[i].angle,
        transitionProgress: 1,
        prevOffsetX: offsets[i].offsetX,
        prevOffsetY: offsets[i].offsetY,
        prevOffsetAngle: offsets[i].angle,
        trail: [],
        speed: cfg.speed,
        renderOffsetX: 0,
        renderOffsetY: 0,
        dockSwayTimer: 0,
        trailSpawnAccumulator: 0,
        decelerationFactor: 1.0,
        animPhase: 0
      };
      this.playerShips.push(ship);
    }
  }

  createEnemyFleet(): void {
    this.enemyShips = [];
    const types = [
      ShipType.Destroyer,
      ShipType.Cruiser,
      ShipType.Cruiser,
      ShipType.Battleship,
      ShipType.Battleship
    ];
    for (let i = 0; i < types.length; i++) {
      const cfg = SHIP_CONFIGS[types[i]];
      const ex = 500 + Math.random() * 250;
      const ey = 50 + Math.random() * 500;
      this.enemyShips.push({
        id: this.nextId++,
        type: types[i],
        x: ex,
        y: ey,
        targetX: ex,
        targetY: ey,
        angle: Math.PI,
        targetAngle: Math.PI,
        health: cfg.health,
        maxHealth: cfg.health,
        isPlayer: false,
        isSinking: false,
        sinkTimer: 0,
        isDead: false,
        fireTimer: Math.random() * 2,
        fireInterval: 2.0,
        formationOffsetX: 0,
        formationOffsetY: 0,
        formationOffsetAngle: 0,
        transitionProgress: 1,
        prevOffsetX: 0,
        prevOffsetY: 0,
        prevOffsetAngle: 0,
        trail: [],
        speed: cfg.speed * 0.6,
        renderOffsetX: 0,
        renderOffsetY: 0,
        dockSwayTimer: 0,
        trailSpawnAccumulator: 0,
        decelerationFactor: 1.0,
        animPhase: 0
      });
    }
  }

  setFormation(newFormation: FormationType): void {
    if (this.formation === newFormation) return;
    const offsets = computeFormationOffsets(newFormation, this.playerShips.filter(s => !s.isDead).length);
    const aliveShips = this.playerShips.filter(s => !s.isDead);
    for (let i = 0; i < aliveShips.length; i++) {
      const ship = aliveShips[i];
      ship.prevOffsetX = ship.formationOffsetX;
      ship.prevOffsetY = ship.formationOffsetY;
      ship.prevOffsetAngle = ship.formationOffsetAngle;
      ship.formationOffsetX = offsets[i].offsetX;
      ship.formationOffsetY = offsets[i].offsetY;
      ship.formationOffsetAngle = offsets[i].angle;
      ship.transitionProgress = 0;
    }
    this.formation = newFormation;
  }

  moveFleetTo(tx: number, ty: number): void {
    this.fleetTargetX = tx;
    this.fleetTargetY = ty;
  }

  activateFocusFire(): void {
    if (this.focusFireActive) return;
    this.focusFireActive = true;
    this.focusFireTimer = 5.0;
    const aliveEnemies = this.enemyShips.filter(s => !s.isDead && !s.isSinking);
    if (aliveEnemies.length === 0) return;
    let nearest: Ship | null = null;
    let minDist = Infinity;
    const cx = this.playerShips.filter(s => !s.isDead).reduce((s, sh) => s + sh.x, 0) /
      Math.max(1, this.playerShips.filter(s => !s.isDead).length);
    const cy = this.playerShips.filter(s => !s.isDead).reduce((s, sh) => s + sh.y, 0) /
      Math.max(1, this.playerShips.filter(s => !s.isDead).length);
    for (const e of aliveEnemies) {
      const d = Math.hypot(e.x - cx, e.y - cy);
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    }
    this.focusFireTarget = nearest;
  }

  private updateShipMovement(ship: Ship, dt: number): void {
    if (ship.isDead || ship.isSinking) return;

    ship.animPhase += dt;

    const dx = ship.targetX - ship.x;
    const dy = ship.targetY - ship.y;
    const dist = Math.hypot(dx, dy);

    const inFormationTransition = ship.transitionProgress < 1;

    let speedFactor = 1.0;
    let decelFactor = 1.0;

    if (!inFormationTransition && dist <= 50 && dist > 2) {
      decelFactor = 0.3 + 0.7 * (dist / 50);
      speedFactor = decelFactor;
      ship.dockSwayTimer = 0;
    } else if (!inFormationTransition && dist <= 2) {
      decelFactor = 0.3;
      speedFactor = 0;
      if (ship.dockSwayTimer < 1.0) {
        ship.dockSwayTimer += dt;
      }
    } else {
      decelFactor = 1.0;
      speedFactor = 1.0;
      ship.dockSwayTimer = 0;
    }

    ship.decelerationFactor = decelFactor;

    if (dist > 2) {
      const baseMoveSpeed = ship.speed * 60 * dt;
      const moveSpeed = baseMoveSpeed * speedFactor;
      const moveDist = Math.min(moveSpeed, dist);
      ship.x += (dx / dist) * moveDist;
      ship.y += (dy / dist) * moveDist;
      ship.targetAngle = Math.atan2(dy, dx) + Math.PI / 2;
    }

    let angleDiff = ship.targetAngle - ship.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    ship.angle += angleDiff * Math.min(1, 5 * dt);

    if (!inFormationTransition && dist <= 50 && dist > 2) {
      const pitchAmp = 3 + (ship.type === ShipType.Battleship ? 2 : 1);
      ship.renderOffsetY = Math.sin(ship.animPhase * (Math.PI * 2 / 0.3)) * pitchAmp;
      ship.renderOffsetX = 0;
    } else if (!inFormationTransition && dist <= 2 && ship.dockSwayTimer < 1.0) {
      const swayT = Math.min(1, ship.dockSwayTimer / 1.0);
      const swayAmp = 2 * (1 - swayT * 0.5);
      ship.renderOffsetX = Math.sin(ship.animPhase * (Math.PI * 2 / 0.5)) * swayAmp;
      ship.renderOffsetY = Math.sin(ship.animPhase * (Math.PI * 2 / 0.5) + 0.5) * (swayAmp * 0.3);
    } else {
      ship.renderOffsetX *= Math.min(1, 1 - dt * 5);
      ship.renderOffsetY *= Math.min(1, 1 - dt * 5);
    }

    if (dist > 2 && !ship.isSinking) {
      const slowT = 1 - decelFactor;
      const spawnInterval = 0.05 + slowT * 0.15;
      const particleSize = 3 - slowT * 2;
      const particleLife = 1.0 - slowT * 0.7;

      ship.trailSpawnAccumulator += dt;
      while (ship.trailSpawnAccumulator >= spawnInterval) {
        ship.trailSpawnAccumulator -= spawnInterval;
        ship.trail.push({
          x: ship.x - Math.sin(ship.angle) * (ship.type === ShipType.Battleship ? 12 : 8),
          y: ship.y + Math.cos(ship.angle) * (ship.type === ShipType.Battleship ? 12 : 8),
          vx: 0,
          vy: 0,
          life: particleLife,
          maxLife: particleLife,
          color: 'rgba(255,255,255,',
          size: particleSize
        });
      }
    } else {
      ship.trailSpawnAccumulator = 0;
    }
  }

  private updateTrail(ship: Ship, dt: number): void {
    for (let i = ship.trail.length - 1; i >= 0; i--) {
      ship.trail[i].life -= dt;
      if (ship.trail[i].life <= 0) {
        ship.trail.splice(i, 1);
      }
    }
  }

  private findNearestEnemy(ship: Ship): Ship | null {
    const enemies = ship.isPlayer
      ? this.enemyShips.filter(s => !s.isDead && !s.isSinking)
      : this.playerShips.filter(s => !s.isDead && !s.isSinking);
    if (enemies.length === 0) return null;
    let nearest: Ship | null = null;
    let minDist = Infinity;
    for (const e of enemies) {
      const d = Math.hypot(e.x - ship.x, e.y - ship.y);
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    }
    return nearest;
  }

  private fireProjectile(ship: Ship, target: Ship): void {
    const isFocus = this.focusFireActive && ship.isPlayer;
    const speed = 5;
    const dx = target.x - ship.x;
    const dy = target.y - ship.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;
    this.projectiles.push({
      x: ship.x,
      y: ship.y,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      targetX: target.x,
      targetY: target.y,
      speed,
      isFocusFire: isFocus,
      fromPlayer: ship.isPlayer,
      trail: [],
      alive: true
    });
  }

  private createExplosion(x: number, y: number): void {
    const colors = ['#ff4400', '#ff8800', '#ffaa00', '#ff2200'];
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 30 + Math.random() * 80;
      this.explosions.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.3,
        maxLife: 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 3
      });
    }
  }

  update(dt: number): void {
    if (this.focusFireActive) {
      this.focusFireTimer -= dt;
      if (this.focusFireTimer <= 0) {
        this.focusFireActive = false;
        this.focusFireTarget = null;
      }
      if (this.focusFireTarget && (this.focusFireTarget.isDead || this.focusFireTarget.isSinking)) {
        this.focusFireTarget = null;
        this.focusFireActive = false;
      }
    }

    const alivePlayerShips = this.playerShips.filter(s => !s.isDead);
    for (const ship of alivePlayerShips) {
      if (ship.transitionProgress < 1) {
        ship.transitionProgress = Math.min(1, ship.transitionProgress + dt / 0.3);
        const t = easeInOut(ship.transitionProgress);
        const currentOffsetX = ship.prevOffsetX + (ship.formationOffsetX - ship.prevOffsetX) * t;
        const currentOffsetY = ship.prevOffsetY + (ship.formationOffsetY - ship.prevOffsetY) * t;
        const currentOffsetAngle = ship.prevOffsetAngle + (ship.formationOffsetAngle - ship.prevOffsetAngle) * t;
        ship.targetX = this.fleetTargetX + currentOffsetX;
        ship.targetY = this.fleetTargetY + currentOffsetY;
        ship.targetAngle = currentOffsetAngle;
      } else {
        ship.targetX = this.fleetTargetX + ship.formationOffsetX;
        ship.targetY = this.fleetTargetY + ship.formationOffsetY;
      }

      this.updateShipMovement(ship, dt);
      this.updateTrail(ship, dt);
    }

    for (const ship of this.enemyShips) {
      if (ship.isDead) continue;
      if (ship.isSinking) {
        ship.sinkTimer -= dt;
        if (ship.sinkTimer <= 0) {
          ship.isDead = true;
        }
        continue;
      }

      const nearestPlayer = this.findNearestEnemy(ship);
      if (nearestPlayer) {
        const dist = Math.hypot(nearestPlayer.x - ship.x, nearestPlayer.y - ship.y);
        if (dist > 150) {
          const dx = nearestPlayer.x - ship.x;
          const dy = nearestPlayer.y - ship.y;
          const moveSpeed = ship.speed * 60 * dt;
          const d = Math.hypot(dx, dy);
          if (d > 0) {
            ship.x += (dx / d) * moveSpeed;
            ship.y += (dy / d) * moveSpeed;
          }
          ship.targetAngle = Math.atan2(dy, dx) + Math.PI / 2;
          let angleDiff = ship.targetAngle - ship.angle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          ship.angle += angleDiff * Math.min(1, 5 * dt);
        }
      }

      this.updateTrail(ship, dt);
    }

    const fireRange = 150;
    for (const ship of alivePlayerShips) {
      if (ship.isSinking) continue;
      ship.fireTimer -= dt;
      const interval = this.focusFireActive ? 1.0 : 2.0;
      if (ship.fireTimer <= 0) {
        let target: Ship | null = null;
        if (this.focusFireActive && this.focusFireTarget) {
          target = this.focusFireTarget;
        } else {
          target = this.findNearestEnemy(ship);
        }
        if (target) {
          const dist = Math.hypot(target.x - ship.x, target.y - ship.y);
          if (dist <= fireRange) {
            this.fireProjectile(ship, target);
            ship.fireTimer = interval;
          }
        }
      }
    }

    for (const ship of this.enemyShips) {
      if (ship.isSinking || ship.isDead) continue;
      ship.fireTimer -= dt;
      if (ship.fireTimer <= 0) {
        const target = this.findNearestEnemy(ship);
        if (target) {
          const dist = Math.hypot(target.x - ship.x, target.y - ship.y);
          if (dist <= fireRange) {
            this.fireProjectile(ship, target);
            ship.fireTimer = 2.0;
          }
        }
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.alive) continue;
      p.x += p.vx * 60 * dt;
      p.y += p.vy * 60 * dt;

      p.trail.push({
        x: p.x,
        y: p.y,
        vx: 0,
        vy: 0,
        life: 0.15,
        maxLife: 0.15,
        color: p.isFocusFire ? 'rgba(255,50,50,' : 'rgba(255,200,100,',
        size: 2
      });

      for (let j = p.trail.length - 1; j >= 0; j--) {
        p.trail[j].life -= dt;
        if (p.trail[j].life <= 0) p.trail.splice(j, 1);
      }

      const checkShips = p.fromPlayer ? this.enemyShips : this.playerShips;

      for (const target of checkShips) {
        if (target.isDead || target.isSinking) continue;
        const hitDist = target.type === ShipType.Battleship ? 16 : target.type === ShipType.Cruiser ? 14 : 10;
        if (Math.hypot(p.x - target.x, p.y - target.y) < hitDist) {
          p.alive = false;
          target.health -= 20;
          this.createExplosion(p.x, p.y);
          if (target.health <= 0) {
            target.health = 0;
            target.isSinking = true;
            target.sinkTimer = 0.5;
          }
          break;
        }
      }

      if (p.x < -50 || p.x > 850 || p.y < -50 || p.y > 650) {
        p.alive = false;
      }
    }

    this.projectiles = this.projectiles.filter(p => p.alive);

    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const e = this.explosions[i];
      e.life -= dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vx *= 0.95;
      e.vy *= 0.95;
      if (e.life <= 0) {
        this.explosions.splice(i, 1);
      }
    }

    for (const ship of this.playerShips) {
      if (ship.isSinking && !ship.isDead) {
        ship.sinkTimer -= dt;
        if (ship.sinkTimer <= 0) {
          ship.isDead = true;
        }
      }
    }
  }

  getPlayerTotalHealth(): number {
    return this.playerShips.reduce((s, sh) => s + Math.max(0, sh.health), 0);
  }

  getPlayerMaxHealth(): number {
    return this.playerShips.reduce((s, sh) => s + sh.maxHealth, 0);
  }

  getSunkenEnemyCount(): number {
    return this.enemyShips.filter(s => s.isDead).length;
  }

  isVictory(): boolean {
    return this.enemyShips.every(s => s.isDead);
  }

  isDefeat(): boolean {
    return this.playerShips.every(s => s.isDead);
  }
}
