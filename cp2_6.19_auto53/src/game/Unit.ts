export type UnitType = 'infantry' | 'archer' | 'cavalry';
export type Team = 'player' | 'enemy';

export interface Position {
  x: number;
  y: number;
}

export interface UnitStats {
  maxHp: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  radius: number;
}

export const UNIT_STATS: Record<UnitType, UnitStats> = {
  infantry: {
    maxHp: 50,
    speed: 60,
    damage: 5,
    attackRange: 60,
    attackCooldown: 1,
    radius: 14
  },
  archer: {
    maxHp: 50,
    speed: 80,
    damage: 8,
    attackRange: 60,
    attackCooldown: 1,
    radius: 12
  },
  cavalry: {
    maxHp: 50,
    speed: 180,
    damage: 12,
    attackRange: 60,
    attackCooldown: 1,
    radius: 16
  }
};

const UNIT_NAMES: Record<UnitType, string[]> = {
  infantry: ['步兵A', '步兵B', '步兵C', '步兵D', '步兵E', '步兵F', '步兵G', '步兵H'],
  archer: ['弓箭手A', '弓箭手B', '弓箭手C', '弓箭手D', '弓箭手E', '弓箭手F'],
  cavalry: ['骑兵A', '骑兵B', '骑兵C', '骑兵D', '骑兵E']
};

let unitIdCounter = 0;

export class Unit {
  public id: string;
  public name: string;
  public type: UnitType;
  public team: Team;
  public position: Position;
  public targetPosition: Position | null;
  public formationOffset: Position;
  public finalTargetPosition: Position | null;
  public hp: number;
  public maxHp: number;
  public speed: number;
  public damage: number;
  public attackRange: number;
  public attackCooldown: number;
  public radius: number;
  public isMoving: boolean;
  public isInCombat: boolean;
  public lastAttackTime: number;
  public facingAngle: number;
  public isSelected: boolean;
  public patrolPath: Position[];
  public patrolIndex: number;
  public animatingFormation: boolean;
  public formationAnimStartPos: Position | null;
  public formationAnimProgress: number;
  public formationAnimDuration: number;
  public isBouncing: boolean;
  public bounceAnimTime: number;
  public bounceDuration: number;
  public bounceAmplitude: number;
  public bounceOffset: number;

  constructor(type: UnitType, team: Team, position: Position) {
    this.id = `unit_${++unitIdCounter}`;
    this.type = type;
    this.team = team;
    this.position = { ...position };
    this.targetPosition = null;
    this.formationOffset = { x: 0, y: 0 };
    this.finalTargetPosition = null;

    const stats = UNIT_STATS[type];
    this.maxHp = stats.maxHp;
    this.hp = stats.maxHp;
    this.speed = stats.speed;
    this.damage = stats.damage;
    this.attackRange = stats.attackRange;
    this.attackCooldown = stats.attackCooldown;
    this.radius = stats.radius;

    this.isMoving = false;
    this.isInCombat = false;
    this.lastAttackTime = 0;
    this.facingAngle = 0;
    this.isSelected = false;

    this.patrolPath = [];
    this.patrolIndex = 0;

    this.animatingFormation = false;
    this.formationAnimStartPos = null;
    this.formationAnimProgress = 0;
    this.formationAnimDuration = 0.5;

    this.isBouncing = false;
    this.bounceAnimTime = 0;
    this.bounceDuration = 0.2;
    this.bounceAmplitude = 3;
    this.bounceOffset = 0;

    const nameList = UNIT_NAMES[type];
    const index = (unitIdCounter - 1) % nameList.length;
    this.name = team === 'enemy' ? `敌方${String.fromCharCode(65 + (unitIdCounter - 1) % 26)}` : nameList[index];
  }

  public setMoveTarget(target: Position, formationOffset: Position): void {
    this.formationOffset = { ...formationOffset };
    this.finalTargetPosition = { ...target };
    this.targetPosition = {
      x: target.x + formationOffset.x,
      y: target.y + formationOffset.y
    };
    this.isMoving = true;
    this.isInCombat = false;
  }

  public setFormationOffset(offset: Position, animate: boolean = true): void {
    if (animate && this.finalTargetPosition) {
      this.formationAnimStartPos = { ...this.position };
      this.formationAnimProgress = 0;
      this.animatingFormation = true;
    }
    this.formationOffset = { ...offset };
    if (this.finalTargetPosition) {
      this.targetPosition = {
        x: this.finalTargetPosition.x + offset.x,
        y: this.finalTargetPosition.y + offset.y
      };
    }
  }

  public takeDamage(damage: number): void {
    this.hp = Math.max(0, this.hp - damage);
  }

  public attack(target: Unit): number {
    target.takeDamage(this.damage);
    this.lastAttackTime = 0;
    const dx = target.position.x - this.position.x;
    const dy = target.position.y - this.position.y;
    this.facingAngle = Math.atan2(dy, dx);
    return this.damage;
  }

  public update(deltaTime: number): void {
    if (this.hp <= 0) return;

    if (this.isBouncing) {
      this.bounceAnimTime += deltaTime;
      if (this.bounceAnimTime >= this.bounceDuration) {
        this.isBouncing = false;
        this.bounceOffset = 0;
      } else {
        const t = this.bounceAnimTime / this.bounceDuration;
        this.bounceOffset = this.bounceAmplitude * easeOutBounce(t);
      }
    }

    if (this.animatingFormation && this.formationAnimStartPos && this.targetPosition) {
      const startPos = this.formationAnimStartPos;
      const targetPos = this.targetPosition;
      this.formationAnimProgress += deltaTime / this.formationAnimDuration;
      if (this.formationAnimProgress >= 1) {
        this.formationAnimProgress = 1;
        this.animatingFormation = false;
        this.formationAnimStartPos = null;
        this.isBouncing = true;
        this.bounceAnimTime = 0;
      }
      const t = easeOutCubic(this.formationAnimProgress);
      this.position.x = startPos.x + (targetPos.x - startPos.x) * t;
      this.position.y = startPos.y + (targetPos.y - startPos.y) * t;
      return;
    }

    if (this.isInCombat) {
      this.lastAttackTime += deltaTime;
      return;
    }

    if (this.isMoving && this.targetPosition) {
      const dx = this.targetPosition.x - this.position.x;
      const dy = this.targetPosition.y - this.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 2) {
        this.position.x = this.targetPosition.x;
        this.position.y = this.targetPosition.y;
        this.isMoving = false;
      } else {
        const moveDistance = this.speed * deltaTime;
        const ratio = Math.min(moveDistance / distance, 1);
        this.position.x += dx * ratio;
        this.position.y += dy * ratio;
        this.facingAngle = Math.atan2(dy, dx);
      }
    }

    if (this.team === 'enemy' && this.patrolPath.length > 0 && !this.isInCombat) {
      if (!this.isMoving) {
        this.patrolIndex = (this.patrolIndex + 1) % this.patrolPath.length;
        const nextPoint = this.patrolPath[this.patrolIndex];
        this.targetPosition = { ...nextPoint };
        this.isMoving = true;
      }
    }
  }

  public canAttack(): boolean {
    return this.lastAttackTime >= this.attackCooldown && this.hp > 0;
  }

  public distanceTo(other: Unit): number {
    const dx = other.position.x - this.position.x;
    const dy = other.position.y - this.position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public isDead(): boolean {
    return this.hp <= 0;
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    const t2 = t - 1.5 / d1;
    return n1 * t2 * t2 + 0.75;
  } else if (t < 2.5 / d1) {
    const t2 = t - 2.25 / d1;
    return n1 * t2 * t2 + 0.9375;
  } else {
    const t2 = t - 2.625 / d1;
    return n1 * t2 * t2 + 0.984375;
  }
}
