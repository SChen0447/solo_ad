export interface Enemy {
  id: number; x: number; y: number; width: number; height: number; hp: number; isBoss: boolean;
}

export interface HitEvent {
  enemyId: number; damage: number; bulletType: string;
}

export interface Bullet {
  id: number; x: number; y: number; vx: number; vy: number;
  type: 'arrow' | 'fireball' | 'sword_slash' | 'fireball_skill' | 'heal_wave' | 'blink_effect' | 'enemy_bullet';
  damage: number; radius: number; tracking: boolean; targetId: number; lifetime: number; maxLifetime: number;
}

export class BulletSystem {
  private bullets: Bullet[] = [];
  private nextId: number = 1;
  private readonly MAX_BULLETS = 50;

  createPlayerBullet(weaponType: string, playerX: number, playerY: number, facingRight: boolean): void {
    if (this.bullets.length >= this.MAX_BULLETS) return;

    const dir = facingRight ? 1 : -1;

    if (weaponType === 'sword') {
      this.bullets.push({
        id: this.nextId++,
        x: playerX + dir * 20,
        y: playerY,
        vx: 0,
        vy: 0,
        type: 'sword_slash',
        damage: 15,
        radius: 40,
        tracking: false,
        targetId: -1,
        lifetime: 0.15,
        maxLifetime: 0.15,
      });
    } else if (weaponType === 'bow') {
      this.bullets.push({
        id: this.nextId++,
        x: playerX,
        y: playerY,
        vx: 8 * dir,
        vy: 0,
        type: 'arrow',
        damage: 10,
        radius: 4,
        tracking: false,
        targetId: -1,
        lifetime: 2,
        maxLifetime: 2,
      });
    } else if (weaponType === 'staff') {
      this.bullets.push({
        id: this.nextId++,
        x: playerX,
        y: playerY,
        vx: 5 * dir,
        vy: 0,
        type: 'fireball',
        damage: 12,
        radius: 8,
        tracking: true,
        targetId: -1,
        lifetime: 3,
        maxLifetime: 3,
      });
    }
  }

  createSkillEffect(skillType: string, playerX: number, playerY: number, enemies: Enemy[]): void {
    if (this.bullets.length >= this.MAX_BULLETS) return;

    if (skillType === 'fireball') {
      const target = this.findNearestEnemy(playerX, playerY, enemies);
      this.bullets.push({
        id: this.nextId++,
        x: playerX,
        y: playerY,
        vx: target ? (target.x - playerX) : 6,
        vy: target ? (target.y - playerY) : 0,
        type: 'fireball_skill',
        damage: 30,
        radius: 16,
        tracking: true,
        targetId: target ? target.id : -1,
        lifetime: 1,
        maxLifetime: 1,
      });
    } else if (skillType === 'heal') {
      this.bullets.push({
        id: this.nextId++,
        x: playerX,
        y: playerY,
        vx: 0,
        vy: 0,
        type: 'heal_wave',
        damage: 0,
        radius: 10,
        tracking: false,
        targetId: -1,
        lifetime: 0.6,
        maxLifetime: 0.6,
      });
    } else if (skillType === 'blink') {
      this.bullets.push({
        id: this.nextId++,
        x: playerX,
        y: playerY,
        vx: 0,
        vy: 0,
        type: 'blink_effect',
        damage: 0,
        radius: 30,
        tracking: false,
        targetId: -1,
        lifetime: 0.2,
        maxLifetime: 0.2,
      });
    }
  }

  createEnemyBullet(x: number, y: number, vx: number, vy: number): void {
    if (this.bullets.length >= this.MAX_BULLETS) return;

    this.bullets.push({
      id: this.nextId++,
      x,
      y,
      vx,
      vy,
      type: 'enemy_bullet',
      damage: 0,
      radius: 5,
      tracking: false,
      targetId: -1,
      lifetime: 5,
      maxLifetime: 5,
    });
  }

  update(dt: number, enemies: Enemy[]): HitEvent[] {
    const hits: HitEvent[] = [];
    const frameMul = dt * 60;

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];

      if (b.tracking && b.type !== 'sword_slash' && b.type !== 'heal_wave' && b.type !== 'blink_effect') {
        const target = this.findNearestEnemy(b.x, b.y, enemies);
        if (target) {
          const dx = target.x - b.x;
          const dy = target.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            const trackSpeed = speed > 0 ? speed : 5;
            b.vx = (dx / dist) * trackSpeed;
            b.vy = (dy / dist) * trackSpeed;
          }
        }
      }

      if (b.type === 'heal_wave') {
        const progress = 1 - b.lifetime / b.maxLifetime;
        b.radius = 10 + progress * 80;
      }

      b.x += b.vx * frameMul;
      b.y += b.vy * frameMul;
      b.lifetime -= dt;

      if (b.lifetime <= 0) {
        this.bullets.splice(i, 1);
        continue;
      }

      if (b.type === 'heal_wave' || b.type === 'blink_effect') {
        continue;
      }

      for (const enemy of enemies) {
        const ex = enemy.x;
        const ey = enemy.y;
        const ew = enemy.width;
        const eh = enemy.height;

        const closestX = Math.max(ex, Math.min(b.x, ex + ew));
        const closestY = Math.max(ey, Math.min(b.y, ey + eh));
        const distX = b.x - closestX;
        const distY = b.y - closestY;
        const distSq = distX * distX + distY * distY;

        if (distSq <= b.radius * b.radius) {
          hits.push({ enemyId: enemy.id, damage: b.damage, bulletType: b.type });
          this.bullets.splice(i, 1);
          break;
        }
      }
    }

    return hits;
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const b of this.bullets) {
      ctx.save();

      if (b.type === 'arrow') {
        ctx.fillStyle = '#ffcc00';
        const angle = Math.atan2(b.vy, b.vx);
        ctx.translate(b.x, b.y);
        ctx.rotate(angle);
        ctx.fillRect(-8, -1.5, 16, 3);
      } else if (b.type === 'fireball') {
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.type === 'fireball_skill') {
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.type === 'sword_slash') {
        const alpha = Math.max(0, b.lifetime / b.maxLifetime) * 0.6;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, -Math.PI * 0.6, Math.PI * 0.6);
        ctx.stroke();
      } else if (b.type === 'heal_wave') {
        const alpha = Math.max(0, b.lifetime / b.maxLifetime) * 0.5;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (b.type === 'blink_effect') {
        const alpha = Math.max(0, b.lifetime / b.maxLifetime) * 0.7;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.type === 'enemy_bullet') {
        ctx.fillStyle = '#9b59b6';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  clear(): void {
    this.bullets = [];
    this.nextId = 1;
  }

  private findNearestEnemy(x: number, y: number, enemies: Enemy[]): Enemy | null {
    let nearest: Enemy | null = null;
    let minDist = Infinity;

    for (const e of enemies) {
      const cx = e.x + e.width / 2;
      const cy = e.y + e.height / 2;
      const dx = cx - x;
      const dy = cy - y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearest = e;
      }
    }

    return nearest;
  }
}
