import { Bullet, Player } from './PlayerController';
import { Enemy } from './EnemySpawner';

export interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  active: boolean;
  size: number;
}

export interface CollisionCallback {
  onEnemyHit: (enemy: Enemy) => void;
  onPlayerHit: () => void;
  triggerScreenShake: () => void;
  spawnExplosion: (x: number, y: number) => void;
}

export class CollisionDetection {
  private particles: ExplosionParticle[] = [];
  private maxParticles: number = 200;
  private screenWidth: number;
  private screenHeight: number;

  constructor(screenWidth: number, screenHeight: number) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
  }

  public checkCollisions(
    player: Player,
    bullets: Bullet[],
    enemies: Enemy[],
    callback: CollisionCallback
  ): void {
    for (const bullet of bullets) {
      if (!bullet.active) continue;
      for (const enemy of enemies) {
        if (!enemy.active) continue;
        if (this.circleCollision(bullet.x, bullet.y, bullet.radius, enemy.x, enemy.y, enemy.radius)) {
          bullet.active = false;
          enemy.active = false;
          callback.spawnExplosion(enemy.x, enemy.y);
          callback.onEnemyHit(enemy);
          break;
        }
      }
    }

    if (!player.invincible) {
      for (const enemy of enemies) {
        if (!enemy.active) continue;
        if (this.circleCollision(player.x, player.y, player.radius, enemy.x, enemy.y, enemy.radius)) {
          enemy.active = false;
          callback.onPlayerHit();
          callback.spawnExplosion(player.x, player.y);
          callback.triggerScreenShake();
          break;
        }
      }
    }
  }

  private circleCollision(
    x1: number, y1: number, r1: number,
    x2: number, y2: number, r2: number
  ): boolean {
    const dx = x1 - x2;
    const dy = y1 - y2;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < r1 + r2;
  }

  public spawnExplosion(x: number, y: number): void {
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      let particle = this.particles.find(p => !p.active);
      if (!particle && this.particles.length < this.maxParticles) {
        particle = { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 12, active: false, size: 3 };
        this.particles.push(particle);
      }
      if (particle) {
        const angle = (i / particleCount) * Math.PI * 2;
        const speed = 2 + Math.random() * 2;
        particle.x = x;
        particle.y = y;
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed;
        particle.life = 12;
        particle.maxLife = 12;
        particle.active = true;
        particle.size = 3;
      }
    }
  }

  public updateParticles(): void {
    for (const particle of this.particles) {
      if (!particle.active) continue;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life--;
      if (particle.life <= 0) {
        particle.active = false;
      }
    }
  }

  public getParticles(): ExplosionParticle[] {
    return this.particles.filter(p => p.active);
  }

  public reset(): void {
    for (const p of this.particles) {
      p.active = false;
    }
  }

  public resize(screenWidth: number, screenHeight: number): void {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
  }
}
