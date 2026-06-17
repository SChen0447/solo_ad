import Phaser from 'phaser';
import { fleetManager, Ship } from '../data/FleetManager';

export class BattleScene extends Phaser.Scene {
  private bulletPool: Phaser.GameObjects.Arc[] = [];
  private combatZones: Map<string, { x: number; y: number; active: boolean }> = new Map();
  private explosionTimer?: Phaser.Time.TimerEvent;
  private bulletTimer?: Phaser.Time.TimerEvent;
  private pollingTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'BattleScene' });
  }

  create(): void {
    this.explosionTimer = this.time.addEvent({
      delay: 100,
      callback: this.checkAndExplode,
      callbackScope: this,
      loop: true,
    });

    this.bulletTimer = this.time.addEvent({
      delay: 400,
      callback: this.fireBullets,
      callbackScope: this,
      loop: true,
    });

    this.pollingTimer = this.time.addEvent({
      delay: 2000,
      callback: this.pollCombatStatus,
      callbackScope: this,
      loop: true,
    });
  }

  private async pollCombatStatus(): Promise<void> {
    try {
      const data = await fleetManager.queryStatus();
      this.updateCombatZones(data.fleet, data.enemy_fleet);
    } catch (e) {
      console.error('Battle poll failed:', e);
    }
  }

  private updateCombatZones(fleet: Ship[], enemyFleet: Ship[]): void {
    this.combatZones.clear();
    for (const ps of fleet) {
      if (ps.hp <= 0 || ps.status !== 'combat') continue;
      for (const es of enemyFleet) {
        if (es.hp <= 0 || es.status !== 'combat') continue;
        const dist = Math.sqrt((ps.x - es.x) ** 2 + (ps.y - es.y) ** 2);
        if (dist < 80) {
          const key = `${ps.id}_vs_${es.id}`;
          this.combatZones.set(key, {
            x: (ps.x + es.x) / 2,
            y: (ps.y + es.y) / 2,
            active: true,
          });
        }
      }
    }
  }

  private checkAndExplode(): void {
    for (const [, zone] of this.combatZones) {
      if (!zone.active) continue;
      if (Math.random() < 0.3) {
        this.createExplosionParticle(
          zone.x + Phaser.Math.Between(-25, 25),
          zone.y + Phaser.Math.Between(-25, 25)
        );
      }
    }
  }

  private createExplosionParticle(x: number, y: number): void {
    const colors = [0xffcc00, 0xff8800, 0xff4400];
    const color = Phaser.Utils.Array.GetRandom(colors);
    const size = Phaser.Math.Between(2, 4);
    const particle = this.add.circle(x, y, size, color);
    particle.setBlendMode(Phaser.BlendModes.ADD);

    const angle = Phaser.Math.Between(0, 360) * (Math.PI / 180);
    const speed = Phaser.Math.Between(20, 60);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    this.tweens.add({
      targets: particle,
      x: x + vx,
      y: y + vy,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => particle.destroy(),
    });
  }

  private fireBullets(): void {
    for (const [, zone] of this.combatZones) {
      if (!zone.active) continue;

      const bulletColor = 0xffff44;
      const bullet = this.add.circle(zone.x, zone.y, 2, bulletColor);
      bullet.setBlendMode(Phaser.BlendModes.ADD);

      const angle = Phaser.Math.Between(0, 360) * (Math.PI / 180);
      const speed = Phaser.Math.Between(100, 200);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      this.tweens.add({
        targets: bullet,
        x: zone.x + vx,
        y: zone.y + vy,
        alpha: 0,
        duration: 600,
        ease: 'Linear',
        onComplete: () => bullet.destroy(),
      });

      this.bulletPool.push(bullet);
    }

    this.bulletPool = this.bulletPool.filter(b => b.active);
  }

  update(): void {
    this.bulletPool = this.bulletPool.filter(b => b.active);
  }
}
