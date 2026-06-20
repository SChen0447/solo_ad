import {
  Position,
  GridPos,
  GRID_SIZE,
  PathWeightMap,
  gridKey
} from '../types';
import { MapGrid } from '../map/mapGrid';
import _ from 'lodash';

// 数据流向：接收 mapGrid 的障碍物 + decisionTree 的权重图 → 返回像素级路径点给 enemyManager

interface AStarNode {
  gx: number;
  gy: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

export class PathFinder {
  private mapGrid: MapGrid;
  private weightMap: PathWeightMap;

  constructor(mapGrid: MapGrid) {
    this.mapGrid = mapGrid;
    this.weightMap = {};
  }

  setWeightMap(weights: PathWeightMap): void {
    this.weightMap = _.cloneDeep(weights);
  }

  getWeightMap(): PathWeightMap {
    return _.cloneDeep(this.weightMap);
  }

  private heuristic(gx: number, gy: number, endGx: number, endGy: number): number {
    return Math.abs(gx - endGx) + Math.abs(gy - endGy);
  }

  private getWeight(gx: number, gy: number): number {
    const key = gridKey(gx, gy);
    return this.weightMap[key] ?? 1.0;
  }

  findPath(start: GridPos, end: GridPos): Position[] | null {
    const openList: AStarNode[] = [];
    const closedSet = new Set<string>();

    const startNode: AStarNode = {
      gx: start.gx,
      gy: start.gy,
      g: 0,
      h: this.heuristic(start.gx, start.gy, end.gx, end.gy),
      f: 0,
      parent: null
    };
    startNode.f = startNode.g + startNode.h;
    openList.push(startNode);

    const openMap = new Map<string, AStarNode>();
    openMap.set(gridKey(start.gx, start.gy), startNode);

    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ];

    while (openList.length > 0) {
      let minIdx = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[minIdx].f) {
          minIdx = i;
        }
      }

      const current = openList.splice(minIdx, 1)[0];
      const currentKey = gridKey(current.gx, current.gy);
      openMap.delete(currentKey);

      if (current.gx === end.gx && current.gy === end.gy) {
        return this.reconstructPath(current);
      }

      closedSet.add(currentKey);

      for (const dir of dirs) {
        const ngx = current.gx + dir.dx;
        const ngy = current.gy + dir.dy;
        const neighborKey = gridKey(ngx, ngy);

        if (!this.mapGrid.isInBounds(ngx, ngy)) continue;
        if (this.mapGrid.isObstacle(ngx, ngy)) continue;
        if (closedSet.has(neighborKey)) continue;

        const moveWeight = this.getWeight(ngx, ngy);
        const tentativeG = current.g + 1 * moveWeight;

        const existing = openMap.get(neighborKey);
        if (existing) {
          if (tentativeG < existing.g) {
            existing.g = tentativeG;
            existing.f = existing.g + existing.h;
            existing.parent = current;
          }
        } else {
          const neighbor: AStarNode = {
            gx: ngx,
            gy: ngy,
            g: tentativeG,
            h: this.heuristic(ngx, ngy, end.gx, end.gy),
            f: 0,
            parent: current
          };
          neighbor.f = neighbor.g + neighbor.h;
          openList.push(neighbor);
          openMap.set(neighborKey, neighbor);
        }
      }
    }

    return null;
  }

  private reconstructPath(endNode: AStarNode): Position[] {
    const path: GridPos[] = [];
    let current: AStarNode | null = endNode;
    while (current) {
      path.push({ gx: current.gx, gy: current.gy });
      current = current.parent;
    }
    path.reverse();

    return path.map(gp => ({
      x: gp.gx * GRID_SIZE + GRID_SIZE / 2,
      y: gp.gy * GRID_SIZE + GRID_SIZE / 2
    }));
  }

  getPathGridPositions(start: GridPos, end: GridPos): GridPos[] | null {
    const pixelPath = this.findPath(start, end);
    if (!pixelPath) return null;
    return pixelPath.map(p => ({
      gx: Math.floor(p.x / GRID_SIZE),
      gy: Math.floor(p.y / GRID_SIZE)
    }));
  }

  pathExists(start: GridPos, end: GridPos): boolean {
    return this.findPath(start, end) !== null;
  }

  evaluateRouteDanger(gridPath: GridPos[]): number {
    let danger = 0;
    for (const gp of gridPath) {
      danger += this.getWeight(gp.gx, gp.gy);
    }
    return danger / gridPath.length;
  }
}
