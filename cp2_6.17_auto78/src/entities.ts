import type { PlayerActions } from './input';

export type CharacterState = 'idle' | 'moving' | 'attacking' | 'hurt' | 'defending' | 'skilling';

export const CHAR_WIDTH = 40;
export const CHAR_HEIGHT = 60;
const GROUND_Y = 420;
const GRAVITY = 0.8;
const MOVE_SPEED = 3.5;
const JUMP_FORCE = 13;
const KNOCKBACK_FORCE = 6;
const ATTACK_DAMAGE = 8;
const SKILL_DAMAGE = 20;
const DEFEND_REDUCTION = 0.3;

const ATTACK_DURATION = 350;
const SKILL_DURATION = 500;
const HURT_DURATION = 200;
const ATTACK_HITBOX_START = 0.2;
const ATTACK_HITBOX_END = 0.6;
const SKILL_HITBOX_START = 0.2;
const SKILL_HITBOX_END = 0.7;
const ATTACK_RANGE = 55;
const SKILL_RANGE = 75;

export interface HitEvent {
  x: number;
  y: number;
  isSkill: boolean;
  damage: number;
}

export class Character {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public hp: number;
  public maxHp: number;
  public state: CharacterState;
  public facing: 1 | -1;
  public color: string;
  public playerId: 1 | 2;

  private stateTimer: number;
  private hurtFlashTimer: number;
  private hurtFlashPhase: number;
  private hitDealt: boolean;
  private onGround: boolean;
  private _lastHit: HitEvent | null;

  constructor(x: number, color: string, playerId: 1 | 2, facing: 1 | -1) {
    this.x = x;
    this.y = GROUND_Y - CHAR_HEIGHT;
    this.vx = 0;
    this.vy = 0;
    this.hp = 100;
    this.maxHp = 100;
    this.state = 'idle';
    this.facing = facing;
    this.color = color;
    this.playerId = playerId;
    this.stateTimer = 0;
    this.hurtFlashTimer = 0;
    this.hurtFlashPhase = 0;
    this.hitDealt = false;
    this.onGround = true;
    this._lastHit = null;
  }

  public reset(x: number, facing: 1 | -1): void {
    this.x = x;
    this.y = GROUND_Y - CHAR_HEIGHT;
    this.vx = 0;
    this.vy = 0;
    this.hp = this.maxHp;
    this.state = 'idle';
    this.facing = facing;
    this.stateTimer = 0;
    this.hurtFlashTimer = 0;
    this.hurtFlashPhase = 0;
    this.hitDealt = false;
    this.onGround = true;
    this._lastHit = null;
  }

  public update(
    dt: number,
    actions: Readonly<PlayerActions>,
    opponent: Character,
    input: { consumeAttack: (p: 1 | 2) => boolean; consumeSkill: (p: 1 | 2) => boolean }
  ): HitEvent | null {
    this._lastHit = null;

    this.stateTimer += dt;

    if (this.hurtFlashTimer > 0) {
      this.hurtFlashTimer -= dt;
      this.hurtFlashPhase = (this.hurtFlashPhase + dt / 33) % 1;
    }

    if (this.state === 'hurt') {
      if (this.stateTimer >= HURT_DURATION) {
        this.state = 'idle';
        this.stateTimer = 0;
      }
    } else if (this.state === 'attacking') {
      if (this.stateTimer >= ATTACK_DURATION) {
        this.state = 'idle';
        this.stateTimer = 0;
        this.hitDealt = false;
      } else {
        this.tryDealHit(opponent, false);
      }
    } else if (this.state === 'skilling') {
      if (this.stateTimer >= SKILL_DURATION) {
        this.state = 'idle';
        this.stateTimer = 0;
        this.hitDealt = false;
      } else {
        this.tryDealHit(opponent, true);
      }
    } else {
      this.handleMovement(actions);

      if (input.consumeAttack(this.playerId)) {
        this.state = 'attacking';
        this.stateTimer = 0;
        this.hitDealt = false;
        this.vx = 0;
      } else if (input.consumeSkill(this.playerId)) {
        this.state = 'skilling';
        this.stateTimer = 0;
        this.hitDealt = false;
        this.vx = 0;
      } else if (actions.defend) {
        this.state = 'defending';
        this.vx = 0;
      } else if (actions.left || actions.right) {
        this.state = 'moving';
      } else {
        this.state = 'idle';
      }
    }

    this.x += this.vx;
    this.vy += GRAVITY;
    this.y += this.vy;

    if (this.y >= GROUND_Y - CHAR_HEIGHT) {
      this.y = GROUND_Y - CHAR_HEIGHT;
      this.vy = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    if (this.x < 0) this.x = 0;
    if (this.x > 800 - CHAR_WIDTH) this.x = 800 - CHAR_WIDTH;

    if (this.x < opponent.x) {
      this.facing = 1;
    } else {
      this.facing = -1;
    }

    return this._lastHit;
  }

  private handleMovement(actions: Readonly<PlayerActions>): void {
    this.vx = 0;

    if (actions.left) {
      this.vx = -MOVE_SPEED;
    }
    if (actions.right) {
      this.vx = MOVE_SPEED;
    }
    if (actions.jump && this.onGround) {
      this.vy = -JUMP_FORCE;
      this.onGround = false;
    }
  }

  private tryDealHit(opponent: Character, isSkill: boolean): void {
    if (this.hitDealt) return;

    const progress = this.stateTimer / (isSkill ? SKILL_DURATION : ATTACK_DURATION);
    const start = isSkill ? SKILL_HITBOX_START : ATTACK_HITBOX_START;
    const end = isSkill ? SKILL_HITBOX_END : ATTACK_HITBOX_END;

    if (progress < start || progress > end) return;

    const range = isSkill ? SKILL_RANGE : ATTACK_RANGE;
    const attackX = this.facing === 1 ? this.x + CHAR_WIDTH : this.x - range;
    const attackY = this.y + CHAR_HEIGHT * 0.3;

    const hit = this.rectIntersect(
      attackX,
      attackY,
      range,
      CHAR_HEIGHT * 0.5,
      opponent.x,
      opponent.y,
      CHAR_WIDTH,
      CHAR_HEIGHT
    );

    if (hit) {
      this.hitDealt = true;
      let damage = isSkill ? SKILL_DAMAGE : ATTACK_DAMAGE;

      if (opponent.state === 'defending') {
        damage = Math.floor(damage * DEFEND_REDUCTION);
      }

      opponent.takeDamage(damage, this.facing);
      this._lastHit = {
        x: opponent.x + CHAR_WIDTH / 2,
        y: opponent.y + CHAR_HEIGHT / 2,
        isSkill,
        damage
      };
    }
  }

  private takeDamage(damage: number, fromFacing: 1 | -1): void {
    this.hp = Math.max(0, this.hp - damage);
    this.state = 'hurt';
    this.stateTimer = 0;
    this.hurtFlashTimer = HURT_DURATION;
    this.hurtFlashPhase = 0;
    this.vx = fromFacing * KNOCKBACK_FORCE;
  }

  private rectIntersect(
    ax: number, ay: number, aw: number, ah: number,
    bx: number, by: number, bw: number, bh: number
  ): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  public getHurtAlpha(): number {
    if (this.hurtFlashTimer <= 0) return 1;
    const step = Math.floor(this.hurtFlashPhase * 6);
    return step % 2 === 0 ? 1 : 0.3;
  }

  public isDead(): boolean {
    return this.hp <= 0;
  }

  public getAttackProgress(): number {
    if (this.state === 'attacking') {
      return this.stateTimer / ATTACK_DURATION;
    }
    if (this.state === 'skilling') {
      return this.stateTimer / SKILL_DURATION;
    }
    return 0;
  }
}
