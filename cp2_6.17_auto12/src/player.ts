export interface InventoryItem {
  type: 'potion' | 'power' | 'key';
  slot: number;
}

export class Player {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  baseAtk: number;
  inventory: InventoryItem[];
  exploredCells: Set<string>;
  killedMonsters: number;
  powerBoosted: boolean;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.hp = 20;
    this.maxHp = 20;
    this.atk = 3;
    this.def = 1;
    this.baseAtk = 3;
    this.inventory = [];
    this.exploredCells = new Set<string>();
    this.killedMonsters = 0;
    this.powerBoosted = false;
    this.markExplored(x, y);
  }

  markExplored(x: number, y: number): void {
    this.exploredCells.add(`${x},${y}`);
  }

  isExplored(x: number, y: number): boolean {
    return this.exploredCells.has(`${x},${y}`);
  }

  getExploredCount(): number {
    return this.exploredCells.size;
  }

  moveTo(nx: number, ny: number): void {
    this.x = nx;
    this.y = ny;
    this.markExplored(nx, ny);
  }

  takeDamage(rawDmg: number): number {
    const actualDmg = Math.max(1, rawDmg - this.def);
    this.hp = Math.max(0, this.hp - actualDmg);
    return actualDmg;
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  applyPowerBoost(): void {
    this.atk = this.baseAtk * 2;
    this.powerBoosted = true;
  }

  consumePowerBoost(): void {
    if (this.powerBoosted) {
      this.atk = this.baseAtk;
      this.powerBoosted = false;
    }
  }

  addItem(type: 'potion' | 'power' | 'key'): number {
    const slot = this.inventory.length + 1;
    this.inventory.push({ type, slot });
    return slot;
  }

  useItem(slotNumber: number): 'potion' | 'power' | 'key' | null {
    const idx = this.inventory.findIndex(item => item.slot === slotNumber);
    if (idx === -1) return null;
    const item = this.inventory[idx];
    this.inventory.splice(idx, 1);
    this.inventory.forEach((it, i) => { it.slot = i + 1; });
    return item.type;
  }

  hasItem(slotNumber: number): boolean {
    return this.inventory.some(item => item.slot === slotNumber);
  }

  getInventoryDisplay(): string {
    if (this.inventory.length === 0) return '无';
    return this.inventory.map(item => {
      const icons: Record<string, string> = { potion: '🧪', power: '⚗️', key: '🔑' };
      return `${item.slot}:${icons[item.type]}`;
    }).join(' ');
  }

  isDead(): boolean {
    return this.hp <= 0;
  }

  getScore(): number {
    return this.getExploredCount() * 10 + this.killedMonsters * 50;
  }
}
