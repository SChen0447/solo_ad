export interface IslandData {
  id: number;
  position: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  color: string;
  isMoving: boolean;
  moveAxis?: 'x' | 'z';
  moveRange?: number;
  moveSpeed?: number;
  moveOffset?: number;
  isStart?: boolean;
  isEnd?: boolean;
}

export interface LevelData {
  islands: IslandData[];
  totalDistance: number;
}

const COLOR_START = { r: 0x8f / 255, g: 0xbc / 255, b: 0x8f / 255 };
const COLOR_END = { r: 0xf0 / 255, g: 0xe6 / 255, b: 0x8c / 255 };

function lerpColor(t: number): string {
  const r = Math.round((COLOR_START.r + (COLOR_END.r - COLOR_START.r) * t) * 255);
  const g = Math.round((COLOR_START.g + (COLOR_END.g - COLOR_START.g) * t) * 255);
  const b = Math.round((COLOR_START.b + (COLOR_END.b - COLOR_START.b) * t) * 255);
  return `rgb(${r}, ${g}, ${b})`;
}

export class LevelGenerator {
  private static readonly MIN_ISLANDS = 6;
  private static readonly MAX_ISLANDS = 8;
  private static readonly MIN_DISTANCE = 2.5;
  private static readonly MAX_DISTANCE = 5.5;
  private static readonly MOVING_ISLAND_RATIO = 0.3;
  private static readonly MOVE_SPEED = 0.5;

  static generate(seed?: number): LevelData {
    const random = this.createRandom(seed);
    const islandCount = Math.floor(random() * (this.MAX_ISLANDS - this.MIN_ISLANDS + 1)) + this.MIN_ISLANDS;
    const islands: IslandData[] = [];

    let currentX = 0;
    let currentZ = 0;

    for (let i = 0; i < islandCount; i++) {
      const t = islandCount <= 1 ? 0 : i / (islandCount - 1);
      const sizeX = 1.8 + random() * 0.8;
      const sizeZ = 1.8 + random() * 0.8;
      const sizeY = 0.2;

      if (i === 0) {
        currentX = 0;
        currentZ = 0;
      } else {
        const distance = this.MIN_DISTANCE + random() * (this.MAX_DISTANCE - this.MIN_DISTANCE);
        const angleOffset = (random() - 0.5) * 0.8;
        currentX += Math.cos(angleOffset) * distance;
        currentZ += Math.sin(angleOffset) * distance;
      }

      const isMoving = i > 0 && i < islandCount - 1 && random() < this.MOVING_ISLAND_RATIO;
      const moveAxis = random() > 0.5 ? 'x' : 'z';
      const moveRange = 1 + random() * 1.5;

      islands.push({
        id: i,
        position: { x: currentX, y: 0, z: currentZ },
        size: { x: sizeX, y: sizeY, z: sizeZ },
        color: lerpColor(t),
        isMoving,
        moveAxis: isMoving ? moveAxis : undefined,
        moveRange: isMoving ? moveRange : undefined,
        moveSpeed: isMoving ? this.MOVE_SPEED : undefined,
        moveOffset: isMoving ? random() * Math.PI * 2 : undefined,
        isStart: i === 0,
        isEnd: i === islandCount - 1
      });
    }

    const totalDistance = Math.sqrt(
      Math.pow(islands[islands.length - 1].position.x - islands[0].position.x, 2) +
      Math.pow(islands[islands.length - 1].position.z - islands[0].position.z, 2)
    );

    return { islands, totalDistance };
  }

  static getIslandPositionAtTime(island: IslandData, time: number): { x: number; y: number; z: number } {
    if (!island.isMoving || !island.moveAxis || !island.moveRange || !island.moveSpeed) {
      return { ...island.position };
    }

    const offset = Math.sin(time * island.moveSpeed + (island.moveOffset || 0)) * island.moveRange;
    const pos = { ...island.position };

    if (island.moveAxis === 'x') {
      pos.x += offset;
    } else {
      pos.z += offset;
    }

    return pos;
  }

  private static createRandom(seed?: number): () => number {
    if (seed === undefined) {
      return Math.random;
    }
    let s = seed;
    return function() {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }
}
