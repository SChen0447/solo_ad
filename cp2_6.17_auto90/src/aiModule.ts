import { Player } from './player';
import { Bullet, Position, Difficulty, AIState, InputState,
  AI_REACTION_DELAY, AI_HIT_RATE, AI_ATTACK_RANGE, AI_DODGE_RANGE,
  PLAYER_SPEED, CANVAS_WIDTH, CANVAS_HEIGHT, PLAYER_SIZE
} from './types';

export class AIModule {
  private difficulty: Difficulty;
  private lastDecisionTime: number = 0;
  private currentDecision: AIState = 'patrol';
  private lastPatrolUpdate: number = 0;
  private patrolTarget: Position = { x: 0, y: 0 };
  private dodgeDirection: number = 0;
  private lastDodgeTime: number = 0;

  constructor(difficulty: Difficulty) {
    this.difficulty = difficulty;
    this.patrolTarget = {
      x: CANVAS_WIDTH * 0.75,
      y: CANVAS_HEIGHT / 2
    };
  }

  update(
    aiPlayer: Player,
    target: Player,
    bullets: Bullet[],
    currentTime: number
  ): { input: InputState; shouldShoot: boolean } {
    const reactionDelay = AI_REACTION_DELAY[this.difficulty];
    
    if (currentTime - this.lastDecisionTime >= reactionDelay) {
      this.currentDecision = this.makeDecision(aiPlayer, target, bullets, currentTime);
      this.lastDecisionTime = currentTime;
    }

    aiPlayer.aiState = this.currentDecision;

    switch (this.currentDecision) {
      case 'dodge':
        return this.dodge(aiPlayer, bullets, currentTime);
      case 'attack':
        return this.attack(aiPlayer, target, currentTime);
      case 'patrol':
      default:
        return this.patrol(aiPlayer, currentTime);
    }
  }

  private makeDecision(
    aiPlayer: Player,
    target: Player,
    bullets: Bullet[],
    currentTime: number
  ): AIState {
    const threateningBullets = this.detectThreateningBullets(aiPlayer, bullets);
    if (threateningBullets.length > 0 && currentTime - this.lastDodgeTime > 500) {
      return 'dodge';
    }

    const distanceToTarget = this.getDistance(
      { x: aiPlayer.x, y: aiPlayer.y },
      { x: target.x, y: target.y }
    );
    if (distanceToTarget <= AI_ATTACK_RANGE) {
      return 'attack';
    }

    return 'patrol';
  }

  private patrol(aiPlayer: Player, currentTime: number): { input: InputState; shouldShoot: boolean } {
    if (currentTime - this.lastPatrolUpdate > 2000 || this.reachedPatrolTarget(aiPlayer)) {
      this.patrolTarget = {
        x: CANVAS_WIDTH * 0.6 + Math.random() * CANVAS_WIDTH * 0.3,
        y: PLAYER_SIZE + Math.random() * (CANVAS_HEIGHT - PLAYER_SIZE * 2)
      };
      this.lastPatrolUpdate = currentTime;
    }

    const dx = this.patrolTarget.x - aiPlayer.x;
    const dy = this.patrolTarget.y - aiPlayer.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const input: InputState = { up: false, down: false, left: false, right: false, shoot: false };

    if (distance > 5) {
      if (Math.abs(dx) > 3) {
        input.left = dx < 0;
        input.right = dx > 0;
      }
      if (Math.abs(dy) > 3) {
        input.up = dy < 0;
        input.down = dy > 0;
      }
    }

    return { input, shouldShoot: false };
  }

  private attack(
    aiPlayer: Player,
    target: Player,
    currentTime: number
  ): { input: InputState; shouldShoot: boolean } {
    const dx = target.x - aiPlayer.x;
    const dy = target.y - aiPlayer.y;

    const input: InputState = { up: false, down: false, left: false, right: false, shoot: false };

    const preferredX = target.x - 100;
    if (Math.abs(aiPlayer.x - preferredX) > 20) {
      input.left = aiPlayer.x > preferredX;
      input.right = aiPlayer.x < preferredX;
    }

    if (Math.abs(dy) > 30) {
      input.up = dy < 0;
      input.down = dy > 0;
    }

    const shouldShoot = this.calculateHitChance(aiPlayer, target);

    return { input, shouldShoot };
  }

  private dodge(
    aiPlayer: Player,
    bullets: Bullet[],
    currentTime: number
  ): { input: InputState; shouldShoot: boolean } {
    const threateningBullets = this.detectThreateningBullets(aiPlayer, bullets);
    
    if (threateningBullets.length === 0) {
      return { input: { up: false, down: false, left: false, right: false, shoot: false }, shouldShoot: false };
    }

    if (currentTime - this.lastDodgeTime > 800) {
      this.dodgeDirection = Math.random() > 0.5 ? 1 : -1;
      this.lastDodgeTime = currentTime;
    }

    const input: InputState = { up: false, down: false, left: false, right: false, shoot: false };

    const nearestBullet = threateningBullets[0];
    const bulletDy = nearestBullet.vy;

    if (Math.abs(bulletDy) < 2) {
      input.up = this.dodgeDirection < 0;
      input.down = this.dodgeDirection > 0;
    } else {
      input.left = this.dodgeDirection < 0;
      input.right = this.dodgeDirection > 0;
    }

    return { input, shouldShoot: false };
  }

  private calculateHitChance(aiPlayer: Player, target: Player): boolean {
    const baseHitRate = AI_HIT_RATE[this.difficulty];
    
    const dx = Math.abs(target.x - aiPlayer.x);
    const dy = Math.abs(target.y - aiPlayer.y);
    const distanceFactor = Math.max(0.5, 1 - dx / AI_ATTACK_RANGE * 0.5);
    const yOffsetFactor = Math.max(0.3, 1 - dy / 100);
    
    const adjustedHitRate = baseHitRate * distanceFactor * yOffsetFactor;
    
    return Math.random() < adjustedHitRate;
  }

  private getDistance(p1: Position, p2: Position): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private detectThreateningBullets(aiPlayer: Player, bullets: Bullet[]): Bullet[] {
    return bullets
      .filter(bullet => {
        if (bullet.ownerId === aiPlayer.id) return false;
        
        const dx = bullet.x - aiPlayer.x;
        const dy = bullet.y - aiPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > AI_DODGE_RANGE) return false;
        
        const dotProduct = dx * bullet.vx + dy * bullet.vy;
        if (dotProduct > 0) return false;
        
        return true;
      })
      .sort((a, b) => {
        const distA = this.getDistance({ x: a.x, y: a.y }, { x: aiPlayer.x, y: aiPlayer.y });
        const distB = this.getDistance({ x: b.x, y: b.y }, { x: aiPlayer.x, y: aiPlayer.y });
        return distA - distB;
      });
  }

  private reachedPatrolTarget(aiPlayer: Player): boolean {
    const dx = this.patrolTarget.x - aiPlayer.x;
    const dy = this.patrolTarget.y - aiPlayer.y;
    return Math.sqrt(dx * dx + dy * dy) < 20;
  }
}
