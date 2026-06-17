export interface Vector2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Circle {
  x: number;
  y: number;
  radius: number;
}

export type EntityType =
  | 'submarine'
  | 'enemy'
  | 'boss'
  | 'obstacle'
  | 'bullet'
  | 'particle'
  | 'collectible'
  | 'oxygen'
  | 'bossProjectile';

export type EnemyType = 'lanternfish' | 'eel';
export type BossType = 'octopus' | 'seadragon';
export type ObstacleType = 'coral' | 'shipwreck';
export type CollectibleType = 'coin' | 'relicFragment' | 'relic' | 'oxygenBubble';
export type ParticleType = 'trail' | 'explosion' | 'bubble' | 'ink' | 'debris';

export interface EntityState {
  id: string;
  type: EntityType;
  position: Vector2;
  velocity: Vector2;
  active: boolean;
}

export class Submarine implements EntityState {
  id: string;
  type: EntityType = 'submarine';
  position: Vector2;
  velocity: Vector2 = { x: 0, y: 0 };
  active: boolean = true;
  width: number = 48;
  height: number = 28;
  health: number = 100;
  maxHealth: number = 100;
  oxygen: number = 100;
  maxOxygen: number = 100;
  coins: number = 0;
  relicFragments: number = 0;
  relics: number = 0;
  shootCooldown: number = 0;
  invincible: number = 0;
  facing: number = 1;
  thrusterFrame: number = 0;

  constructor(x: number, y: number, id: string) {
    this.id = id;
    this.position = { x, y };
  }

  getCollisionRect(): Rect {
    return {
      x: this.position.x - this.width / 2,
      y: this.position.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }

  draw(ctx: CanvasRenderingContext2D, depth: number) {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.scale(this.facing, 1);

    if (this.invincible > 0 && Math.floor(this.invincible / 4) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    this.thrusterFrame = (this.thrusterFrame + 0.2) % 4;

    ctx.fillStyle = '#ff8c00';
    const flameLen = 6 + Math.sin(this.thrusterFrame * Math.PI) * 3;
    ctx.fillRect(-this.width / 2 - flameLen, -4, flameLen, 3);
    ctx.fillRect(-this.width / 2 - flameLen, 1, flameLen, 3);
    ctx.fillStyle = '#ffe100';
    ctx.fillRect(-this.width / 2 - flameLen + 2, -3, flameLen - 3, 1);
    ctx.fillRect(-this.width / 2 - flameLen + 2, 2, flameLen - 3, 1);

    ctx.fillStyle = '#3a5f8a';
    ctx.fillRect(-this.width / 2, -this.height / 2 + 4, this.width, this.height - 8);

    ctx.fillStyle = '#4a7ab0';
    ctx.fillRect(-this.width / 2 + 4, -this.height / 2 + 6, this.width - 8, this.height - 14);

    ctx.fillStyle = '#1a3a5c';
    ctx.fillRect(-this.width / 2, -this.height / 2 + 4, 4, this.height - 8);
    ctx.fillRect(this.width / 2 - 4, -this.height / 2 + 4, 4, this.height - 8);

    ctx.fillStyle = '#5ba3d9';
    ctx.fillRect(this.width / 2 - 18, -this.height / 2 + 2, 14, 12);
    ctx.fillStyle = '#7bc4f5';
    ctx.fillRect(this.width / 2 - 16, -this.height / 2 + 4, 10, 8);
    ctx.fillStyle = '#c8e8ff';
    ctx.fillRect(this.width / 2 - 14, -this.height / 2 + 5, 3, 3);

    ctx.fillStyle = '#2d4a6e';
    ctx.fillRect(0, -this.height / 2 - 4, 12, 6);
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(10, -this.height / 2 - 2, 4, 2);

    ctx.fillStyle = '#8b4513';
    ctx.fillRect(-8, this.height / 2 - 6, 6, 6);
    ctx.fillRect(4, this.height / 2 - 6, 6, 6);

    ctx.restore();
  }
}

export class Bullet implements EntityState {
  id: string;
  type: EntityType = 'bullet';
  position: Vector2;
  velocity: Vector2;
  active: boolean = true;
  radius: number = 4;
  life: number = 90;
  trail: Vector2[] = [];

  constructor(x: number, y: number, vx: number, vy: number, id: string) {
    this.id = id;
    this.position = { x, y };
    this.velocity = { x: vx, y: vy };
  }

  getCollisionCircle(): Circle {
    return { x: this.position.x, y: this.position.y, radius: this.radius };
  }

  update() {
    this.trail.push({ x: this.position.x, y: this.position.y });
    if (this.trail.length > 8) this.trail.shift();
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    this.life--;
    if (this.life <= 0) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const alpha = i / this.trail.length;
      ctx.fillStyle = `rgba(255, 180, 80, ${alpha * 0.7})`;
      const r = (i / this.trail.length) * this.radius;
      ctx.fillRect(t.x - r, t.y - r, r * 2, r * 2);
    }
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(this.position.x - this.radius, this.position.y - this.radius, this.radius * 2, this.radius * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.position.x - 1, this.position.y - 1, 2, 2);
  }
}

export class Enemy implements EntityState {
  id: string;
  type: EntityType = 'enemy';
  position: Vector2;
  velocity: Vector2;
  active: boolean = true;
  width: number = 36;
  height: number = 20;
  enemyType: EnemyType;
  health: number;
  maxHealth: number;
  animFrame: number = 0;
  hitFlash: number = 0;

  constructor(x: number, y: number, enemyType: EnemyType, id: string) {
    this.id = id;
    this.enemyType = enemyType;
    this.position = { x, y };
    this.velocity = { x: -1.2, y: 0 };
    if (enemyType === 'eel') {
      this.health = 3;
      this.width = 56;
      this.height = 16;
    } else {
      this.health = 2;
    }
    this.maxHealth = this.health;
  }

  getCollisionRect(): Rect {
    return {
      x: this.position.x - this.width / 2,
      y: this.position.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }

  update(targetX: number, targetY: number) {
    this.animFrame += 0.15;
    if (this.hitFlash > 0) this.hitFlash--;

    const dx = targetX - this.position.x;
    const dy = targetY - this.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 300 && dist > 0) {
      this.velocity.x += (dx / dist) * 0.02;
      this.velocity.y += (dy / dist) * 0.02;
    }

    const maxSpeed = this.enemyType === 'eel' ? 2.5 : 1.8;
    const spd = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    if (spd > maxSpeed) {
      this.velocity.x = (this.velocity.x / spd) * maxSpeed;
      this.velocity.y = (this.velocity.y / spd) * maxSpeed;
    }

    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y + Math.sin(this.animFrame) * 0.5;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    const facing = this.velocity.x < 0 ? -1 : 1;
    ctx.scale(facing, 1);

    if (this.hitFlash > 0) {
      ctx.globalAlpha = 0.8;
    }

    if (this.enemyType === 'lanternfish') {
      const flash = this.hitFlash > 0;
      ctx.fillStyle = flash ? '#ffffff' : '#1a2a4a';
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.fillStyle = flash ? '#ffffff' : '#2d4a7a';
      ctx.fillRect(-this.width / 2 + 3, -this.height / 2 + 3, this.width - 8, this.height - 8);

      ctx.fillStyle = flash ? '#ffffff' : '#00ffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 8;
      ctx.fillRect(this.width / 2 - 6, -this.height / 2 - 10, 4, 10);
      ctx.fillRect(this.width / 2 - 8, -this.height / 2 - 14, 8, 6);
      ctx.shadowBlur = 0;

      ctx.fillStyle = flash ? '#ff0000' : '#ffff00';
      ctx.fillRect(this.width / 2 - 10, -4, 4, 4);
      ctx.fillRect(this.width / 2 - 10, 2, 4, 4);

      const tailWag = Math.sin(this.animFrame * 2) * 3;
      ctx.fillStyle = flash ? '#ffffff' : '#1a2a4a';
      ctx.fillRect(-this.width / 2 - 8, -4 + tailWag, 8, 8);
    } else {
      const flash = this.hitFlash > 0;
      const segments = 6;
      for (let i = 0; i < segments; i++) {
        const wave = Math.sin(this.animFrame + i * 0.5) * 3;
        const segW = this.width / segments;
        ctx.fillStyle = flash ? '#ffffff' : (i % 2 === 0 ? '#5a3a1a' : '#7a5a2a');
        ctx.fillRect(-this.width / 2 + i * segW, -this.height / 2 + wave, segW, this.height);
      }

      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 6;
      for (let i = 0; i < segments; i++) {
        if (i % 2 === 0) {
          const wave = Math.sin(this.animFrame + i * 0.5) * 3;
          const segW = this.width / segments;
          ctx.fillStyle = flash ? '#ffffff' : '#ffff00';
          ctx.fillRect(-this.width / 2 + i * segW + 2, -this.height / 2 + wave - 2, 2, 2);
          ctx.fillRect(-this.width / 2 + i * segW + 2, this.height / 2 + wave, 2, 2);
        }
      }
      ctx.shadowBlur = 0;

      ctx.fillStyle = flash ? '#ffffff' : '#4a2a0a';
      ctx.fillRect(this.width / 2 - 6, -6, 6, 12);
      ctx.fillStyle = flash ? '#ffffff' : '#ff3300';
      ctx.fillRect(this.width / 2 - 4, -4, 3, 3);
      ctx.fillRect(this.width / 2 - 4, 1, 3, 3);

      const mouthOpen = Math.sin(this.animFrame * 3) * 0.5 + 0.5;
      ctx.fillStyle = '#000';
      ctx.fillRect(this.width / 2, -2, 4, 4 * mouthOpen + 1);
    }

    ctx.restore();
  }
}

export enum BossAttackMode {
  TentacleSlam,
  InkBarrage,
  VortexPull,
}

export class Boss implements EntityState {
  id: string;
  type: EntityType = 'boss';
  position: Vector2;
  velocity: Vector2 = { x: 0, y: 0 };
  active: boolean = true;
  width: number = 140;
  height: number = 120;
  bossType: BossType;
  health: number;
  maxHealth: number;
  animFrame: number = 0;
  attackCooldown: number = 120;
  currentAttack: BossAttackMode = BossAttackMode.TentacleSlam;
  attackTimer: number = 0;
  hitFlash: number = 0;
  phase: number = 1;
  tentacles: { angle: number; length: number; active: boolean; slamTimer: number }[] = [];

  constructor(x: number, y: number, bossType: BossType, id: string) {
    this.id = id;
    this.bossType = bossType;
    this.position = { x, y };
    this.health = bossType === 'octopus' ? 80 : 120;
    this.maxHealth = this.health;
    for (let i = 0; i < 6; i++) {
      this.tentacles.push({
        angle: (i / 6) * Math.PI * 2,
        length: 80 + Math.random() * 40,
        active: true,
        slamTimer: 0,
      });
    }
  }

  getCollisionRect(): Rect {
    return {
      x: this.position.x - this.width / 2,
      y: this.position.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }

  getTentacleRects(): Rect[] {
    const rects: Rect[] = [];
    for (const t of this.tentacles) {
      if (!t.active) continue;
      const ex = this.position.x + Math.cos(t.angle + this.animFrame * 0.02) * t.length;
      const ey = this.position.y + Math.sin(t.angle + this.animFrame * 0.02) * t.length;
      rects.push({
        x: Math.min(this.position.x, ex) - 8,
        y: Math.min(this.position.y, ey) - 8,
        width: Math.abs(ex - this.position.x) + 16,
        height: Math.abs(ey - this.position.y) + 16,
      });
    }
    return rects;
  }

  update(targetX: number, targetY: number, screenW: number, screenH: number) {
    this.animFrame++;
    if (this.hitFlash > 0) this.hitFlash--;

    if (this.health < this.maxHealth * 0.5) this.phase = 2;
    if (this.health < this.maxHealth * 0.25) this.phase = 3;

    const cx = screenW * 0.65;
    const cy = screenH * 0.5;
    this.position.x += (cx - this.position.x) * 0.01;
    this.position.y += (cy - this.position.y) * 0.01;
    this.position.y += Math.sin(this.animFrame * 0.03) * 0.8;

    this.attackCooldown--;
    if (this.attackTimer > 0) this.attackTimer--;

    if (this.attackCooldown <= 0 && this.attackTimer <= 0) {
      const modes = [BossAttackMode.TentacleSlam, BossAttackMode.InkBarrage, BossAttackMode.VortexPull];
      this.currentAttack = modes[Math.floor(Math.random() * modes.length)];
      this.attackCooldown = this.phase === 3 ? 90 : this.phase === 2 ? 140 : 180;
      this.attackTimer = 60;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);

    if (this.hitFlash > 0 && Math.floor(this.hitFlash / 2) % 2 === 0) {
      ctx.globalAlpha = 0.6;
    }

    if (this.bossType === 'octopus') {
      for (let i = 0; i < this.tentacles.length; i++) {
        const t = this.tentacles[i];
        const wave = this.animFrame * 0.05;
        ctx.strokeStyle = this.hitFlash > 0 ? '#ffffff' : `rgba(120, 60, 140, 0.85)`;
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let s = 0; s <= 20; s++) {
          const p = s / 20;
          const ang = t.angle + wave + Math.sin(wave * 2 + i + p * 6) * 0.3;
          const px = Math.cos(ang) * t.length * p;
          const py = Math.sin(ang) * t.length * p;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        for (let s = 3; s <= 18; s += 3) {
          const p = s / 20;
          const ang = t.angle + wave + Math.sin(wave * 2 + i + p * 6) * 0.3;
          const px = Math.cos(ang) * t.length * p;
          const py = Math.sin(ang) * t.length * p;
          ctx.fillStyle = '#2a0a3a';
          ctx.fillRect(px - 2, py - 2, 4, 4);
        }
      }

      ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#7a3a9a';
      ctx.beginPath();
      ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#9a5aba';
      ctx.beginPath();
      ctx.ellipse(-10, -10, this.width / 3, this.height / 3, 0, 0, Math.PI * 2);
      ctx.fill();

      const eyeBlink = Math.floor(this.animFrame / 120) % 20 < 2;
      if (!eyeBlink) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-35, -20, 18, 18);
        ctx.fillRect(17, -20, 18, 18);
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(-30, -15, 10, 10);
        ctx.fillRect(22, -15, 10, 10);
        ctx.fillStyle = '#000';
        ctx.fillRect(-26, -11, 4, 4);
        ctx.fillRect(26, -11, 4, 4);
      } else {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-35, -12);
        ctx.lineTo(-17, -12);
        ctx.moveTo(17, -12);
        ctx.lineTo(35, -12);
        ctx.stroke();
      }

      ctx.fillStyle = '#4a1a6a';
      ctx.fillRect(-15, 10, 30, 6);
    } else {
      const wave = this.animFrame * 0.03;
      for (let i = 10; i >= 0; i--) {
        const p = i / 10;
        const bx = -this.width / 2 * p + Math.sin(wave + i * 0.5) * 8;
        const by = Math.cos(wave + i * 0.5) * 10;
        const size = 30 - i * 1.5;
        ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : (i % 2 === 0 ? '#2a5a3a' : '#3a7a4a');
        ctx.fillRect(bx - size / 2, by - size / 2, size, size);
        if (i % 3 === 0) {
          ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#8aff8a';
          ctx.shadowColor = '#4aff4a';
          ctx.shadowBlur = 6;
          ctx.fillRect(bx - 2, by - size / 2 - 4, 4, 4);
          ctx.shadowBlur = 0;
        }
      }

      ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#4a8a5a';
      ctx.fillRect(10, -25, 50, 50);
      ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#6aaa7a';
      ctx.fillRect(15, -20, 40, 40);

      ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#3a6a4a';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(20 + i * 15, -35, 4, 12);
      }

      const eyeBlink = Math.floor(this.animFrame / 100) % 15 < 2;
      if (!eyeBlink) {
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 8;
        ctx.fillRect(35, -15, 12, 12);
        ctx.fillRect(35, 3, 12, 12);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(40, -12, 5, 5);
        ctx.fillRect(40, 6, 5, 5);
      }

      ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#1a3a2a';
      ctx.fillRect(55, -5, 10, 14);
      ctx.fillStyle = '#000';
      ctx.fillRect(60, 0, 6, 6);

      ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : '#2a5a3a';
      for (let i = 0; i < 4; i++) {
        const fx = -5 - i * 10;
        const fy = -25 + i * 4;
        ctx.fillRect(fx, fy, 12, 8);
      }
    }

    ctx.restore();
  }
}

export class BossProjectile implements EntityState {
  id: string;
  type: EntityType = 'bossProjectile';
  position: Vector2;
  velocity: Vector2;
  active: boolean = true;
  radius: number;
  life: number;
  projectileType: 'ink' | 'vortex';

  constructor(x: number, y: number, vx: number, vy: number, id: string, type: 'ink' | 'vortex' = 'ink') {
    this.id = id;
    this.position = { x, y };
    this.velocity = { x: vx, y: vy };
    this.projectileType = type;
    this.radius = type === 'ink' ? 8 : 20;
    this.life = type === 'ink' ? 200 : 180;
  }

  getCollisionCircle(): Circle {
    return { x: this.position.x, y: this.position.y, radius: this.radius };
  }

  update() {
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    this.velocity.x *= 0.99;
    this.velocity.y *= 0.99;
    this.life--;
    if (this.life <= 0) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.projectileType === 'ink') {
      ctx.fillStyle = 'rgba(20, 10, 30, 0.9)';
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(50, 30, 70, 0.6)';
      ctx.beginPath();
      ctx.arc(this.position.x - 3, this.position.y - 3, this.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.save();
      ctx.translate(this.position.x, this.position.y);
      ctx.rotate((this.life * 0.1) % (Math.PI * 2));
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = `rgba(100, 150, 255, ${0.3 + i * 0.15})`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, this.radius, -0.3, 0.3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

export class Obstacle implements EntityState {
  id: string;
  type: EntityType = 'obstacle';
  position: Vector2;
  velocity: Vector2 = { x: 0, y: 0 };
  active: boolean = true;
  width: number;
  height: number;
  obstacleType: ObstacleType;
  floatPhase: number;
  floatAmp: number;

  constructor(x: number, y: number, obstacleType: ObstacleType, id: string) {
    this.id = id;
    this.obstacleType = obstacleType;
    this.position = { x, y };
    this.floatPhase = Math.random() * Math.PI * 2;
    this.floatAmp = 2 + Math.random() * 3;
    if (obstacleType === 'coral') {
      this.width = 40 + Math.random() * 40;
      this.height = 50 + Math.random() * 50;
    } else {
      this.width = 100 + Math.random() * 60;
      this.height = 50 + Math.random() * 30;
    }
  }

  getCollisionRect(): Rect {
    return {
      x: this.position.x - this.width / 2,
      y: this.position.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }

  update(time: number) {
    this.position.y += Math.sin(time * 0.001 + this.floatPhase) * 0.3;
  }

  draw(ctx: CanvasRenderingContext2D, time: number) {
    ctx.save();
    const floatY = Math.sin(time * 0.001 + this.floatPhase) * this.floatAmp;
    ctx.translate(this.position.x, this.position.y + floatY);

    if (this.obstacleType === 'coral') {
      const colors = ['#ff6b6b', '#ff8e8e', '#ffb3b3', '#ff4757', '#c44569'];
      for (let i = 0; i < 5; i++) {
        const bx = (i - 2) * (this.width / 5);
        const bh = this.height * (0.5 + Math.sin(i + this.floatPhase) * 0.3);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(bx - 6, -bh / 2, 12, bh);
        ctx.fillRect(bx - 10, -bh / 2 - 8, 20, 10);
        if (i % 2 === 0) {
          ctx.fillStyle = '#ffcc00';
          ctx.fillRect(bx - 3, -bh / 2 - 12, 6, 6);
        }
      }
      ctx.fillStyle = '#8b6914';
      ctx.fillRect(-this.width / 2 - 5, this.height / 2 - 10, this.width + 10, 15);
    } else {
      ctx.fillStyle = '#5a4a3a';
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height * 0.7);
      ctx.fillStyle = '#7a6a5a';
      ctx.fillRect(-this.width / 2 + 4, -this.height / 2 + 4, this.width - 8, this.height * 0.6);
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(-this.width / 2, this.height / 2 - 20, this.width, 20);

      const mastH = this.height * 0.8;
      ctx.fillStyle = '#4a3a2a';
      ctx.fillRect(-4, -this.height / 2 - mastH, 8, mastH);
      ctx.fillStyle = '#f0e0c0';
      ctx.beginPath();
      ctx.moveTo(4, -this.height / 2 - mastH + 10);
      ctx.lineTo(40, -this.height / 2 - mastH + 40);
      ctx.lineTo(4, -this.height / 2 - mastH + 50);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#2a1a0a';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(-this.width / 2 + 15 + i * 25, -this.height / 2 + 10, 12, 14);
      }

      ctx.fillStyle = '#8a7a6a';
      const broken = Math.sin(this.floatPhase) * 5;
      ctx.fillRect(this.width / 2 - 20, -this.height / 2 - 5 + broken, 25, 8);
    }

    ctx.restore();
  }
}

export class Particle implements EntityState {
  id: string;
  type: EntityType = 'particle';
  position: Vector2;
  velocity: Vector2;
  active: boolean = true;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  particleType: ParticleType;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    size: number,
    color: string,
    particleType: ParticleType,
    id: string,
  ) {
    this.id = id;
    this.position = { x, y };
    this.velocity = { x: vx, y: vy };
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.color = color;
    this.particleType = particleType;
  }

  update() {
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    if (this.particleType === 'bubble') {
      this.velocity.y -= 0.02;
      this.velocity.x += (Math.random() - 0.5) * 0.1;
    } else if (this.particleType === 'debris') {
      this.velocity.y += 0.05;
    } else {
      this.velocity.x *= 0.95;
      this.velocity.y *= 0.95;
    }
    this.life--;
    if (this.life <= 0) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.life / this.maxLife;
    if (this.particleType === 'bubble') {
      ctx.strokeStyle = `rgba(200, 230, 255, ${alpha * 0.8})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
      ctx.fillRect(this.position.x - this.size * 0.3, this.position.y - this.size * 0.3, this.size * 0.3, this.size * 0.3);
    } else if (this.particleType === 'ink') {
      ctx.fillStyle = `rgba(30, 20, 50, ${alpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.size * (1 + (1 - alpha)), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = this.color.replace('ALPHA', alpha.toFixed(2));
      ctx.fillRect(this.position.x - this.size / 2, this.position.y - this.size / 2, this.size, this.size);
    }
  }
}

export class Collectible implements EntityState {
  id: string;
  type: EntityType = 'collectible';
  position: Vector2;
  velocity: Vector2 = { x: 0, y: 0 };
  active: boolean = true;
  width: number = 16;
  height: number = 16;
  collectibleType: CollectibleType;
  animFrame: number = 0;
  life: number = 600;

  constructor(x: number, y: number, collectibleType: CollectibleType, id: string) {
    this.id = id;
    this.collectibleType = collectibleType;
    this.position = { x, y };
    if (collectibleType === 'oxygenBubble') {
      this.width = 20;
      this.height = 20;
    } else if (collectibleType === 'relic') {
      this.width = 28;
      this.height = 28;
    }
  }

  getCollisionRect(): Rect {
    return {
      x: this.position.x - this.width / 2,
      y: this.position.y - this.height / 2,
      width: this.width,
      height: this.height,
    };
  }

  update() {
    this.animFrame += 0.1;
    this.position.y += Math.sin(this.animFrame) * 0.3;
    if (this.collectibleType === 'oxygenBubble') {
      this.position.y -= 0.5;
    }
    this.life--;
    if (this.life <= 0) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.position.x, this.position.y + Math.sin(this.animFrame) * 2);
    const bob = Math.sin(this.animFrame * 2) * 0.1 + 1;
    ctx.scale(bob, bob);

    if (this.collectibleType === 'coin') {
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.arc(0, 0, this.width / 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff5cc';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0);
    } else if (this.collectibleType === 'relicFragment') {
      ctx.fillStyle = '#9b59b6';
      ctx.shadowColor = '#8e44ad';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, -this.height / 2);
      ctx.lineTo(this.width / 2, 0);
      ctx.lineTo(0, this.height / 2);
      ctx.lineTo(-this.width / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#d4a5ff';
      ctx.fillRect(-3, -3, 6, 6);
    } else if (this.collectibleType === 'relic') {
      ctx.fillStyle = '#f39c12';
      ctx.shadowColor = '#e67e22';
      ctx.shadowBlur = 12;
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(-this.width / 2 + 4, -this.height / 2 + 4, this.width - 8, this.height - 8);
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(-4, -8, 8, 16);
      ctx.fillRect(-8, -4, 16, 8);
    } else if (this.collectibleType === 'oxygenBubble') {
      ctx.strokeStyle = 'rgba(150, 220, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#5bc0de';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(200, 240, 255, 0.4)';
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(-this.width / 4, -this.height / 4, 3, 3);
      ctx.fillStyle = '#00ccff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('O₂', 0, 0);
    }

    ctx.restore();
  }
}

export interface GameState {
  submarine: Submarine;
  enemies: Enemy[];
  boss: Boss | null;
  bossProjectiles: BossProjectile[];
  obstacles: Obstacle[];
  bullets: Bullet[];
  particles: Particle[];
  collectibles: Collectible[];
  keys: Record<string, boolean>;
  time: number;
  screenShake: number;
  depth: number;
  lastObstacleSpawn: number;
  lastEnemySpawn: number;
  lastBossSpawn: number;
  gameOver: boolean;
  bossActive: boolean;
  storiesUnlocked: string[];
  pendingStory: string | null;
  width: number;
  height: number;
  scrollOffset: number;
}

export const STORY_FRAGMENTS: string[] = [
  '第一卷：千年前，亚特兰蒂斯王国在这片海域繁荣昌盛，他们掌握了操控水流的古老秘术……',
  '第二卷：大祭司警告说，深海中封印着远古的存在，不可唤醒。但国王贪图力量，执意探索深渊……',
  '第三卷：那一夜，天空变成了血红色，海面沸腾。巨大的触手从海底升起，将整座城市拖入黑暗……',
  '第四卷：少数幸存者将自己的记忆封存在遗物中，希望有朝一日，有人能找到真相，阻止灾难再次降临……',
  '第五卷：你手中的这块碎片，记录着封印的关键。远古海龙正在苏醒，时间已经不多了……',
  '第六卷（最终）：当所有遗物汇聚，封印将重新启动。勇敢的探险者，海洋的命运就托付给你了。',
];
