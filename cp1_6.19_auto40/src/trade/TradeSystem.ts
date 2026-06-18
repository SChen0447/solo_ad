import type { TradeRecord, MineralType, Ship } from '@/types/game';
import { removeCargo } from '@/ship/ShipSystem';

const BASE_PRICES: Record<MineralType, number> = {
  iron: 10,
  copper: 15,
  titaniumIce: 25,
};

const MIN_PRICE_MULTIPLIER = 0.6;
const PRICE_DECAY_RATE = 0.1;

export function createInitialTradeRecords(): TradeRecord[] {
  return (['iron', 'copper', 'titaniumIce'] as MineralType[]).map(type => ({
    mineralType: type,
    sellCount: 0,
    basePrice: BASE_PRICES[type],
    currentPriceMultiplier: 1.0,
  }));
}

export function calculatePrice(
  mineralType: MineralType,
  tradeRecords: TradeRecord[]
): number {
  const record = tradeRecords.find(r => r.mineralType === mineralType);
  if (!record) return BASE_PRICES[mineralType];
  
  return Math.floor(record.basePrice * record.currentPriceMultiplier);
}

export function calculateAllPrices(
  tradeRecords: TradeRecord[]
): Record<MineralType, number> {
  return {
    iron: calculatePrice('iron', tradeRecords),
    copper: calculatePrice('copper', tradeRecords),
    titaniumIce: calculatePrice('titaniumIce', tradeRecords),
  };
}

export function sellMineral(
  ship: Ship,
  mineralType: MineralType,
  amount: number,
  tradeRecords: TradeRecord[]
): { 
  ship: Ship; 
  credits: number; 
  updatedRecords: TradeRecord[];
  sold: number;
} {
  const { ship: updatedShip, removed } = removeCargo(ship, mineralType, amount);
  
  if (removed <= 0) {
    return { ship, credits: 0, updatedRecords: tradeRecords, sold: 0 };
  }
  
  const price = calculatePrice(mineralType, tradeRecords);
  const credits = price * removed;
  
  const updatedRecords = tradeRecords.map(record => {
    if (record.mineralType !== mineralType) return record;
    
    const newSellCount = record.sellCount + removed;
    const decaySteps = Math.floor(newSellCount / 50);
    const newMultiplier = Math.max(
      MIN_PRICE_MULTIPLIER,
      1.0 - decaySteps * PRICE_DECAY_RATE
    );
    
    return {
      ...record,
      sellCount: newSellCount,
      currentPriceMultiplier: newMultiplier,
    };
  });
  
  return {
    ship: updatedShip,
    credits,
    updatedRecords,
    sold: removed,
  };
}

export function sellAllMinerals(
  ship: Ship,
  tradeRecords: TradeRecord[]
): {
  ship: Ship;
  totalCredits: number;
  updatedRecords: TradeRecord[];
} {
  let currentShip = ship;
  let currentRecords = tradeRecords;
  let totalCredits = 0;
  
  for (const type of ['iron', 'copper', 'titaniumIce'] as MineralType[]) {
    const amount = currentShip.cargo[type];
    if (amount > 0) {
      const result = sellMineral(currentShip, type, amount, currentRecords);
      currentShip = result.ship;
      currentRecords = result.updatedRecords;
      totalCredits += result.credits;
    }
  }
  
  return {
    ship: currentShip,
    totalCredits,
    updatedRecords: currentRecords,
  };
}

export function getPriceInfo(
  mineralType: MineralType,
  tradeRecords: TradeRecord[]
): {
  currentPrice: number;
  basePrice: number;
  multiplier: number;
  sellCount: number;
} {
  const record = tradeRecords.find(r => r.mineralType === mineralType);
  if (!record) {
    return {
      currentPrice: BASE_PRICES[mineralType],
      basePrice: BASE_PRICES[mineralType],
      multiplier: 1.0,
      sellCount: 0,
    };
  }
  
  return {
    currentPrice: Math.floor(record.basePrice * record.currentPriceMultiplier),
    basePrice: record.basePrice,
    multiplier: record.currentPriceMultiplier,
    sellCount: record.sellCount,
  };
}

export function getRefuelCost(amount: number): number {
  return amount * 2;
}

export function getRepairCost(amount: number): number {
  return amount * 3;
}

export function refuelAtStation(
  ship: Ship,
  credits: number,
  amount: number
): { ship: Ship; credits: number; success: boolean; message?: string } {
  const actualAmount = Math.min(amount, ship.maxFuel - ship.fuel);
  const cost = getRefuelCost(actualAmount);
  
  if (credits < cost) {
    return { ship, credits, success: false, message: '金币不足' };
  }
  
  if (actualAmount <= 0) {
    return { ship, credits, success: false, message: '燃料已满' };
  }
  
  return {
    ship: { ...ship, fuel: ship.fuel + actualAmount },
    credits: credits - cost,
    success: true,
  };
}

export function repairAtStation(
  ship: Ship,
  credits: number,
  amount: number
): { ship: Ship; credits: number; success: boolean; message?: string } {
  const actualAmount = Math.min(amount, ship.maxHull - ship.hull);
  const cost = getRepairCost(actualAmount);
  
  if (credits < cost) {
    return { ship, credits, success: false, message: '金币不足' };
  }
  
  if (actualAmount <= 0) {
    return { ship, credits, success: false, message: '船体完好' };
  }
  
  return {
    ship: { ...ship, hull: ship.hull + actualAmount },
    credits: credits - cost,
    success: true,
  };
}
