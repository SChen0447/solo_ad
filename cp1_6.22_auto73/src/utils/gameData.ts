export enum ResourceType {
  WOOD = 'wood',
  BRICK = 'brick',
  WOOL = 'wool',
  GRAIN = 'grain',
  ORE = 'ore',
  DESERT = 'desert'
}

export enum BuildingType {
  ROAD = 'road',
  VILLAGE = 'village',
  CITY = 'city'
}

export interface Player {
  id: string;
  name: string;
  color: string;
  score: number;
  resources: Record<ResourceType, number>;
  buildings: Record<BuildingType, number>;
}

export interface HexTile {
  q: number;
  r: number;
  resource: ResourceType;
  token: number;
}

export interface Vertex {
  id: string;
  x: number;
  y: number;
  occupied: boolean;
  playerId: string | null;
  buildingType: BuildingType | null;
  animating: boolean;
  animationProgress: number;
}

export interface TradeCard {
  id: string;
  type: ResourceType;
  animating: boolean;
  animationProgress: number;
}

export interface BuildingAnimation {
  type: BuildingType;
  progress: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export const RESOURCE_COLORS: Record<ResourceType, string> = {
  [ResourceType.WOOD]: '#4a7c3f',
  [ResourceType.BRICK]: '#b87333',
  [ResourceType.WOOL]: '#f0e68c',
  [ResourceType.GRAIN]: '#ffd700',
  [ResourceType.ORE]: '#a0a0a0',
  [ResourceType.DESERT]: '#d4a574'
};

export const RESOURCE_LIGHT_COLORS: Record<ResourceType, string> = {
  [ResourceType.WOOD]: '#d4e157',
  [ResourceType.BRICK]: '#ffab91',
  [ResourceType.WOOL]: '#fff9c4',
  [ResourceType.GRAIN]: '#fff59d',
  [ResourceType.ORE]: '#e0e0e0',
  [ResourceType.DESERT]: '#ffe0b2'
};

export const RESOURCE_NAMES: Record<ResourceType, string> = {
  [ResourceType.WOOD]: '木材',
  [ResourceType.BRICK]: '砖石',
  [ResourceType.WOOL]: '羊毛',
  [ResourceType.GRAIN]: '谷物',
  [ResourceType.ORE]: '矿石',
  [ResourceType.DESERT]: '沙漠'
};

export const RESOURCE_ICONS: Record<ResourceType, string> = {
  [ResourceType.WOOD]: '🌲',
  [ResourceType.BRICK]: '🧱',
  [ResourceType.WOOL]: '🐑',
  [ResourceType.GRAIN]: '🌾',
  [ResourceType.ORE]: '⛏️',
  [ResourceType.DESERT]: '🏜️'
};

export const BUILDING_NAMES: Record<BuildingType, string> = {
  [BuildingType.ROAD]: '道路',
  [BuildingType.VILLAGE]: '村庄',
  [BuildingType.CITY]: '城市'
};

export const BUILDING_ICONS: Record<BuildingType, string> = {
  [BuildingType.ROAD]: '🛤️',
  [BuildingType.VILLAGE]: '🏠',
  [BuildingType.CITY]: '🏙️'
};

export const BUILDING_COSTS: Record<BuildingType, Record<ResourceType, number>> = {
  [BuildingType.ROAD]: {
    [ResourceType.WOOD]: 2,
    [ResourceType.BRICK]: 2,
    [ResourceType.WOOL]: 0,
    [ResourceType.GRAIN]: 0,
    [ResourceType.ORE]: 0,
    [ResourceType.DESERT]: 0
  },
  [BuildingType.VILLAGE]: {
    [ResourceType.WOOD]: 2,
    [ResourceType.BRICK]: 2,
    [ResourceType.WOOL]: 1,
    [ResourceType.GRAIN]: 1,
    [ResourceType.ORE]: 0,
    [ResourceType.DESERT]: 0
  },
  [BuildingType.CITY]: {
    [ResourceType.WOOD]: 0,
    [ResourceType.BRICK]: 0,
    [ResourceType.WOOL]: 0,
    [ResourceType.GRAIN]: 2,
    [ResourceType.ORE]: 3,
    [ResourceType.DESERT]: 0
  }
};

export const HEX_RADIUS = 40;
export const HEX_SPACING = 2;
export const VERTEX_CLICK_RADIUS = 15;
export const MAX_TRADE_CARDS = 4;
export const MAX_HAND_CARDS = 20;
export const PLAYER_COLORS = ['#e53e3e', '#3182ce', '#ecc94b'];

export const RESOURCE_TYPES: ResourceType[] = [
  ResourceType.WOOD,
  ResourceType.BRICK,
  ResourceType.WOOL,
  ResourceType.GRAIN,
  ResourceType.ORE
];

export function generateHexGrid(): HexTile[] {
  const tiles: HexTile[] = [];
  
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      if (Math.abs(q + r) <= 2) {
        tiles.push({
          q,
          r,
          resource: ResourceType.DESERT,
          token: 0
        });
      }
    }
  }
  
  return tiles;
}

export function assignRandomResources(tiles: HexTile[]): HexTile[] {
  const resourceCounts: Record<ResourceType, number> = {
    [ResourceType.WOOD]: 4,
    [ResourceType.BRICK]: 3,
    [ResourceType.WOOL]: 4,
    [ResourceType.GRAIN]: 4,
    [ResourceType.ORE]: 3,
    [ResourceType.DESERT]: 1
  };
  
  const availableResources: ResourceType[] = [];
  
  for (const [resource, count] of Object.entries(resourceCounts)) {
    for (let i = 0; i < count; i++) {
      availableResources.push(resource as ResourceType);
    }
  }
  
  for (let i = availableResources.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [availableResources[i], availableResources[j]] = [availableResources[j], availableResources[i]];
  }
  
  const tokens = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
  let tokenIndex = 0;
  
  return tiles.map((tile, index) => {
    const resource = availableResources[index];
    const token = resource === ResourceType.DESERT ? 0 : tokens[tokenIndex++];
    return {
      ...tile,
      resource,
      token
    };
  });
}

export function hexToPixel(q: number, r: number, centerX: number, centerY: number): { x: number; y: number } {
  const x = centerX + HEX_RADIUS * (3 / 2 * q);
  const y = centerY + HEX_RADIUS * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
  return { x, y };
}

export function getHexCorners(centerX: number, centerY: number): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push({
      x: centerX + HEX_RADIUS * Math.cos(angle),
      y: centerY + HEX_RADIUS * Math.sin(angle)
    });
  }
  return corners;
}

export function generateVertices(tiles: HexTile[], centerX: number, centerY: number): Vertex[] {
  const vertexMap = new Map<string, { x: number; y: number }>();
  
  for (const tile of tiles) {
    const pixel = hexToPixel(tile.q, tile.r, centerX, centerY);
    const corners = getHexCorners(pixel.x, pixel.y);
    
    for (const corner of corners) {
      const key = `${Math.round(corner.x * 10) / 10},${Math.round(corner.y * 10) / 10}`;
      if (!vertexMap.has(key)) {
        vertexMap.set(key, { x: corner.x, y: corner.y });
      }
    }
  }
  
  const vertices: Vertex[] = [];
  let idCounter = 0;
  
  for (const [, pos] of vertexMap) {
    vertices.push({
      id: `vertex-${idCounter++}`,
      x: pos.x,
      y: pos.y,
      occupied: false,
      playerId: null,
      buildingType: null,
      animating: false,
      animationProgress: 0
    });
  }
  
  return vertices;
}

export function findNearestVertex(
  x: number,
  y: number,
  vertices: Vertex[]
): Vertex | null {
  let nearest: Vertex | null = null;
  let minDist = Infinity;
  
  for (const vertex of vertices) {
    const dist = Math.sqrt((x - vertex.x) ** 2 + (y - vertex.y) ** 2);
    if (dist < minDist && dist < VERTEX_CLICK_RADIUS) {
      minDist = dist;
      nearest = vertex;
    }
  }
  
  return nearest;
}

export function canPlaceBuilding(
  vertex: Vertex,
  vertices: Vertex[],
  minDistance: number = HEX_RADIUS
): boolean {
  if (vertex.occupied) return false;
  
  for (const v of vertices) {
    if (v.id === vertex.id) continue;
    if (!v.occupied) continue;
    
    const dist = Math.sqrt((v.x - vertex.x) ** 2 + (v.y - vertex.y) ** 2);
    if (dist < minDistance) return false;
  }
  
  return true;
}

export function canAffordBuilding(
  buildingType: BuildingType,
  resources: Record<ResourceType, number>,
  tradeCards: TradeCard[]
): boolean {
  const cost = BUILDING_COSTS[buildingType];
  const availableResources = { ...resources };
  
  for (const card of tradeCards) {
    availableResources[card.type]++;
  }
  
  for (const [resource, amount] of Object.entries(cost)) {
    if (availableResources[resource as ResourceType] < amount) {
      return false;
    }
  }
  
  return true;
}

export function createInitialPlayer(): Player {
  return {
    id: 'player-1',
    name: '玩家一',
    color: PLAYER_COLORS[0],
    score: 10,
    resources: {
      [ResourceType.WOOD]: 4,
      [ResourceType.BRICK]: 4,
      [ResourceType.WOOL]: 4,
      [ResourceType.GRAIN]: 4,
      [ResourceType.ORE]: 4,
      [ResourceType.DESERT]: 0
    },
    buildings: {
      [BuildingType.ROAD]: 0,
      [BuildingType.VILLAGE]: 0,
      [BuildingType.CITY]: 0
    }
  };
}

export function generateMap(canvasWidth: number, canvasHeight: number) {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  
  let tiles = generateHexGrid();
  tiles = assignRandomResources(tiles);
  const vertices = generateVertices(tiles, centerX, centerY);
  
  return { tiles, vertices };
}
