import { v4 as uuidv4 } from 'uuid';
import type { Planet, MineralVein, TerrainType, MineralType } from '@/types/game';
import { PLANET_NAMES, WEATHER_TYPES } from '@/types/game';

const PLANET_WIDTH = 1200;
const PLANET_HEIGHT = 700;
const VEIN_COUNT_MIN = 3;
const VEIN_COUNT_MAX = 5;
const VEIN_AMOUNT_MIN = 50;
const VEIN_AMOUNT_MAX = 150;
const VEIN_RESPAWN_TIME = 30000;
const MINING_RADIUS = 50;

const TERRAIN_MINERAL_BIAS: Record<TerrainType, Record<MineralType, number>> = {
  mountain: { iron: 0.6, copper: 0.3, titaniumIce: 0.1 },
  plain: { iron: 0.2, copper: 0.6, titaniumIce: 0.2 },
  iceField: { iron: 0.1, copper: 0.2, titaniumIce: 0.7 },
};

function getRandomTerrain(): TerrainType {
  const terrains: TerrainType[] = ['mountain', 'plain', 'iceField'];
  return terrains[Math.floor(Math.random() * terrains.length)];
}

function getRandomPlanetName(): string {
  return PLANET_NAMES[Math.floor(Math.random() * PLANET_NAMES.length)];
}

function getRandomWeather(): string {
  return WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getMineralTypeForTerrain(terrain: TerrainType): MineralType {
  const bias = TERRAIN_MINERAL_BIAS[terrain];
  const rand = Math.random();
  let cumulative = 0;
  
  for (const [type, probability] of Object.entries(bias)) {
    cumulative += probability;
    if (rand < cumulative) {
      return type as MineralType;
    }
  }
  
  return 'iron';
}

function generateVein(terrain: TerrainType, planetWidth: number, planetHeight: number): MineralVein {
  const type = getMineralTypeForTerrain(terrain);
  const maxAmount = getRandomInt(VEIN_AMOUNT_MIN, VEIN_AMOUNT_MAX);
  
  return {
    id: uuidv4(),
    type,
    x: getRandomInt(100, planetWidth - 100),
    y: getRandomInt(150, planetHeight - 100),
    amount: maxAmount,
    maxAmount,
    respawnTime: 0,
  };
}

export function generatePlanet(): Planet {
  const terrain = getRandomTerrain();
  const veinCount = getRandomInt(VEIN_COUNT_MIN, VEIN_COUNT_MAX);
  const veins: MineralVein[] = [];
  
  for (let i = 0; i < veinCount; i++) {
    veins.push(generateVein(terrain, PLANET_WIDTH, PLANET_HEIGHT));
  }
  
  return {
    id: uuidv4(),
    name: getRandomPlanetName(),
    terrain,
    veins,
    weather: getRandomWeather(),
    width: PLANET_WIDTH,
    height: PLANET_HEIGHT,
  };
}

export function refreshVeins(planet: Planet): MineralVein[] {
  const now = Date.now();
  return planet.veins.map(vein => {
    if (vein.amount <= 0 && vein.respawnTime > 0 && now >= vein.respawnTime) {
      return {
        ...vein,
        amount: vein.maxAmount,
        respawnTime: 0,
      };
    }
    return vein;
  });
}

export function getNearestVein(
  planet: Planet,
  shipX: number,
  shipY: number
): MineralVein | null {
  const activeVeins = planet.veins.filter(v => v.amount > 0);
  if (activeVeins.length === 0) return null;
  
  let nearest: MineralVein | null = null;
  let minDistance = Infinity;
  
  for (const vein of activeVeins) {
    const distance = Math.sqrt(
      Math.pow(vein.x - shipX, 2) + Math.pow(vein.y - shipY, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearest = vein;
    }
  }
  
  return minDistance <= MINING_RADIUS * 2 ? nearest : null;
}

export function mineVein(
  vein: MineralVein,
  amount: number
): { success: boolean; mined: number; updatedVein: MineralVein } {
  if (vein.amount <= 0) {
    return { success: false, mined: 0, updatedVein: vein };
  }
  
  const actualMined = Math.min(amount, vein.amount);
  const newAmount = vein.amount - actualMined;
  
  const updatedVein: MineralVein = {
    ...vein,
    amount: newAmount,
    respawnTime: newAmount <= 0 ? Date.now() + VEIN_RESPAWN_TIME : 0,
  };
  
  return { success: true, mined: actualMined, updatedVein };
}

export function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

export function isInMiningRange(
  shipX: number,
  shipY: number,
  veinX: number,
  veinY: number
): boolean {
  return getDistance(shipX, shipY, veinX, veinY) <= MINING_RADIUS;
}

export { MINING_RADIUS, PLANET_WIDTH, PLANET_HEIGHT };
