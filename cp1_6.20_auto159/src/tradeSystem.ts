import type { MineralRarity } from './planetEngine';
import type { PlayerState } from './playerState';
import { addGold, spendGold, addMineral, removeMineral } from './playerState';

export interface TradePrices {
  common: number;
  rare: number;
  legendary: number;
}

export interface PriceChange {
  rarity: MineralRarity;
  type: 'up' | 'down';
  amount: number;
  timestamp: number;
  visible: boolean;
}

const BASE_PRICES: TradePrices = {
  common: 10,
  rare: 50,
  legendary: 200,
};

const PRICE_VOLATILITY = 0.15;
const PRICE_CHANGE_INTERVAL = 5000;

export function createTradePrices(): TradePrices {
  return { ...BASE_PRICES };
}

export function updatePrices(
  prices: TradePrices,
  lastUpdate: number,
  now: number
): { prices: TradePrices; changes: PriceChange[] } {
  if (now - lastUpdate < PRICE_CHANGE_INTERVAL) {
    return { prices, changes: [] };
  }

  const newPrices = { ...prices };
  const changes: PriceChange[] = [];

  const rarities: MineralRarity[] = ['common', 'rare', 'legendary'];
  for (const rarity of rarities) {
    const basePrice = BASE_PRICES[rarity];
    const currentPrice = newPrices[rarity];

    const change = (Math.random() - 0.5) * 2 * PRICE_VOLATILITY * basePrice;
    const newPrice = Math.max(
      basePrice * 0.5,
      Math.min(basePrice * 1.5, currentPrice + change)
    );

    const roundedPrice = Math.round(newPrice);
    if (roundedPrice !== currentPrice) {
      changes.push({
        rarity,
        type: roundedPrice > currentPrice ? 'up' : 'down',
        amount: Math.abs(roundedPrice - currentPrice),
        timestamp: now,
        visible: true,
      });
      newPrices[rarity] = roundedPrice;
    }
  }

  return { prices: newPrices, changes };
}

export function sellMineral(
  player: PlayerState,
  prices: TradePrices,
  rarity: MineralRarity,
  amount: number
): { success: boolean; goldEarned: number } {
  if (player.inventory[rarity] < amount) {
    return { success: false, goldEarned: 0 };
  }

  const goldEarned = prices[rarity] * amount;
  removeMineral(player, rarity, amount);
  addGold(player, goldEarned);

  return { success: true, goldEarned };
}

export function buyMineral(
  player: PlayerState,
  prices: TradePrices,
  rarity: MineralRarity,
  amount: number
): { success: boolean; goldSpent: number } {
  const totalCost = prices[rarity] * amount;
  if (player.gold < totalCost) {
    return { success: false, goldSpent: 0 };
  }

  spendGold(player, totalCost);
  addMineral(player, rarity, amount);

  return { success: true, goldSpent: totalCost };
}

export function getMineralName(rarity: MineralRarity): string {
  switch (rarity) {
    case 'common':
      return '普通矿石';
    case 'rare':
      return '稀有矿石';
    case 'legendary':
      return '传说矿石';
  }
}

export function getMineralColor(rarity: MineralRarity): string {
  switch (rarity) {
    case 'common':
      return '#FFD700';
    case 'rare':
      return '#FF69B4';
    case 'legendary':
      return '#00FFFF';
  }
}

export { BASE_PRICES, PRICE_CHANGE_INTERVAL };
