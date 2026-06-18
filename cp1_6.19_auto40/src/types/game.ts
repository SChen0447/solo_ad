export type MineralType = 'iron' | 'copper' | 'titaniumIce';

export type TerrainType = 'mountain' | 'plain' | 'iceField';

export type EventType = 'pirate' | 'meteor' | 'trader';

export interface MineralVein {
  id: string;
  type: MineralType;
  x: number;
  y: number;
  amount: number;
  maxAmount: number;
  respawnTime: number;
}

export interface Planet {
  id: string;
  name: string;
  terrain: TerrainType;
  veins: MineralVein[];
  weather: string;
  width: number;
  height: number;
}

export interface ShipPart {
  level: number;
  maxLevel: number;
  upgradeCost: { minerals: Record<MineralType, number>; credits: number };
}

export interface Ship {
  x: number;
  y: number;
  speed: number;
  hull: number;
  maxHull: number;
  fuel: number;
  maxFuel: number;
  shield: number;
  maxShield: number;
  shieldActive: boolean;
  shieldCooldown: number;
  shieldDuration: number;
  cargo: Record<MineralType, number>;
  cargoCapacity: number;
  parts: {
    engine: ShipPart;
    cargo: ShipPart;
    shield: ShipPart;
  };
}

export interface TradeRecord {
  mineralType: MineralType;
  sellCount: number;
  basePrice: number;
  currentPriceMultiplier: number;
}

export interface EventOption {
  id: string;
  label: string;
  action: () => void;
}

export interface GameEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  options: EventOption[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
}

export interface GameState {
  planet: Planet | null;
  ship: Ship;
  credits: number;
  tradeRecords: TradeRecord[];
  currentEvent: GameEvent | null;
  showTradeModal: boolean;
  showUpgradeModal: boolean;
  travelTime: number;
  isPaused: boolean;
  isAtStation: boolean;
  particles: Particle[];
  stars: Star[];
  miningTarget: MineralVein | null;
  message: string | null;
}

export interface GameActions {
  setPlanet: (planet: Planet | null) => void;
  updateShip: (ship: Partial<Ship>) => void;
  addCargo: (type: MineralType, amount: number) => void;
  removeCargo: (type: MineralType, amount: number) => void;
  updateCredits: (amount: number) => void;
  updateTradeRecords: (records: TradeRecord[]) => void;
  setCurrentEvent: (event: GameEvent | null) => void;
  setShowTradeModal: (show: boolean) => void;
  setShowUpgradeModal: (show: boolean) => void;
  setTravelTime: (time: number) => void;
  setIsPaused: (paused: boolean) => void;
  setIsAtStation: (atStation: boolean) => void;
  addParticle: (particle: Particle) => void;
  removeParticle: (id: number) => void;
  updateParticles: (particles: Particle[]) => void;
  setMiningTarget: (vein: MineralVein | null) => void;
  setMessage: (message: string | null) => void;
  updateVein: (veinId: string, updates: Partial<MineralVein>) => void;
  activateShield: () => void;
  upgradePart: (part: 'engine' | 'cargo' | 'shield') => void;
  moveShip: (targetX: number, targetY: number, deltaTime: number) => void;
  consumeFuel: (amount: number) => void;
  applyDamage: (damage: number) => void;
  mineNearestVein: () => void;
  travelToStation: () => void;
  travelToNewPlanet: () => void;
  sellMineral: (type: MineralType, amount: number) => void;
  triggerRandomEvent: () => void;
  handleEventOption: (optionId: string) => void;
  loadGame: () => void;
  saveGame: () => void;
  resetGame: () => void;
}

export const MINERAL_COLORS: Record<MineralType, string> = {
  iron: '#ff4444',
  copper: '#ffaa00',
  titaniumIce: '#00ccff',
};

export const MINERAL_NAMES: Record<MineralType, string> = {
  iron: '铁矿',
  copper: '铜矿',
  titaniumIce: '钛冰',
};

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  mountain: '#2c3e50',
  plain: '#d4a76a',
  iceField: '#e0f7fa',
};

export const TERRAIN_NAMES: Record<TerrainType, string> = {
  mountain: '山脉',
  plain: '平原',
  iceField: '冰原',
};

export const WEATHER_TYPES = ['晴朗', '多云', '风暴', '沙尘', '极光'];

export const PLANET_NAMES = [
  '赤焰星', '寒冰星', '矿脉星', '风暴星', '幽暗星',
  '曙光星', '深渊星', '翡翠星', '琥珀星', '钛晶星',
];
