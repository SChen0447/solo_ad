import { Biome, MapTile, Region, MAP_WIDTH, MAP_HEIGHT } from './types';
import { eventBus } from '../../eventBus';

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed || Date.now();
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  rangeInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

export class MapGenerator {
  private rand: SeededRandom;

  constructor(seed?: number) {
    this.rand = new SeededRandom(seed ?? Date.now());
  }

  generate(width: number = MAP_WIDTH, height: number = MAP_HEIGHT): { tiles: MapTile[][]; regions: Region[] } {
    const tiles: MapTile[][] = this.createInitialTiles(width, height);
    const regions: Region[] = [];

    regions.push(...this.generateRegions('mountain', 3, 6, 12, width, height, tiles));
    regions.push(...this.generateRegions('water', 2, 8, 15, width, height, tiles));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = tiles[y][x];
        if (tile.biome === 'mountain') {
          tile.elevation = this.generateElevation();
          tile.walkable = false;
        } else if (tile.biome === 'water') {
          tile.walkable = false;
        } else {
          tile.walkable = true;
        }
      }
    }

    eventBus.emit('map:generated', { tiles, regions });
    return { tiles, regions };
  }

  private createInitialTiles(width: number, height: number): MapTile[][] {
    const tiles: MapTile[][] = [];
    for (let y = 0; y < height; y++) {
      const row: MapTile[] = [];
      for (let x = 0; x < width; x++) {
        row.push({
          x,
          y,
          biome: 'plain',
          walkable: true,
          obstacle: false
        });
      }
      tiles.push(row);
    }
    return tiles;
  }

  private generateRegions(
    biome: Biome,
    count: number,
    minSize: number,
    maxSize: number,
    width: number,
    height: number,
    tiles: MapTile[][]
  ): Region[] {
    const regions: Region[] = [];
    for (let i = 0; i < count; i++) {
      const regionSize = this.rand.rangeInt(minSize, maxSize);
      const cx = this.rand.rangeInt(2, width - 3);
      const cy = this.rand.rangeInt(2, height - 3);
      const region = this.createBlobRegion(cx, cy, regionSize, biome, tiles, width, height);
      if (region.tiles.length > 0) {
        regions.push(region);
      }
    }
    return regions;
  }

  private createBlobRegion(
    cx: number,
    cy: number,
    size: number,
    biome: Biome,
    tiles: MapTile[][],
    width: number,
    height: number
  ): Region {
    const regionTiles: Array<{ x: number; y: number }> = [];
    const queue: Array<{ x: number; y: number }> = [{ x: cx, y: cy }];
    const visited = new Set<string>();
    let added = 0;

    while (queue.length > 0 && added < size) {
      const current = queue.shift()!;
      const key = `${current.x},${current.y}`;
      if (visited.has(key)) continue;
      if (current.x < 0 || current.x >= width || current.y < 0 || current.y >= height) continue;

      visited.add(key);
      tiles[current.y][current.x].biome = biome;
      regionTiles.push({ x: current.x, y: current.y });
      added++;

      const dirs = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 }
      ];
      for (const d of dirs) {
        if (this.rand.next() > 0.3) {
          queue.push({ x: current.x + d.dx, y: current.y + d.dy });
        }
      }
    }

    return {
      id: `${biome}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tiles: regionTiles,
      biome
    };
  }

  private generateElevation(): number[] {
    const numVertices = 5 + Math.floor(this.rand.next() * 4);
    const elev: number[] = [];
    for (let i = 0; i < numVertices; i++) {
      const angle = (i / numVertices) * Math.PI * 2;
      const baseHeight = 6 + this.rand.next() * 14;
      const jitter = this.rand.next() * 4 - 2;
      const height = Math.max(4, baseHeight + jitter * Math.sin(angle * 2));
      elev.push(height);
    }
    return elev;
  }
}
