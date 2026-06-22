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

    const buildingCount = this.randomInt(
      Math.floor(150 * density),
      Math.floor(300 * density)
    );

    const gridSize = 20;
    const gridCells = new Set<string>();

    let attempts = 0;
    const maxAttempts = buildingCount * 10;

    while (buildings.length < buildingCount && attempts < maxAttempts) {
      attempts++;

      const width = this.randomRange(8, 20);
      const depth = this.randomRange(8, 20);
      const x = this.randomRange(0, 400 - width);
      const z = this.randomRange(0, 400 - depth);

      const minHeight = this.lerp(5, 40, heightVariation - 0.5);
      const maxHeight = this.lerp(40, 80, heightVariation - 0.5);
      const height = this.randomRange(minHeight, maxHeight);

      const gridX = Math.floor((x + width / 2) / gridSize);
      const gridZ = Math.floor((z + depth / 2) / gridSize);
      const gridKey = `${gridX},${gridZ}`;

      if (gridCells.has(gridKey)) {
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

      if (this.checkOverlap(building, buildings)) {
        continue;
      }

      gridCells.add(gridKey);
      buildings.push(building);
    }

    return buildings;
  }
}
