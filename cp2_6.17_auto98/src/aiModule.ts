import { Player, Bullet } from './player';

export enum AIBehavior {
  PATROL,
  ATTACK,
  EVADE,
}

interface AIDifficultyConfig {
  reactionDelay: number;
  accuracy: number;
  shootInterval: number;
}

const DIFFICULTY_CONFIGS: Record<string, AIDifficultyConfig> = {
  easy: { reactionDelay: 300, accuracy: 0.4, shootInterval: 0.5 },
  hard: { reactionDelay: 100, accuracy: 0.7, shootInterval: 0.35 },
};

export class AIBehaviorTree {
  state = AIBehavior.PATROL;
  config: AIDifficultyConfig;
  patrolTargetX: number;
  patrolTargetY: number;
  lastDecisionTime = 0;
  evasionDir = 1;
  shootTimer = 0;
  private decided = false;

  constructor(difficulty: 'easy' | 'hard') {
    this.config = DIFFICULTY_CONFIGS[difficulty];
    this.patrolTargetX = 150 + Math.random() * 600;
    this.patrolTargetY = 60 + Math.random() * 200;
  }

  update(
    ai: Player,
    target: Player,
    bullets: Bullet[],
    dt: number,
    now: number
  ): boolean {
    this.shootTimer -= dt;

    const canDecide = (now - this.lastDecisionTime) >= this.config.reactionDelay;
    if (!canDecide && this.decided) {
      return this.executeCurrentBehavior(ai, target, bullets, now);
    }
    if (canDecide) {
      this.lastDecisionTime = now;
      this.decided = true;
    }

    const bulletDist = this.nearestThreatBulletDist(ai, bullets);
    if (bulletDist < 150) {
      if (this.state !== AIBehavior.EVADE) {
        this.state = AIBehavior.EVADE;
        this.evasionDir = Math.random() > 0.5 ? 1 : -1;
      }
    } else {
      const dist = Math.hypot(target.x - ai.x, target.y - ai.y);
      if (dist < 200) {
        this.state = AIBehavior.ATTACK;
      } else {
        this.state = AIBehavior.PATROL;
      }
    }

    return this.executeCurrentBehavior(ai, target, bullets, now);
  }

  private executeCurrentBehavior(
    ai: Player, target: Player, bullets: Bullet[], now: number
  ): boolean {
    switch (this.state) {
      case AIBehavior.EVADE:
        return this.doEvade(ai, bullets);
      case AIBehavior.ATTACK:
        return this.doAttack(ai, target, now);
      case AIBehavior.PATROL:
      default:
        return this.doPatrol(ai);
    }
  }

  private nearestThreatBulletDist(ai: Player, bullets: Bullet[]): number {
    let minDist = Infinity;
    for (const b of bullets) {
      if (!b.active || b.ownerId === ai.id) continue;
      const dist = Math.hypot(b.x - ai.x, b.y - ai.y);
      const dx = ai.x - b.x;
      const dy = ai.y - b.y;
      const dot = dx * b.vx + dy * b.vy;
      if (dot > 0 && dist < minDist) {
        minDist = dist;
      }
    }
    return minDist;
  }

  private doPatrol(ai: Player): boolean {
    const dx = this.patrolTargetX - ai.x;
    const dy = this.patrolTargetY - ai.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 25) {
      this.patrolTargetX = 100 + Math.random() * 700;
      this.patrolTargetY = 50 + Math.random() * 250;
    }
    if (dist > 0) {
      ai.vx = (dx / dist) * ai.speed * 0.6;
      ai.vy = (dy / dist) * ai.speed * 0.6;
    }
    return false;
  }

  private doAttack(ai: Player, target: Player, now: number): boolean {
    const dx = target.x - ai.x;
    const dy = target.y - ai.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 120) {
      ai.vx = (dx / dist) * ai.speed * 0.45;
      ai.vy = (dy / dist) * ai.speed * 0.45;
    } else {
      ai.vx *= 0.9;
      ai.vy *= 0.9;
    }

    const aimAngle = Math.atan2(dy, dx);
    const inaccuracy = (1 - this.config.accuracy) * 0.6;
    ai.facingAngle = aimAngle + (Math.random() - 0.5) * inaccuracy * 0.3;

    if (this.shootTimer <= 0 && Math.random() < this.config.accuracy) {
      this.shootTimer = this.config.shootInterval;
      return true;
    }
    if (this.shootTimer <= 0) {
      this.shootTimer = this.config.shootInterval;
    }
    return false;
  }

  private doEvade(ai: Player, bullets: Bullet[]): boolean {
    let closest: Bullet | null = null;
    let minDist = Infinity;
    for (const b of bullets) {
      if (!b.active || b.ownerId === ai.id) continue;
      const dist = Math.hypot(b.x - ai.x, b.y - ai.y);
      const dx = ai.x - b.x;
      const dy = ai.y - b.y;
      const dot = dx * b.vx + dy * b.vy;
      if (dot > 0 && dist < minDist) {
        minDist = dist;
        closest = b;
      }
    }
    if (closest) {
      const bulletAngle = Math.atan2(closest.vy, closest.vx);
      const perpAngle = bulletAngle + (Math.PI / 2) * this.evasionDir;
      ai.vx = Math.cos(perpAngle) * ai.speed;
      ai.vy = Math.sin(perpAngle) * ai.speed;
    }
    return false;
  }
}
