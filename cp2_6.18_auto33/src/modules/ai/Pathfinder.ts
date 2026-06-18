import { MapTile, MAP_WIDTH, MAP_HEIGHT } from '../gameMap/types';

interface PFNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PFNode | null;
}

export interface PathRequest {
  unitId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface PathResult {
  unitId: string;
  path: Array<{ x: number; y: number }>;
}

export class Pathfinder {
  findPath(
    tiles: MapTile[][],
    startGridX: number,
    startGridY: number,
    endGridX: number,
    endGridY: number
  ): Array<{ x: number; y: number }> {
    if (
      startGridX < 0 || startGridX >= MAP_WIDTH ||
      startGridY < 0 || startGridY >= MAP_HEIGHT ||
      endGridX < 0 || endGridX >= MAP_WIDTH ||
      endGridY < 0 || endGridY >= MAP_HEIGHT
    ) {
      return [];
    }

    if (startGridX === endGridX && startGridY === endGridY) {
      return [];
    }

    let targetX = endGridX;
    let targetY = endGridY;
    const targetTile = tiles[targetY]?.[targetX];
    if (!targetTile || !this.isWalkable(targetTile)) {
      const nearest = this.findNearestWalkable(tiles, endGridX, endGridY);
      if (!nearest) return [];
      targetX = nearest.x;
      targetY = nearest.y;
      if (targetX === startGridX && targetY === startGridY) return [];
    }

    const openSet: PFNode[] = [];
    const closedSet = new Set<string>();
    const openMap = new Map<string, PFNode>();

    const startNode: PFNode = {
      x: startGridX,
      y: startGridY,
      g: 0,
      h: this.heuristic(startGridX, startGridY, targetX, targetY),
      f: 0,
      parent: null
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);
    openMap.set(`${startGridX},${startGridY}`, startNode);

    const directions = [
      { dx: 1, dy: 0, cost: 1 },
      { dx: -1, dy: 0, cost: 1 },
      { dx: 0, dy: 1, cost: 1 },
      { dx: 0, dy: -1, cost: 1 },
      { dx: 1, dy: 1, cost: 1.414 },
      { dx: 1, dy: -1, cost: 1.414 },
      { dx: -1, dy: 1, cost: 1.414 },
      { dx: -1, dy: -1, cost: 1.414 }
    ];

    let iterations = 0;
    const maxIterations = MAP_WIDTH * MAP_HEIGHT * 2;
    let endNode: PFNode | null = null;

    while (openSet.length > 0 && iterations < maxIterations) {
      iterations++;
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      const cKey = `${current.x},${current.y}`;
      openMap.delete(cKey);
      closedSet.add(cKey);

      if (current.x === targetX && current.y === targetY) {
        endNode = current;
        break;
      }

      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) continue;
        const nKey = `${nx},${ny}`;
        if (closedSet.has(nKey)) continue;
        const tile = tiles[ny]?.[nx];
        if (!tile || !this.isWalkable(tile)) continue;
        if (dir.dx !== 0 && dir.dy !== 0) {
          const t1 = tiles[current.y]?.[current.x + dir.dx];
          const t2 = tiles[current.y + dir.dy]?.[current.x];
          if (!t1 || !this.isWalkable(t1) || !t2 || !this.isWalkable(t2)) continue;
        }
        const tentativeG = current.g + dir.cost;
        let neighbor = openMap.get(nKey);
        if (!neighbor) {
          neighbor = {
            x: nx,
            y: ny,
            g: tentativeG,
            h: this.heuristic(nx, ny, targetX, targetY),
            f: 0,
            parent: current
          };
          neighbor.f = neighbor.g + neighbor.h;
          openSet.push(neighbor);
          openMap.set(nKey, neighbor);
        } else if (tentativeG < neighbor.g) {
          neighbor.g = tentativeG;
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;
        }
      }
    }

    if (!endNode) return [];
    const gridPath: Array<{ x: number; y: number }> = [];
    let node: PFNode | null = endNode;
    while (node) {
      gridPath.push({ x: node.x, y: node.y });
      node = node.parent;
    }
    gridPath.reverse();

    return this.smoothPath(gridPath);
  }

  private smoothPath(gridPath: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
    if (gridPath.length <= 2) return gridPath;
    const result: Array<{ x: number; y: number }> = [gridPath[0]];
    let i = 0;
    while (i < gridPath.length - 1) {
      let j = gridPath.length - 1;
      while (j > i + 1) {
        if (this.lineClear(gridPath[i], gridPath[j])) {
          break;
        }
        j--;
      }
      result.push(gridPath[j]);
      i = j;
    }
    return result;
  }

  private lineClear(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
    const dx = Math.abs(b.x - a.x);
    const dy = Math.abs(b.y - a.y);
    const sx = a.x < b.x ? 1 : -1;
    const sy = a.y < b.y ? 1 : -1;
    let err = dx - dy;
    let x = a.x;
    let y = a.y;
    while (x !== b.x || y !== b.y) {
      if (Math.abs(x - a.x) + Math.abs(y - a.y) > 1) {
        return false;
      }
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
    return true;
  }

  private isWalkable(tile: MapTile): boolean {
    return tile.walkable && !tile.obstacle;
  }

  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
  }

  private findNearestWalkable(
    tiles: MapTile[][],
    cx: number,
    cy: number
  ): { x: number; y: number } | null {
    for (let r = 1; r <= 5; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) continue;
          const tile = tiles[ny]?.[nx];
          if (tile && this.isWalkable(tile)) return { x: nx, y: ny };
        }
      }
    }
    return null;
  }
}

export const pathfinder = new Pathfinder();
