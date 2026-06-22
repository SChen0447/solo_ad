import { ShipType, Team, SHIP_STATS, ShipConfig } from '../types';
import type { Fleet } from './fleet';

let shipIdCounter = 0;

export class Ship {
  id: string;
  type: ShipType;
  team: Team;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackSpeed: number;
  lastAttackTime: number;
  size: number;
  fleet: Fleet | null;
  formationOffset: { x: number; y: number };
  desiredFormationOffset: { x: number; y: number };
  isSelected: boolean;
  isAlive: boolean;
  angle: number;
  dodgeVector: { x: number; y: number } | null;
  dodgeTimer: number;

  constructor(config: ShipConfig) {
    const stats = SHIP_STATS[config.type];
    this.id = `ship_${++shipIdCounter}`;
    this.type = config.type;
    this.team = config.team;
    this.x = config.x;
    this.y = config.y;
    this.targetX = config.x;
    this.targetY = config.y;
    this.health = stats.maxHealth;
    this.maxHealth = stats.maxHealth;
    this.speed = stats.speed;
    this.damage = stats.damage;
    this.attackRange = stats.attackRange;
    this.attackSpeed = stats.attackSpeed;
    this.lastAttackTime = 0;
    this.size = stats.size;
    this.fleet = null;
    this.formationOffset = { x: 0, y: 0 };
    this.desiredFormationOffset = { x: 0, y: 0 };
    this.isSelected = false;
    this.isAlive = true;
    this.angle = 0;
    this.dodgeVector = null;
    this.dodgeTimer = 0;
  }

  update(dt: number): void {
    if (!this.isAlive) return;

    if (this.dodgeTimer > 0) {
      this.dodgeTimer -= dt;
      if (this.dodgeTimer <= 0) {
        this.dodgeVector = null;
      }
    }

    let dx = this.targetX - this.x;
    let dy = this.targetY - this.y;

    if (this.fleet) {
      const offsetLerp = Math.min(dt * 0.5, 1);
      this.formationOffset.x += (this.desiredFormationOffset.x - this.formationOffset.x) * offsetLerp;
      this.formationOffset.y += (this.desiredFormationOffset.y - this.formationOffset.y) * offsetLerp;

      dx = (this.fleet.targetX + this.formationOffset.x) - this.x;
      dy = (this.fleet.targetY + this.formationOffset.y) - this.y;
    }

    if (this.dodgeVector) {
      dx += this.dodgeVector.x * 50;
      dy += this.dodgeVector.y * 50;
    }

    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      const moveSpeed = this.speed * 60 * dt;
      const ratio = Math.min(moveSpeed / dist, 1);
      this.x += dx * ratio;
      this.y += dy * ratio;
      this.angle = Math.atan2(dy, dx);
    }
  }

  canAttack(currentTime: number): boolean {
    return this.isAlive && (currentTime - this.lastAttackTime) >= this.attackSpeed * 1000;
  }

  attack(target: Ship, currentTime: number): boolean {
    this.lastAttackTime = currentTime;
    return target.takeDamage(this.damage);
  }

  takeDamage(amount: number): boolean {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      return true;
    }
    return false;
  }

  startDodge(): void {
    const angle = Math.random() * Math.PI * 2;
    this.dodgeVector = {
      x: Math.cos(angle),
      y: Math.sin(angle)
    };
    this.dodgeTimer = 0.5;
  }

  setFormationOffset(offset: { x: number; y: number }): void {
    this.desiredFormationOffset = { ...offset };
  }

  getDistanceTo(target: Ship): number {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getAABB(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.size / 2,
      y: this.y - this.size / 2,
      width: this.size,
      height: this.size
    };
  }

  render(ctx: CanvasRenderingContext2D, currentTime: number): void {
    if (!this.isAlive) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + Math.PI / 2);

    const baseColor = this.team === 'player' ? '#4a9eff' : '#ff4a4a';
    const glowColor = this.team === 'player' ? 'rgba(74, 158, 255, 0.5)' : 'rgba(255, 74, 74, 0.5)';

    if (this.isSelected) {
      const pulsePhase = (currentTime % 2000) / 2000;
      const pulseSize = this.size + 8 + Math.sin(pulsePhase * Math.PI * 2) * 4;
      ctx.shadowColor = '#4a9eff';
      ctx.shadowBlur = 15 + Math.sin(pulsePhase * Math.PI * 2) * 10;
      ctx.strokeStyle = `rgba(74, 158, 255, ${0.6 - pulsePhase * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, pulseSize, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;

    if (this.type === 'fighter') {
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.moveTo(0, -this.size);
      ctx.lineTo(-this.size * 0.7, this.size * 0.7);
      ctx.lineTo(0, this.size * 0.3);
      ctx.lineTo(this.size * 0.7, this.size * 0.7);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, -this.size * 0.2, this.size * 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'frigate') {
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 2;
        const px = Math.cos(angle) * this.size;
        const py = Math.sin(angle) * this.size;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -this.size * 0.5);
      ctx.lineTo(0, this.size * 0.5);
      ctx.moveTo(-this.size * 0.5, 0);
      ctx.lineTo(this.size * 0.5, 0);
      ctx.stroke();
    } else {
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -this.size * 0.8);
      ctx.lineTo(-this.size * 0.4, this.size * 0.2);
      ctx.lineTo(this.size * 0.4, this.size * 0.2);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.size * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.restore();

    const healthPercent = this.health / this.maxHealth;
    const barWidth = this.size * 2;
    const barHeight = 4;
    const barY = this.y - this.size - 10;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);

    const healthColor = healthPercent > 0.5 ? '#4ade80' : healthPercent > 0.25 ? '#fbbf24' : '#ef4444';
    ctx.fillStyle = healthColor;
    ctx.fillRect(this.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
  }
}
