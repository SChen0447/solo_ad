export interface ProjectileData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  type: 'beam' | 'missile' | 'pellet';
  lifetime: number;
  maxLifetime: number;
  startX: number;
  startY: number;
}

export interface Weapon {
  name: string;
  ammo: number;
  maxAmmo: number;
  cooldown: number;
  cooldownTimer: number;
  switchDelay: number;
  switchTimer: number;
  canFire(): boolean;
  fire(startX: number, startY: number, targetX: number, targetY: number): ProjectileData[];
  update(dt: number): void;
  resetSwitchDelay(): void;
}

export class EnergyGun implements Weapon {
  name = '能量枪';
  ammo = Infinity;
  maxAmmo = Infinity;
  cooldown = 0.6;
  cooldownTimer = 0;
  switchDelay = 0.3;
  switchTimer = 0;

  canFire(): boolean {
    return this.cooldownTimer <= 0 && this.switchTimer <= 0;
  }

  fire(startX: number, startY: number, targetX: number, targetY: number): ProjectileData[] {
    if (!this.canFire()) return [];
    this.cooldownTimer = this.cooldown;
    const angle = Math.atan2(targetY - startY, targetX - startX);
    return [{
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      damage: 15,
      type: 'beam',
      lifetime: 0,
      maxLifetime: 0.3,
      startX,
      startY,
    }];
  }

  update(dt: number): void {
    if (this.cooldownTimer > 0) this.cooldownTimer -= dt;
    if (this.switchTimer > 0) this.switchTimer -= dt;
  }

  resetSwitchDelay(): void {
    this.switchTimer = this.switchDelay;
  }
}

export class MissileLauncher implements Weapon {
  name = '导弹';
  ammo = 10;
  maxAmmo = 10;
  cooldown = 1.5;
  cooldownTimer = 0;
  switchDelay = 0.3;
  switchTimer = 0;
  private perMissileCooldown = 0.4;

  canFire(): boolean {
    return this.cooldownTimer <= 0 && this.ammo > 0 && this.switchTimer <= 0;
  }

  fire(startX: number, startY: number, targetX: number, targetY: number): ProjectileData[] {
    if (!this.canFire()) return [];
    this.ammo--;
    this.cooldownTimer = this.cooldown;
    const angle = Math.atan2(targetY - startY, targetX - startX);
    const speed = 1200;
    return [{
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: 35,
      type: 'missile',
      lifetime: 0,
      maxLifetime: 3,
      startX,
      startY,
    }];
  }

  update(dt: number): void {
    if (this.cooldownTimer > 0) this.cooldownTimer -= dt;
    if (this.switchTimer > 0) this.switchTimer -= dt;
  }

  resetSwitchDelay(): void {
    this.switchTimer = this.switchDelay;
  }
}

export class Shotgun implements Weapon {
  name = '霰弹';
  ammo = 5;
  maxAmmo = 5;
  cooldown = 1.2;
  cooldownTimer = 0;
  switchDelay = 0.3;
  switchTimer = 0;
  private pelletCount = 6;
  private spreadAngle = Math.PI / 4;

  canFire(): boolean {
    return this.cooldownTimer <= 0 && this.ammo > 0 && this.switchTimer <= 0;
  }

  fire(startX: number, startY: number, targetX: number, targetY: number): ProjectileData[] {
    if (!this.canFire()) return [];
    this.ammo--;
    this.cooldownTimer = this.cooldown;
    const baseAngle = Math.atan2(targetY - startY, targetX - startX);
    const pellets: ProjectileData[] = [];
    const halfSpread = this.spreadAngle / 2;
    const speed = 600;
    for (let i = 0; i < this.pelletCount; i++) {
      const offsetAngle = -halfSpread + (this.spreadAngle / (this.pelletCount - 1)) * i;
      const angle = baseAngle + offsetAngle;
      pellets.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: 8,
        type: 'pellet',
        lifetime: 0,
        maxLifetime: 1,
        startX,
        startY,
      });
    }
    return pellets;
  }

  update(dt: number): void {
    if (this.cooldownTimer > 0) this.cooldownTimer -= dt;
    if (this.switchTimer > 0) this.switchTimer -= dt;
  }

  resetSwitchDelay(): void {
    this.switchTimer = this.switchDelay;
  }
}
