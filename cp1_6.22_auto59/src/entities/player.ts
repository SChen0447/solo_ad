import type { Position, Item, ItemType } from '../types';
import { Inventory } from '../systems/inventory';
import type { MapGenerator } from '../game/mapGenerator';

export class Player {
  public x: number;
  public y: number;
  public hp: number;
  public maxHp: number;
  public attack: number;
  public defense: number;
  public inventory: Inventory;
  public lastMoveTime: number = 0;
  public readonly moveCooldown: number = 200;
  public isHit: boolean = false;
  public hitTime: number = 0;
  public keys: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.hp = 100;
    this.maxHp = 100;
    this.attack = 15;
    this.defense = 5;
    this.inventory = new Inventory();
    this.keys = 0;
  }

  public canMove(currentTime: number): boolean {
    return currentTime - this.lastMoveTime >= this.moveCooldown;
  }

  public tryMove(
    dx: number,
    dy: number,
    map: MapGenerator,
    currentTime: number
  ): { moved: boolean; hitTrap: boolean; newPos: Position } {
    if (!this.canMove(currentTime)) {
      return { moved: false, hitTrap: false, newPos: { x: this.x, y: this.y } };
    }

    const newX = this.x + dx;
    const newY = this.y + dy;

    if (!map.isWalkable(newX, newY)) {
      return { moved: false, hitTrap: false, newPos: { x: this.x, y: this.y } };
    }

    const tile = map.tiles[newY][newX];
    if (tile.type === 'door' && this.keys <= 0) {
      return { moved: false, hitTrap: false, newPos: { x: this.x, y: this.y } };
    }

    this.x = newX;
    this.y = newY;
    this.lastMoveTime = currentTime;

    if (tile.type === 'door') {
      this.keys--;
      map.tiles[newY][newX].type = 'floor';
    }

    const hitTrap = tile.type === 'trap';

    return { moved: true, hitTrap, newPos: { x: this.x, y: this.y } };
  }

  public takeDamage(amount: number, currentTime: number): void {
    const actualDamage = Math.max(1, amount - this.defense);
    this.hp -= actualDamage;
    if (this.hp < 0) this.hp = 0;
    this.isHit = true;
    this.hitTime = currentTime;
  }

  public heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  public addItem(item: Item): void {
    this.inventory.addItem(item);
    if (item.type === 'key') {
      this.keys += item.count;
    }
  }

  public useItem(type: ItemType, currentTime: number): boolean {
    const item = this.inventory.getItem(type);
    if (!item || item.count <= 0) return false;

    switch (type) {
      case 'healthPotion':
        this.heal(30);
        this.inventory.removeItem(type, 1);
        return true;
      case 'key':
        return false;
      default:
        this.inventory.removeItem(type, 1);
        return true;
    }
  }

  public isDead(): boolean {
    return this.hp <= 0;
  }

  public update(currentTime: number): void {
    if (this.isHit && currentTime - this.hitTime > 200) {
      this.isHit = false;
    }
  }
}
