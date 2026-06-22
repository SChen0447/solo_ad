export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type PlantCategory = 'tree' | 'shrub' | 'flower';

export interface SeasonAppearance {
  color: [number, number, number, number];
  heightScale: number;
  foliageScale: number;
}

export interface PlantData {
  id: string;
  name: string;
  category: PlantCategory;
  climate: string;
  seasons: Record<Season, SeasonAppearance>;
  heightRange: [number, number];
  crownRange: [number, number];
  bloomMonths: number[];
}

const plantDatabase: PlantData[] = [
  {
    id: 'oak',
    name: '橡树',
    category: 'tree',
    climate: '温带',
    seasons: {
      spring: { color: [0.486, 0.702, 0.259, 1], heightScale: 0.9, foliageScale: 0.85 },
      summer: { color: [0.180, 0.490, 0.196, 1], heightScale: 1.0, foliageScale: 1.0 },
      autumn: { color: [0.902, 0.318, 0.0, 1], heightScale: 1.0, foliageScale: 0.7 },
      winter: { color: [0.365, 0.251, 0.216, 1], heightScale: 1.0, foliageScale: 0.15 },
    },
    heightRange: [3, 5],
    crownRange: [2.5, 4],
    bloomMonths: [4, 5],
  },
  {
    id: 'maple',
    name: '枫树',
    category: 'tree',
    climate: '温带',
    seasons: {
      spring: { color: [0.486, 0.702, 0.259, 1], heightScale: 0.85, foliageScale: 0.8 },
      summer: { color: [0.180, 0.490, 0.196, 1], heightScale: 1.0, foliageScale: 1.0 },
      autumn: { color: [0.902, 0.318, 0.0, 1], heightScale: 1.0, foliageScale: 0.85 },
      winter: { color: [0.365, 0.251, 0.216, 1], heightScale: 1.0, foliageScale: 0.1 },
    },
    heightRange: [3, 5],
    crownRange: [2, 3.5],
    bloomMonths: [4, 5],
  },
  {
    id: 'pine',
    name: '松树',
    category: 'tree',
    climate: '温带/寒带',
    seasons: {
      spring: { color: [0.300, 0.580, 0.280, 1], heightScale: 0.95, foliageScale: 0.9 },
      summer: { color: [0.150, 0.420, 0.180, 1], heightScale: 1.0, foliageScale: 1.0 },
      autumn: { color: [0.250, 0.400, 0.200, 1], heightScale: 1.0, foliageScale: 0.95 },
      winter: { color: [0.200, 0.350, 0.220, 1], heightScale: 1.0, foliageScale: 0.9 },
    },
    heightRange: [4, 6],
    crownRange: [1.5, 2.5],
    bloomMonths: [],
  },
  {
    id: 'cherry',
    name: '樱花树',
    category: 'tree',
    climate: '温带',
    seasons: {
      spring: { color: [1.0, 0.757, 0.800, 1], heightScale: 0.9, foliageScale: 0.85 },
      summer: { color: [0.180, 0.490, 0.196, 1], heightScale: 1.0, foliageScale: 1.0 },
      autumn: { color: [0.824, 0.420, 0.118, 1], heightScale: 1.0, foliageScale: 0.7 },
      winter: { color: [0.365, 0.251, 0.216, 1], heightScale: 1.0, foliageScale: 0.1 },
    },
    heightRange: [2.5, 4],
    crownRange: [2, 3],
    bloomMonths: [3, 4],
  },
  {
    id: 'birch',
    name: '白桦树',
    category: 'tree',
    climate: '温带/寒带',
    seasons: {
      spring: { color: [0.580, 0.780, 0.320, 1], heightScale: 0.9, foliageScale: 0.8 },
      summer: { color: [0.250, 0.550, 0.220, 1], heightScale: 1.0, foliageScale: 1.0 },
      autumn: { color: [0.850, 0.680, 0.150, 1], heightScale: 1.0, foliageScale: 0.65 },
      winter: { color: [0.365, 0.251, 0.216, 1], heightScale: 1.0, foliageScale: 0.05 },
    },
    heightRange: [3, 5],
    crownRange: [1.5, 2.5],
    bloomMonths: [4, 5],
  },
  {
    id: 'boxwood',
    name: '黄杨',
    category: 'shrub',
    climate: '温带',
    seasons: {
      spring: { color: [0.486, 0.702, 0.259, 1], heightScale: 0.9, foliageScale: 0.85 },
      summer: { color: [0.220, 0.520, 0.200, 1], heightScale: 1.0, foliageScale: 1.0 },
      autumn: { color: [0.500, 0.580, 0.200, 1], heightScale: 1.0, foliageScale: 0.9 },
      winter: { color: [0.280, 0.380, 0.220, 1], heightScale: 1.0, foliageScale: 0.8 },
    },
    heightRange: [0.5, 1.5],
    crownRange: [0.8, 1.5],
    bloomMonths: [4, 5],
  },
  {
    id: 'lavender',
    name: '薰衣草',
    category: 'shrub',
    climate: '温带/地中海',
    seasons: {
      spring: { color: [0.580, 0.450, 0.700, 1], heightScale: 0.7, foliageScale: 0.7 },
      summer: { color: [0.480, 0.320, 0.650, 1], heightScale: 1.0, foliageScale: 1.0 },
      autumn: { color: [0.400, 0.320, 0.500, 1], heightScale: 0.9, foliageScale: 0.75 },
      winter: { color: [0.300, 0.280, 0.350, 1], heightScale: 0.7, foliageScale: 0.4 },
    },
    heightRange: [0.3, 0.8],
    crownRange: [0.4, 0.8],
    bloomMonths: [6, 7, 8],
  },
  {
    id: 'hydrangea',
    name: '绣球花',
    category: 'shrub',
    climate: '温带',
    seasons: {
      spring: { color: [0.486, 0.702, 0.259, 1], heightScale: 0.8, foliageScale: 0.7 },
      summer: { color: [0.400, 0.550, 0.850, 1], heightScale: 1.0, foliageScale: 1.0 },
      autumn: { color: [0.600, 0.350, 0.300, 1], heightScale: 0.95, foliageScale: 0.8 },
      winter: { color: [0.365, 0.251, 0.216, 1], heightScale: 0.8, foliageScale: 0.2 },
    },
    heightRange: [0.8, 1.5],
    crownRange: [1, 1.8],
    bloomMonths: [6, 7, 8],
  },
  {
    id: 'forsythia',
    name: '连翘',
    category: 'shrub',
    climate: '温带',
    seasons: {
      spring: { color: [1.0, 0.843, 0.0, 1], heightScale: 0.85, foliageScale: 0.6 },
      summer: { color: [0.220, 0.520, 0.200, 1], heightScale: 1.0, foliageScale: 1.0 },
      autumn: { color: [0.700, 0.450, 0.150, 1], heightScale: 1.0, foliageScale: 0.75 },
      winter: { color: [0.365, 0.251, 0.216, 1], heightScale: 0.9, foliageScale: 0.1 },
    },
    heightRange: [0.8, 2],
    crownRange: [1, 2],
    bloomMonths: [3, 4],
  },
  {
    id: 'rhododendron',
    name: '杜鹃',
    category: 'shrub',
    climate: '温带/亚热带',
    seasons: {
      spring: { color: [0.900, 0.250, 0.350, 1], heightScale: 0.85, foliageScale: 0.8 },
      summer: { color: [0.200, 0.480, 0.200, 1], heightScale: 1.0, foliageScale: 1.0 },
      autumn: { color: [0.500, 0.400, 0.200, 1], heightScale: 1.0, foliageScale: 0.85 },
      winter: { color: [0.280, 0.350, 0.220, 1], heightScale: 0.9, foliageScale: 0.6 },
    },
    heightRange: [0.5, 1.5],
    crownRange: [0.8, 1.5],
    bloomMonths: [4, 5],
  },
  {
    id: 'rose',
    name: '玫瑰',
    category: 'flower',
    climate: '温带',
    seasons: {
      spring: { color: [0.900, 0.250, 0.350, 1], heightScale: 0.6, foliageScale: 0.6 },
      summer: { color: [0.850, 0.150, 0.250, 1], heightScale: 1.0, foliageScale: 1.0 },
      autumn: { color: [0.650, 0.200, 0.250, 1], heightScale: 0.8, foliageScale: 0.6 },
      winter: { color: [0.365, 0.251, 0.216, 1], heightScale: 0.3, foliageScale: 0.1 },
    },
    heightRange: [0.3, 0.8],
    crownRange: [0.3, 0.6],
    bloomMonths: [5, 6, 7, 8, 9],
  },
  {
    id: 'sunflower',
    name: '向日葵',
    category: 'flower',
    climate: '温带',
    seasons: {
      spring: { color: [0.486, 0.702, 0.259, 1], heightScale: 0.5, foliageScale: 0.5 },
      summer: { color: [1.0, 0.843, 0.0, 1], heightScale: 1.0, foliageScale: 1.0 },
      autumn: { color: [0.750, 0.550, 0.0, 1], heightScale: 0.8, foliageScale: 0.6 },
      winter: { color: [0.365, 0.251, 0.216, 1], heightScale: 0.1, foliageScale: 0.0 },
    },
    heightRange: [0.5, 1.5],
    crownRange: [0.2, 0.5],
    bloomMonths: [7, 8],
  },
  {
    id: 'tulip',
    name: '郁金香',
    category: 'flower',
    climate: '温带',
    seasons: {
      spring: { color: [0.900, 0.200, 0.400, 1], heightScale: 1.0, foliageScale: 1.0 },
      summer: { color: [0.486, 0.702, 0.259, 1], heightScale: 0.4, foliageScale: 0.3 },
      autumn: { color: [0.365, 0.251, 0.216, 1], heightScale: 0.1, foliageScale: 0.0 },
      winter: { color: [0.365, 0.251, 0.216, 1], heightScale: 0.0, foliageScale: 0.0 },
    },
    heightRange: [0.2, 0.5],
    crownRange: [0.1, 0.25],
    bloomMonths: [3, 4, 5],
  },
  {
    id: 'daisy',
    name: '雏菊',
    category: 'flower',
    climate: '温带',
    seasons: {
      spring: { color: [1.0, 1.0, 0.900, 1], heightScale: 0.8, foliageScale: 0.8 },
      summer: { color: [1.0, 1.0, 0.850, 1], heightScale: 1.0, foliageScale: 1.0 },
      autumn: { color: [0.800, 0.750, 0.500, 1], heightScale: 0.6, foliageScale: 0.5 },
      winter: { color: [0.365, 0.251, 0.216, 1], heightScale: 0.1, foliageScale: 0.0 },
    },
    heightRange: [0.15, 0.4],
    crownRange: [0.1, 0.2],
    bloomMonths: [5, 6, 7, 8, 9],
  },
  {
    id: 'peony',
    name: '牡丹',
    category: 'flower',
    climate: '温带',
    seasons: {
      spring: { color: [0.900, 0.300, 0.450, 1], heightScale: 0.8, foliageScale: 0.75 },
      summer: { color: [0.850, 0.250, 0.400, 1], heightScale: 1.0, foliageScale: 1.0 },
      autumn: { color: [0.500, 0.350, 0.250, 1], heightScale: 0.6, foliageScale: 0.4 },
      winter: { color: [0.365, 0.251, 0.216, 1], heightScale: 0.0, foliageScale: 0.0 },
    },
    heightRange: [0.4, 1],
    crownRange: [0.3, 0.6],
    bloomMonths: [4, 5, 6],
  },
];

export function getPlantsByCategory(category: PlantCategory): PlantData[] {
  return plantDatabase.filter((p) => p.category === category);
}

export function getPlantById(id: string): PlantData | undefined {
  return plantDatabase.find((p) => p.id === id);
}

export function filterPlants(predicate: (p: PlantData) => boolean): PlantData[] {
  return plantDatabase.filter(predicate);
}

export function getAllPlants(): PlantData[] {
  return plantDatabase;
}

export function getCategories(): PlantCategory[] {
  return ['tree', 'shrub', 'flower'];
}

export const SEASON_LIGHT_COLORS: Record<Season, [number, number, number]> = {
  spring: [1.0, 0.95, 0.8],
  summer: [1.0, 1.0, 0.95],
  autumn: [1.0, 0.85, 0.7],
  winter: [0.75, 0.82, 1.0],
};

export const SEASON_AMBIENT_INTENSITY: Record<Season, number> = {
  spring: 0.6,
  summer: 0.7,
  autumn: 0.5,
  winter: 0.4,
};
