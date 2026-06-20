import type { DrillLevel } from './drillLogic';
import { getDrillColor, getDrillName } from './drillLogic';
import type { PlayerState, PlayerInventory } from './playerState';
import { removeMineral } from './playerState';

export interface UpgradeInfo {
  from: DrillLevel;
  to: DrillLevel;
  cost: {
    mineral: 'common' | 'rare' | 'legendary';
    amount: number;
  };
}

export const UPGRADE_PATH: UpgradeInfo[] = [
  {
    from: 'copper',
    to: 'silver',
    cost: { mineral: 'common', amount: 20 },
  },
  {
    from: 'silver',
    to: 'gold',
    cost: { mineral: 'rare', amount: 15 },
  },
];

export function getNextUpgrade(currentLevel: DrillLevel): UpgradeInfo | null {
  return UPGRADE_PATH.find((u) => u.from === currentLevel) || null;
}

export function canUpgrade(
  currentLevel: DrillLevel,
  inventory: PlayerInventory
): boolean {
  const upgrade = getNextUpgrade(currentLevel);
  if (!upgrade) return false;
  return inventory[upgrade.cost.mineral] >= upgrade.cost.amount;
}

export function performUpgrade(state: PlayerState): boolean {
  const upgrade = getNextUpgrade(state.drillLevel);
  if (!upgrade) return false;

  if (!removeMineral(state, upgrade.cost.mineral, upgrade.cost.amount)) {
    return false;
  }

  state.drillLevel = upgrade.to;
  return true;
}

export function getDrillLevels(): DrillLevel[] {
  return ['copper', 'silver', 'gold'];
}

export function getDrillLevelIndex(level: DrillLevel): number {
  return getDrillLevels().indexOf(level);
}

export function getUpgradeDescription(upgrade: UpgradeInfo): string {
  const mineralNames: Record<string, string> = {
    common: '普通矿石',
    rare: '稀有矿石',
    legendary: '传说矿石',
  };
  return `升级到${getDrillName(upgrade.to)}：需要 ${upgrade.cost.amount} 个${mineralNames[upgrade.cost.mineral]}`;
}

export { getDrillColor, getDrillName };
