import {
  Position,
  Monster,
  Treasure,
  FightRequest,
  FightResponse,
  CellType,
} from './backendClient';
import { backendClient } from './backendClient';

export interface PlayerState {
  position: Position;
  previousPosition: Position;
  hp: number;
  maxHp: number;
  attack: number;
  baseAttack: number;
  floor: number;
  treasuresCollected: number;
  score: number;
  isMoving: boolean;
  moveStartTime: number;
  moveDuration: number;
  isAttacking: boolean;
  attackStartTime: number;
  attackDuration: number;
  isCollectingTreasure: boolean;
  collectStartTime: number;
  collectDuration: number;
  collectingTreasureId: string | null;
}

export class Player {
  public state: PlayerState;

  constructor() {
    this.state = {
      position: { x: 0, y: 0 },
      previousPosition: { x: 0, y: 0 },
      hp: 100,
      maxHp: 100,
      attack: 10,
      baseAttack: 10,
      floor: 1,
      treasuresCollected: 0,
      score: 0,
      isMoving: false,
      moveStartTime: 0,
      moveDuration: 150,
      isAttacking: false,
      attackStartTime: 0,
      attackDuration: 100,
      isCollectingTreasure: false,
      collectStartTime: 0,
      collectDuration: 300,
      collectingTreasureId: null,
    };
  }

  public reset(): void {
    this.state.hp = 100;
    this.state.maxHp = 100;
    this.state.attack = 10;
    this.state.baseAttack = 10;
    this.state.floor = 1;
    this.state.treasuresCollected = 0;
    this.state.score = 0;
    this.state.isMoving = false;
    this.state.isAttacking = false;
    this.state.isCollectingTreasure = false;
  }

  public setPosition(position: Position): void {
    this.state.position = { ...position };
    this.state.previousPosition = { ...position };
  }

  public canMove(
    direction: 'up' | 'down' | 'left' | 'right',
    grid: CellType[][],
    monsters: Monster[],
    currentTime: number
  ): boolean {
    if (this.state.isMoving || this.state.isAttacking || this.state.isCollectingTreasure) {
      return false;
    }

    const newPos = this.getNextPosition(direction);
    const gridSize = grid.length;

    if (newPos.x < 0 || newPos.x >= gridSize || newPos.y < 0 || newPos.y >= gridSize) {
      return false;
    }

    if (grid[newPos.y][newPos.x] === 'wall') {
      return false;
    }

    for (const monster of monsters) {
      if (monster.hp > 0 && monster.position.x === newPos.x && monster.position.y === newPos.y) {
        return false;
      }
    }

    return true;
  }

  public getNextPosition(direction: 'up' | 'down' | 'left' | 'right'): Position {
    const { x, y } = this.state.position;
    switch (direction) {
      case 'up':
        return { x, y: y - 1 };
      case 'down':
        return { x, y: y + 1 };
      case 'left':
        return { x: x - 1, y };
      case 'right':
        return { x: x + 1, y };
    }
  }

  public move(direction: 'up' | 'down' | 'left' | 'right', currentTime: number): void {
    const newPos = this.getNextPosition(direction);
    this.state.previousPosition = { ...this.state.position };
    this.state.position = newPos;
    this.state.isMoving = true;
    this.state.moveStartTime = currentTime;
  }

  public updateMoveAnimation(currentTime: number): void {
    if (this.state.isMoving) {
      const elapsed = currentTime - this.state.moveStartTime;
      if (elapsed >= this.state.moveDuration) {
        this.state.isMoving = false;
      }
    }
  }

  public getInterpolatedPosition(currentTime: number): Position {
    if (!this.state.isMoving) {
      return { ...this.state.position };
    }

    const elapsed = currentTime - this.state.moveStartTime;
    const progress = Math.min(1, elapsed / this.state.moveDuration);
    const easeProgress = this.easeOutQuad(progress);

    return {
      x:
        this.state.previousPosition.x +
        (this.state.position.x - this.state.previousPosition.x) * easeProgress,
      y:
        this.state.previousPosition.y +
        (this.state.position.y - this.state.previousPosition.y) * easeProgress,
    };
  }

  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  public isAdjacentToMonster(monster: Monster): boolean {
    const dx = Math.abs(this.state.position.x - monster.position.x);
    const dy = Math.abs(this.state.position.y - monster.position.y);
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  }

  public getAdjacentMonster(monsters: Monster[]): Monster | null {
    for (const monster of monsters) {
      if (monster.hp > 0 && this.isAdjacentToMonster(monster)) {
        return monster;
      }
    }
    return null;
  }

  public async attack(
    monster: Monster,
    currentTime: number
  ): Promise<FightResponse | null> {
    if (this.state.isAttacking || this.state.isMoving || this.state.isCollectingTreasure) {
      return null;
    }

    this.state.isAttacking = true;
    this.state.attackStartTime = currentTime;

    const request: FightRequest = {
      playerAttack: this.state.attack,
      monsterDefense: monster.defense,
      monsterHp: monster.hp,
      playerHp: this.state.hp,
      monsterAttack: monster.attack,
    };

    try {
      const response = await backendClient.fight(request);
      
      this.state.hp = response.playerHp;
      
      if (response.monsterDefeated) {
        this.state.score += 100 * this.state.floor;
      }

      return response;
    } catch (error) {
      console.error('攻击失败:', error);
      this.state.isAttacking = false;
      throw error;
    }
  }

  public updateAttackAnimation(currentTime: number): boolean {
    if (this.state.isAttacking) {
      const elapsed = currentTime - this.state.attackStartTime;
      if (elapsed >= this.state.attackDuration) {
        this.state.isAttacking = false;
        return true;
      }
    }
    return false;
  }

  public isAttackFlashing(currentTime: number): boolean {
    if (!this.state.isAttacking) return false;
    const elapsed = currentTime - this.state.attackStartTime;
    return elapsed < this.state.attackDuration;
  }

  public checkTreasureCollection(
    treasures: Treasure[],
    currentTime: number
  ): Treasure | null {
    for (const treasure of treasures) {
      if (
        !treasure.collected &&
        treasure.position.x === this.state.position.x &&
        treasure.position.y === this.state.position.y &&
        !this.state.isCollectingTreasure
      ) {
        return treasure;
      }
    }
    return null;
  }

  public collectTreasure(treasure: Treasure, currentTime: number): void {
    this.state.isCollectingTreasure = true;
    this.state.collectStartTime = currentTime;
    this.state.collectingTreasureId = treasure.id;

    if (treasure.type === 'heal') {
      this.state.hp = Math.min(this.state.maxHp, this.state.hp + treasure.value);
    } else if (treasure.type === 'attack') {
      this.state.attack = this.state.baseAttack + treasure.value;
    }

    this.state.treasuresCollected++;
    this.state.score += 50 * this.state.floor;
  }

  public updateCollectAnimation(currentTime: number): void {
    if (this.state.isCollectingTreasure) {
      const elapsed = currentTime - this.state.collectStartTime;
      if (elapsed >= this.state.collectDuration) {
        this.state.isCollectingTreasure = false;
        this.state.collectingTreasureId = null;
      }
    }
  }

  public getCollectAnimationProgress(currentTime: number): number {
    if (!this.state.isCollectingTreasure) return 0;
    const elapsed = currentTime - this.state.collectStartTime;
    return Math.min(1, elapsed / this.state.collectDuration);
  }

  public isOnExit(exitPosition: Position): boolean {
    return (
      this.state.position.x === exitPosition.x &&
      this.state.position.y === exitPosition.y
    );
  }

  public nextFloor(): void {
    this.state.floor++;
    this.state.attack = this.state.baseAttack;
  }

  public calculateScore(timeBonus: number): number {
    const hpBonus = Math.floor((this.state.hp / this.state.maxHp) * 500);
    const treasureBonus = this.state.treasuresCollected * 100;
    const floorBonus = (this.state.floor - 1) * 500;
    return this.state.score + hpBonus + treasureBonus + floorBonus + Math.max(0, timeBonus);
  }

  public takeDamage(damage: number): void {
    this.state.hp = Math.max(0, this.state.hp - damage);
  }

  public heal(amount: number): void {
    this.state.hp = Math.min(this.state.maxHp, this.state.hp + amount);
  }

  public isLowHealth(): boolean {
    return this.state.hp / this.state.maxHp < 0.3;
  }

  public isDead(): boolean {
    return this.state.hp <= 0;
  }
}
