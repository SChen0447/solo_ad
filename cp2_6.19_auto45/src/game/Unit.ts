export type UnitType = 'infantry' | 'archer' | 'cavalry';
export type Team = 'player' | 'enemy';

export interface UnitStats {
  maxHp: number;
  speed: number;
  damage: number;
  attackCooldown: number;
  radius: number;
  color: string;
  displayName: string;
}

export const UNIT_STATS: Record<UnitType, UnitStats> = {
  infantry: {
    maxHp: 50,
    speed: 60,
    damage: 5,
    attackCooldown: 1,
    radius: 14,
    color: '#4a9eff',
    displayName: '步兵',
  },
  archer: {
    maxHp: 50,
    speed: 90,
    damage: 8,
    attackCooldown: 1,
    radius: 12,
    color: '#4ade80',
    displayName: '弓箭手',
  },
  cavalry: {
    maxHp: 50,
    speed: 180,
    damage: 12,
    attackCooldown: 1,
    radius: 16,
    color: '#ef4444',
    displayName: '骑兵',
  },
};

export class Unit {
  public id: string;
  public type: UnitType;
  public team: Team;
  public name: string;
  public position: { x: number; y: number };
  public targetPosition: { x: number; y: number };
  public formationOffset: { x: number; y: number };
  public hp: number;
  public maxHp: number;
  public speed: number;
  public damage: number;
  public attackCooldown: number;
  public attackTimer: number;
  public radius: number;
  public color: string;
  public displayName: string;
  public isSelected: boolean;
  public isMoving: boolean;
  public isInCombat: boolean;
  public facingAngle: number;
  public formationTransitionProgress: number;
  public previousFormationOffset: { x: number; y: number };
  public targetFormationOffset: { x: number; y: number };
  public isTransitioningFormation: boolean;

  private static counter = 0;

  constructor(
    type: UnitType,
    team: Team,
    position: { x: number; y: number },
    name?: string
  ) {
    const stats = UNIT_STATS[type];
    this.id = `unit_${Unit.counter++}`;
    this.type = type;
    this.team = team;
    this.name = name ?? `${stats.displayName}${Unit.counter}`;
    this.position = { ...position };
    this.targetPosition = { ...position };
    this.formationOffset = { x: 0, y: 0 };
    this.previousFormationOffset = { x: 0, y: 0 };
    this.targetFormationOffset = { x: 0, y: 0 };
    this.hp = stats.maxHp;
    this.maxHp = stats.maxHp;
    this.speed = stats.speed;
    this.damage = stats.damage;
    this.attackCooldown = stats.attackCooldown;
    this.attackTimer = 0;
    this.radius = stats.radius;
    this.color = stats.color;
    this.displayName = stats.displayName;
    this.isSelected = false;
    this.isMoving = false;
    this.isInCombat = false;
    this.facingAngle = 0;
    this.formationTransitionProgress = 1;
    this.isTransitioningFormation = false;
  }

  public update(deltaTime: number, formationCenter?: { x: number; y: number }): void {
    if (this.isTransitioningFormation) {
      this.formationTransitionProgress = Math.min(
        1,
        this.formationTransitionProgress + deltaTime * 2
      );
      const t = this.easeOutCubic(this.formationTransitionProgress);
      this.formationOffset = {
        x: this.previousFormationOffset.x + (this.targetFormationOffset.x - this.previousFormationOffset.x) * t,
        y: this.previousFormationOffset.y + (this.targetFormationOffset.y - this.previousFormationOffset.y) * t,
      };
      if (this.formationTransitionProgress >= 1) {
        this.isTransitioningFormation = false;
      }
    }

    if (this.isInCombat) {
      this.attackTimer = Math.max(0, this.attackTimer - deltaTime);
      return;
    }

    if (formationCenter) {
      const worldTarget = {
        x: formationCenter.x + this.formationOffset.x,
        y: formationCenter.y + this.formationOffset.y,
      };
      this.moveTowards(worldTarget, deltaTime);
    } else if (this.isMoving) {
      this.moveTowards(this.targetPosition, deltaTime);
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private moveTowards(target: { x: number; y: number }, deltaTime: number): void {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 1) {
      this.position.x = target.x;
      this.position.y = target.y;
      this.isMoving = false;
      return;
    }

    this.facingAngle = Math.atan2(dy, dx);
    const moveDistance = this.speed * deltaTime;

    if (moveDistance >= distance) {
      this.position.x = target.x;
      this.position.y = target.y;
      this.isMoving = false;
    } else {
      this.position.x += (dx / distance) * moveDistance;
      this.position.y += (dy / distance) * moveDistance;
      this.isMoving = true;
    }
  }

  public setTargetPosition(target: { x: number; y: number }): void {
    this.targetPosition = { ...target };
    this.isMoving = true;
    this.isInCombat = false;
  }

  public setFormationOffset(offset: { x: number; y: number }, smooth: boolean = true): void {
    if (smooth) {
      this.previousFormationOffset = { ...this.formationOffset };
      this.targetFormationOffset = { ...offset };
      this.formationTransitionProgress = 0;
      this.isTransitioningFormation = true;
    } else {
      this.formationOffset = { ...offset };
      this.targetFormationOffset = { ...offset };
      this.previousFormationOffset = { ...offset };
      this.formationTransitionProgress = 1;
      this.isTransitioningFormation = false;
    }
  }

  public takeDamage(damage: number): boolean {
    this.hp = Math.max(0, this.hp - damage);
    return this.hp <= 0;
  }

  public canAttack(): boolean {
    return this.attackTimer <= 0 && this.isInCombat;
  }

  public performAttack(): number {
    this.attackTimer = this.attackCooldown;
    return this.damage;
  }

  public faceTowards(target: { x: number; y: number }): void {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    this.facingAngle = Math.atan2(dy, dx);
  }

  public enterCombat(): void {
    this.isInCombat = true;
    this.isMoving = false;
  }

  public exitCombat(): void {
    this.isInCombat = false;
  }

  public distanceTo(other: { x: number; y: number }): number {
    const dx = other.x - this.position.x;
    const dy = other.y - this.position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public isAlive(): boolean {
    return this.hp > 0;
  }
}
