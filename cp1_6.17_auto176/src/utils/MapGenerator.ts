import { TerrainHex, TerrainType, TERRAIN_MOVE_COST } from '../types';
import { coordKey } from './hexUtils';

interface MapGeneratorOptions {
  width: number;
  height: number;
  terrainDensity: number;
  seed?: number;
}

export class MapGenerator {
  private width: number;
  private height: number;
  private terrainDensity: number;
  private random: () => number;

  constructor(options: MapGeneratorOptions) {
    this.width = options.width;
    this.height = options.height;
    this.terrainDensity = options.terrainDensity;
    this.random = this.createSeededRandom(options.seed ?? Date.now());
  }

  private createSeededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  generate(): TerrainHex[] {
    const hexes: TerrainHex[] = [];
    const terrainMap = new Map<string, TerrainType>();

    for (let r = 0; r < this.height; r++) {
      for (let q = 0; q < this.width; q++) {
        const offsetQ = Math.floor(r / 2);
        const axialQ = q - offsetQ;
        const key = coordKey(axialQ, r);
        const terrain = this.generateTerrain(axialQ, r);
        terrainMap.set(key, terrain);
      }
    }

    this.growTerrainClusters(terrainMap, 'forest', Math.floor(this.terrainDensity * 0.3));
    this.growTerrainClusters(terrainMap, 'hill', Math.floor(this.terrainDensity * 0.25));
    this.generateRiver(terrainMap);
    this.placeCities(terrainMap, Math.floor(this.terrainDensity * 0.15));

    for (let r = 0; r < this.height; r++) {
      for (let q = 0; q < this.width; q++) {
        const offsetQ = Math.floor(r / 2);
        const axialQ = q - offsetQ;
        const key = coordKey(axialQ, r);
        const terrain = terrainMap.get(key) || 'plain';
        hexes.push({ q: axialQ, r, terrain });
      }
    }

    return hexes;
  }

  private generateTerrain(q: number, r: number): TerrainType {
    const noise = this.random();
    if (noise < 0.7) {
      return 'plain';
    } else if (noise < 0.85) {
      return 'forest';
    } else {
      return 'hill';
    }
  }

  private growTerrainClusters(
    terrainMap: Map<string, TerrainType>,
    terrainType: TerrainType,
    clusterCount: number
  ): void {
    const allKeys = Array.from(terrainMap.keys());

    for (let i = 0; i < clusterCount; i++) {
      const startKey = allKeys[Math.floor(this.random() * allKeys.length)];
      if (!startKey) continue;

      const [startQ, startR] = startKey.split(',').map(Number);
      const clusterSize = Math.floor(this.random() * 5) + 3;

      this.growCluster(terrainMap, startQ, startR, terrainType, clusterSize);
    }
  }

  private growCluster(
    terrainMap: Map<string, TerrainType>,
    startQ: number,
    startR: number,
    terrainType: TerrainType,
    size: number
  ): void {
    const visited = new Set<string>();
    const queue: { q: number; r: number }[] = [{ q: startQ, r: startR }];
    let grown = 0;

    while (queue.length > 0 && grown < size) {
      const current = queue.shift()!;
      const key = coordKey(current.q, current.r);

      if (visited.has(key)) continue;
      if (!terrainMap.has(key)) continue;

      visited.add(key);
      terrainMap.set(key, terrainType);
      grown++;

      const neighbors = this.getNeighbors(current.q, current.r);
      const shuffled = neighbors.sort(() => this.random() - 0.5);

      for (const neighbor of shuffled) {
        const nKey = coordKey(neighbor.q, neighbor.r);
        if (!visited.has(nKey) && terrainMap.has(nKey)) {
          if (this.random() < 0.6) {
            queue.push(neighbor);
          }
        }
      }
    }
  }

  private generateRiver(terrainMap: Map<string, TerrainType>): void {
    const startRow = Math.floor(this.random() * this.height);
    let q = -Math.floor(startRow / 2);

    for (let r = startRow; r < this.height; r++) {
      const key = coordKey(q, r);
      if (terrainMap.has(key)) {
        terrainMap.set(key, 'river');
      }

      const direction = this.random();
      if (direction < 0.3) {
        q -= 1;
      } else if (direction > 0.7) {
        q += 1;
      }

      if (r % 2 === 1) {
        q += 1;
      }
    }
  }

  private placeCities(
    terrainMap: Map<string, TerrainType>,
    count: number
  ): void {
    const plainKeys = Array.from(terrainMap.entries())
      .filter(([, terrain]) => terrain === 'plain')
      .map(([key]) => key);

    for (let i = 0; i < count && plainKeys.length > 0; i++) {
      const index = Math.floor(this.random() * plainKeys.length);
      const key = plainKeys.splice(index, 1)[0];
      if (key) {
        terrainMap.set(key, 'city');
      }
    }
  }

  private getNeighbors(q: number, r: number): { q: number; r: number }[] {
    return [
      { q: q + 1, r: r },
      { q: q + 1, r: r - 1 },
      { q: q, r: r - 1 },
      { q: q - 1, r: r },
      { q: q - 1, r: r + 1 },
      { q: q, r: r + 1 },
    ];
  }

  getMoveCost(terrain: TerrainType): number {
    return TERRAIN_MOVE_COST[terrain];
  }
}

export function generateMap(
  width: number = 20,
  height: number = 15,
  terrainDensity: number = 50
): TerrainHex[] {
  const generator = new MapGenerator({
    width,
    height,
    terrainDensity,
  });
  return generator.generate();
}
