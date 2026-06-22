export type PlayerAnimationState = 'idle' | 'walk' | 'jump' | 'attack' | 'hurt';
export type AttackPhase = 'none' | 'first' | 'second' | 'third';

export interface AttackEvent {
  damage: number;
  knockback: number;
  isThirdHit: boolean;
  hitbox: { x: number; y: number; width: number; height: number };
}

export interface PlayerState {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  velocityY: number;
  isGrounded: boolean;
  facingRight: boolean;
  isInvincible: boolean;
  animationState: PlayerAnimationState;
  attackPhase: AttackPhase;
  attackTimer: number;
  attackCooldown: number;
  comboTimer: number;
  hitFlashTimer: number;
  hitFlashColor: 'white' | 'red';
  jumpTimer: number;
  jumpDuration: number;
  jumpHeight: number;
  isAttacking: boolean;
  attackRotation: number;
  lastAttackTime: number;
  consecutiveHits: number;
}

export const PLAYER_CONFIG = {
  width: 48,
  height: 64,
  moveSpeed: 200,
  maxHealth: 100,
  jumpHeight: 120,
  jumpDuration: 800,
  fallAccelerationMultiplier: 0.5,
  attackDamage: 10,
  attackAnimationDuration: 400,
  attackCooldown: 300,
  comboWindow: 300,
  hitFlashDuration: 200,
  invincibilityDuration: 500,
  attackRange: 60,
  thirdHitKnockback: 60,
  canvasWidth: 640,
  canvasHeight: 360,
  groundY: 320,
  playerColor: '#ff6b6b'
};

export class PlayerController {
  private state: PlayerState;
  private keys: Set<string> = new Set();
  private onAttackCallback: ((event: AttackEvent) => void) | null = null;

  constructor(startX: number = 100, groundY: number = 320) {
    this.state = {
      x: startX,
      y: groundY - PLAYER_CONFIG.height,
      health: PLAYER_CONFIG.maxHealth,
      maxHealth: PLAYER_CONFIG.maxHealth,
      velocityY: 0,
      isGrounded: true,
      facingRight: true,
      isInvincible: false,
      animationState: 'idle',
      attackPhase: 'none',
      attackTimer: 0,
      attackCooldown: 0,
      comboTimer: 0,
      hitFlashTimer: 0,
      hitFlashColor: 'white',
      jumpTimer: 0,
      jumpDuration: 0,
      jumpHeight: 0,
      isAttacking: false,
      attackRotation: 0,
      lastAttackTime: 0,
      consecutiveHits: 0
    };

    this.setupKeyboardListeners();
  }

  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());

      if (e.key.toLowerCase() === 'j' && this.state.attackCooldown <= 0 && !this.state.isAttacking) {
        this.performAttack();
      }

      if (e.key.toLowerCase() === 'k' && this.state.isGrounded && !this.state.isAttacking) {
        this.performJump();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  private performAttack(): void {
    const now = performance.now();
    const timeSinceLastAttack = now - this.state.lastAttackTime;

    if (timeSinceLastAttack <= PLAYER_CONFIG.comboWindow && this.state.consecutiveHits > 0) {
      if (this.state.consecutiveHits === 1) {
        this.state.attackPhase = 'second';
      } else if (this.state.consecutiveHits === 2) {
        this.state.attackPhase = 'third';
      }
    } else {
      this.state.attackPhase = 'first';
      this.state.consecutiveHits = 0;
    }

    this.state.isAttacking = true;
    this.state.attackTimer = PLAYER_CONFIG.attackAnimationDuration;
    this.state.attackCooldown = PLAYER_CONFIG.attackCooldown;
    this.state.animationState = 'attack';
    this.state.attackRotation = 0;
    this.state.lastAttackTime = now;
    this.state.consecutiveHits++;

    const damage = this.state.attackPhase === 'third'
      ? PLAYER_CONFIG.attackDamage * 2
      : PLAYER_CONFIG.attackDamage;

    const knockback = this.state.attackPhase === 'third'
      ? PLAYER_CONFIG.thirdHitKnockback
      : 0;

    const hitboxX = this.state.facingRight
      ? this.state.x + PLAYER_CONFIG.width
      : this.state.x - PLAYER_CONFIG.attackRange;

    const attackEvent: AttackEvent = {
      damage,
      knockback,
      isThirdHit: this.state.attackPhase === 'third',
      hitbox: {
        x: hitboxX,
        y: this.state.y,
        width: PLAYER_CONFIG.attackRange,
        height: PLAYER_CONFIG.height
      }
    };

    if (this.onAttackCallback) {
      this.onAttackCallback(attackEvent);
    }
  }

  private performJump(): void {
    this.state.isGrounded = false;
    this.state.jumpTimer = PLAYER_CONFIG.jumpDuration;
    this.state.jumpDuration = PLAYER_CONFIG.jumpDuration;
    this.state.jumpHeight = PLAYER_CONFIG.jumpHeight;
    this.state.animationState = 'jump';
    this.state.velocityY = -1;
  }

  public update(deltaTime: number): void {
    this.state.attackCooldown = Math.max(0, this.state.attackCooldown - deltaTime);

    if (!this.state.isAttacking) {
      this.handleMovement(deltaTime);
    }

    this.handleJump(deltaTime);

    if (this.state.isAttacking) {
      this.state.attackTimer -= deltaTime;
      this.state.attackRotation = (1 - this.state.attackTimer / PLAYER_CONFIG.attackAnimationDuration) * 4;

      if (this.state.attackTimer <= 0) {
        this.state.isAttacking = false;
        this.state.attackPhase = 'none';
        this.state.attackRotation = 0;
      }
    }

    if (this.state.hitFlashTimer > 0) {
      this.state.hitFlashTimer -= deltaTime;
      const flashPhase = Math.floor(this.state.hitFlashTimer / 50) % 2;
      this.state.hitFlashColor = flashPhase === 0 ? 'red' : 'white';

      if (this.state.hitFlashTimer <= 0) {
        this.state.isInvincible = false;
      }
    }

    if (!this.state.isAttacking) {
      if (this.state.isGrounded) {
        const isMoving = this.keys.has('a') || this.keys.has('d');
        this.state.animationState = isMoving ? 'walk' : 'idle';
      }
    }

    this.clampToBounds();
  }

  private handleMovement(deltaTime: number): void {
    const moveAmount = (PLAYER_CONFIG.moveSpeed * deltaTime) / 1000;

    if (this.keys.has('a')) {
      this.state.x -= moveAmount;
      this.state.facingRight = false;
    }
    if (this.keys.has('d')) {
      this.state.x += moveAmount;
      this.state.facingRight = true;
    }
  }

  private handleJump(deltaTime: number): void {
    if (!this.state.isGrounded) {
      this.state.jumpTimer -= deltaTime;
      const progress = 1 - this.state.jumpTimer / this.state.jumpDuration;

      let height: number;
      if (progress < 0.5) {
        height = Math.sin(progress * Math.PI) * this.state.jumpHeight;
      } else {
        const fallProgress = (progress - 0.5) * 2;
        const easedFall = 1 - Math.pow(1 - fallProgress, 2) * PLAYER_CONFIG.fallAccelerationMultiplier;
        height = Math.sin(progress * Math.PI) * this.state.jumpHeight * (1 - easedFall * 0.3);
      }

      this.state.y = PLAYER_CONFIG.groundY - PLAYER_CONFIG.height - height;

      if (this.state.jumpTimer <= 0) {
        this.state.isGrounded = true;
        this.state.y = PLAYER_CONFIG.groundY - PLAYER_CONFIG.height;
        this.state.velocityY = 0;
      }
    }
  }

  private clampToBounds(): void {
    const minX = 0;
    const maxX = PLAYER_CONFIG.canvasWidth - PLAYER_CONFIG.width;
    this.state.x = Math.max(minX, Math.min(maxX, this.state.x));
  }

  public takeDamage(damage: number): void {
    if (this.state.isInvincible) return;

    this.state.health = Math.max(0, this.state.health - damage);
    this.state.isInvincible = true;
    this.state.hitFlashTimer = PLAYER_CONFIG.hitFlashDuration;
    this.state.hitFlashColor = 'white';
    this.state.animationState = 'hurt';
    this.state.consecutiveHits = 0;
  }

  public getState(): PlayerState {
    return { ...this.state };
  }

  public setOnAttackCallback(callback: (event: AttackEvent) => void): void {
    this.onAttackCallback = callback;
  }

  public reset(startX: number = 100): void {
    this.state = {
      x: startX,
      y: PLAYER_CONFIG.groundY - PLAYER_CONFIG.height,
      health: PLAYER_CONFIG.maxHealth,
      maxHealth: PLAYER_CONFIG.maxHealth,
      velocityY: 0,
      isGrounded: true,
      facingRight: true,
      isInvincible: false,
      animationState: 'idle',
      attackPhase: 'none',
      attackTimer: 0,
      attackCooldown: 0,
      comboTimer: 0,
      hitFlashTimer: 0,
      hitFlashColor: 'white',
      jumpTimer: 0,
      jumpDuration: 0,
      jumpHeight: 0,
      isAttacking: false,
      attackRotation: 0,
      lastAttackTime: 0,
      consecutiveHits: 0
    };
    this.keys.clear();
  }

  public destroy(): void {
    this.keys.clear();
  }
}
