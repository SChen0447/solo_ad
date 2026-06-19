export enum ShipType {
  Frigate = 'frigate',
  Destroyer = 'destroyer',
  Cruiser = 'cruiser',
  Battleship = 'battleship',
  Carrier = 'carrier'
}

export interface ShipStats {
  hp: number;
  shield: number;
  shieldRegen: number;
  attack: number;
  range: number;
  fireRate: number;
  speed: number;
  turnRate: number;
  size: number;
  projectileSpeed: number;
  color: string;
  accentColor: string;
}

export interface ShipPreset {
  type: ShipType;
  name: string;
  description: string;
  cost: number;
  stats: ShipStats;
}

export interface PlacedShip {
  id: string;
  type: ShipType;
  gridX: number;
  gridY: number;
  facing: number;
  stats: ShipStats;
  name: string;
}

export const SHIP_PRESETS: Record<ShipType, ShipPreset> = {
  [ShipType.Frigate]: {
    type: ShipType.Frigate,
    name: '护卫舰',
    description: '快速机动，低伤害高闪避',
    cost: 100,
    stats: {
      hp: 300,
      shield: 150,
      shieldRegen: 2,
      attack: 18,
      range: 220,
      fireRate: 0.35,
      speed: 95,
      turnRate: 2.2,
      size: 14,
      projectileSpeed: 420,
      color: '#5ad1ff',
      accentColor: '#a8e6ff'
    }
  },
  [ShipType.Destroyer]: {
    type: ShipType.Destroyer,
    name: '驱逐舰',
    description: '均衡型，攻守兼备',
    cost: 220,
    stats: {
      hp: 650,
      shield: 320,
      shieldRegen: 3,
      attack: 38,
      range: 280,
      fireRate: 0.55,
      speed: 68,
      turnRate: 1.4,
      size: 20,
      projectileSpeed: 380,
      color: '#7aff9a',
      accentColor: '#bfffc9'
    }
  },
  [ShipType.Cruiser]: {
    type: ShipType.Cruiser,
    name: '巡洋舰',
    description: '高火力，中程压制',
    cost: 400,
    stats: {
      hp: 1200,
      shield: 600,
      shieldRegen: 4.5,
      attack: 72,
      range: 340,
      fireRate: 0.8,
      speed: 50,
      turnRate: 0.9,
      size: 28,
      projectileSpeed: 360,
      color: '#ffd166',
      accentColor: '#ffe8a8'
    }
  },
  [ShipType.Battleship]: {
    type: ShipType.Battleship,
    name: '战列舰',
    description: '超厚装甲，巨炮火力',
    cost: 700,
    stats: {
      hp: 2600,
      shield: 1200,
      shieldRegen: 6,
      attack: 160,
      range: 420,
      fireRate: 1.6,
      speed: 30,
      turnRate: 0.45,
      size: 40,
      projectileSpeed: 340,
      color: '#ff8a5a',
      accentColor: '#ffc2a8'
    }
  },
  [ShipType.Carrier]: {
    type: ShipType.Carrier,
    name: '航母',
    description: '舰载机远程打击',
    cost: 900,
    stats: {
      hp: 2200,
      shield: 900,
      shieldRegen: 5,
      attack: 110,
      range: 520,
      fireRate: 2.2,
      speed: 22,
      turnRate: 0.3,
      size: 48,
      projectileSpeed: 260,
      color: '#ff6ea6',
      accentColor: '#ffb0ce'
    }
  }
};

export function getShipPreset(type: ShipType): ShipPreset {
  return SHIP_PRESETS[type];
}

export const SHIP_TYPE_LIST: ShipType[] = [
  ShipType.Frigate,
  ShipType.Destroyer,
  ShipType.Cruiser,
  ShipType.Battleship,
  ShipType.Carrier
];

export const MAX_FLEET_SIZE = 8;
