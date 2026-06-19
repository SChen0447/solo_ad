export enum TileType {
  GRASS = 'grass',
  TREE = 'tree',
  STONE = 'stone',
  WATER = 'water',
  CRAFTING = 'crafting'
}

export interface TileData {
  type: TileType;
  walkable: boolean;
  harvestable: boolean;
  harvestItem?: string;
  color: number;
  secondaryColor: number;
}

export const TILE_CONFIG: Record<TileType, TileData> = {
  [TileType.GRASS]: {
    type: TileType.GRASS,
    walkable: true,
    harvestable: false,
    color: 0x4a7c23,
    secondaryColor: 0x5d8a2b
  },
  [TileType.TREE]: {
    type: TileType.TREE,
    walkable: false,
    harvestable: true,
    harvestItem: 'wood',
    color: 0x2d5016,
    secondaryColor: 0x6b4423
  },
  [TileType.STONE]: {
    type: TileType.STONE,
    walkable: false,
    harvestable: true,
    harvestItem: 'stone',
    color: 0x808080,
    secondaryColor: 0x606060
  },
  [TileType.WATER]: {
    type: TileType.WATER,
    walkable: true,
    harvestable: false,
    color: 0x2980b9,
    secondaryColor: 0x3498db
  },
  [TileType.CRAFTING]: {
    type: TileType.CRAFTING,
    walkable: true,
    harvestable: false,
    color: 0x8b4513,
    secondaryColor: 0xd2691e
  }
};

export class Tile {
  public gridX: number;
  public gridY: number;
  public type: TileType;
  public walkable: boolean;
  public harvestable: boolean;
  public harvestItem?: string;
  public color: number;
  public secondaryColor: number;
  public graphics?: Phaser.GameObjects.Graphics;
  public textureKey?: string;

  constructor(gridX: number, gridY: number, type: TileType) {
    this.gridX = gridX;
    this.gridY = gridY;
    const config = TILE_CONFIG[type];
    this.type = type;
    this.walkable = config.walkable;
    this.harvestable = config.harvestable;
    this.harvestItem = config.harvestItem;
    this.color = config.color;
    this.secondaryColor = config.secondaryColor;
  }

  public setType(type: TileType): void {
    this.type = type;
    const config = TILE_CONFIG[type];
    this.walkable = config.walkable;
    this.harvestable = config.harvestable;
    this.harvestItem = config.harvestItem;
    this.color = config.color;
    this.secondaryColor = config.secondaryColor;
  }

  public isSlow(): boolean {
    return this.type === TileType.WATER;
  }
}
