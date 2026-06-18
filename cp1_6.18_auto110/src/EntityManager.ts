import { AudioManager } from './AudioManager';

export enum PuppetType {
  Melee = 'melee',
  Ranged = 'ranged',
  Healer = 'healer',
}

export enum MonsterType {
  Normal = 'normal',
  Fast = 'fast',
  Giant = 'giant',
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
  alpha: number;
}

export interface GoldCoin {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  vy: number;
  bounceCount: number;
  startX: number;
  startY: number;
}

export interface SummonCircle {
  x: number;
  y: number;
  progress: number;
  duration: number;
  puppetType: PuppetType;
  color: string;
}

export interface Projectile {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  damage: number;
  color: string;
  startX: number;
  startY: number;
  peakHeight: number;
  targetRef: Monster | null;
}

export interface Puppet {
  x: number;
  y: number;
  type: PuppetType;
  hp: number;
  maxHp: number;
  level: number;
  exp: number;
  expToLevel: number;
  attack: number;
  range: number;
  attackCooldown: number;
  attackTimer: number;
  attackWindup: number;
  isWindup: boolean;
  color: string;
  size: number;
  summonAnim: number;
  target: Monster | null;
  healCooldown: number;
  healTimer: number;
  facingAngle: number;
  slashAnim: number;
  alive: boolean;
}

export interface Monster {
  x: number;
  y: number;
  type: MonsterType;
  hp: number;
  maxHp: number;
  speed: number;
  attack: number;
  size: number;
  pathIndex: number;
  pathProgress: number;
  color: string;
  goldValue: number;
  expValue: number;
  alive: boolean;
  hitFlash: number;
  facingAngle: number;
  slowTimer: number;
}

export interface Puppeteer {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  selectedType: PuppetType;
  summonSlots: number;
  trailParticles: Particle[];
  slideTimer: number;
  facingAngle: number;
}

export interface Crystal {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  flashTimer: number;
}

const PUPPET_STATS: Record<PuppetType, { hp: number; attack: number; range: number; cooldown: number; size: number; color: string }> = {
  [PuppetType.Melee]: { hp: 150, attack: 20, range: 60, cooldown: 1.0, size: 18, color: '#4a9eff' },
  [PuppetType.Ranged]: { hp: 80, attack: 15, range: 200, cooldown: 1.5, size: 16, color: '#ff9944' },
  [PuppetType.Healer]: { hp: 100, attack: 0, range: 120, cooldown: 2.5, size: 16, color: '#44ff88' },
};

const MONSTER_STATS: Record<MonsterType, { hp: number; speed: number; attack: number; size: number; color: string; gold: number; exp: number }> = {
  [MonsterType.Normal]: { hp: 80, speed: 50, attack: 10, size: 14, color: '#cc3333', gold: 10, exp: 15 },
  [MonsterType.Fast]: { hp: 40, speed: 100, attack: 6, size: 10, color: '#ffcc00', gold: 8, exp: 10 },
  [MonsterType.Giant]: { hp: 240, speed: 25, attack: 25, size: 28, color: '#882222', gold: 25, exp: 30 },
};

export const PATH_WAYPOINTS: { x: number; y: number }[] = [
  { x: 1220, y: 360 },
  { x: 1050, y: 360 },
  { x: 1050, y: 180 },
  { x: 850, y: 180 },
  { x: 850, y: 540 },
  { x: 650, y: 540 },
  { x: 650, y: 250 },
  { x: 450, y: 250 },
  { x: 450, y: 480 },
  { x: 250, y: 480 },
  { x: 250, y: 360 },
  { x: 80, y: 360 },
];

export class EntityManager {
  puppeteer: Puppeteer;
  puppets: Puppet[] = [];
  monsters: Monster[] = [];
  particles: Particle[] = [];
  goldCoins: GoldCoin[] = [];
  summonCircles: SummonCircle[] = [];
  projectiles: Projectile[] = [];
  crystal: Crystal;
  gold: number = 50;
  wave: number = 0;
  nextWaveTimer: number = 5.0;
  waveActive: boolean = false;
  gameOver: boolean = false;
  shopOpen: boolean = false;
  attackUpgradeLevel: number = 0;
  cooldownUpgradeLevel: number = 0;
  private audioManager: AudioManager;
  private maxPuppets: number = 5;
  private backgroundParticles: Particle[] = [];

  constructor(audioManager: AudioManager) {
    this.audioManager = audioManager;
    this.puppeteer = {
      x: 640,
      y: 360,
      hp: 200,
      maxHp: 200,
      speed: 200,
      selectedType: PuppetType.Melee,
      summonSlots: 5,
      trailParticles: [],
      slideTimer: 0,
      facingAngle: 0,
    };
    this.crystal = {
      x: 60,
      y: 360,
      hp: 20,
      maxHp: 20,
      flashTimer: 0,
    };
    this.initBackgroundParticles();
  }

  private initBackgroundParticles() {
    for (let i = 0; i < 40; i++) {
      this.backgroundParticles.push({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 5,
        life: 999999,
        maxLife: 999999,
        size: Math.random() * 30 + 10,
        color: `hsla(${270 + Math.random() * 30}, 60%, 30%, ${0.03 + Math.random() * 0.05})`,
        alpha: 0.03 + Math.random() * 0.05,
      });
    }
  }

  spawnMonster(type: MonsterType) {
    const stats = MONSTER_STATS[type];
    const waveScale = 1 + (this.wave - 1) * 0.15;
    this.monsters.push({
      x: PATH_WAYPOINTS[0].x,
      y: PATH_WAYPOINTS[0].y,
      type,
      hp: Math.floor(stats.hp * waveScale),
      maxHp: Math.floor(stats.hp * waveScale),
      speed: stats.speed,
      attack: Math.floor(stats.attack * waveScale),
      size: stats.size,
      color: stats.color,
      goldValue: stats.gold,
      expValue: stats.exp,
      pathIndex: 0,
      pathProgress: 0,
      alive: true,
      hitFlash: 0,
      facingAngle: 0,
      slowTimer: 0,
    });
  }

  spawnWave() {
    this.wave++;
    this.waveActive = true;
    const count = 3 + Math.floor(Math.random() * 4);
    const types: MonsterType[] = [];
    for (let i = 0; i < count; i++) {
      const roll = Math.random();
      if (this.wave >= 3 && roll < 0.15) {
        types.push(MonsterType.Giant);
      } else if (roll < 0.4) {
        types.push(MonsterType.Fast);
      } else {
        types.push(MonsterType.Normal);
      }
    }
    types.forEach((type, i) => {
      setTimeout(() => this.spawnMonster(type), i * 600);
    });
    this.audioManager.play('wave', 0.5);
  }

  summonPuppet(x: number, y: number) {
    if (this.puppets.filter(p => p.alive).length >= this.puppeteer.summonSlots) return;
    if (this.puppets.filter(p => p.alive).length >= this.maxPuppets + this.puppeteer.summonSlots - 5) return;
    const type = this.puppeteer.selectedType;
    const stats = PUPPET_STATS[type];
    const attackBonus = 1 + this.attackUpgradeLevel * 0.15;
    const cdBonus = 1 - this.cooldownUpgradeLevel * 0.1;
    this.summonCircles.push({
      x,
      y,
      progress: 0,
      duration: 0.8,
      puppetType: type,
      color: stats.color,
    });
    setTimeout(() => {
      this.puppets.push({
        x,
        y,
        type,
        hp: stats.hp,
        maxHp: stats.hp,
        level: 1,
        exp: 0,
        expToLevel: 30,
        attack: Math.floor(stats.attack * attackBonus),
        range: stats.range,
        attackCooldown: stats.cooldown * Math.max(0.3, cdBonus),
        attackTimer: 0,
        attackWindup: 0.3,
        isWindup: false,
        color: stats.color,
        size: stats.size,
        summonAnim: 1.0,
        target: null,
        healCooldown: 2.5 * Math.max(0.3, cdBonus),
        healTimer: 0,
        facingAngle: 0,
        slashAnim: 0,
        alive: true,
      });
    }, 800);
    this.audioManager.play('summon', 0.6);
  }

  private emitParticles(x: number, y: number, color: string, count: number, spread: number = 50) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * spread,
        vy: (Math.random() - 0.5) * spread,
        life: 0.3 + Math.random() * 0.5,
        maxLife: 0.3 + Math.random() * 0.5,
        size: 2 + Math.random() * 4,
        color,
        alpha: 0.8,
      });
    }
  }

  private spawnGoldCoin(x: number, y: number, value: number) {
    const count = Math.min(3, Math.ceil(value / 10));
    for (let i = 0; i < count; i++) {
      this.goldCoins.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        targetX: 1230,
        targetY: 30,
        progress: 0,
        vy: -3,
        bounceCount: 0,
        startX: x,
        startY: y,
      });
    }
    this.gold += value;
    this.audioManager.play('gold', 0.4);
  }

  update(dt: number, keys: Set<string>, mousePos: { x: number; y: number } | null) {
    if (this.gameOver) return;

    this.updatePuppeteer(dt, keys);
    this.updateMonsters(dt);
    this.updatePuppets(dt);
    this.updateParticles(dt);
    this.updateSummonCircles(dt);
    this.updateProjectiles(dt);
    this.updateGoldCoins(dt);
    this.updateBackgroundParticles(dt);
    this.updateCrystal(dt);
    this.checkWaveState(dt);
  }

  private updatePuppeteer(dt: number, keys: Set<string>) {
    const p = this.puppeteer;
    let dx = 0, dy = 0;
    if (keys.has('w') || keys.has('arrowup')) dy -= 1;
    if (keys.has('s') || keys.has('arrowdown')) dy += 1;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;

    const isMoving = dx !== 0 || dy !== 0;
    if (isMoving) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
      p.x += dx * p.speed * dt;
      p.y += dy * p.speed * dt;
      p.x = Math.max(20, Math.min(1260, p.x));
      p.y = Math.max(20, Math.min(700, p.y));
      p.facingAngle = Math.atan2(dy, dx);
      p.slideTimer = 0.15;

      if (Math.random() < 0.6) {
        p.trailParticles.push({
          x: p.x - dx * 12 + (Math.random() - 0.5) * 8,
          y: p.y - dy * 12 + (Math.random() - 0.5) * 8,
          vx: -dx * 20 + (Math.random() - 0.5) * 15,
          vy: -dy * 20 + (Math.random() - 0.5) * 15,
          life: 0.3 + Math.random() * 0.2,
          maxLife: 0.3 + Math.random() * 0.2,
          size: 3 + Math.random() * 3,
          color: '#9966ff',
          alpha: 0.6,
        });
      }
    }

    if (p.slideTimer > 0) p.slideTimer -= dt;
    p.trailParticles = p.trailParticles.filter(pt => {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      pt.alpha = (pt.life / pt.maxLife) * 0.6;
      return pt.life > 0;
    });
  }

  private updateMonsters(dt: number) {
    for (const m of this.monsters) {
      if (!m.alive) continue;
      if (m.hitFlash > 0) m.hitFlash -= dt;

      if (m.pathIndex < PATH_WAYPOINTS.length - 1) {
        const current = PATH_WAYPOINTS[m.pathIndex];
        const next = PATH_WAYPOINTS[m.pathIndex + 1];
        const segDx = next.x - current.x;
        const segDy = next.y - current.y;
        const segLen = Math.sqrt(segDx * segDx + segDy * segDy);
        const speed = m.slowTimer > 0 ? m.speed * 0.5 : m.speed;
        m.pathProgress += (speed * dt) / segLen;

        if (m.pathProgress >= 1) {
          m.pathProgress = 0;
          m.pathIndex++;
          if (m.pathIndex >= PATH_WAYPOINTS.length - 1) {
            m.alive = false;
            this.crystal.hp--;
            this.crystal.flashTimer = 0.5;
            this.emitParticles(this.crystal.x, this.crystal.y, '#ff4444', 10);
            if (this.crystal.hp <= 0) {
              this.gameOver = true;
            }
            continue;
          }
        }

        const wp1 = PATH_WAYPOINTS[m.pathIndex];
        const wp2 = PATH_WAYPOINTS[Math.min(m.pathIndex + 1, PATH_WAYPOINTS.length - 1)];
        m.x = wp1.x + (wp2.x - wp1.x) * m.pathProgress;
        m.y = wp1.y + (wp2.y - wp1.y) * m.pathProgress;
        m.facingAngle = Math.atan2(wp2.y - wp1.y, wp2.x - wp1.x);
      }

      if (m.slowTimer > 0) m.slowTimer -= dt;
    }
    this.monsters = this.monsters.filter(m => m.alive || m.hitFlash > 0);
  }

  private updatePuppets(dt: number) {
    for (const p of this.puppets) {
      if (!p.alive) continue;
      if (p.summonAnim > 0) {
        p.summonAnim -= dt * 1.5;
        continue;
      }

      if (p.slashAnim > 0) p.slashAnim -= dt;

      if (p.type === PuppetType.Healer) {
        p.healTimer -= dt;
        if (p.healTimer <= 0) {
          const allies = this.puppets.filter(a => a.alive && a !== p && a.type !== PuppetType.Healer);
          const nearby = allies.filter(a => {
            const d = Math.sqrt((a.x - p.x) ** 2 + (a.y - p.y) ** 2);
            return d <= p.range;
          });
          for (const ally of nearby) {
            const healAmt = ally.maxHp * 0.08;
            ally.hp = Math.min(ally.maxHp, ally.hp + healAmt);
            this.emitParticles(ally.x, ally.y - ally.size, '#44ff88', 5, 20);
          }
          if (nearby.length > 0) {
            this.audioManager.play('heal', 0.3);
          }
          p.healTimer = p.healCooldown;
        }
        continue;
      }

      p.attackTimer -= dt;
      let closestMonster: Monster | null = null;
      let closestDist = Infinity;
      for (const m of this.monsters) {
        if (!m.alive) continue;
        const d = Math.sqrt((m.x - p.x) ** 2 + (m.y - p.y) ** 2);
        if (d <= p.range && d < closestDist) {
          closestDist = d;
          closestMonster = m;
        }
      }

      p.target = closestMonster;
      if (closestMonster) {
        p.facingAngle = Math.atan2(closestMonster.y - p.y, closestMonster.x - p.x);
      }

      if (closestMonster && p.attackTimer <= 0) {
        if (!p.isWindup) {
          p.isWindup = true;
          p.attackWindup = 0.3;
        }
      }

      if (p.isWindup) {
        p.attackWindup -= dt;
        if (p.attackWindup <= 0) {
          p.isWindup = false;
          if (p.type === PuppetType.Melee && closestMonster) {
            closestMonster.hp -= p.attack;
            closestMonster.hitFlash = 0.15;
            closestMonster.slowTimer = 0.3;
            p.slashAnim = 0.3;
            this.emitParticles(closestMonster.x, closestMonster.y, '#4a9eff', 4, 30);
            this.audioManager.play('attack', 0.3);
            if (closestMonster.hp <= 0) {
              this.killMonster(closestMonster);
            }
          } else if (p.type === PuppetType.Ranged && closestMonster) {
            this.projectiles.push({
              x: p.x,
              y: p.y - p.size,
              targetX: closestMonster.x,
              targetY: closestMonster.y,
              progress: 0,
              speed: 350,
              damage: p.attack,
              color: '#ffaa33',
              startX: p.x,
              startY: p.y - p.size,
              peakHeight: 40 + Math.random() * 20,
              targetRef: closestMonster,
            });
            this.audioManager.play('attack', 0.25);
          }
          p.attackTimer = p.attackCooldown;
        }
      }
    }
    this.puppets = this.puppets.filter(p => p.alive);
  }

  private killMonster(m: Monster) {
    m.alive = false;
    this.emitParticles(m.x, m.y, m.color, 8, 40);
    this.spawnGoldCoin(m.x, m.y, m.goldValue);
    for (const p of this.puppets) {
      if (!p.alive) continue;
      p.exp += m.expValue;
      if (p.exp >= p.expToLevel) {
        p.exp -= p.expToLevel;
        p.level++;
        p.expToLevel = Math.floor(p.expToLevel * 1.3);
        p.maxHp = Math.floor(p.maxHp * 1.1);
        p.hp = Math.min(p.hp + Math.floor(p.maxHp * 0.3), p.maxHp);
        p.attack = Math.floor(p.attack * 1.1);
        this.emitParticles(p.x, p.y, '#ffdd44', 10, 40);
      }
    }
  }

  private updateParticles(dt: number) {
    this.particles = this.particles.filter(pt => {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      pt.alpha = Math.max(0, (pt.life / pt.maxLife));
      pt.vx *= 0.98;
      pt.vy *= 0.98;
      return pt.life > 0;
    });
  }

  private updateSummonCircles(dt: number) {
    this.summonCircles = this.summonCircles.filter(sc => {
      sc.progress += dt / sc.duration;
      return sc.progress < 1;
    });
  }

  private updateProjectiles(dt: number) {
    this.projectiles = this.projectiles.filter(proj => {
      proj.progress += (proj.speed * dt) / Math.sqrt((proj.targetX - proj.startX) ** 2 + (proj.targetY - proj.startY) ** 2);
      const t = Math.min(proj.progress, 1);
      proj.x = proj.startX + (proj.targetX - proj.startX) * t;
      proj.y = proj.startY + (proj.targetY - proj.startY) * t - proj.peakHeight * Math.sin(Math.PI * t);

      if (proj.progress >= 1) {
        if (proj.targetRef && proj.targetRef.alive) {
          proj.targetRef.hp -= proj.damage;
          proj.targetRef.hitFlash = 0.15;
          this.emitParticles(proj.targetRef.x, proj.targetRef.y, '#ffaa33', 3, 20);
          this.audioManager.play('hit', 0.2);
          if (proj.targetRef.hp <= 0) {
            this.killMonster(proj.targetRef);
          }
        }
        return false;
      }
      return true;
    });
  }

  private updateGoldCoins(dt: number) {
    this.goldCoins = this.goldCoins.filter(gc => {
      gc.progress += dt * 1.8;
      if (gc.bounceCount === 0 && gc.progress < 0.3) {
        gc.y = gc.startY - Math.sin(gc.progress / 0.3 * Math.PI) * 30;
        gc.x = gc.startX;
      } else {
        gc.bounceCount = 1;
        const t = (gc.progress - 0.3) / 0.7;
        if (t >= 1) return false;
        const ease = 1 - Math.pow(1 - t, 3);
        gc.x = gc.startX + (gc.targetX - gc.startX) * ease;
        gc.y = gc.startY + (gc.targetY - gc.startY) * ease - Math.sin(t * Math.PI * 2) * 8 * (1 - t);
      }
      return gc.progress < 1.0;
    });
  }

  private updateBackgroundParticles(dt: number) {
    for (const p of this.backgroundParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < -50) p.x = 1330;
      if (p.x > 1330) p.x = -50;
      if (p.y < -50) p.y = 770;
      if (p.y > 770) p.y = -50;
    }
  }

  private updateCrystal(dt: number) {
    if (this.crystal.flashTimer > 0) this.crystal.flashTimer -= dt;
  }

  private checkWaveState(dt: number) {
    const aliveMonsters = this.monsters.filter(m => m.alive);
    if (this.waveActive && aliveMonsters.length === 0) {
      this.waveActive = false;
      this.nextWaveTimer = 8.0;
    }
    if (!this.waveActive) {
      this.nextWaveTimer -= dt;
      if (this.nextWaveTimer <= 0) {
        this.spawnWave();
      }
    }
  }

  getBackgroundParticles(): Particle[] {
    return this.backgroundParticles;
  }

  buyAttackUpgrade(): boolean {
    const cost = 50 + this.attackUpgradeLevel * 30;
    if (this.gold >= cost) {
      this.gold -= cost;
      this.attackUpgradeLevel++;
      for (const p of this.puppets) {
        if (p.alive) {
          p.attack = Math.floor(p.attack * 1.15);
        }
      }
      return true;
    }
    return false;
  }

  buyCooldownUpgrade(): boolean {
    const cost = 60 + this.cooldownUpgradeLevel * 35;
    if (this.gold >= cost && this.cooldownUpgradeLevel < 5) {
      this.gold -= cost;
      this.cooldownUpgradeLevel++;
      for (const p of this.puppets) {
        if (p.alive) {
          p.attackCooldown *= 0.9;
          if (p.type === PuppetType.Healer) p.healCooldown *= 0.9;
        }
      }
      return true;
    }
    return false;
  }

  buySummonSlot(): boolean {
    const cost = 80 + (this.puppeteer.summonSlots - 5) * 50;
    if (this.gold >= cost) {
      this.gold -= cost;
      this.puppeteer.summonSlots++;
      return true;
    }
    return false;
  }
}
