export interface BuildingData {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
}

export interface CityParams {
  density: number;
  heightVariation: number;
  theme: 'sunset' | 'cyberpunk' | 'ice';
}

export class CityGenerator {
  private seed: number;

  constructor(seed: number = 42) {
    this.seed = seed;
  }

  private random(): number {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
    return (this.seed >>> 0) / 0xffffffff;
  }

  private randomRange(min: number, max: number): number {
    return min + this.random() * (max - min);
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(this.randomRange(min, max + 1));
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    return this.rgbToHex(
      this.lerp(c1.r, c2.r, t),
      this.lerp(c1.g, c2.g, t),
      this.lerp(c1.b, c2.b, t)
    );
  }

  private getColor(theme: 'sunset' | 'cyberpunk' | 'ice'): string {
    const t = this.random();
    switch (theme) {
      case 'sunset': {
        const palettes = [
          ['#FF6B35', '#D7263D'],
          ['#F7B267', '#A63C06'],
          ['#F7931E', '#8B2500'],
        ];
        const palette = palettes[this.randomInt(0, palettes.length - 1)];
        return this.lerpColor(palette[0], palette[1], t);
      }
      case 'cyberpunk': {
        const palettes = [
          ['#FF00FF', '#00FFFF'],
          ['#9D00FF', '#00C2FF'],
          ['#FF1493', '#7B68EE'],
        ];
        const palette = palettes[this.randomInt(0, palettes.length - 1)];
        return this.lerpColor(palette[0], palette[1], t);
      }
      case 'ice': {
        const palettes = [
          ['#FFFFFF', '#B0E0E6'],
          ['#E0FFFF', '#87CEEB'],
          ['#F0FFFF', '#ADD8E6'],
        ];
        const palette = palettes[this.randomInt(0, palettes.length - 1)];
        return this.lerpColor(palette[0], palette[1], t);
      }
    }
  }

  private checkOverlap(
    building: BuildingData,
    existingBuildings: BuildingData[]
  ): boolean {
    for (const existing of existingBuildings) {
      if (
        building.x < existing.x + existing.width &&
        building.x + building.width > existing.x &&
        building.z < existing.z + existing.depth &&
        building.z + building.depth > existing.z
      ) {
        return true;
      }
    }
    return false;
  }

  generate(params: CityParams): BuildingData[] {
    const buildings: BuildingData[] = [];

    const density = Math.max(0.2, Math.min(1.0, params.density));
    const heightVariation = Math.max(0.5, Math.min(2.0, params.heightVariation));

    const minCount = Math.max(30, Math.floor(150 * density));
    const maxCount = Math.max(minCount + 30, Math.floor(300 * density));
    const buildingCount = this.randomInt(minCount, maxCount);

    const gridSize = 10;
    const gridCols = Math.ceil(400 / gridSize);
    const gridRows = Math.ceil(400 / gridSize);
    const gridOccupied: boolean[][] = [];
    for (let i = 0; i < gridCols; i++) {
      gridOccupied[i] = [];
      for (let j = 0; j < gridRows; j++) {
        gridOccupied[i][j] = false;
      }
    }

    const checkGridOccupied = (
      startX: number,
      startZ: number,
      endX: number,
      endZ: number
    ): boolean => {
      const sx = Math.max(0, Math.floor(startX / gridSize));
      const sz = Math.max(0, Math.floor(startZ / gridSize));
      const ex = Math.min(gridCols - 1, Math.floor(endX / gridSize));
      const ez = Math.min(gridRows - 1, Math.floor(endZ / gridSize));
      for (let i = sx; i <= ex; i++) {
        for (let j = sz; j <= ez; j++) {
          if (gridOccupied[i][j]) return true;
        }
      }
      return false;
    };

    const markGridOccupied = (
      startX: number,
      startZ: number,
      endX: number,
      endZ: number
    ): void => {
      const sx = Math.max(0, Math.floor(startX / gridSize));
      const sz = Math.max(0, Math.floor(startZ / gridSize));
      const ex = Math.min(gridCols - 1, Math.floor(endX / gridSize));
      const ez = Math.min(gridRows - 1, Math.floor(endZ / gridSize));
      for (let i = sx; i <= ex; i++) {
        for (let j = sz; j <= ez; j++) {
          gridOccupied[i][j] = true;
        }
      }
    };

    let attempts = 0;
    const maxAttempts = buildingCount * 50;
    const margin = 2;

    while (buildings.length < buildingCount && attempts < maxAttempts) {
      attempts++;

      const width = this.randomRange(8, 20);
      const depth = this.randomRange(8, 20);
      const x = this.randomRange(0, 400 - width);
      const z = this.randomRange(0, 400 - depth);

      const minHeight = this.lerp(5, 40, heightVariation - 0.5);
      const maxHeight = this.lerp(40, 80, heightVariation - 0.5);
      const height = this.randomRange(minHeight, maxHeight);

      if (
        checkGridOccupied(
          x - margin,
          z - margin,
          x + width + margin,
          z + depth + margin
        )
      ) {
        continue;
      }

      const building: BuildingData = {
        x,
        z,
        width,
        depth,
        height,
        color: this.getColor(params.theme),
      };

      const expandedBuilding = {
        ...building,
        x: building.x - margin,
        z: building.z - margin,
        width: building.width + 2 * margin,
        depth: building.depth + 2 * margin,
      };
      if (this.checkOverlap(expandedBuilding, buildings)) {
        continue;
      }

      markGridOccupied(x, z, x + width, z + depth);
      buildings.push(building);
    }

    return buildings;
  }
}
