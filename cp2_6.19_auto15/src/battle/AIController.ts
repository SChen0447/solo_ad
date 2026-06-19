export interface ShipEntity {
  id: string;
  team: 'player' | 'enemy';
  type: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  targetHeading: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  shieldRegen: number;
  attack: number;
  range: number;
  fireRate: number;
  fireCooldown: number;
  speed: number;
  turnRate: number;
  size: number;
  projectileSpeed: number;
  color: string;
  accentColor: string;
  targetId: string | null;
  alive: boolean;
  destroyedAt: number | null;
  spawnedAt: number;
  totalDamageDealt: number;
  kills: number;
  isExploding: boolean;
  explosionTime: number;
}

export interface Projectile {
  id: string;
  team: 'player' | 'enemy';
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  ownerId: string;
  life: number;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface Explosion {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
  fragments: { x: number; y: number; vx: number; vy: number; rot: number; rotSpeed: number; size: number; }[];
}

export class AIController {
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  update(ships: ShipEntity[], dt: number): void {
    for (const ship of ships) {
      if (!ship.alive) continue;
      this.selectTarget(ship, ships);
      this.computeMovement(ship, ships, dt);
    }
  }

  private selectTarget(ship: ShipEntity, ships: ShipEntity[]): void {
    if (ship.targetId) {
      const t = ships.find(s => s.id === ship.targetId);
      if (t && t.alive) {
        const dist = this.distance(ship, t);
        if (dist <= ship.range * 1.5) return;
      }
    }

    let best: ShipEntity | null = null;
    let bestScore = Infinity;

    for (const other of ships) {
      if (other.team === ship.team || !other.alive) continue;
      const d = this.distance(ship, other);
      if (d > ship.range * 3) continue;
      const threat = (other.attack + other.hp * 0.05) / Math.max(1, other.hp);
      const score = d + threat * 30;
      if (score < bestScore) {
        bestScore = score;
        best = other;
      }
    }

    if (!best) {
      for (const other of ships) {
        if (other.team === ship.team || !other.alive) continue;
        const d = this.distance(ship, other);
        if (d < bestScore) {
          bestScore = d;
          best = other;
        }
      }
    }

    ship.targetId = best ? best.id : null;
  }

  private computeMovement(ship: ShipEntity, ships: ShipEntity[], dt: number): void {
    const target = ships.find(s => s.id === ship.targetId);
    let desiredX: number;
    let desiredY: number;

    if (target && target.alive) {
      const dx = target.x - ship.x;
      const dy = target.y - ship.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const idealDist = ship.range * 0.75;
      const factor = (dist - idealDist) / dist;
      desiredX = ship.x + dx * factor;
      desiredY = ship.y + dy * factor;
      ship.targetHeading = Math.atan2(dy, dx);
    } else {
      const baseX = ship.team === 'player' ? this.width * 0.2 : this.width * 0.8;
      const baseY = this.height * 0.5;
      desiredX = baseX + Math.sin(performance.now() * 0.0003 + ship.spawnedAt) * 80;
      desiredY = baseY + Math.cos(performance.now() * 0.0004 + ship.spawnedAt) * 120;
      ship.targetHeading = ship.team === 'player' ? 0 : Math.PI;
    }

    this.separate(ship, ships, desiredX, desiredY);
    this.moveToward(ship, desiredX, desiredY, dt);
    this.applyTurning(ship, dt);
    this.clampToField(ship);
  }

  private separate(ship: ShipEntity, ships: ShipEntity[], dx: number, dy: number): void {
    let fx = 0, fy = 0;
    for (const other of ships) {
      if (!other.alive || other.id === ship.id) continue;
      const ddx = ship.x - other.x;
      const ddy = ship.y - other.y;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      const min = (ship.size + other.size) * 1.8;
      if (dist > 0 && dist < min) {
        const k = (min - dist) / min;
        fx += (ddx / dist) * k * 60;
        fy += (ddy / dist) * k * 60;
      }
    }
  }

  private moveToward(ship: ShipEntity, tx: number, ty: number, dt: number): void {
    const dx = tx - ship.x;
    const dy = ty - ship.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) {
      ship.vx *= 0.9;
      ship.vy *= 0.9;
      return;
    }
    const maxSpd = ship.speed * (dist > 80 ? 1 : Math.max(0.3, dist / 80));
    const ax = (dx / dist) * maxSpd;
    const ay = (dy / dist) * maxSpd;
    ship.vx += (ax - ship.vx) * Math.min(1, dt * 3);
    ship.vy += (ay - ship.vy) * Math.min(1, dt * 3);
    const v = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    if (v > ship.speed) {
      ship.vx = (ship.vx / v) * ship.speed;
      ship.vy = (ship.vy / v) * ship.speed;
    }
  }

  private applyTurning(ship: ShipEntity, dt: number): void {
    const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    if (speed > ship.speed * 0.1) {
      ship.targetHeading = Math.atan2(ship.vy, ship.vx);
    }
    let delta = ship.targetHeading - ship.heading;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    const maxTurn = ship.turnRate * dt;
    if (Math.abs(delta) <= maxTurn) {
      ship.heading = ship.targetHeading;
    } else {
      ship.heading += Math.sign(delta) * maxTurn;
    }
  }

  private clampToField(ship: ShipEntity): void {
    const pad = ship.size + 10;
    if (ship.x < pad) { ship.x = pad; ship.vx = Math.abs(ship.vx) * 0.5; }
    if (ship.x > this.width - pad) { ship.x = this.width - pad; ship.vx = -Math.abs(ship.vx) * 0.5; }
    if (ship.y < pad) { ship.y = pad; ship.vy = Math.abs(ship.vy) * 0.5; }
    if (ship.y > this.height - pad) { ship.y = this.height - pad; ship.vy = -Math.abs(ship.vy) * 0.5; }
  }

  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
