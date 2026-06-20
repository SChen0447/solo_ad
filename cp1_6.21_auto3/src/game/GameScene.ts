import Phaser from 'phaser';
import { Player } from './Player';
import { Enemy, Asteroid, EnemyShip } from './Enemy';
import { InputHandler, InputState } from '../input/InputHandler';
import { UpgradeManager, UpgradeType } from '../upgrade/UpgradeManager';
import { HUD } from '../ui/HUD';

interface Laser {
  sprite: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  isEnemy: boolean;
  lifetime: number;
}

interface Particle {
  sprite: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifetime: number;
  maxLifetime: number;
  size: number;
  color: number;
}

interface EnergyPickup {
  sprite: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  value: number;
  lifetime: number;
}

export class GameScene extends Phaser.Scene {
  private inputHandler!: InputHandler;
  private upgradeManager!: UpgradeManager;
  private hud!: HUD;
  private player!: Player;

  private enemies: Enemy[] = [];
  private lasers: Laser[] = [];
  private particles: Particle[] = [];
  private energyPickups: EnergyPickup[] = [];
  private stars: Phaser.GameObjects.Graphics[] = [];

  private score: number = 0;
  private wave: number = 1;
  private kills: number = 0;
  private isGameRunning: boolean = false;
  private isGameOver: boolean = false;

  private waveTimer: number = 0;
  private waveInterval: number = 15000;
  private enemiesPerWave: number = 3;
  private shipSpawnChance: number = 0.3;

  private maxParticles: number = 300;

  constructor() {
    super('GameScene');
  }

  public init(data: {
    inputHandler: InputHandler;
    upgradeManager: UpgradeManager;
    hud: HUD;
  }): void {
    this.inputHandler = data.inputHandler;
    this.upgradeManager = data.upgradeManager;
    this.hud = data.hud;
  }

  public create(): void {
    this.createStarfield();
    this.createPlayer();
    this.setupHUDCallbacks();
    this.startGame();
  }

  private createStarfield(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x1a0a2e, 1);
    graphics.fillRect(0, 0, this.scale.width, this.scale.height);

    for (let i = 0; i < 100; i++) {
      const star = this.add.graphics();
      const x = Math.random() * this.scale.width;
      const y = Math.random() * this.scale.height;
      const size = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.8 + 0.2;

      star.fillStyle(0xffffff, alpha);
      star.beginPath();
      star.arc(x, y, size, 0, Math.PI * 2);
      star.fillPath();

      this.stars.push(star);
    }
  }

  private createPlayer(): void {
    this.player = new Player(
      this,
      this.scale.width / 2,
      this.scale.height / 2
    );

    this.player.onShoot((x, y, angle, damage) => {
      this.spawnPlayerLaser(x, y, angle, damage);
    });

    this.player.onHit(() => {
      this.updateHUDStats();
      this.checkGameOver();
    });
  }

  private setupHUDCallbacks(): void {
    this.hud.onUpgradeRequest((type) => {
      this.handleUpgrade(type);
    });

    this.hud.onStart(() => {
      this.startGame();
    });

    this.hud.onRestart(() => {
      this.restartGame();
    });
  }

  private startGame(): void {
    this.isGameRunning = true;
    this.isGameOver = false;
    this.score = 0;
    this.wave = 1;
    this.kills = 0;
    this.waveTimer = 0;
    this.waveInterval = 15000;
    this.enemiesPerWave = 3;
    this.shipSpawnChance = 0.3;

    this.player.reset();
    this.upgradeManager.reset();

    this.clearEnemies();
    this.clearLasers();
    this.clearParticles();
    this.clearEnergyPickups();

    this.applyAllUpgrades();

    this.spawnWave();
    this.updateHUDStats();
  }

  private restartGame(): void {
    this.startGame();
  }

  private handleUpgrade(type: UpgradeType): void {
    if (this.upgradeManager.upgrade(type)) {
      this.applyUpgrade(type);
    }
  }

  private applyUpgrade(type: UpgradeType): void {
    const level = this.upgradeManager.getUpgradeLevel(type);

    switch (type) {
      case 'shield':
        this.player.applyShieldUpgrade(level);
        break;
      case 'weapon':
        this.player.applyWeaponUpgrade(level);
        break;
      case 'turret':
        this.player.applyTurretUpgrade(level);
        break;
    }

    this.updateHUDStats();
  }

  private applyAllUpgrades(): void {
    this.applyUpgrade('shield');
    this.applyUpgrade('weapon');
    this.applyUpgrade('turret');
  }

  public update(time: number, delta: number): void {
    if (!this.isGameRunning || this.isGameOver) return;

    this.inputHandler.update();
    const inputState = this.inputHandler.getState();

    this.player.update(delta, inputState);

    this.updateEnemies(delta);
    this.updateLasers(delta);
    this.updateParticles(delta);
    this.updateEnergyPickups(delta);
    this.updateStarfield(delta);

    this.checkCollisions();
    this.updateTurret(delta);

    this.waveTimer += delta;
    if (this.waveTimer >= this.waveInterval) {
      this.waveTimer = 0;
      this.nextWave();
    }

    this.optimizeParticles();
  }

  private updateEnemies(delta: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(delta, this.player.x, this.player.y);

      if (enemy instanceof EnemyShip) {
        enemy.onShoot((x, y, angle, damage) => {
          this.spawnEnemyLaser(x, y, angle, damage);
        });
      }
    }
  }

  private updateLasers(delta: number): void {
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const laser = this.lasers[i];
      laser.x += laser.vx * (delta / 1000);
      laser.y += laser.vy * (delta / 1000);
      laser.lifetime -= delta;

      laser.sprite.setPosition(laser.x, laser.y);

      if (
        laser.lifetime <= 0 ||
        laser.x < -50 ||
        laser.x > this.scale.width + 50 ||
        laser.y < -50 ||
        laser.y > this.scale.height + 50
      ) {
        laser.sprite.destroy();
        this.lasers.splice(i, 1);
      }
    }
  }

  private updateParticles(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.x += particle.vx * (delta / 1000);
      particle.y += particle.vy * (delta / 1000);
      particle.lifetime -= delta;

      const alpha = Math.max(0, particle.lifetime / particle.maxLifetime);
      particle.sprite.clear();
      particle.sprite.fillStyle(particle.color, alpha);
      particle.sprite.fillCircle(0, 0, particle.size);
      particle.sprite.setPosition(particle.x, particle.y);

      if (particle.lifetime <= 0) {
        particle.sprite.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  private updateEnergyPickups(delta: number): void {
    for (let i = this.energyPickups.length - 1; i >= 0; i--) {
      const pickup = this.energyPickups[i];
      pickup.lifetime -= delta;

      const pulse = 1 + Math.sin(this.time.now / 200) * 0.2;
      pickup.sprite.setScale(pulse);

      const dist = Phaser.Math.Distance.Between(
        pickup.x,
        pickup.y,
        this.player.x,
        this.player.y
      );

      if (dist < 50) {
        const angle = Phaser.Math.Angle.Between(
          pickup.x,
          pickup.y,
          this.player.x,
          this.player.y
        );
        const speed = 200;
        pickup.x += Math.cos(angle) * speed * (delta / 1000);
        pickup.y += Math.sin(angle) * speed * (delta / 1000);
      }

      pickup.sprite.setPosition(pickup.x, pickup.y);

      if (dist < 25) {
        this.upgradeManager.addEnergy(pickup.value);
        pickup.sprite.destroy();
        this.energyPickups.splice(i, 1);
        this.updateHUDStats();
        continue;
      }

      if (pickup.lifetime <= 0) {
        pickup.sprite.destroy();
        this.energyPickups.splice(i, 1);
      }
    }
  }

  private updateStarfield(delta: number): void {
    const speed = 10 * (delta / 1000);
    this.stars.forEach((star, index) => {
      const y = star.y + speed * (1 + (index % 5) * 0.5);
      if (y > this.scale.height) {
        star.y = 0;
        star.x = Math.random() * this.scale.width;
      } else {
        star.y = y;
      }
    });
  }

  private updateTurret(delta: number): void {
    if (!this.player.stats.hasTurret) return;

    let nearestEnemy: Enemy | null = null;
    let nearestDist = Infinity;

    for (const enemy of this.enemies) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        enemy.x,
        enemy.y
      );
      if (dist < nearestDist && dist < 300) {
        nearestDist = dist;
        nearestEnemy = enemy;
      }
    }

    if (nearestEnemy) {
      for (let i = 0; i < this.player.stats.turretCount; i++) {
        const offsetAngle = (i / this.player.stats.turretCount) * Math.PI * 2;
        const turretX = this.player.x + Math.cos(offsetAngle) * 25;
        const turretY = this.player.y + Math.sin(offsetAngle) * 25;

        const now = this.time.now;
        const fireInterval = this.player.stats.turretFireRate;
        const lastFireKey = `turret_${i}_lastFire`;
        const lastFire = (this as any)[lastFireKey] || 0;

        if (now - lastFire >= fireInterval) {
          (this as any)[lastFireKey] = now;
          const angle = Phaser.Math.Angle.Between(
            turretX,
            turretY,
            nearestEnemy.x,
            nearestEnemy.y
          );
          this.spawnPlayerLaser(turretX, turretY, angle, this.player.stats.turretDamage);
        }
      }
    }
  }

  private checkCollisions(): void {
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const laser = this.lasers[i];

      if (laser.isEnemy) {
        const playerBounds = this.player.getBounds();
        if (Phaser.Geom.Circle.Contains(
          playerBounds,
          laser.x,
          laser.y
        )) {
          this.player.takeDamage(laser.damage);
          laser.sprite.destroy();
          this.lasers.splice(i, 1);
          this.spawnHitParticles(laser.x, laser.y, 0xff0000);
          continue;
        }
      } else {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const enemy = this.enemies[j];
          const enemyBounds = enemy.getBounds();

          if (Phaser.Geom.Circle.Contains(enemyBounds, laser.x, laser.y)) {
            const killed = enemy.takeDamage(laser.damage);
            laser.sprite.destroy();
            this.lasers.splice(i, 1);
            this.spawnHitParticles(laser.x, laser.y, 0x00d4ff);

            if (killed) {
              this.onEnemyKilled(enemy);
            }
            break;
          }
        }
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const enemyBounds = enemy.getBounds();
      const playerBounds = this.player.getBounds();

      const dist = Phaser.Math.Distance.Between(
        enemyBounds.x, enemyBounds.y,
        playerBounds.x, playerBounds.y
      );
      if (dist < enemyBounds.radius + playerBounds.radius) {
        this.player.takeDamage(enemy.damage);
        enemy.takeDamage(enemy.health);

        if (enemy.isAlive() === false) {
          this.onEnemyKilled(enemy);
        }
      }
    }
  }

  private onEnemyKilled(enemy: Enemy): void {
    this.score += enemy.score;
    this.kills++;

    this.spawnEnergyPickup(enemy.x, enemy.y, enemy.energyDrop);
    this.spawnExplosionParticles(enemy.x, enemy.y, enemy.type);

    if (enemy instanceof Asteroid) {
      const pieces = enemy.splitIntoPieces();
      pieces.forEach((piece) => {
        piece.onDestroyed((e, killed) => {
          if (!killed) return;
        });
        this.enemies.push(piece);
      });
    }

    const index = this.enemies.indexOf(enemy);
    if (index > -1) {
      this.enemies.splice(index, 1);
    }
    enemy.destroy();

    this.updateHUDStats();
  }

  private spawnPlayerLaser(x: number, y: number, angle: number, damage: number): void {
    const speed = 800;
    const graphics = this.add.graphics();

    graphics.fillStyle(0x00d4ff, 1);
    graphics.beginPath();
    for (let i = 0; i <= 360; i += 15) {
      const rad = Phaser.Math.DegToRad(i);
      const px = Math.cos(rad) * 4;
      const py = Math.sin(rad) * 12;
      if (i === 0) {
        graphics.moveTo(px, py);
      } else {
        graphics.lineTo(px, py);
      }
    }
    graphics.closePath();
    graphics.fillPath();

    graphics.setPosition(x, y);
    graphics.setRotation(angle);

    this.lasers.push({
      sprite: graphics,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage,
      isEnemy: false,
      lifetime: 2000,
    });
  }

  private spawnEnemyLaser(x: number, y: number, angle: number, damage: number): void {
    const speed = 400;
    const graphics = this.add.graphics();

    graphics.fillStyle(0xff6b35, 1);
    graphics.beginPath();
    graphics.arc(0, 0, 5, 0, Math.PI * 2);
    graphics.fillPath();

    graphics.setPosition(x, y);

    this.lasers.push({
      sprite: graphics,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage,
      isEnemy: true,
      lifetime: 3000,
    });
  }

  private spawnExplosionParticles(x: number, y: number, type: string): void {
    const count = type === 'asteroid' ? 15 : 25;
    const color = type === 'asteroid' ? 0x8b4513 : 0xff6b35;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 150;
      const size = 2 + Math.random() * 5;
      const lifetime = 500 + Math.random() * 500;

      const graphics = this.add.graphics();
      graphics.fillStyle(color, 1);
      graphics.fillCircle(0, 0, size);
      graphics.setPosition(x, y);

      this.particles.push({
        sprite: graphics,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        lifetime,
        maxLifetime: lifetime,
        size,
        color,
      });
    }
  }

  private spawnHitParticles(x: number, y: number, color: number): void {
    const count = 5;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      const size = 1.5 + Math.random() * 2;
      const lifetime = 200 + Math.random() * 200;

      const graphics = this.add.graphics();
      graphics.fillStyle(color, 1);
      graphics.fillCircle(0, 0, size);
      graphics.setPosition(x, y);

      this.particles.push({
        sprite: graphics,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        lifetime,
        maxLifetime: lifetime,
        size,
        color,
      });
    }
  }

  private spawnEnergyPickup(x: number, y: number, value: number): void {
    const graphics = this.add.graphics();

    graphics.fillStyle(0xff6b35, 1);
    graphics.beginPath();
    graphics.moveTo(0, -10);
    graphics.lineTo(6, 0);
    graphics.lineTo(0, 10);
    graphics.lineTo(-6, 0);
    graphics.closePath();
    graphics.fillPath();

    graphics.setPosition(x, y);

    this.energyPickups.push({
      sprite: graphics,
      x,
      y,
      value,
      lifetime: 8000,
    });
  }

  private spawnWave(): void {
    for (let i = 0; i < this.enemiesPerWave; i++) {
      this.spawnEnemy();
    }
  }

  private spawnEnemy(): void {
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;

    const margin = 50;
    switch (side) {
      case 0:
        x = Math.random() * this.scale.width;
        y = -margin;
        break;
      case 1:
        x = this.scale.width + margin;
        y = Math.random() * this.scale.height;
        break;
      case 2:
        x = Math.random() * this.scale.width;
        y = this.scale.height + margin;
        break;
      default:
        x = -margin;
        y = Math.random() * this.scale.height;
        break;
    }

    const isShip = Math.random() < this.shipSpawnChance;
    let enemy: Enemy;

    if (isShip) {
      enemy = new EnemyShip(this, x, y, this.wave);
    } else {
      const sizes: Array<'large' | 'medium' | 'small'> = ['large', 'medium', 'small'];
      const size = sizes[Math.floor(Math.random() * 2)];
      enemy = new Asteroid(this, x, y, size);
    }

    enemy.onDestroyed((e, killed) => {
      if (!killed) {
        const idx = this.enemies.indexOf(e);
        if (idx > -1) {
          this.enemies.splice(idx, 1);
        }
      }
    });

    this.enemies.push(enemy);
  }

  private nextWave(): void {
    this.wave++;
    this.enemiesPerWave = 3 + Math.floor(this.wave * 1.5);
    this.shipSpawnChance = Math.min(0.7, 0.3 + this.wave * 0.05);
    this.waveInterval = Math.max(5000, 15000 - this.wave * 500);

    this.spawnWave();
    this.updateHUDStats();
  }

  private checkGameOver(): void {
    if (this.player.isDead() && !this.isGameOver) {
      this.isGameOver = true;
      this.isGameRunning = false;

      this.hud.showGameOverScreen({
        score: this.score,
        kills: this.kills,
        wave: this.wave,
        upgrades: this.upgradeManager.getTotalUpgradeCount(),
      });
    }
  }

  private updateHUDStats(): void {
    this.hud.updateStats({
      score: this.score,
      wave: this.wave,
      shield: this.player.getShield(),
      maxShield: this.player.stats.maxShield,
      energy: this.upgradeManager.getEnergy(),
      kills: this.kills,
      isEmergency: this.player.isInEmergency(),
      isGameOver: this.isGameOver,
    });
  }

  private clearEnemies(): void {
    for (const enemy of this.enemies) {
      enemy.sprite.destroy();
    }
    this.enemies = [];
  }

  private clearLasers(): void {
    for (const laser of this.lasers) {
      laser.sprite.destroy();
    }
    this.lasers = [];
  }

  private clearParticles(): void {
    for (const particle of this.particles) {
      particle.sprite.destroy();
    }
    this.particles = [];
  }

  private clearEnergyPickups(): void {
    for (const pickup of this.energyPickups) {
      pickup.sprite.destroy();
    }
    this.energyPickups = [];
  }

  private optimizeParticles(): void {
    if (this.particles.length <= this.maxParticles) return;

    const sorted = [...this.particles].sort((a, b) => {
      const distA = Phaser.Math.Distance.Between(
        a.x, a.y, this.player.x, this.player.y
      );
      const distB = Phaser.Math.Distance.Between(
        b.x, b.y, this.player.x, this.player.y
      );
      return distB - distA;
    });

    const toRemove = sorted.slice(0, Math.ceil(this.particles.length * 0.2));
    toRemove.forEach((p) => {
      const idx = this.particles.indexOf(p);
      if (idx > -1) {
        p.sprite.destroy();
        this.particles.splice(idx, 1);
      }
    });
  }

  public destroyGame(): void {
    this.clearEnemies();
    this.clearLasers();
    this.clearParticles();
    this.clearEnergyPickups();
  }
}
