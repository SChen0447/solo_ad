import { ShipEntity, Projectile, Particle, Explosion, AIController } from './AIController';
import { PlacedShip, ShipPreset, getShipPreset, ShipType, SHIP_PRESETS } from '../fleet/ShipConfig';

export interface BattleState {
  ships: ShipEntity[];
  projectiles: Projectile[];
  particles: Particle[];
  explosions: Explosion[];
  time: number;
  paused: boolean;
  speed: number;
  ended: boolean;
  winner: 'player' | 'enemy' | 'draw' | null;
}

export interface BattleEvent {
  time: number;
  type: 'fire' | 'hit' | 'destroy' | 'start' | 'end';
  attackerId?: string;
  targetId?: string;
  damage?: number;
  winner?: 'player' | 'enemy' | 'draw';
}

export class BattleEngine {
  state: BattleState;
  private width: number;
  private height: number;
  private ai: AIController;
  events: BattleEvent[] = [];
  onEnd: ((state: BattleState, events: BattleEvent[]) => void) | null = null;
  private particlePool: Particle[] = [];
  private nextProjId = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.ai = new AIController(width, height);
    this.state = {
      ships: [],
      projectiles: [],
      particles: [],
      explosions: [],
      time: 0,
      paused: false,
      speed: 1,
      ended: false,
      winner: null
    };
    this.initParticlePool();
  }

  private initParticlePool(): void {
    for (let i = 0; i < 400; i++) {
      this.particlePool.push({
        x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, size: 0, color: '#fff'
      });
    }
  }

  initFleets(playerFleet: PlacedShip[], enemyFleet: PlacedShip[]): void {
    const now = performance.now();
    const pShips = playerFleet.map((s, i) => this.createEntity(s, 'player', i, playerFleet.length));
    const eShips = enemyFleet.map((s, i) => this.createEntity(s, 'enemy', i, enemyFleet.length));
    this.state.ships = [...pShips, ...eShips];
    this.events.push({ time: 0, type: 'start' });
  }

  private createEntity(placed: PlacedShip, team: 'player' | 'enemy', index: number, total: number): ShipEntity {
    const preset = SHIP_PRESETS[placed.type as ShipType];
    const isPlayer = team === 'player';
    const marginX = this.width * 0.12;
    const baseX = isPlayer ? marginX + (placed.gridX * 24) : this.width - marginX - (placed.gridX * 24);
    const ySpread = this.height * 0.72;
    const yBase = this.height * 0.14;
    const spacing = ySpread / Math.max(8, total);
    const baseY = yBase + (index * spacing) + (placed.gridY - 5) * 12;
    return {
      id: `${team}_${placed.id}`,
      team,
      type: placed.type,
      name: placed.name,
      x: baseX,
      y: baseY,
      vx: 0,
      vy: 0,
      heading: isPlayer ? 0 : Math.PI,
      targetHeading: isPlayer ? 0 : Math.PI,
      hp: preset.stats.hp,
      maxHp: preset.stats.hp,
      shield: preset.stats.shield,
      maxShield: preset.stats.shield,
      shieldRegen: preset.stats.shieldRegen,
      attack: preset.stats.attack,
      range: preset.stats.range,
      fireRate: preset.stats.fireRate,
      fireCooldown: Math.random() * preset.stats.fireRate,
      speed: preset.stats.speed,
      turnRate: preset.stats.turnRate,
      size: preset.stats.size,
      projectileSpeed: preset.stats.projectileSpeed,
      color: preset.stats.color,
      accentColor: preset.stats.accentColor,
      targetId: null,
      alive: true,
      destroyedAt: null,
      spawnedAt: performance.now() + index * 100,
      totalDamageDealt: 0,
      kills: 0,
      isExploding: false,
      explosionTime: 0
    };
  }

  update(dt: number): void {
    if (this.state.paused || this.state.ended) return;
    const step = dt * this.state.speed;
    this.state.time += step;

    this.ai.update(this.state.ships, step);

    for (const ship of this.state.ships) {
      if (!ship.alive) continue;
      ship.x += ship.vx * step;
      ship.y += ship.vy * step;
      if (ship.shield < ship.maxShield) {
        ship.shield = Math.min(ship.maxShield, ship.shield + ship.shieldRegen * step);
      }
      if (ship.fireCooldown > 0) {
        ship.fireCooldown -= step;
      }
      this.tryFire(ship);
    }

    this.updateProjectiles(step);
    this.updateParticles(step);
    this.updateExplosions(step);
    this.checkEnd();
  }

  private tryFire(ship: ShipEntity): void {
    if (!ship.targetId || ship.fireCooldown > 0) return;
    const target = this.state.ships.find(s => s.id === ship.targetId);
    if (!target || !target.alive) return;
    const dx = target.x - ship.x;
    const dy = target.y - ship.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > ship.range) return;
    const nx = dx / (dist || 1);
    const ny = dy / (dist || 1);
    const spread = ship.size * 0.3;
    const pCount = ship.type === ShipType.Battleship ? 3 : (ship.type === ShipType.Carrier ? 2 : 1);
    for (let i = 0; i < pCount; i++) {
      const off = pCount > 1 ? (i - (pCount - 1) / 2) * spread * 0.6 : 0;
      const perpX = -ny;
      const perpY = nx;
      const proj: Projectile = {
        id: `p_${this.nextProjId++}_${i}`,
        team: ship.team,
        x: ship.x + nx * (ship.size + 4) + perpX * off,
        y: ship.y + ny * (ship.size + 4) + perpY * off,
        vx: nx * ship.projectileSpeed + ship.vx * 0.3,
        vy: ny * ship.projectileSpeed + ship.vy * 0.3,
        damage: ship.attack * (pCount > 1 ? 0.7 : 1),
        ownerId: ship.id,
        life: 2.2,
        color: ship.accentColor
      };
      this.state.projectiles.push(proj);
      this.spawnMuzzleFlash(ship, nx, ny, perpX, perpY, off);
    }
    ship.fireCooldown = ship.fireRate;
    this.events.push({ time: this.state.time, type: 'fire', attackerId: ship.id });
  }

  private spawnMuzzleFlash(ship: ShipEntity, nx: number, ny: number, px: number, py: number, off: number): void {
    for (let i = 0; i < 5; i++) {
      const p = this.acquireParticle();
      if (!p) return;
      const angle = Math.atan2(ny, nx) + (Math.random() - 0.5) * 0.4;
      const sp = 140 + Math.random() * 180;
      p.x = ship.x + nx * (ship.size + 5) + px * off;
      p.y = ship.y + ny * (ship.size + 5) + py * off;
      p.vx = Math.cos(angle) * sp;
      p.vy = Math.sin(angle) * sp;
      p.life = 0.22 + Math.random() * 0.18;
      p.maxLife = p.life;
      p.size = 2 + Math.random() * 3;
      p.color = ship.accentColor;
      this.state.particles.push(p);
    }
  }

  private acquireParticle(): Particle | null {
    for (let i = this.particlePool.length - 1; i >= 0; i--) {
      if (this.particlePool[i].life <= 0) {
        return this.particlePool[i];
      }
    }
    return null;
  }

  private returnDeadParticles(): void {
    const alive: Particle[] = [];
    for (const p of this.state.particles) {
      if (p.life > 0) alive.push(p);
    }
    this.state.particles = alive;
  }

  private updateProjectiles(dt: number): void {
    const alive: Projectile[] = [];
    for (const pr of this.state.projectiles) {
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      if (pr.life <= 0 || pr.x < -50 || pr.x > this.width + 50 || pr.y < -50 || pr.y > this.height + 50) continue;
      let hit = false;
      for (const ship of this.state.ships) {
        if (!ship.alive || ship.team === pr.team) continue;
        const dx = ship.x - pr.x;
        const dy = ship.y - pr.y;
        const r = ship.size * 0.8;
        if (dx * dx + dy * dy <= r * r) {
          this.applyDamage(ship, pr);
          hit = true;
          this.spawnHitParticles(pr.x, pr.y, ship.color);
          break;
        }
      }
      if (!hit) alive.push(pr);
    }
    this.state.projectiles = alive;
  }

  private applyDamage(ship: ShipEntity, pr: Projectile): void {
    let dmg = pr.damage;
    if (ship.shield > 0) {
      const absorbed = Math.min(ship.shield, dmg);
      ship.shield -= absorbed;
      dmg -= absorbed;
    }
    ship.hp -= dmg;
    const attacker = this.state.ships.find(s => s.id === pr.ownerId);
    if (attacker) {
      attacker.totalDamageDealt += pr.damage;
    }
    this.events.push({
      time: this.state.time,
      type: 'hit',
      attackerId: pr.ownerId,
      targetId: ship.id,
      damage: pr.damage
    });
    if (ship.hp <= 0 && ship.alive) {
      this.destroyShip(ship, pr.ownerId);
    }
  }

  private destroyShip(ship: ShipEntity, killerId?: string): void {
    ship.alive = false;
    ship.destroyedAt = this.state.time;
    ship.isExploding = true;
    ship.explosionTime = 0;
    this.createExplosion(ship);
    if (killerId) {
      const k = this.state.ships.find(s => s.id === killerId);
      if (k) k.kills++;
    }
    this.events.push({
      time: this.state.time,
      type: 'destroy',
      attackerId: killerId,
      targetId: ship.id
    });
  }

  private createExplosion(ship: ShipEntity): void {
    const frags: Explosion['fragments'] = [];
    const n = 14 + Math.floor(ship.size / 4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
      const sp = 60 + Math.random() * 180;
      frags.push({
        x: ship.x,
        y: ship.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 8,
        size: 2 + Math.random() * (ship.size * 0.25)
      });
    }
    const exp: Explosion = {
      x: ship.x,
      y: ship.y,
      radius: 4,
      maxRadius: ship.size * 3.5 + 40,
      life: 1.2,
      maxLife: 1.2,
      color: ship.color,
      fragments: frags
    };
    this.state.explosions.push(exp);

    for (let i = 0; i < 40; i++) {
      const p = this.acquireParticle();
      if (!p) break;
      const a = Math.random() * Math.PI * 2;
      const sp = 50 + Math.random() * 250;
      p.x = ship.x;
      p.y = ship.y;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.life = 0.4 + Math.random() * 0.8;
      p.maxLife = p.life;
      p.size = 2 + Math.random() * 4;
      p.color = i % 3 === 0 ? '#fff' : (i % 2 === 0 ? ship.accentColor : '#ffa040');
      this.state.particles.push(p);
    }
  }

  private spawnHitParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 8; i++) {
      const p = this.acquireParticle();
      if (!p) break;
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 150;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
      p.life = 0.15 + Math.random() * 0.25;
      p.maxLife = p.life;
      p.size = 1 + Math.random() * 2.5;
      p.color = i % 2 === 0 ? color : '#fff';
      this.state.particles.push(p);
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.state.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt;
    }
    this.returnDeadParticles();
  }

  private updateExplosions(dt: number): void {
    const alive: Explosion[] = [];
    for (const e of this.state.explosions) {
      e.life -= dt;
      const t = 1 - e.life / e.maxLife;
      e.radius = e.maxRadius * Math.min(1, t * 1.3);
      for (const f of e.fragments) {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vx *= 0.98;
        f.vy *= 0.98;
        f.rot += f.rotSpeed * dt;
      }
      if (e.life > 0) alive.push(e);
    }
    this.state.explosions = alive;
  }

  private checkEnd(): void {
    if (this.state.ended) return;
    let pAlive = 0, eAlive = 0;
    for (const s of this.state.ships) {
      if (!s.alive) continue;
      if (s.team === 'player') pAlive++;
      else eAlive++;
    }
    if (pAlive === 0 || eAlive === 0 || this.state.time > 300) {
      this.state.ended = true;
      let w: 'player' | 'enemy' | 'draw' = 'draw';
      if (pAlive > 0 && eAlive === 0) w = 'player';
      else if (eAlive > 0 && pAlive === 0) w = 'enemy';
      this.state.winner = w;
      this.events.push({ time: this.state.time, type: 'end', winner: w });
      if (this.onEnd) {
        this.onEnd(this.state, this.events);
      }
    }
  }

  setPaused(p: boolean): void {
    this.state.paused = p;
  }

  setSpeed(s: number): void {
    this.state.speed = s;
  }
}
