export type Team = 'red' | 'blue';

export type SkillType = 'emp' | 'flame';

export type PickupType = 'health' | 'energy';

export interface Position {
  x: number;
  y: number;
}

export interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;

  constructor(x: number, y: number, vx: number, vy: number, color: string, size: number = 4) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = 1;
    this.maxLife = 1;
    this.color = color;
    this.size = size;
  }

  update(deltaTime: number, duration: number = 400): void {
    this.life -= deltaTime / duration;
    this.x += this.vx * deltaTime / 16;
    this.y += this.vy * deltaTime / 16;
  }

  get alpha(): number {
    return Math.max(0, this.life / this.maxLife);
  }
}

export class Player {
  gridX: number;
  gridY: number;
  team: Team;
  health: number;
  maxHealth: number = 100;
  energy: number;
  maxEnergy: number = 100;
  direction: number = 0;
  moveCooldown: number = 0;
  moveCooldownMax: number = 200;
  stunned: boolean = false;
  stunTimer: number = 0;
  burning: boolean = false;
  burnTimer: number = 0;
  burnDamageTimer: number = 0;
  entranceProgress: number = 0;
  entranceDuration: number = 800;
  isDead: boolean = false;

  shootCooldown: number = 0;
  shootCooldownMax: number = 300;

  skillCooldown: number = 0;
  skillCooldownMax: number = 10000;

  constructor(gridX: number, gridY: number, team: Team) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.team = team;
    this.health = this.maxHealth;
    this.energy = this.maxEnergy;
    this.entranceProgress = team === 'blue' ? -1 : 1;
  }

  get color(): string {
    return this.team === 'red' ? '#e53e3e' : '#3182ce';
  }

  get secondaryColor(): string {
    return this.team === 'red' ? '#c53030' : '#2b6cb0';
  }

  update(deltaTime: number): void {
    if (this.entranceProgress !== 0) {
      const sign = Math.sign(this.entranceProgress);
      this.entranceProgress -= sign * deltaTime / this.entranceDuration;
      if (sign > 0 && this.entranceProgress <= 0) {
        this.entranceProgress = 0;
      }
      if (sign < 0 && this.entranceProgress >= 0) {
        this.entranceProgress = 0;
      }
    }

    if (this.moveCooldown > 0) {
      this.moveCooldown = Math.max(0, this.moveCooldown - deltaTime);
    }

    if (this.shootCooldown > 0) {
      this.shootCooldown = Math.max(0, this.shootCooldown - deltaTime);
    }

    if (this.skillCooldown > 0) {
      this.skillCooldown = Math.max(0, this.skillCooldown - deltaTime);
    }

    if (this.stunned) {
      this.stunTimer -= deltaTime;
      if (this.stunTimer <= 0) {
        this.stunned = false;
        this.stunTimer = 0;
      }
    }

    if (this.burning) {
      this.burnTimer -= deltaTime;
      this.burnDamageTimer -= deltaTime;
      if (this.burnDamageTimer <= 0) {
        this.health = Math.max(0, this.health - this.maxHealth * 0.05);
        this.burnDamageTimer = 1000;
      }
      if (this.burnTimer <= 0) {
        this.burning = false;
        this.burnTimer = 0;
      }
    }

    if (this.health <= 0) {
      this.isDead = true;
    }
  }

  canMove(): boolean {
    return !this.isDead && !this.stunned && this.moveCooldown <= 0 && this.entranceProgress === 0;
  }

  canShoot(): boolean {
    return !this.isDead && !this.stunned && this.shootCooldown <= 0 && this.entranceProgress === 0;
  }

  canUseSkill(): boolean {
    return !this.isDead && !this.stunned && this.skillCooldown <= 0 && this.entranceProgress === 0 && this.energy >= 30;
  }

  shoot(): void {
    this.shootCooldown = this.shootCooldownMax;
  }

  useSkill(): void {
    this.skillCooldown = this.skillCooldownMax;
    this.energy -= 30;
  }

  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  restoreEnergy(amount: number): void {
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
  }

  stun(duration: number): void {
    this.stunned = true;
    this.stunTimer = duration;
  }

  applyBurn(duration: number): void {
    this.burning = true;
    this.burnTimer = duration;
    this.burnDamageTimer = 1000;
  }

  getAABB(cellSize: number, offsetX: number, offsetY: number): AABB {
    const px = offsetX + this.gridX * cellSize + cellSize * 0.2;
    const py = offsetY + this.gridY * cellSize + cellSize * 0.2;
    return {
      x: px,
      y: py,
      width: cellSize * 0.6,
      height: cellSize * 0.6
    };
  }
}

export class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  team: Team;
  damage: number = 10;
  active: boolean = true;
  speed: number = 4;

  constructor(x: number, y: number, direction: number, team: Team, cellSize: number) {
    this.x = x;
    this.y = y;
    this.team = team;
    const speedPixels = this.speed * cellSize;
    this.vx = Math.cos(direction) * speedPixels;
    this.vy = Math.sin(direction) * speedPixels;
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  getAABB(): AABB {
    const size = 12;
    return {
      x: this.x - size / 2,
      y: this.y - size / 2,
      width: size,
      height: size
    };
  }
}

export class SkillEffect {
  type: SkillType;
  gridX: number;
  gridY: number;
  team: Team;
  duration: number;
  maxDuration: number;
  radius: number;
  active: boolean = true;

  constructor(type: SkillType, gridX: number, gridY: number, team: Team) {
    this.type = type;
    this.gridX = gridX;
    this.gridY = gridY;
    this.team = team;
    
    if (type === 'emp') {
      this.maxDuration = 500;
      this.radius = 2;
    } else {
      this.maxDuration = 3000;
      this.radius = 2;
    }
    this.duration = this.maxDuration;
  }

  update(deltaTime: number): void {
    this.duration -= deltaTime;
    if (this.duration <= 0) {
      this.active = false;
    }
  }

  get progress(): number {
    return 1 - this.duration / this.maxDuration;
  }
}

export class Obstacle {
  gridX: number;
  gridY: number;
  health: number = 30;
  maxHealth: number = 30;
  destroyed: boolean = false;
  debris: Particle[] = [];

  constructor(gridX: number, gridY: number) {
    this.gridX = gridX;
    this.gridY = gridY;
  }

  takeDamage(damage: number): boolean {
    this.health -= damage;
    if (this.health <= 0) {
      this.destroyed = true;
      return true;
    }
    return false;
  }

  getAABB(cellSize: number, offsetX: number, offsetY: number): AABB {
    const px = offsetX + this.gridX * cellSize + cellSize * 0.15;
    const py = offsetY + this.gridY * cellSize + cellSize * 0.15;
    return {
      x: px,
      y: py,
      width: cellSize * 0.7,
      height: cellSize * 0.7
    };
  }
}

export class Pickup {
  gridX: number;
  gridY: number;
  type: PickupType;
  breathTimer: number = 0;
  collected: boolean = false;
  pickupEffect: Particle[] = [];

  constructor(gridX: number, gridY: number, type: PickupType) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.type = type;
  }

  update(deltaTime: number): void {
    this.breathTimer += deltaTime;
  }

  get breathAlpha(): number {
    const cycle = 1500;
    const t = (this.breathTimer % cycle) / cycle;
    return 0.7 + 0.3 * Math.sin(t * Math.PI * 2);
  }

  getAABB(cellSize: number, offsetX: number, offsetY: number): AABB {
    const px = offsetX + this.gridX * cellSize + cellSize * 0.25;
    const py = offsetY + this.gridY * cellSize + cellSize * 0.25;
    return {
      x: px,
      y: py,
      width: cellSize * 0.5,
      height: cellSize * 0.5
    };
  }
}
