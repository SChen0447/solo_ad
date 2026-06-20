export type UpgradeType = 'shield' | 'weapon' | 'turret';

export interface UpgradeInfo {
  id: UpgradeType;
  name: string;
  icon: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
}

export type UpgradeChangeCallback = (type: UpgradeType, level: number) => void;
export type EnergyChangeCallback = (energy: number) => void;

export const UPGRADE_INFO: Record<UpgradeType, UpgradeInfo> = {
  shield: {
    id: 'shield',
    name: '护盾强化',
    icon: '🛡️',
    description: '提升护盾上限和减伤效果',
    maxLevel: 5,
    baseCost: 30,
    costMultiplier: 1.8,
  },
  weapon: {
    id: 'weapon',
    name: '主炮强化',
    icon: '⚔️',
    description: '提升主炮伤害和射击速度',
    maxLevel: 5,
    baseCost: 40,
    costMultiplier: 1.8,
  },
  turret: {
    id: 'turret',
    name: '自动炮塔',
    icon: '🔫',
    description: '解锁自动炮塔，自动瞄准攻击敌人',
    maxLevel: 3,
    baseCost: 80,
    costMultiplier: 2.0,
  },
};

export class UpgradeManager {
  private energy: number = 0;
  private upgrades: Record<UpgradeType, number> = {
    shield: 0,
    weapon: 0,
    turret: 0,
  };
  private upgradeCallbacks: UpgradeChangeCallback[] = [];
  private energyCallbacks: EnergyChangeCallback[] = [];

  constructor() {
    this.energy = 0;
  }

  public getEnergy(): number {
    return this.energy;
  }

  public addEnergy(amount: number): void {
    this.energy += amount;
    this.notifyEnergyChange();
  }

  public spendEnergy(amount: number): boolean {
    if (this.energy >= amount) {
      this.energy -= amount;
      this.notifyEnergyChange();
      return true;
    }
    return false;
  }

  public getUpgradeLevel(type: UpgradeType): number {
    return this.upgrades[type];
  }

  public getUpgradeCost(type: UpgradeType): number {
    const info = UPGRADE_INFO[type];
    const level = this.upgrades[type];
    if (level >= info.maxLevel) return Infinity;
    return Math.floor(info.baseCost * Math.pow(info.costMultiplier, level));
  }

  public canUpgrade(type: UpgradeType): boolean {
    const info = UPGRADE_INFO[type];
    const level = this.upgrades[type];
    if (level >= info.maxLevel) return false;
    const cost = this.getUpgradeCost(type);
    return this.energy >= cost;
  }

  public isMaxLevel(type: UpgradeType): boolean {
    return this.upgrades[type] >= UPGRADE_INFO[type].maxLevel;
  }

  public upgrade(type: UpgradeType): boolean {
    if (!this.canUpgrade(type)) return false;
    const cost = this.getUpgradeCost(type);
    this.energy -= cost;
    this.upgrades[type]++;
    this.notifyUpgradeChange(type, this.upgrades[type]);
    this.notifyEnergyChange();
    return true;
  }

  public getTotalUpgradeCount(): number {
    return this.upgrades.shield + this.upgrades.weapon + this.upgrades.turret;
  }

  public onUpgradeChange(callback: UpgradeChangeCallback): void {
    this.upgradeCallbacks.push(callback);
  }

  public offUpgradeChange(callback: UpgradeChangeCallback): void {
    const index = this.upgradeCallbacks.indexOf(callback);
    if (index > -1) {
      this.upgradeCallbacks.splice(index, 1);
    }
  }

  public onEnergyChange(callback: EnergyChangeCallback): void {
    this.energyCallbacks.push(callback);
  }

  public offEnergyChange(callback: EnergyChangeCallback): void {
    const index = this.energyCallbacks.indexOf(callback);
    if (index > -1) {
      this.energyCallbacks.splice(index, 1);
    }
  }

  private notifyUpgradeChange(type: UpgradeType, level: number): void {
    this.upgradeCallbacks.forEach((cb) => cb(type, level));
  }

  private notifyEnergyChange(): void {
    this.energyCallbacks.forEach((cb) => cb(this.energy));
  }

  public reset(): void {
    this.energy = 0;
    this.upgrades = {
      shield: 0,
      weapon: 0,
      turret: 0,
    };
    this.notifyEnergyChange();
    (['shield', 'weapon', 'turret'] as UpgradeType[]).forEach((type) => {
      this.notifyUpgradeChange(type, 0);
    });
  }

  public getAllUpgrades(): Record<UpgradeType, number> {
    return { ...this.upgrades };
  }
}
