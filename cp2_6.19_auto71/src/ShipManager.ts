export type ShipType = 'destroyer' | 'cruiser' | 'battleship';
export type Team = 'player' | 'enemy';
export type FormationType = 'arrow' | 'line' | 'circle';
export type ParticleType = 'wake' | 'explosion' | 'shatter';

export interface Ship {
  id: string;
  type: ShipType;
  team: Team;
  x: number;
  y: number;
  rotation: number;
  targetX: number;
  targetY: number;
  targetRotation: number;
  prevX: number;
  prevY: number;
  hp: number;
  maxHp: number;
  speed: number;
  fireCooldown: number;
  baseFireRate: number;
  range: number;
  damage: number;
  formationOffsetX: number;
  formationOffsetY: number;
  targetFormationOffsetX: number;
  targetFormationOffsetY: number;
  formationTransitionProgress: number;
  isSinking: boolean;
  sinkProgress: number;
  isAlive: boolean;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  team: Team;
  isFocusFire: boolean;
  trail: { x: number; y: number }[];
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
  type: ParticleType;
}

const SHIP_CONFIGS: Record<ShipType, { hp: number; speed: number; range: number; damage: number; fireRate: number }> = {
  destroyer: { hp: 60, speed: 1.8, range: 150, damage: 8, fireRate: 2000 },
  cruiser: { hp: 100, speed: 1.2, range: 150, damage: 15, fireRate: 2000 },
  battleship: { hp: 180, speed: 0.7, range: 150, damage: 25, fireRate: 2000 }
};

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

export class ShipManager {
  ships: Ship[] = [];
  projectiles: Projectile[] = [];
  particles: Particle[] = [];
  formation: FormationType = 'arrow';
  fleetCenterX: number = 200;
  fleetCenterY: number = 300;
  fleetTargetX: number = 200;
  fleetTargetY: number = 300;
  fleetRotation: number = 0;
  isFocusFire: boolean = false;
  focusFireTimer: number = 0;
  focusTargetId: string | null = null;
  destroyedPlayerShips: string[] = [];
  killCount: number = 0;
  private projectileIdCounter: number = 0;
  private shipIdCounter: number = 0;

  private genShipId(): string {
    return `ship_${++this.shipIdCounter}`;
  }

  private genProjectileId(): string {
    return `proj_${++this.projectileIdCounter}`;
  }

  init(canvasWidth: number, canvasHeight: number): void {
    this.ships = [];
    this.projectiles = [];
    this.particles = [];
    this.destroyedPlayerShips = [];
    this.killCount = 0;
    this.formation = 'arrow';
    this.isFocusFire = false;
    this.focusFireTimer = 0;
    this.focusTargetId = null;

    this.fleetCenterX = 150;
    this.fleetCenterY = canvasHeight / 2;
    this.fleetTargetX = this.fleetCenterX;
    this.fleetTargetY = this.fleetCenterY;

    const playerTypes: ShipType[] = ['destroyer', 'cruiser', 'cruiser', 'battleship', 'battleship'];
    playerTypes.forEach((type) => {
      this.ships.push(this.createShip(type, 'player', 0, 0));
    });
    this.applyFormation(this.formation, false);

    const enemyTypes: ShipType[] = ['destroyer', 'cruiser', 'cruiser', 'battleship', 'battleship'];
    enemyTypes.forEach((type) => {
      const x = canvasWidth * 0.6 + Math.random() * (canvasWidth * 0.35);
      const y = 80 + Math.random() * (canvasHeight - 160);
      this.ships.push(this.createShip(type, 'enemy', x, y));
    });
  }

  private createShip(type: ShipType, team: Team, x: number, y: number): Ship {
    const cfg = SHIP_CONFIGS[type];
    return {
      id: this.genShipId(),
      type,
      team,
      x,
      y,
      rotation: team === 'player' ? 0 : Math.PI,
      targetX: x,
      targetY: y,
      targetRotation: team === 'player' ? 0 : Math.PI,
      prevX: x,
      prevY: y,
      hp: cfg.hp,
      maxHp: cfg.hp,
      speed: cfg.speed,
      fireCooldown: Math.random() * 1000,
      baseFireRate: cfg.fireRate,
      range: cfg.range,
      damage: cfg.damage,
      formationOffsetX: 0,
      formationOffsetY: 0,
      targetFormationOffsetX: 0,
      targetFormationOffsetY: 0,
      formationTransitionProgress: 1,
      isSinking: false,
      sinkProgress: 0,
      isAlive: true
    };
  }

  applyFormation(formation: FormationType, animate: boolean = true): void {
    this.formation = formation;
    const playerShips = this.ships.filter(s => s.team === 'player' && s.isAlive);
    const destroyer = playerShips.find(s => s.type === 'destroyer');
    const cruisers = playerShips.filter(s => s.type === 'cruiser');
    const battleships = playerShips.filter(s => s.type === 'battleship');
    const spacing = 55;

    const setOffset = (ship: Ship, ox: number, oy: number) => {
      if (animate) {
        ship.formationTransitionProgress = 0;
        ship.targetFormationOffsetX = ox;
        ship.targetFormationOffsetY = oy;
      } else {
        ship.formationOffsetX = ox;
        ship.formationOffsetY = oy;
        ship.targetFormationOffsetX = ox;
        ship.targetFormationOffsetY = oy;
        ship.formationTransitionProgress = 1;
      }
    };

    if (formation === 'arrow') {
      if (destroyer) setOffset(destroyer, 0, 0);
      if (cruisers[0]) setOffset(cruisers[0], -spacing, -spacing * 0.6);
      if (cruisers[1]) setOffset(cruisers[1], -spacing, spacing * 0.6);
      if (battleships[0]) setOffset(battleships[0], -spacing * 2, -spacing * 1.2);
      if (battleships[1]) setOffset(battleships[1], -spacing * 2, spacing * 1.2);
    } else if (formation === 'line') {
      const ordered: Ship[] = [];
      if (battleships[0]) ordered.push(battleships[0]);
      if (cruisers[0]) ordered.push(cruisers[0]);
      if (destroyer) ordered.push(destroyer);
      if (cruisers[1]) ordered.push(cruisers[1]);
      if (battleships[1]) ordered.push(battleships[1]);
      const totalW = (ordered.length - 1) * spacing;
      ordered.forEach((ship, i) => {
        setOffset(ship, 0, i * spacing - totalW / 2);
      });
    } else if (formation === 'circle') {
      const all = playerShips;
      const r = spacing * 1.2;
      all.forEach((ship, i) => {
        const angle = (i / all.length) * Math.PI * 2 - Math.PI / 2;
        setOffset(ship, Math.cos(angle) * r, Math.sin(angle) * r);
      });
    }
  }

  setFleetTarget(x: number, y: number): void {
    this.fleetTargetX = x;
    this.fleetTargetY = y;
    const dx = x - this.fleetCenterX;
    const dy = y - this.fleetCenterY;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      this.fleetRotation = Math.atan2(dy, dx);
    }
  }

  activateFocusFire(duration: number = 5000): void {
    this.isFocusFire = true;
    this.focusFireTimer = duration;
    const enemies = this.ships.filter(s => s.team === 'enemy' && s.isAlive);
    if (enemies.length === 0) return;
    const playerCenter = this.getFleetCenter();
    let closest: Ship | null = null;
    let closestDist = Infinity;
    enemies.forEach(e => {
      const d = Math.hypot(e.x - playerCenter.x, e.y - playerCenter.y);
      if (d < closestDist) { closestDist = d; closest = e; }
    });
    if (closest) this.focusTargetId = closest.id;
  }

  getFleetCenter(): { x: number; y: number } {
    return { x: this.fleetCenterX, y: this.fleetCenterY };
  }

  getAlivePlayerShips(): Ship[] {
    return this.ships.filter(s => s.team === 'player' && s.isAlive);
  }

  getTotalPlayerHp(): { current: number; max: number } {
    let cur = 0, max = 0;
    this.ships.filter(s => s.team === 'player').forEach(s => {
      max += s.maxHp;
      cur += Math.max(0, s.hp);
    });
    return { current: cur, max };
  }

  update(dt: number, canvasWidth: number, canvasHeight: number): { playerShipSunk: boolean } {
    let playerShipSunk = false;

    if (this.isFocusFire) {
      this.focusFireTimer -= dt;
      if (this.focusFireTimer <= 0) {
        this.isFocusFire = false;
        this.focusTargetId = null;
      }
    }

    const fdx = this.fleetTargetX - this.fleetCenterX;
    const fdy = this.fleetTargetY - this.fleetCenterY;
    const fDist = Math.hypot(fdx, fdy);
    if (fDist > 0.5) {
      const fleetSpeed = 0.8;
      const move = Math.min(fDist, fleetSpeed * dt / 16);
      this.fleetCenterX += (fdx / fDist) * move;
      this.fleetCenterY += (fdy / fDist) * move;
    }

    const playerShips = this.getAlivePlayerShips();
    playerShips.forEach(ship => {
      if (ship.formationTransitionProgress < 1) {
        ship.formationTransitionProgress = Math.min(1, ship.formationTransitionProgress + dt / 300);
        const t = easeInOutQuad(ship.formationTransitionProgress);
        ship.formationOffsetX = lerp(ship.formationOffsetX, ship.targetFormationOffsetX, t);
        ship.formationOffsetY = lerp(ship.formationOffsetY, ship.targetFormationOffsetY, t);
      }

      const cos = Math.cos(this.fleetRotation);
      const sin = Math.sin(this.fleetRotation);
      const targetWorldX = this.fleetCenterX + ship.formationOffsetX * cos - ship.formationOffsetY * sin;
      const targetWorldY = this.fleetCenterY + ship.formationOffsetX * sin + ship.formationOffsetY * cos;

      ship.targetX = targetWorldX;
      ship.targetY = targetWorldY;
      ship.targetRotation = this.fleetRotation;
    });

    const enemies = this.ships.filter(s => s.team === 'enemy' && s.isAlive);
    const playerShipsAlive = this.getAlivePlayerShips();
    enemies.forEach(enemy => {
      if (playerShipsAlive.length === 0) return;
      let closest: Ship | null = null;
      let closestDist = Infinity;
      playerShipsAlive.forEach(p => {
        const d = Math.hypot(p.x - enemy.x, p.y - enemy.y);
        if (d < closestDist) { closestDist = d; closest = p; }
      });
      if (closest) {
        enemy.targetRotation = Math.atan2(closest.y - enemy.y, closest.x - enemy.x);
        if (closestDist > enemy.range * 0.8) {
          enemy.targetX = closest.x;
          enemy.targetY = closest.y;
        } else {
          enemy.targetX = enemy.x;
          enemy.targetY = enemy.y;
        }
      }
    });

    this.ships.forEach(ship => {
      if (!ship.isAlive) return;
      if (ship.isSinking) {
        ship.sinkProgress += dt / 500;
        if (ship.sinkProgress >= 1) {
          ship.isAlive = false;
          if (ship.team === 'enemy') {
            this.killCount++;
          } else {
            this.destroyedPlayerShips.push(ship.id);
            playerShipSunk = true;
          }
        }
        return;
      }

      ship.prevX = ship.x;
      ship.prevY = ship.y;

      const dx = ship.targetX - ship.x;
      const dy = ship.targetY - ship.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.5) {
        const move = Math.min(dist, ship.speed * dt / 16);
        ship.x += (dx / dist) * move;
        ship.y += (dy / dist) * move;

        if (Math.random() < 0.4) {
          const wakeAngle = ship.rotation + Math.PI + (Math.random() - 0.5) * 0.5;
          this.particles.push({
            x: ship.x + Math.cos(ship.rotation + Math.PI) * 10,
            y: ship.y + Math.sin(ship.rotation + Math.PI) * 10,
            vx: Math.cos(wakeAngle) * 0.3,
            vy: Math.sin(wakeAngle) * 0.3,
            life: 1000,
            maxLife: 1000,
            color: '#ffffff',
            size: 2 + Math.random() * 2,
            type: 'wake'
          });
        }
      }

      const targetRot = ship.targetRotation;
      const rotDiff = normalizeAngle(targetRot - ship.rotation);
      if (Math.abs(rotDiff) > 0.01) {
        const rotSpeed = 0.05 * dt / 16;
        ship.rotation += Math.sign(rotDiff) * Math.min(Math.abs(rotDiff), rotSpeed);
      }

      ship.fireCooldown -= dt;
      if (ship.fireCooldown <= 0) {
        const effectiveFireRate = this.isFocusFire && ship.team === 'player' ? ship.baseFireRate / 2 : ship.baseFireRate;
        const target = this.findFireTarget(ship);
        if (target) {
          this.fireProjectile(ship, target);
          ship.fireCooldown = effectiveFireRate;
        } else {
          ship.fireCooldown = 200;
        }
      }

      ship.x = Math.max(15, Math.min(canvasWidth - 15, ship.x));
      ship.y = Math.max(15, Math.min(canvasHeight - 15, ship.y));
    });

    this.projectiles = this.projectiles.filter(p => {
      p.trail.unshift({ x: p.x, y: p.y });
      if (p.trail.length > 8) p.trail.pop();
      p.x += p.vx * dt / 16;
      p.y += p.vy * dt / 16;

      if (p.x < 0 || p.x > canvasWidth || p.y < 0 || p.y > canvasHeight) return false;

      const targets = this.ships.filter(s => s.team !== p.team && s.isAlive && !s.isSinking);
      for (const t of targets) {
        const hitRadius = t.type === 'battleship' ? 18 : t.type === 'cruiser' ? 14 : 10;
        if (Math.hypot(p.x - t.x, p.y - t.y) < hitRadius) {
          this.onProjectileHit(p, t);
          return false;
        }
      }
      return true;
    });

    this.particles = this.particles.filter(p => {
      p.life -= dt;
      p.x += p.vx * dt / 16;
      p.y += p.vy * dt / 16;
      if (p.type === 'explosion') {
        p.vx *= 0.96;
        p.vy *= 0.96;
      }
      return p.life > 0;
    });

    if (this.isFocusFire && this.focusTargetId) {
      const t = this.ships.find(s => s.id === this.focusTargetId);
      if (!t || !t.isAlive) {
        const remaining = this.ships.filter(s => s.team === 'enemy' && s.isAlive);
        if (remaining.length > 0) {
          this.focusTargetId = remaining[0].id;
        } else {
          this.focusTargetId = null;
        }
      }
    }

    return { playerShipSunk };
  }

  private findFireTarget(ship: Ship): Ship | null {
    if (!ship.isAlive || ship.isSinking) return null;
    const enemies = this.ships.filter(s => s.team !== ship.team && s.isAlive && !s.isSinking);
    if (enemies.length === 0) return null;

    if (ship.team === 'player' && this.isFocusFire && this.focusTargetId) {
      const ft = this.ships.find(s => s.id === this.focusTargetId);
      if (ft && ft.isAlive && !ft.isSinking) {
        const d = Math.hypot(ft.x - ship.x, ft.y - ship.y);
        if (d <= ship.range) return ft;
      }
    }

    let closest: Ship | null = null;
    let closestDist = Infinity;
    enemies.forEach(e => {
      const d = Math.hypot(e.x - ship.x, e.y - ship.y);
      if (d <= ship.range && d < closestDist) {
        closestDist = d;
        closest = e;
      }
    });
    return closest;
  }

  private fireProjectile(ship: Ship, target: Ship): void {
    const angle = Math.atan2(target.y - ship.y, target.x - ship.x);
    const speed = 5;
    const isFocus = ship.team === 'player' && this.isFocusFire;
    this.projectiles.push({
      id: this.genProjectileId(),
      x: ship.x + Math.cos(angle) * 15,
      y: ship.y + Math.sin(angle) * 15,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: ship.damage,
      team: ship.team,
      isFocusFire: isFocus,
      trail: []
    });
  }

  private onProjectileHit(proj: Projectile, target: Ship): void {
    target.hp -= proj.damage;
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      const colors = ['#ff4444', '#ff6633', '#ffaa22', '#ff8800'];
      this.particles.push({
        x: target.x,
        y: target.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 300,
        maxLife: 300,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 4,
        type: 'explosion'
      });
    }
    if (target.hp <= 0 && !target.isSinking) {
      target.isSinking = true;
      target.sinkProgress = 0;
    }
  }

  spawnShatterEffect(centerX: number, centerY: number): void {
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 400,
        maxLife: 400,
        color: '#cc2222',
        size: 3 + Math.random() * 5,
        type: 'shatter'
      });
    }
  }
}
