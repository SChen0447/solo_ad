import { hexNeighbors, hexDistance, hexKey, isWalkable } from './hexUtils';
import type { HexCoord, Tile, Unit } from '../types';

interface PathNode {
  coord: HexCoord;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

export function findPath(
  start: HexCoord,
  end: HexCoord,
  tiles: Tile[],
  units: Unit[],
  maxSteps: number = 999
): HexCoord[] | null {
  const tileMap = new Map<string, Tile>();
  tiles.forEach(t => tileMap.set(hexKey(t.coord), t));

  const unitPositions = new Set(units.map(u => hexKey(u.position)));
  unitPositions.delete(hexKey(start));
  unitPositions.delete(hexKey(end));

  const endTile = tileMap.get(hexKey(end));
  if (!endTile || !isWalkable(endTile)) {
    return null;
  }

  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();

  const startNode: PathNode = {
    coord: start,
    g: 0,
    h: hexDistance(start, end),
    f: hexDistance(start, end),
    parent: null,
  };
  openSet.push(startNode);

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    const currentKey = hexKey(current.coord);

    if (currentKey === hexKey(end)) {
      const path: HexCoord[] = [];
      let node: PathNode | null = current;
      while (node) {
        path.unshift(node.coord);
        node = node.parent;
      }
      return path;
    }

    closedSet.add(currentKey);

    if (current.g >= maxSteps) {
      continue;
    }

    for (const neighbor of hexNeighbors(current.coord)) {
      const neighborKey = hexKey(neighbor);

      if (closedSet.has(neighborKey)) continue;

      const tile = tileMap.get(neighborKey);
      if (!tile || !isWalkable(tile)) continue;

      if (unitPositions.has(neighborKey)) continue;

      const g = current.g + 1;
      const h = hexDistance(neighbor, end);
      const f = g + h;

      const existingIndex = openSet.findIndex(n => hexKey(n.coord) === neighborKey);
      if (existingIndex === -1) {
        openSet.push({
          coord: neighbor,
          g,
          h,
          f,
          parent: current,
        });
      } else if (g < openSet[existingIndex].g) {
        openSet[existingIndex] = {
          coord: neighbor,
          g,
          h,
          f,
          parent: current,
        };
      }
    }
  }

  return null;
}

export function getMoveRange(
  start: HexCoord,
  maxSteps: number,
  tiles: Tile[],
  units: Unit[]
): HexCoord[] {
  const tileMap = new Map<string, Tile>();
  tiles.forEach(t => tileMap.set(hexKey(t.coord), t));

  const unitPositions = new Set(units.map(u => hexKey(u.position)));
  unitPositions.delete(hexKey(start));

  const reachable: HexCoord[] = [];
  const visited = new Set<string>();
  const queue: { coord: HexCoord; steps: number }[] = [{ coord: start, steps: 0 }];
  visited.add(hexKey(start));

  while (queue.length > 0) {
    const { coord, steps } = queue.shift()!;

    if (steps > 0) {
      reachable.push(coord);
    }

    if (steps >= maxSteps) continue;

    for (const neighbor of hexNeighbors(coord)) {
      const neighborKey = hexKey(neighbor);
      if (visited.has(neighborKey)) continue;

      const tile = tileMap.get(neighborKey);
      if (!tile || !isWalkable(tile)) continue;

      if (unitPositions.has(neighborKey)) continue;

      visited.add(neighborKey);
      queue.push({ coord: neighbor, steps: steps + 1 });
    }
  }

  return reachable;
}

export function getAttackRange(
  start: HexCoord,
  range: number,
  tiles: Tile[]
): HexCoord[] {
  const tileMap = new Map<string, Tile>();
  tiles.forEach(t => tileMap.set(hexKey(t.coord), t));

  const attackable: HexCoord[] = [];

  tiles.forEach(tile => {
    const dist = hexDistance(start, tile.coord);
    if (dist > 0 && dist <= range) {
      attackable.push(tile.coord);
    }
  });

  return attackable;
}
