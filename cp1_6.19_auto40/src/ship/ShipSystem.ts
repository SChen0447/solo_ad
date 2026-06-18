import type { Ship, MineralType, ShipPart } from '@/types/game';

const BASE_SPEED = 150;
const BASE_FUEL_CONSUMPTION = 0.5;
const BASE_CARGO_CAPACITY = 100;
const BASE_HULL = 100;
const BASE_FUEL = 100;
const BASE_SHIELD = 50;
const SHIELD_DURATION = 10000;
const SHIELD_COOLDOWN = 30000;

function getSpeedForLevel(level: number): number {
  return BASE_SPEED * (1 + (level - 1) * 0.25);
}

function getFuelConsumptionForLevel(level: number): number {
  return BASE_FUEL_CONSUMPTION * (1 - (level - 1) * 0.1);
}

function getCargoCapacityForLevel(level: number): number {
  return BASE_CARGO_CAPACITY + (level - 1) * 50;
}

function getShieldForLevel(level: number): number {
  return BASE_SHIELD + (level - 1) * 25;
}

function getUpgradeCost(
  partType: 'engine' | 'cargo' | 'shield',
  currentLevel: number
): { minerals: Record<MineralType, number>; credits: number } {
  const baseMinerals = 10 * currentLevel;
  const baseCredits = 50 * currentLevel;
  
  const costs: Record<'engine' | 'cargo' | 'shield', Record<MineralType, number>> = {
    engine: { iron: baseMinerals * 2, copper: baseMinerals, titaniumIce: Math.floor(baseMinerals * 0.5) },
    cargo: { iron: baseMinerals, copper: baseMinerals * 2, titaniumIce: Math.floor(baseMinerals * 0.5) },
    shield: { iron: baseMinerals, copper: Math.floor(baseMinerals * 0.5), titaniumIce: baseMinerals * 2 },
  };
  
  return {
    minerals: costs[partType],
    credits: baseCredits,
  };
}

export function createInitialShip(): Ship {
  const enginePart: ShipPart = {
    level: 1,
    maxLevel: 5,
    upgradeCost: getUpgradeCost('engine', 1),
  };
  
  const cargoPart: ShipPart = {
    level: 1,
    maxLevel: 5,
    upgradeCost: getUpgradeCost('cargo', 1),
  };
  
  const shieldPart: ShipPart = {
    level: 1,
    maxLevel: 5,
    upgradeCost: getUpgradeCost('shield', 1),
  };
  
  return {
    x: 100,
    y: 350,
    speed: getSpeedForLevel(1),
    hull: BASE_HULL,
    maxHull: BASE_HULL,
    fuel: BASE_FUEL,
    maxFuel: BASE_FUEL,
    shield: getShieldForLevel(1),
    maxShield: getShieldForLevel(1),
    shieldActive: false,
    shieldCooldown: 0,
    shieldDuration: 0,
    cargo: { iron: 0, copper: 0, titaniumIce: 0 },
    cargoCapacity: getCargoCapacityForLevel(1),
    parts: {
      engine: enginePart,
      cargo: cargoPart,
      shield: shieldPart,
    },
  };
}

export function moveShip(
  ship: Ship,
  targetX: number,
  targetY: number,
  deltaTime: number
): { ship: Ship; reached: boolean } {
  if (ship.fuel <= 0) {
    return { ship, reached: false };
  }
  
  const dx = targetX - ship.x;
  const dy = targetY - ship.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < 5) {
    return { ship: { ...ship, x: targetX, y: targetY }, reached: true };
  }
  
  const moveDistance = ship.speed * (deltaTime / 1000);
  const ratio = Math.min(moveDistance / distance, 1);
  
  const newX = ship.x + dx * ratio;
  const newY = ship.y + dy * ratio;
  
  const fuelConsumption = getFuelConsumptionForLevel(ship.parts.engine.level) * (deltaTime / 1000);
  const newFuel = Math.max(0, ship.fuel - fuelConsumption);
  
  let updatedShield = { ...ship };
  const now = Date.now();
  
  if (ship.shieldActive && ship.shieldDuration > 0 && now >= ship.shieldDuration) {
    updatedShield = {
      ...updatedShield,
      shieldActive: false,
      shield: 0,
      shieldCooldown: now + SHIELD_COOLDOWN,
    };
  }
  
  return {
    ship: {
      ...updatedShield,
      x: newX,
      y: newY,
      fuel: newFuel,
    },
    reached: ratio >= 1,
  };
}

export function getTotalCargo(cargo: Record<MineralType, number>): number {
  return Object.values(cargo).reduce((sum, val) => sum + val, 0);
}

export function addCargo(
  ship: Ship,
  type: MineralType,
  amount: number
): { ship: Ship; added: number } {
  const currentTotal = getTotalCargo(ship.cargo);
  const availableSpace = ship.cargoCapacity - currentTotal;
  const actualAdded = Math.min(amount, availableSpace);
  
  if (actualAdded <= 0) {
    return { ship, added: 0 };
  }
  
  return {
    ship: {
      ...ship,
      cargo: {
        ...ship.cargo,
        [type]: ship.cargo[type] + actualAdded,
      },
    },
    added: actualAdded,
  };
}

export function removeCargo(
  ship: Ship,
  type: MineralType,
  amount: number
): { ship: Ship; removed: number } {
  const actualRemoved = Math.min(amount, ship.cargo[type]);
  
  if (actualRemoved <= 0) {
    return { ship, removed: 0 };
  }
  
  return {
    ship: {
      ...ship,
      cargo: {
        ...ship.cargo,
        [type]: ship.cargo[type] - actualRemoved,
      },
    },
    removed: actualRemoved,
  };
}

export function applyDamage(ship: Ship, damage: number): Ship {
  let remainingDamage = damage;
  let newShield = ship.shield;
  let newHull = ship.hull;
  
  if (ship.shieldActive && ship.shield > 0) {
    const shieldDamage = Math.min(remainingDamage, ship.shield);
    newShield = ship.shield - shieldDamage;
    remainingDamage -= shieldDamage;
  }
  
  newHull = Math.max(0, ship.hull - remainingDamage);
  
  return {
    ...ship,
    shield: newShield,
    hull: newHull,
  };
}

export function consumeFuel(ship: Ship, amount: number): Ship {
  return {
    ...ship,
    fuel: Math.max(0, ship.fuel - amount),
  };
}

export function refuel(ship: Ship, amount: number): Ship {
  return {
    ...ship,
    fuel: Math.min(ship.maxFuel, ship.fuel + amount),
  };
}

export function repairHull(ship: Ship, amount: number): Ship {
  return {
    ...ship,
    hull: Math.min(ship.maxHull, ship.hull + amount),
  };
}

export function activateShield(ship: Ship): { ship: Ship; success: boolean } {
  const now = Date.now();
  
  if (ship.shieldActive || ship.shieldCooldown > now || ship.fuel < 10) {
    return { ship, success: false };
  }
  
  return {
    ship: {
      ...ship,
      shieldActive: true,
      shield: getShieldForLevel(ship.parts.shield.level),
      shieldDuration: now + SHIELD_DURATION,
      fuel: ship.fuel - 10,
    },
    success: true,
  };
}

export function upgradePart(
  ship: Ship,
  part: 'engine' | 'cargo' | 'shield'
): { ship: Ship; success: boolean } {
  const shipPart = ship.parts[part];
  
  if (shipPart.level >= shipPart.maxLevel) {
    return { ship, success: false };
  }
  
  const newLevel = shipPart.level + 1;
  const newUpgradeCost = getUpgradeCost(part, newLevel);
  
  const updatedPart: ShipPart = {
    ...shipPart,
    level: newLevel,
    upgradeCost: newUpgradeCost,
  };
  
  let updatedShip = {
    ...ship,
    parts: {
      ...ship.parts,
      [part]: updatedPart,
    },
  };
  
  if (part === 'engine') {
    updatedShip.speed = getSpeedForLevel(newLevel);
  } else if (part === 'cargo') {
    updatedShip.cargoCapacity = getCargoCapacityForLevel(newLevel);
  } else if (part === 'shield') {
    updatedShip.maxShield = getShieldForLevel(newLevel);
    if (!updatedShip.shieldActive) {
      updatedShip.shield = 0;
    }
  }
  
  return { ship: updatedShip, success: true };
}

export function canUpgrade(
  ship: Ship,
  part: 'engine' | 'cargo' | 'shield',
  credits: number
): { canUpgrade: boolean; reason?: string } {
  const shipPart = ship.parts[part];
  const cost = shipPart.upgradeCost;
  
  if (shipPart.level >= shipPart.maxLevel) {
    return { canUpgrade: false, reason: '已达到最高等级' };
  }
  
  if (credits < cost.credits) {
    return { canUpgrade: false, reason: '金币不足' };
  }
  
  for (const [mineral, amount] of Object.entries(cost.minerals)) {
    if (ship.cargo[mineral as MineralType] < amount) {
      return { canUpgrade: false, reason: '矿物不足' };
    }
  }
  
  return { canUpgrade: true };
}

export { SHIELD_DURATION, SHIELD_COOLDOWN };
