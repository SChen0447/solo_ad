export type ColorTheme = 'sunset' | 'cyberpunk' | 'ice';

export interface Building {
  id: number;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: number;
  emissiveColor: number;
  hasLight: boolean;
  lightPhase: number;
  lightFrequency: number;
}

export interface CityParams {
  density: number;
  heightVariation: number;
  colorTheme: ColorTheme;
}

const GRID_SIZE = 400;
const MIN_BASE_SIZE = 8;
const MAX_BASE_SIZE = 20;
const MIN_HEIGHT = 5;
const MAX_HEIGHT = 80;
const MIN_BUILDINGS = 150;
const MAX_BUILDINGS = 300;

const THEME_PALETTES: Record<ColorTheme, { buildings: number[]; emissive: number[] }> = {
  sunset: {
    buildings: [0x8B4513, 0xCD853F, 0xD2691E, 0xA0522D, 0xBC8F8F, 0xDB7093, 0xCD5C5C, 0xB22222],
    emissive: [0xFFD700, 0xFFA500, 0xFF6347, 0xFF8C00, 0xFFE4B5, 0xFFDAB9]
  },
  cyberpunk: {
    buildings: [0x1a1a2e, 0x16213e, 0x0f3460, 0x2d132c, 0x1a1a1a, 0x2c003e, 0x0d2b45, 0x1f0033],
    emissive: [0xFF00FF, 0x00FFFF, 0xFF0080, 0x8000FF, 0x00FF80, 0xFFFF00]
  },
  ice: {
    buildings: [0xE0FFFF, 0xB0E0E6, 0xADD8E6, 0x87CEEB, 0xAFEEEE, 0x87CEFA, 0x98D8C8, 0x9FE2BF],
    emissive: [0xFFFFFF, 0xE0FFFF, 0xB0E0E6, 0xADD8E6, 0x87CEEB, 0xF0FFFF]
  }
};

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function checkOverlap(
  x: number, z: number, w: number, d: number,
  existing: Building[], padding: number = 2
): boolean {
  const halfW = w / 2 + padding;
  const halfD = d / 2 + padding;

  for (const b of existing) {
    const bHalfW = b.width / 2;
    const bHalfD = b.depth / 2;
    if (
      x - halfW < b.x + bHalfW &&
      x + halfW > b.x - bHalfW &&
      z - halfD < b.z + bHalfD &&
      z + halfD > b.z - bHalfD
    ) {
      return true;
    }
  }
  return false;
}

export class CityGenerator {
  private buildings: Building[] = [];

  public generate(params: CityParams): Building[] {
    this.buildings = [];
    const palette = THEME_PALETTES[params.colorTheme];

    const buildingCount = Math.floor(
      lerp(MIN_BUILDINGS, MAX_BUILDINGS, params.density)
    );

    const maxAttempts = buildingCount * 20;
    let attempts = 0;
    let placed = 0;

    while (placed < buildingCount && attempts < maxAttempts) {
      attempts++;

      const width = randomRange(MIN_BASE_SIZE, MAX_BASE_SIZE);
      const depth = randomRange(MIN_BASE_SIZE, MAX_BASE_SIZE);
      const halfGrid = GRID_SIZE / 2 - MAX_BASE_SIZE;

      const x = randomRange(-halfGrid, halfGrid);
      const z = randomRange(-halfGrid, halfGrid);

      if (checkOverlap(x, z, width, depth, this.buildings)) {
        continue;
      }

      const heightT = Math.pow(Math.random(), 1 / params.heightVariation);
      const height = lerp(MIN_HEIGHT, MAX_HEIGHT, heightT);

      const colorIdx = randomInt(0, palette.buildings.length - 1);
      const color = palette.buildings[colorIdx];

      const hasLight = params.colorTheme === 'cyberpunk' || Math.random() < 0.3;
      const emissiveIdx = randomInt(0, palette.emissive.length - 1);
      const emissiveColor = palette.emissive[emissiveIdx];

      const building: Building = {
        id: placed,
        x,
        z,
        width,
        depth,
        height,
        color,
        emissiveColor,
        hasLight,
        lightPhase: Math.random() * Math.PI * 2,
        lightFrequency: randomRange((Math.PI * 2) / 3, (Math.PI * 2) / 1.5)
      };

      this.buildings.push(building);
      placed++;
    }

    return this.buildings;
  }

  public getBuildings(): Building[] {
    return this.buildings;
  }

  public getStats() {
    if (this.buildings.length === 0) {
      return { count: 0, maxHeight: 0, avgHeight: 0, heightDistribution: [0, 0, 0, 0, 0] };
    }

    const heights = this.buildings.map(b => b.height);
    const maxHeight = Math.max(...heights);
    const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;

    const bins = 5;
    const distribution = new Array(bins).fill(0);
    const binSize = MAX_HEIGHT / bins;

    for (const h of heights) {
      const binIdx = Math.min(Math.floor(h / binSize), bins - 1);
      distribution[binIdx]++;
    }

    return {
      count: this.buildings.length,
      maxHeight,
      avgHeight,
      heightDistribution: distribution
    };
  }

  public getThemeColors(theme: ColorTheme) {
    const palette = THEME_PALETTES[theme];
    return {
      primary: palette.buildings[0],
      secondary: palette.buildings[palette.buildings.length - 1],
      accent: palette.emissive[0],
      chartColors: palette.buildings.slice(0, 5)
    };
  }
}
