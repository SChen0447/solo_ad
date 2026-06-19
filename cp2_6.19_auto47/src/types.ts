export type BuildingType = 'fishery' | 'hotel' | 'restaurant' | 'lighthouse' | 'garden';

export interface BuildingConfig {
  type: BuildingType;
  name: string;
  color: string;
  baseCoinPerMin: number;
  maxCoinPerMin: number;
  baseVisitorCap: number;
  maxVisitorCap: number;
  icon: string;
}

export interface Building {
  id: number;
  type: BuildingType;
  gridX: number;
  gridY: number;
  level: number;
  scale: number;
  shakeOffset: { x: number; y: number };
  isPlacing: boolean;
  placeTimer: number;
  upgrading: boolean;
  upgradeProgress: number;
  dragOffsetX: number;
  dragOffsetY: number;
  isDragging: boolean;
  lastCoinTime: number;
}

export type VisitorColor = 'red' | 'yellow' | 'blue' | 'green';

export interface Visitor {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: VisitorColor;
  bobOffset: number;
  bobTimer: number;
  state: 'walking' | 'consuming' | 'leaving';
  currentTargetBuilding: number | null;
  pathIndex: number;
  path: Array<{ x: number; y: number }>;
  consumeTimer: number;
  showingCoin: boolean;
  coinScale: number;
  coinTimer: number;
}

export interface Transaction {
  id: number;
  amount: number;
  source: string;
  timestamp: number;
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

export interface GameStats {
  todayVisitors: number;
  totalIncome: number;
  buildingIncome: Record<BuildingType, number>;
  recentTransactions: Transaction[];
}

export const BUILDING_CONFIGS: Record<BuildingType, BuildingConfig> = {
  fishery: {
    type: 'fishery',
    name: '渔屋',
    color: '#4A90A4',
    baseCoinPerMin: 5,
    maxCoinPerMin: 25,
    baseVisitorCap: 0,
    maxVisitorCap: 0,
    icon: '🐟'
  },
  hotel: {
    type: 'hotel',
    name: '旅馆',
    color: '#D4A574',
    baseCoinPerMin: 3,
    maxCoinPerMin: 15,
    baseVisitorCap: 3,
    maxVisitorCap: 15,
    icon: '🏠'
  },
  restaurant: {
    type: 'restaurant',
    name: '餐厅',
    color: '#E74C3C',
    baseCoinPerMin: 8,
    maxCoinPerMin: 40,
    baseVisitorCap: 0,
    maxVisitorCap: 0,
    icon: '🍽️'
  },
  lighthouse: {
    type: 'lighthouse',
    name: '灯塔',
    color: '#F39C12',
    baseCoinPerMin: 10,
    maxCoinPerMin: 50,
    baseVisitorCap: 0,
    maxVisitorCap: 0,
    icon: '🗼'
  },
  garden: {
    type: 'garden',
    name: '花圃',
    color: '#E91E63',
    baseCoinPerMin: 6,
    maxCoinPerMin: 30,
    baseVisitorCap: 0,
    maxVisitorCap: 0,
    icon: '🌸'
  }
};

export const GRID_SIZE = 20;
