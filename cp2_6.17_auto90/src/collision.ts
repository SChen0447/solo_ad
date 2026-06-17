import { Player } from './player';
import { Bullet, Particle, Position,
  EXPLOSION_PARTICLES, PARTICLE_LIFETIME, COLORS
} from './types';

export class CollisionDetector {
  static checkRectCircleCollision(
    rect: { x: number; y: number; width: number; height: number },
    circle: { x: number; y: number; radius: number }
  ): boolean {
    const closestPoint = this.closestPointOnRect(circle.x, circle.y, rect);
    const dx = circle.x - closestPoint.x;
    const dy = circle.y - closestPoint.y;
    const distanceSquared = dx * dx + dy * dy;
    return distanceSquared <= circle.radius * circle.radius;
  }

  static checkRectRectCollision(
    rect1: { x: number; y: number; width: number; height: number },
    rect2: { x: number; y: number; width: number; height: number }
  ): boolean {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }

  static detectBulletPlayerCollisions(
    bullets: Bullet[],
    players: Player[],
    onHit: (bullet: Bullet, player: Player, particles: Particle[]) => void
  ): Bullet[] {
    const remainingBullets: Bullet[] = [];
    const hitBulletIndices = new Set<number>();

    for (let i = 0; i < bullets.length; i++) {
      const bullet = bullets[i];
      let hit = false;

      for (const player of players) {
        if (bullet.ownerId === player.id) continue;

        if (this.checkRectCircleCollision(player.getRect(), bullet)) {
          const particles = this.createExplosionParticles(bullet.x, bullet.y);
          onHit(bullet, player, particles);
          hit = true;
          hitBulletIndices.add(i);
          break;
        }
      }

      if (!hit) {
        remainingBullets.push(bullet);
      }
    }

    return remainingBullets;
  }

  static detectPlayerPlayerCollisions(
    players: Player[],
    onCollide: (p1: Player, p2: Player) => void
  ): void {
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        if (this.checkRectRectCollision(players[i].getRect(), players[j].getRect())) {
          onCollide(players[i], players[j]);
        }
      }
    }
  }

  private static closestPointOnRect(
    px: number,
    py: number,
    rect: { x: number; y: number; width: number; height: number }
  ): Position {
    const closestX = Math.max(rect.x, Math.min(px, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(py, rect.y + rect.height));
    return { x: closestX, y: closestY };
  }

  private static createExplosionParticles(x: number, y: number): Particle[] {
    const particles: Particle[] = [];
    
    for (let i = 0; i < EXPLOSION_PARTICLES; i++) {
      const angle = (i / EXPLOSION_PARTICLES) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 3;
      const particle = new Particle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        2 + Math.random() * 2,
        COLORS.accent,
        PARTICLE_LIFETIME
      );
      particles.push(particle);
    }
    
    return particles;
  }
}
