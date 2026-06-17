import Phaser from 'phaser';
import { ShipData } from '../data/FleetManager';
import { fleetManager } from '../data/FleetManager';

interface BattleShip {
  id: string;
  sprite: Phaser.GameObjects.Graphics;
  selectionRing: Phaser.GameObjects.Graphics | null;
  data: ShipData;
  velocity: { x: number; y: number };
  lastFireTime: number;
  lastTrailTime: number;
  trailParticles: { sprite: Phaser.GameObjects.Graphics; life: number; maxLife: number }[];
  ringAngle: number;
}

export class BattleScene extends Phaser.Scene {
  private playerShips: BattleShip[] = [];
  private enemyShips: BattleShip[] = [];
  private bullets: { sprite: Phaser.GameObjects.Graphics; vx: number; vy: number; damage: number; faction: string; life: number }[] = [];
  private particles: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private battleTime: number = 0;
  private selectedShipId: string | null = null;

  constructor() {
    super('BattleScene');
  }

  create(): void {
    this.battleTime = 0;
    this.bullets = [];
    this.selectedShipId = null;

    fleetManager.subscribe(() => {
      const selected = fleetManager.getSelectedShip();
      this.selectedShipId = selected ? selected.id : null;
    });
  }

  init(data: { playerShips: ShipData[]; enemyShips: ShipData[] }): void {
    this.createPlayerShips(data.playerShips || []);
    this.createEnemyShips(data.enemyShips || []);
  }

  update(time: number, delta: number): void {
    this.battleTime += delta;
    this.updateShips(delta);
    this.updateSelectionRings(delta);
    this.updateTrailParticles(delta);
    this.updateBullets(delta);
    this.checkCollisions();
    this.checkBattleEnd();
  }

  private createPlayerShips(ships: ShipData[]): void {
    this.playerShips = [];
    const startX = 100;
    const spacing = 80;

    ships.forEach((ship, i) => {
      const y = 200 + i * spacing;
      const sprite = this.add.graphics();
      this.drawWarship(sprite, startX, y, 0x44ff88, ship.stars);

      const shipObj: BattleShip = {
        id: ship.id,
        sprite,
        selectionRing: null,
        data: { ...ship, x: startX, y },
        velocity: { x: 0, y: 0 },
        lastFireTime: 0,
        lastTrailTime: 0,
        trailParticles: [],
        ringAngle: 0
      };
      this.playerShips.push(shipObj);

      sprite.setInteractive(new Phaser.Geom.Circle(0, 0, 25), Phaser.Geom.Circle.Contains);
      sprite.on('pointerdown', () => {
        if (shipObj.data.hull > 0) {
          fleetManager.setSelectedShip(ship.id);
        }
      });
    });
  }

  private createEnemyShips(ships: ShipData[]): void {
    this.enemyShips = [];
    const startX = 700;
    const spacing = 100;

    ships.forEach((ship, i) => {
      const y = 200 + i * spacing;
      const sprite = this.add.graphics();
      this.drawWarship(sprite, startX, y, 0xff4444, ship.stars);
      sprite.rotation = Math.PI;

      this.enemyShips.push({
        id: ship.id,
        sprite,
        selectionRing: null,
        data: { ...ship, x: startX, y },
        velocity: { x: 0, y: 0 },
        lastFireTime: 0,
        lastTrailTime: 0,
        trailParticles: [],
        ringAngle: 0
      });
    });
  }

  private drawWarship(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, stars: number): void {
    g.clear();
    g.savePosition();
    g.x = x;
    g.y = y;

    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(0, -20);
    g.lineTo(15, 5);
    g.lineTo(10, 15);
    g.lineTo(-10, 15);
    g.lineTo(-15, 5);
    g.closePath();
    g.fillPath();

    g.fillStyle(color, 0.7);
    g.fillRect(-5, -8, 10, 12);

    g.lineStyle(1, color, 0.5);
    g.strokePath();

    const glowSize = 10 + stars * 2;
    g.fillStyle(color, 0.15);
    g.fillCircle(0, 0, glowSize);
  }

  private updateShips(delta: number): void {
    const now = this.battleTime;

    for (const ship of this.playerShips) {
      if (ship.data.hull <= 0) continue;

      const nearest = this.findNearestEnemy(ship);
      if (nearest) {
        const dx = nearest.data.x - ship.data.x;
        const dy = nearest.data.y - ship.data.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 150) {
          ship.velocity.x = (dx / dist) * ship.data.speed * 0.3;
          ship.velocity.y = (dy / dist) * ship.data.speed * 0.3;
        } else {
          ship.velocity.x *= 0.95;
          ship.velocity.y *= 0.95;
        }

        if (dist < 250 && this.battleTime - ship.lastFireTime > 1500) {
          this.fireBullet(ship, nearest);
          ship.lastFireTime = this.battleTime;
        }
      }

      ship.data.x += ship.velocity.x * (delta / 1000);
      ship.data.y += ship.velocity.y * (delta / 1000);
      ship.sprite.x = ship.data.x;
      ship.sprite.y = ship.data.y;

      const isMoving = Math.abs(ship.velocity.x) > 5 || Math.abs(ship.velocity.y) > 5;
      if ((isMoving || nearest) && this.battleTime - ship.lastTrailTime > 70) {
        ship.lastTrailTime = this.battleTime;
        this.spawnBattleTrail(ship, 0x4488ff);
      }
    }

    for (const enemy of this.enemyShips) {
      if (enemy.data.hull <= 0) continue;

      const nearest = this.findNearestPlayer(enemy);
      if (nearest) {
        const dx = nearest.data.x - enemy.data.x;
        const dy = nearest.data.y - enemy.data.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 180) {
          enemy.velocity.x = (dx / dist) * enemy.data.speed * 0.25;
          enemy.velocity.y = (dy / dist) * enemy.data.speed * 0.25;
        } else {
          enemy.velocity.x *= 0.95;
          enemy.velocity.y *= 0.95;
        }

        if (dist < 280 && this.battleTime - enemy.lastFireTime > 2000) {
          this.fireBullet(enemy, nearest);
          enemy.lastFireTime = this.battleTime;
        }
      }

      enemy.data.x += enemy.velocity.x * (delta / 1000);
      enemy.data.y += enemy.velocity.y * (delta / 1000);
      enemy.sprite.x = enemy.data.x;
      enemy.sprite.y = enemy.data.y;

      const isMoving = Math.abs(enemy.velocity.x) > 5 || Math.abs(enemy.velocity.y) > 5;
      if ((isMoving || nearest) && this.battleTime - enemy.lastTrailTime > 70) {
        enemy.lastTrailTime = this.battleTime;
        this.spawnBattleTrail(enemy, 0xff4444);
      }
    }
  }

  private findNearestEnemy(ship: BattleShip): BattleShip | null {
    let nearest: BattleShip | null = null;
    let minDist = Infinity;
    for (const enemy of this.enemyShips) {
      if (enemy.data.hull <= 0) continue;
      const dist = Math.sqrt(
        (ship.data.x - enemy.data.x) ** 2 +
        (ship.data.y - enemy.data.y) ** 2
      );
      if (dist < minDist) {
        minDist = dist;
        nearest = enemy;
      }
    }
    return nearest;
  }

  private findNearestPlayer(enemy: BattleShip): BattleShip | null {
    let nearest: BattleShip | null = null;
    let minDist = Infinity;
    for (const ship of this.playerShips) {
      if (ship.data.hull <= 0) continue;
      const dist = Math.sqrt(
        (enemy.data.x - ship.data.x) ** 2 +
        (enemy.data.y - ship.data.y) ** 2
      );
      if (dist < minDist) {
        minDist = dist;
        nearest = ship;
      }
    }
    return nearest;
  }

  private fireBullet(from: BattleShip, to: BattleShip): void {
    const dx = to.data.x - from.data.x;
    const dy = to.data.y - from.data.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 400;

    const bullet = this.add.graphics();
    bullet.setDepth(5);
    bullet.x = from.data.x;
    bullet.y = from.data.y;

    const color = from.data.faction === 'player' ? 0x88ffaa : 0xff8866;
    bullet.fillStyle(color, 1);
    bullet.fillCircle(0, 0, 3);
    bullet.fillStyle(color, 0.4);
    bullet.fillCircle(0, 0, 6);

    this.bullets.push({
      sprite: bullet,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      damage: from.data.firepower * 0.1,
      faction: from.data.faction,
      life: 2000
    });
  }

  private updateBullets(delta: number): void {
    const dt = delta / 1000;

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.sprite.x += bullet.vx * dt;
      bullet.sprite.y += bullet.vy * dt;
      bullet.life -= delta;

      if (bullet.life <= 0) {
        bullet.sprite.destroy();
        this.bullets.splice(i, 1);
      }
    }
  }

  private checkCollisions(): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];

      if (bullet.faction === 'player') {
        for (const enemy of this.enemyShips) {
          if (enemy.data.hull <= 0) continue;
          const dist = Math.sqrt(
            (bullet.sprite.x - enemy.data.x) ** 2 +
            (bullet.sprite.y - enemy.data.y) ** 2
          );
          if (dist < 20) {
            enemy.data.hull -= bullet.damage;
            this.spawnHitEffect(bullet.sprite.x, bullet.sprite.y, 0xff6644);
            bullet.sprite.destroy();
            this.bullets.splice(i, 1);

            if (enemy.data.hull <= 0) {
              this.spawnExplosion(enemy.data.x, enemy.data.y);
              enemy.sprite.alpha = 0;
            }
            break;
          }
        }
      } else {
        for (const ship of this.playerShips) {
          if (ship.data.hull <= 0) continue;
          const dist = Math.sqrt(
            (bullet.sprite.x - ship.data.x) ** 2 +
            (bullet.sprite.y - ship.data.y) ** 2
          );
          if (dist < 20) {
            ship.data.hull -= bullet.damage;
            this.spawnHitEffect(bullet.sprite.x, bullet.sprite.y, 0x88ffaa);
            bullet.sprite.destroy();
            this.bullets.splice(i, 1);

            if (ship.data.hull <= 0) {
              this.spawnExplosion(ship.data.x, ship.data.y);
              ship.sprite.alpha = 0;
            }
            break;
          }
        }
      }
    }
  }

  private spawnHitEffect(x: number, y: number, color: number): void {
    for (let i = 0; i < 5; i++) {
      const p = this.add.graphics();
      p.setDepth(8);
      p.x = x;
      p.y = y;
      p.fillStyle(color, 1);
      p.fillCircle(0, 0, 2);

      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 30;

      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.3,
        duration: 300,
        onComplete: () => p.destroy()
      });
    }
  }

  private spawnExplosion(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      const p = this.add.graphics();
      p.setDepth(10);
      p.x = x;
      p.y = y;
      const color = Math.random() > 0.5 ? 0xffcc00 : 0xff5500;
      const size = 2 + Math.random() * 4;
      p.fillStyle(color, 1);
      p.fillCircle(0, 0, size);

      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;

      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        scale: 0.2,
        duration: 1000,
        onComplete: () => p.destroy()
      });
    }
  }

  private updateSelectionRings(delta: number): void {
    for (const ship of this.playerShips) {
      const isSelected = this.selectedShipId === ship.id && ship.data.hull > 0;

      if (isSelected && !ship.selectionRing) {
        ship.selectionRing = this.add.graphics();
        ship.selectionRing.setDepth(2);
      } else if (!isSelected && ship.selectionRing) {
        ship.selectionRing.destroy();
        ship.selectionRing = null;
      }

      if (ship.selectionRing && isSelected) {
        ship.ringAngle += delta * 0.0015;
        const ring = ship.selectionRing;
        ring.clear();

        const cx = ship.data.x;
        const cy = ship.data.y;
        const radius = 32;
        const segments = 40;

        ring.lineStyle(2, 0x88ccff, 0.5);
        ring.beginPath();
        for (let i = 0; i <= segments; i++) {
          const t = (i / segments) * Math.PI * 2 + ship.ringAngle;
          const wobble = Math.sin(t * 3) * 2;
          const x = cx + Math.cos(t) * (radius + wobble);
          const y = cy + Math.sin(t) * (radius + wobble);
          if (i === 0) {
            ring.moveTo(x, y);
          } else {
            ring.lineTo(x, y);
          }
        }
        ring.closePath();
        ring.strokePath();

        ring.lineStyle(1, 0xaaddff, 0.3);
        ring.beginPath();
        for (let i = 0; i <= segments; i++) {
          const t = (i / segments) * Math.PI * 2 - ship.ringAngle * 0.7;
          const wobble = Math.cos(t * 2) * 3;
          const x = cx + Math.cos(t) * (radius + 6 + wobble);
          const y = cy + Math.sin(t) * (radius + 6 + wobble);
          if (i === 0) {
            ring.moveTo(x, y);
          } else {
            ring.lineTo(x, y);
          }
        }
        ring.closePath();
        ring.strokePath();
      }
    }
  }

  private spawnBattleTrail(ship: BattleShip, color: number): void {
    if (ship.trailParticles.length >= 15) {
      const oldest = ship.trailParticles.shift();
      if (oldest) oldest.sprite.destroy();
    }

    const p = this.add.graphics();
    p.setDepth(1);
    const angle = Math.atan2(ship.velocity.y, ship.velocity.x) + Math.PI;
    const offsetX = Math.cos(angle) * 15;
    const offsetY = Math.sin(angle) * 15;
    p.x = ship.data.x + offsetX + (Math.random() - 0.5) * 4;
    p.y = ship.data.y + offsetY + (Math.random() - 0.5) * 4;
    p.fillStyle(color, 0.6);
    p.fillCircle(0, 0, 2 + Math.random() * 2);

    ship.trailParticles.push({
      sprite: p,
      life: 0,
      maxLife: 400
    });
  }

  private updateTrailParticles(delta: number): void {
    const allShips = [...this.playerShips, ...this.enemyShips];
    for (const ship of allShips) {
      for (let i = ship.trailParticles.length - 1; i >= 0; i--) {
        const particle = ship.trailParticles[i];
        particle.life += delta;
        const t = particle.life / particle.maxLife;
        particle.sprite.alpha = Math.max(0, 1 - t);
        particle.sprite.scale = Math.max(0.1, 1 - t * 0.7);
        if (particle.life >= particle.maxLife) {
          particle.sprite.destroy();
          ship.trailParticles.splice(i, 1);
        }
      }
    }
  }

  private checkBattleEnd(): void {
    const playerAlive = this.playerShips.some(s => s.data.hull > 0);
    const enemyAlive = this.enemyShips.some(s => s.data.hull > 0);

    if (!playerAlive || !enemyAlive) {
      this.time.delayedCall(2000, () => {
        this.scene.stop('BattleScene');
        this.scene.resume('StarmapScene');
      });
    }
  }
}
