import type { Position } from './maze';

export interface Inventory {
  potionHeal: number;
  potionPower: number;
  key: number;
}

export class Player {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  baseAttack: number;
  baseDefense: number;
  inventory: Inventory;
  powerUpActive: boolean;
  powerUpConsumed: boolean;
  exploredCount: number;
  killedMonsters: number;
  floor: number;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
    this.maxHp = 20;
    this.hp = this.maxHp;
    this.baseAttack = 3;
    this.baseDefense = 1;
    this.attack = this.baseAttack;
    this.defense = this.baseDefense;
    this.inventory = {
      potionHeal: 0,
      potionPower: 0,
      key: 0,
    };
    this.powerUpActive = false;
    this.powerUpConsumed = false;
    this.exploredCount = 0;
    this.killedMonsters = 0;
    this.floor = 1;
  }

  setPosition(pos: Position): void {
    this.x = pos.x;
    this.y = pos.y;
  }

  takeDamage(damage: number): number {
    const actualDamage = Math.max(1, damage - this.defense);
    this.hp = Math.max(0, this.hp - actualDamage);
    return actualDamage;
  }

  heal(amount: number): number {
    const healed = Math.min(amount, this.maxHp - this.hp);
    this.hp += healed;
    return healed;
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  activatePowerUp(): void {
    if (this.inventory.potionPower <= 0 || this.powerUpActive) return;
    this.inventory.potionPower--;
    this.powerUpActive = true;
    this.powerUpConsumed = false;
    this.attack = this.baseAttack * 2;
  }

  consumePowerUpIfActive(): void {
    if (this.powerUpActive && !this.powerUpConsumed) {
      this.powerUpConsumed = true;
    }
  }

  resetPowerUpAfterBattle(): void {
    if (this.powerUpActive && this.powerUpConsumed) {
      this.powerUpActive = false;
      this.attack = this.baseAttack;
    }
  }

  usePotionHeal(): number {
    if (this.inventory.potionHeal <= 0) return 0;
    this.inventory.potionHeal--;
    return this.heal(5);
  }

  addItem(type: 'potion-heal' | 'potion-power' | 'key'): void {
    switch (type) {
      case 'potion-heal':
        this.inventory.potionHeal++;
        break;
      case 'potion-power':
        this.inventory.potionPower++;
        break;
      case 'key':
        this.inventory.key++;
        break;
    }
  }

  useKey(): boolean {
    if (this.inventory.key <= 0) return false;
    this.inventory.key--;
    return true;
  }

  incrementExplored(): void {
    this.exploredCount++;
  }

  incrementKilled(): void {
    this.killedMonsters++;
  }

  nextFloor(): void {
    this.floor++;
  }

  reset(startX: number, startY: number): void {
    this.x = startX;
    this.y = startY;
    this.maxHp = 20;
    this.hp = this.maxHp;
    this.baseAttack = 3;
    this.baseDefense = 1;
    this.attack = this.baseAttack;
    this.defense = this.baseDefense;
    this.inventory = {
      potionHeal: 0,
      potionPower: 0,
      key: 0,
    };
    this.powerUpActive = false;
    this.powerUpConsumed = false;
    this.exploredCount = 0;
    this.killedMonsters = 0;
    this.floor = 1;
  }

  calculateScore(): number {
    return this.exploredCount * 10 + this.killedMonsters * 50;
  }
}
