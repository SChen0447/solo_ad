export type WeaponType = 'energy' | 'missile' | 'shotgun';
export type EffectType = 'beam' | 'missile' | 'pellet' | 'explosion' | 'shard';

export interface ProjectileData {
  id: number;
  type: WeaponType;
  effectType: EffectType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  life: number;
  maxLife: number;
  angle: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  traveled: number;
  maxDistance: number;
}

export interface Weapon {
  type: WeaponType;
  name: string;
  ammo: number;
  maxAmmo: number;
  cooldown: number;
  currentCooldown: number;
  switchDelay: number;
  currentSwitchDelay: number;
  canFire(): boolean;
  update(dt: number): void;
  fire(startX: number, startY: number, targetX: number, targetY: number): ProjectileData[];
  startSwitch(): void;
}

let projectileIdCounter = 0;

function nextProjectileId(): number {
  return ++projectileIdCounter;
}

export class EnergyGun implements Weapon {
  type: WeaponType = 'energy';
  name = '能量枪';
  ammo = Infinity;
  maxAmmo = Infinity;
  cooldown = 0.6;
  currentCooldown = 0;
  switchDelay = 0.3;
  currentSwitchDelay = 0;
  damage = 15;

  canFire(): boolean {
    return this.currentCooldown <= 0 && this.currentSwitchDelay <= 0;
  }

  update(dt: number): void {
    if (this.currentCooldown > 0) this.currentCooldown -= dt;
    if (this.currentSwitchDelay > 0) this.currentSwitchDelay -= dt;
  }

  fire(startX: number, startY: number, targetX: number, targetY: number): ProjectileData[] {
    if (!this.canFire()) return [];
    this.currentCooldown = this.cooldown;

    const dx = targetX - startX;
    const dy = targetY - startY;
    const angle = Math.atan2(dy, dx);
    const dist = Math.hypot(dx, dy);
    const speed = 2500;

    return [{
      id: nextProjectileId(),
      type: 'energy',
      effectType: 'beam',
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: this.damage,
      life: 0.3,
      maxLife: 0.3,
      angle,
      startX,
      startY,
      targetX,
      targetY,
      traveled: 0,
      maxDistance: dist
    }];
  }

  startSwitch(): void {
    this.currentSwitchDelay = this.switchDelay;
  }
}

export class MissileLauncher implements Weapon {
  type: WeaponType = 'missile';
  name = '导弹发射器';
  ammo = 10;
  maxAmmo = 10;
  cooldown = 0.4;
  totalCooldown = 1.5;
  currentCooldown = 0;
  switchDelay = 0.3;
  currentSwitchDelay = 0;
  damage = 35;
  speed = 1200;
  shotsFired = 0;

  canFire(): boolean {
    return this.currentCooldown <= 0 && this.currentSwitchDelay <= 0 && this.ammo > 0;
  }

  update(dt: number): void {
    if (this.currentCooldown > 0) this.currentCooldown -= dt;
    if (this.currentSwitchDelay > 0) this.currentSwitchDelay -= dt;
  }

  fire(startX: number, startY: number, targetX: number, targetY: number): ProjectileData[] {
    if (!this.canFire()) return [];

    this.ammo--;
    this.shotsFired++;

    if (this.shotsFired >= 3) {
      this.currentCooldown = this.totalCooldown;
      this.shotsFired = 0;
    } else {
      this.currentCooldown = this.cooldown;
    }

    const dx = targetX - startX;
    const dy = targetY - startY;
    const angle = Math.atan2(dy, dx);
    const dist = Math.hypot(dx, dy);

    return [{
      id: nextProjectileId(),
      type: 'missile',
      effectType: 'missile',
      x: startX,
      y: startY,
      vx: Math.cos(angle) * this.speed,
      vy: Math.sin(angle) * this.speed,
      damage: this.damage,
      life: 5,
      maxLife: 5,
      angle,
      startX,
      startY,
      targetX,
      targetY,
      traveled: 0,
      maxDistance: dist
    }];
  }

  startSwitch(): void {
    this.currentSwitchDelay = this.switchDelay;
  }
}

export class Shotgun implements Weapon {
  type: WeaponType = 'shotgun';
  name = '霰弹枪';
  ammo = 5;
  maxAmmo = 5;
  cooldown = 1.2;
  currentCooldown = 0;
  switchDelay = 0.3;
  currentSwitchDelay = 0;
  damage = 8;
  pelletCount = 6;
  spreadAngle = Math.PI / 4;
  speed = 900;
  maxDistance = 600;

  canFire(): boolean {
    return this.currentCooldown <= 0 && this.currentSwitchDelay <= 0 && this.ammo > 0;
  }

  update(dt: number): void {
    if (this.currentCooldown > 0) this.currentCooldown -= dt;
    if (this.currentSwitchDelay > 0) this.currentSwitchDelay -= dt;
  }

  fire(startX: number, startY: number, targetX: number, targetY: number): ProjectileData[] {
    if (!this.canFire()) return [];

    this.ammo--;
    this.currentCooldown = this.cooldown;

    const baseDx = targetX - startX;
    const baseDy = targetY - startY;
    const baseAngle = Math.atan2(baseDy, baseDx);

    const projectiles: ProjectileData[] = [];
    const halfSpread = this.spreadAngle / 2;
    const step = this.spreadAngle / (this.pelletCount - 1);

    for (let i = 0; i < this.pelletCount; i++) {
      const angle = baseAngle - halfSpread + step * i;
      projectiles.push({
        id: nextProjectileId(),
        type: 'shotgun',
        effectType: 'pellet',
        x: startX,
        y: startY,
        vx: Math.cos(angle) * this.speed,
        vy: Math.sin(angle) * this.speed,
        damage: this.damage,
        life: 2,
        maxLife: 2,
        angle,
        startX,
        startY,
        targetX,
        targetY,
        traveled: 0,
        maxDistance: this.maxDistance
      });
    }

    return projectiles;
  }

  startSwitch(): void {
    this.currentSwitchDelay = this.switchDelay;
  }
}
