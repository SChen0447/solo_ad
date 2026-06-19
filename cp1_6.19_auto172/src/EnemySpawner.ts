import { Player } from './PlayerController';

export interface Enemy {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  angle: number;
  active: boolean;
  radius: number;
}

export class EnemySpawner {
  private enemies: Enemy[];
  private maxEnemies: number = 20;
  private spawnTimer: number = 0;
  private standardInterval: number = 72;
  private fastInterval: number = 48;
  private enemyThreshold: number = 5;
  private screenWidth: number;
  private screenHeight: number;

  constructor(screenWidth: number, screenHeight: number) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.enemies = [];
  }

  private spawnEnemy(): void {
    let enemy = this.enemies.find(e => !e.active);
    if (!enemy && this.enemies.length < this.maxEnemies) {
      enemy = { x: 0, y: 0, size: 20, vx: 0, vy: 0, angle: 0, active: false, radius: 15 };
      this.enemies.push(enemy);
    }
    if (enemy) {
      enemy.x = this.screenWidth + 30;
      enemy.y = 60 + Math.random() * (this.screenHeight - 100);
      enemy.vx = -3;
      enemy.vy = 0;
      enemy.angle = Math.PI;
      enemy.active = true;
      enemy.size = 20;
      enemy.radius = 15;
    }
  }

  public update(player: Player): void {
    const activeCount = this.enemies.filter(e => e.active).length;
    const interval = activeCount < this.enemyThreshold ? this.fastInterval : this.standardInterval;

    this.spawnTimer++;
    if (this.spawnTimer >= interval) {
      this.spawnEnemy();
      this.spawnTimer = 0;
    }

    for (const enemy of this.enemies) {
      if (!enemy.active) continue;

      enemy.x += enemy.vx;

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 300) {
        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - enemy.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        const turnRate = 0.1;
        if (Math.abs(angleDiff) > turnRate) {
          enemy.angle += Math.sign(angleDiff) * turnRate;
        } else {
          enemy.angle = targetAngle;
        }
        const speed = 3;
        enemy.vx = Math.cos(enemy.angle) * speed;
        enemy.vy = Math.sin(enemy.angle) * speed;
        enemy.y += enemy.vy;
      }

      if (enemy.x < -50 || enemy.y < -50 || enemy.y > this.screenHeight + 50) {
        enemy.active = false;
      }
    }
  }

  public getEnemies(): Enemy[] {
    return this.enemies.filter(e => e.active);
  }

  public getAllEnemies(): Enemy[] {
    return this.enemies;
  }

  public reset(): void {
    for (const e of this.enemies) {
      e.active = false;
    }
    this.spawnTimer = 0;
  }

  public resize(screenWidth: number, screenHeight: number): void {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
  }
}
