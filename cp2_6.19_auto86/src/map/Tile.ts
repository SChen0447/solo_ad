export enum TerrainType {
  GRASS = 'grass',
  TREE = 'tree',
  STONE = 'stone',
  WATER = 'water',
}

export class Tile {
  type: TerrainType;
  textureIndex: number;
  harvestable: boolean;
  walkable: boolean;

  constructor(type: TerrainType) {
    this.type = type;
    this.walkable = true;
    this.harvestable = false;
    this.textureIndex = 0;

    switch (type) {
      case TerrainType.GRASS:
        this.walkable = true;
        this.harvestable = false;
        this.textureIndex = Math.floor(Math.random() * 3);
        break;
      case TerrainType.TREE:
        this.walkable = false;
        this.harvestable = true;
        this.textureIndex = Math.floor(Math.random() * 2);
        break;
      case TerrainType.STONE:
        this.walkable = false;
        this.harvestable = true;
        this.textureIndex = Math.floor(Math.random() * 2);
        break;
      case TerrainType.WATER:
        this.walkable = true;
        this.harvestable = false;
        this.textureIndex = Math.floor(Math.random() * 2);
        break;
    }
  }
}
