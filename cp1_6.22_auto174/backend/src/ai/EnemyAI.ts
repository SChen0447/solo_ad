export type EnemyState = 'patrol' | 'chase' | 'attack';

export interface EnemyDecision {
  moveDirection: number;
  attackIntent: boolean;
  attackDamage: number;
  skillIntent: boolean;
  skillDamage: number;
  skillRadius: number;
  newState: EnemyState;
}

interface Enemy {
  id: string;
  type: 'grunt' | 'elite';
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  state: EnemyState;
  lastAttackTime: number;
  lastSkillTime: number;
}

interface PlayerState {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  isAttacking: boolean;
  facingRight: boolean;
}

interface EnemyConfig {
  maxHealth: number;
  moveSpeed: number;
  attackInterval: number;
  attackDamage: number;
  detectionRange: number;
  attackRange: number;
  skillCooldown?: number;
  skillRadius?: number;
  skillDamage?: number;
}

const ENEMY_CONFIGS: Record<string, EnemyConfig> = {
  grunt: {
    maxHealth: 50,
    moveSpeed: 100,
    attackInterval: 2000,
    attackDamage: 8,
    detectionRange: 200,
    attackRange: 60
  },
  elite: {
    maxHealth: 150,
    moveSpeed: 80,
    attackInterval: 1500,
    attackDamage: 12,
    detectionRange: 250,
    attackRange: 80,
    skillCooldown: 8000,
    skillRadius: 80,
    skillDamage: 25
  }
};

export class EnemyAI {
  private patrolDirection: Record<string, number> = {};
  private patrolTimer: Record<string, number> = {};

  makeDecision(
    enemy: Enemy,
    playerState: PlayerState,
    deltaTime: number,
    currentTime: number
  ): EnemyDecision {
    const config = ENEMY_CONFIGS[enemy.type];
    const distanceToPlayer = Math.abs(enemy.x - playerState.x);
    const playerInAttackRange = distanceToPlayer <= config.attackRange;
    const playerInDetectionRange = distanceToPlayer <= config.detectionRange;

    let newState: EnemyState = enemy.state;
    let moveDirection = 0;
    let attackIntent = false;
    let attackDamage = 0;
    let skillIntent = false;
    let skillDamage = 0;
    let skillRadius = 0;

    if (playerState.health <= 0) {
      newState = 'patrol';
    } else if (playerInAttackRange) {
      newState = 'attack';
    } else if (playerInDetectionRange) {
      newState = 'chase';
    } else {
      newState = 'patrol';
    }

    switch (newState) {
      case 'patrol':
        moveDirection = this.getPatrolDirection(enemy.id, currentTime);
        break;

      case 'chase':
        moveDirection = playerState.x > enemy.x ? 1 : -1;
        break;

      case 'attack':
        moveDirection = 0;
        const timeSinceLastAttack = currentTime - enemy.lastAttackTime;
        if (timeSinceLastAttack >= config.attackInterval) {
          attackIntent = true;
          attackDamage = config.attackDamage;
        }

        if (enemy.type === 'elite' && config.skillCooldown && config.skillDamage && config.skillRadius) {
          const timeSinceLastSkill = currentTime - enemy.lastSkillTime;
          if (timeSinceLastSkill >= config.skillCooldown && distanceToPlayer <= config.skillRadius) {
            skillIntent = true;
            skillDamage = config.skillDamage;
            skillRadius = config.skillRadius;
          }
        }
        break;
    }

    return {
      moveDirection,
      attackIntent,
      attackDamage,
      skillIntent,
      skillDamage,
      skillRadius,
      newState
    };
  }

  private getPatrolDirection(enemyId: string, currentTime: number): number {
    if (!this.patrolTimer[enemyId] || currentTime - this.patrolTimer[enemyId] > 2000) {
      this.patrolDirection[enemyId] = Math.random() > 0.5 ? 1 : -1;
      this.patrolTimer[enemyId] = currentTime;
    }
    return this.patrolDirection[enemyId];
  }

  static getConfig(type: 'grunt' | 'elite'): EnemyConfig {
    return ENEMY_CONFIGS[type];
  }
}
