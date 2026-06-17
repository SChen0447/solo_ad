import Phaser from 'phaser';
import { Enemy } from './Enemy';

export type TowerType = 'arrow' | 'cannon' | 'magic';

export interface TowerLevelConfig {
  damage: number;
  fireRate: number;
  range: number;
  upgradeCost: number;
}

export interface TowerConfig {
  type: TowerType;
  name: string;
  cost: number;
  color: number;
  secondaryColor: number;
  levels: TowerLevelConfig[];
  isAoe: boolean;
  aoeRadius: number;
  slowAmount: number;
  slowDuration: number;
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  arrow: {
    type: 'arrow',
    name: '箭塔',
    cost: 50,
    color: 0x60a5fa,
    secondaryColor: 0x3b82f6,
    isAoe: false,
    aoeRadius: 0,
    slowAmount: 0,
    slowDuration: 0,
    levels: [
      { damage: 15, fireRate: 0.6, range: 180, upgradeCost: 50 },
      { damage: 22.5, fireRate: 0.48, range: 200, upgradeCost: 100 },
      { damage: 30, fireRate: 0.36, range: 220, upgradeCost: 0 }
    ]
  },
  cannon: {
    type: 'cannon',
    name: '炮塔',
    cost: 100,
    color: 0xf97316,
    secondaryColor: 0xea580c,
    isAoe: true,
    aoeRadius: 60,
    slowAmount: 0,
    slowDuration: 0,
    levels: [
      { damage: 30, fireRate: 1.5, range: 150, upgradeCost: 50 },
      { damage: 45, fireRate: 1.2, range: 170, upgradeCost: 100 },
      { damage: 60, fireRate: 0.9, range: 190, upgradeCost: 0 }
    ]
  },
  magic: {
    type: 'magic',
    name: '魔法塔',
    cost: 75,
    color: 0xa855f7,
    secondaryColor: 0x7c3aed,
    isAoe: false,
    aoeRadius: 0,
    slowAmount: 0.4,
    slowDuration: 1500,
    levels: [
      { damage: 25, fireRate: 1.0, range: 160, upgradeCost: 50 },
      { damage: 37.5, fireRate: 0.8, range: 180, upgradeCost: 100 },
      { damage: 50, fireRate: 0.6, range: 200, upgradeCost: 0 }
    ]
  }
};

export class Tower extends Phaser.GameObjects.Container {
  public type: TowerType;
  public level: number = 0;
  public gridX: number;
  public gridY: number;
  public isPlaced: boolean = false;

  private config: TowerConfig;
  private currentLevelConfig: TowerLevelConfig;
  private cooldown: number = 0;
  private target: Enemy | null = null;

  private baseSprite: Phaser.GameObjects.Rectangle;
  private towerSprite: Phaser.GameObjects.Rectangle;
  private barrelSprite: Phaser.GameObjects.Rectangle;
  private rangeCircle: Phaser.GameObjects.Arc;
  private glowSprite?: Phaser.GameObjects.Arc;

  private projectiles: Phaser.GameObjects.Container[] = [];
  private enemies: Enemy[] = [];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: TowerType,
    gridX: number,
    gridY: number
  ) {
    super(scene, x, y);
    this.type = type;
    this.gridX = gridX;
    this.gridY = gridY;
    this.config = TOWER_CONFIGS[type];
    this.currentLevelConfig = this.config.levels[0];

    this.baseSprite = scene.add.rectangle(0, 8, 40, 16, this.config.secondaryColor);
    this.baseSprite.setStrokeStyle(2, 0xffffff);
    this.add(this.baseSprite);

    this.towerSprite = scene.add.rectangle(0, -8, 32, 32, this.config.color);
    this.towerSprite.setStrokeStyle(2, 0xffffff);
    this.add(this.towerSprite);

    if (type === 'arrow') {
      this.barrelSprite = scene.add.rectangle(0, -20, 8, 20, 0xffffff);
      this.barrelSprite.setStrokeStyle(1, 0x333333);
    } else if (type === 'cannon') {
      this.barrelSprite = scene.add.rectangle(0, -20, 14, 24, 0x333333);
      this.barrelSprite.setStrokeStyle(2, 0x666666);
    } else {
      this.barrelSprite = scene.add.rectangle(0, -20, 10, 18, this.config.color);
      this.barrelSprite.setStrokeStyle(2, 0xffffff);
      this.glowSprite = scene.add.arc(0, -20, 15, 0, 360, false, 0xa855f7, 0.4);
      this.add(this.glowSprite);
    }
    this.add(this.barrelSprite);

    this.rangeCircle = scene.add.arc(0, 0, this.currentLevelConfig.range, 0, 360, false, 0xffffff, 0.1);
    this.rangeCircle.setStrokeStyle(2, 0xffffff, 0.3);
    this.rangeCircle.setVisible(false);
    this.add(this.rangeCircle);

    this.setSize(40, 48);
    scene.add.existing(this);
  }

  update(time: number, delta: number, enemies: Enemy[]): void {
    if (!this.isPlaced) return;

    this.enemies = enemies;

    if (this.cooldown > 0) {
      this.cooldown -= delta / 1000;
    }

    this.findTarget();

    if (this.target && !this.target.isDead && this.cooldown <= 0) {
      this.fire();
      this.cooldown = this.currentLevelConfig.fireRate;
    }

    this.updateProjectiles(delta);
  }

  private findTarget(): void {
    let closestEnemy: Enemy | null = null;
    let closestDistance = Infinity;

    for (const enemy of this.enemies) {
      if (enemy.isDead || enemy.reachedEnd) continue;

      const distance = Phaser.Math.Distance.Between(
        this.x, this.y,
        enemy.x, enemy.y
      );

      if (distance <= this.currentLevelConfig.range && distance < closestDistance) {
        closestDistance = distance;
        closestEnemy = enemy;
      }
    }

    this.target = closestEnemy;
  }

  private fire(): void {
    if (!this.target) return;

    const projectile = this.scene.add.container(this.x, this.y - 20);
    const bullet = this.scene.add.rectangle(0, 0, 8, 8, this.config.color);
    bullet.setStrokeStyle(1, 0xffffff);
    projectile.add(bullet);

    if (this.type === 'magic' && this.glowSprite) {
      const glow = this.scene.add.arc(0, 0, 12, 0, 360, false, 0xa855f7, 0.5);
      projectile.add(glow);
    }

    const angle = Phaser.Math.Angle.Between(
      this.x, this.y - 20,
      this.target.x, this.target.y
    );

    this.scene.add.existing(projectile);

    this.projectiles.push(projectile);

    const speed = 500;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    (projectile as any).vx = vx;
    (projectile as any).vy = vy;
    (projectile as any).target = this.target;
    (projectile as any).damage = this.currentLevelConfig.damage;
    (projectile as any).isAoe = this.config.isAoe;
    (projectile as any).aoeRadius = this.config.aoeRadius;
    (projectile as any).slowAmount = this.config.slowAmount;
    (projectile as any).slowDuration = this.config.slowDuration;
  }

  private updateProjectiles(delta: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.projectiles.length; i++) {
      const proj = this.projectiles[i];
      const vx = (proj as any).vx;
      const vy = (proj as any).vy;

      proj.x += vx * (delta / 1000);
      proj.y += vy * (delta / 1000);

      const target: Enemy = (proj as any).target;
      const damage: number = (proj as any).damage;
      const isAoe: boolean = (proj as any).isAoe;
      const aoeRadius: number = (proj as any).aoeRadius;
      const slowAmount: number = (proj as any).slowAmount;
      const slowDuration: number = (proj as any).slowDuration;

      if (target && !target.isDead) {
        const distance = Phaser.Math.Distance.Between(
          proj.x, proj.y,
          target.x, target.y
        );

        if (distance < 20) {
          if (isAoe) {
            this.handleAoeDamage(proj.x, proj.y, damage, aoeRadius);
          } else {
            target.takeDamage(damage);
            if (slowAmount > 0) {
              target.applySlow(slowAmount, slowDuration);
            }
          }
          toRemove.push(i);
          proj.destroy();
        }
      } else {
        toRemove.push(i);
        proj.destroy();
      }

      if (proj.x < -50 || proj.x > 2000 || proj.y < -50 || proj.y > 1200) {
        toRemove.push(i);
        proj.destroy();
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.projectiles.splice(toRemove[i], 1);
    }
  }

  private handleAoeDamage(x: number, y: number, damage: number, radius: number): void {
    for (const enemy of this.enemies) {
      if (enemy.isDead || enemy.reachedEnd) continue;

      const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (distance <= radius) {
        const damageMultiplier = 1 - (distance / radius) * 0.5;
        enemy.takeDamage(damage * damageMultiplier);
      }
    }
  }

  upgrade(): boolean {
    if (this.level >= 2) return false;

    const upgradeCost = this.currentLevelConfig.upgradeCost;
    if (upgradeCost <= 0) return false;

    this.level++;
    this.currentLevelConfig = this.config.levels[this.level];
    this.rangeCircle.setRadius(this.currentLevelConfig.range);

    this.updateVisuals();
    this.playUpgradeEffect();

    return true;
  }

  private updateVisuals(): void {
    const scale = 1 + this.level * 0.2;

    if (this.type === 'arrow') {
      this.barrelSprite.setSize(8 + this.level * 3, 20 + this.level * 4);
      this.barrelSprite.setFillStyle(0xffd700);
    } else if (this.type === 'cannon') {
      this.barrelSprite.setSize(14 + this.level * 4, 24 + this.level * 4);
    } else if (this.type === 'magic') {
      if (this.glowSprite) {
        this.glowSprite.setRadius(15 + this.level * 8);
        this.glowSprite.setStrokeStyle(2, 0xffd700, 0.6);
      }
    }

    this.towerSprite.setScale(scale);
  }

  private playUpgradeEffect(): void {
    const particleCount = 20;
    const particles: Phaser.GameObjects.Rectangle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 100 + Math.random() * 100;
      const particle = this.scene.add.rectangle(this.x, this.y, 6, 6, 0xffd700);
      particle.setStrokeStyle(1, 0xffffff);
      (particle as any).vx = Math.cos(angle) * speed;
      (particle as any).vy = Math.sin(angle) * speed;
      particles.push(particle);
    }

    const startTime = this.scene.time.now;
    const duration = 300;

    const updateParticles = () => {
      const elapsed = this.scene.time.now - startTime;
      const progress = Math.min(1, elapsed / duration);

      for (const particle of particles) {
        const vx = (particle as any).vx;
        const vy = (particle as any).vy;
        particle.x += vx * 0.016;
        particle.y += vy * 0.016;
        particle.setAlpha(1 - progress);
        particle.setScale(1 - progress * 0.5);
      }

      if (progress < 1) {
        requestAnimationFrame(updateParticles);
      } else {
        for (const particle of particles) {
          particle.destroy();
        }
      }
    };

    updateParticles();
  }

  sell(): number {
    const totalCost = this.config.cost + 
      (this.level >= 1 ? this.config.levels[0].upgradeCost : 0) +
      (this.level >= 2 ? this.config.levels[1].upgradeCost : 0);
    const refund = Math.floor(totalCost * 0.5);

    for (const proj of this.projectiles) {
      proj.destroy();
    }
    this.projectiles = [];

    this.scene.tweens.add({
      targets: this,
      scale: 0,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.destroy();
      }
    });

    return refund;
  }

  showRange(show: boolean): void {
    this.rangeCircle.setVisible(show);
  }

  getCost(): number {
    return this.config.cost;
  }

  getUpgradeCost(): number {
    if (this.level >= 2) return 0;
    return this.currentLevelConfig.upgradeCost;
  }

  getLevel(): number {
    return this.level;
  }

  getDamage(): number {
    return this.currentLevelConfig.damage;
  }

  getRange(): number {
    return this.currentLevelConfig.range;
  }

  getFireRate(): number {
    return this.currentLevelConfig.fireRate;
  }

  canUpgrade(): boolean {
    return this.level < 2;
  }
}
