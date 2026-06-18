export interface MushroomSpecies {
  id: number;
  name: string;
  color1: string;
  color2: string;
  glowColor: string;
  optimalTemp: [number, number];
  optimalHumidity: [number, number];
  optimalLight: [number, number];
  growthDuration: number;
  competitiveness: number;
}

export const SPECIES: MushroomSpecies[] = [
  { id: 0, name: '红伞菇', color1: '#c0392b', color2: '#e74c3c', glowColor: 'rgba(231,76,60,0.3)', optimalTemp: [20, 30], optimalHumidity: [50, 70], optimalLight: [20, 50], growthDuration: 60, competitiveness: 7 },
  { id: 1, name: '荧光菇', color1: '#1abc9c', color2: '#2ecc71', glowColor: 'rgba(46,204,113,0.3)', optimalTemp: [15, 25], optimalHumidity: [60, 80], optimalLight: [0, 20], growthDuration: 50, competitiveness: 5 },
  { id: 2, name: '鬼笔菇', color1: '#8e44ad', color2: '#9b59b6', glowColor: 'rgba(155,89,182,0.3)', optimalTemp: [25, 35], optimalHumidity: [70, 90], optimalLight: [10, 30], growthDuration: 70, competitiveness: 8 },
  { id: 3, name: '松茸菇', color1: '#d35400', color2: '#e67e22', glowColor: 'rgba(230,126,34,0.3)', optimalTemp: [18, 24], optimalHumidity: [50, 65], optimalLight: [30, 60], growthDuration: 90, competitiveness: 6 },
  { id: 4, name: '灵芝菇', color1: '#922b21', color2: '#cb4335', glowColor: 'rgba(203,67,53,0.3)', optimalTemp: [22, 32], optimalHumidity: [55, 75], optimalLight: [15, 40], growthDuration: 120, competitiveness: 9 },
  { id: 5, name: '鸡枞菇', color1: '#bdc3c7', color2: '#ecf0f1', glowColor: 'rgba(236,240,241,0.3)', optimalTemp: [24, 30], optimalHumidity: [65, 85], optimalLight: [5, 25], growthDuration: 55, competitiveness: 4 },
  { id: 6, name: '牛肝菇', color1: '#795548', color2: '#a1887f', glowColor: 'rgba(161,136,127,0.3)', optimalTemp: [16, 26], optimalHumidity: [45, 65], optimalLight: [25, 55], growthDuration: 65, competitiveness: 6 },
  { id: 7, name: '竹荪菇', color1: '#f5f5dc', color2: '#fffacd', glowColor: 'rgba(255,250,205,0.3)', optimalTemp: [20, 28], optimalHumidity: [60, 80], optimalLight: [10, 35], growthDuration: 80, competitiveness: 5 },
];

export const SYMBIOSIS_COMBOS = [
  { species: [0, 1, 2], bonus: 0.2, spreadBonus: 0.1 },
];

export type GrowthStage = 0 | 1 | 2 | 3;

export const GROWTH_STAGE_NAMES = ['孢子期', '幼体期', '成熟期', '衰败期'] as const;

export interface GridCellData {
  speciesId: number | null;
  growthStage: GrowthStage;
  colonyId: number | null;
  lastCollected: number;
  growthProgress: number;
}

export interface ColonyData {
  id: number;
  speciesId: number;
  cells: { x: number; y: number }[];
  hasSymbiosis: boolean;
}

export interface CultivationSlot {
  speciesId: number | null;
  startTime: number | null;
  growthProgress: number;
  isComplete: boolean;
}

export interface InventorySlot {
  speciesId: number;
  count: number;
}

export interface PlayerPosition {
  x: number;
  y: number;
}
