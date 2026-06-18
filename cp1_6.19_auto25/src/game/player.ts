import { TileType, Crystal, TILE_SIZE, PLAYER_SPEED, INTERACTION_RADIUS } from '@/types';

export interface PlayerState {
  x: number;
  y: number;
  speed: number;
  inventory: Crystal[];
}

export function createPlayer(startX: number, startY: number): PlayerState {
  return {
    x: startX,
    y: startY,
    speed: PLAYER_SPEED,
    inventory: [],
  };
}

export function getTileAt(
  worldX: number,
  worldY: number,
  tiles: TileType[][]
): TileType {
  const col = Math.floor(worldX / TILE_SIZE);
  const row = Math.floor(worldY / TILE_SIZE);
  if (row < 0 || row >= tiles.length || col < 0 || col >= tiles[0].length) {
    return 'rock';
  }
  return tiles[row][col];
}

export function isTileBlocking(tile: TileType): boolean {
  return tile === 'rock';
}

export function isTileSlowing(tile: TileType): boolean {
  return tile === 'water';
}

export function movePlayer(
  player: PlayerState,
  dx: number,
  dy: number,
  tiles: TileType[][]
): { x: number; y: number; speed: number } {
  let speed = PLAYER_SPEED;
  const currentTile = getTileAt(player.x, player.y, tiles);
  if (isTileSlowing(currentTile)) {
    speed = PLAYER_SPEED / 2;
  }

  const newX = player.x + dx * speed;
  const newY = player.y + dy * speed;

  const targetTileX = getTileAt(newX, player.y, tiles);
  const targetTileY = getTileAt(player.x, newY, tiles);

  let finalX = player.x;
  let finalY = player.y;

  if (!isTileBlocking(targetTileX)) {
    finalX = newX;
  }
  if (!isTileBlocking(targetTileY)) {
    finalY = newY;
  }

  const finalTile = getTileAt(finalX, finalY, tiles);
  if (isTileSlowing(finalTile)) {
    speed = PLAYER_SPEED / 2;
  }

  return { x: finalX, y: finalY, speed };
}

export function checkCrystalCollection(
  playerX: number,
  playerY: number,
  crystals: Crystal[]
): string[] {
  const collectedIds: string[] = [];
  for (const crystal of crystals) {
    if (crystal.collected) continue;
    const dx = playerX - crystal.x;
    const dy = playerY - crystal.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < INTERACTION_RADIUS) {
      collectedIds.push(crystal.id);
    }
  }
  return collectedIds;
}

export function isNearAlchemistTable(
  playerX: number,
  playerY: number,
  tableX: number,
  tableY: number
): boolean {
  const dx = playerX - tableX;
  const dy = playerY - tableY;
  return Math.sqrt(dx * dx + dy * dy) < 80;
}
