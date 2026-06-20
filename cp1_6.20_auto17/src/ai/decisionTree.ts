import {
  Tower,
  GridPos,
  PathWeightMap,
  GRID_COLS,
  GRID_ROWS,
  TOWER_CONFIGS,
  gridKey,
  distance,
  gridToPixel,
  EnemyType
} from '../types';
import { MapGrid } from '../map/mapGrid';
import _ from 'lodash';

// 数据流向：接收 towerManager 的炮塔列表 → 分析火力分布 → 生成权重图给 pathFinder

interface WeakPoint {
  pos: GridPos;
  score: number;
  coverage: number;
}

type DecisionNode =
  | { type: 'threshold'; attr: string; threshold: number; left: DecisionNode; right: DecisionNode }
  | { type: 'result'; weights: { normal: number; fast: number; heavy: number } };

export class DecisionTree {
  private mapGrid: MapGrid;
  private towerCoverage: Map<string, number>;
  private decisionTree: DecisionNode;
  private lastWeakPoints: WeakPoint[];

  constructor(mapGrid: MapGrid) {
    this.mapGrid = mapGrid;
    this.towerCoverage = new Map();
    this.lastWeakPoints = [];
    this.decisionTree = this.buildDecisionTree();
  }

  private buildDecisionTree(): DecisionNode {
    return {
      type: 'threshold',
      attr: 'towerCount',
      threshold: 5,
      left: {
        type: 'threshold',
        attr: 'coverageStd',
        threshold: 0.3,
        left: { type: 'result', weights: { normal: 1.0, fast: 0.8, heavy: 1.2 } },
        right: { type: 'result', weights: { normal: 1.0, fast: 0.6, heavy: 1.5 } }
      },
      right: {
        type: 'threshold',
        attr: 'weakPointCount',
        threshold: 3,
        left: { type: 'result', weights: { normal: 1.2, fast: 0.7, heavy: 1.4 } },
        right: {
          type: 'threshold',
          attr: 'maxDensity',
          threshold: 4,
          left: { type: 'result', weights: { normal: 1.5, fast: 0.5, heavy: 1.6 } },
          right: { type: 'result', weights: { normal: 1.8, fast: 0.4, heavy: 1.8 } }
        }
      }
    };
  }

  private evaluateTree(
    node: DecisionNode,
    features: Record<string, number>
  ): { normal: number; fast: number; heavy: number } {
    if (node.type === 'result') {
      return node.weights;
    }
    const val = features[node.attr] ?? 0;
    if (val < node.threshold) {
      return this.evaluateTree(node.left, features);
    } else {
      return this.evaluateTree(node.right, features);
    }
  }

  private computeTowerCoverage(towers: Tower[]): void {
    this.towerCoverage.clear();

    for (let gy = 0; gy < GRID_ROWS; gy++) {
      for (let gx = 0; gx < GRID_COLS; gx++) {
        if (this.mapGrid.isObstacle(gx, gy)) continue;

        const cellCenter = gridToPixel({ gx, gy });
        let coverage = 0;

        for (const tower of towers) {
          const cfg = TOWER_CONFIGS[tower.type];
          const range = cfg.range[tower.level - 1];
          const d = distance(cellCenter, tower.pixelPos);
          if (d <= range) {
            const falloff = 1 - (d / range) * 0.4;
            const damagePerSec = cfg.damage[tower.level - 1] / cfg.attackSpeed[tower.level - 1];
            coverage += damagePerSec * falloff * 0.01;
          }
        }

        if (coverage > 0) {
          this.towerCoverage.set(gridKey(gx, gy), coverage);
        }
      }
    }
  }

  private findWeakPoints(): WeakPoint[] {
    const weakPoints: WeakPoint[] = [];
    const coverageValues: number[] = [];

    this.towerCoverage.forEach(v => coverageValues.push(v));
    const avgCoverage = coverageValues.length > 0
      ? _.sum(coverageValues) / coverageValues.length
      : 0;

    for (let gy = 0; gy < GRID_ROWS; gy++) {
      for (let gx = 0; gx < GRID_COLS; gx++) {
        if (this.mapGrid.isObstacle(gx, gy)) continue;

        const key = gridKey(gx, gy);
        const cov = this.towerCoverage.get(key) ?? 0;

        if (cov < avgCoverage * 0.6) {
          const end = this.mapGrid.getEnd();
          const distToEnd = Math.abs(gx - end.gx) + Math.abs(gy - end.gy);
          const distBonus = 1 - (distToEnd / (GRID_COLS + GRID_ROWS)) * 0.5;
          const score = ((avgCoverage - cov) / Math.max(avgCoverage, 0.01)) * distBonus;

          weakPoints.push({
            pos: { gx, gy },
            score,
            coverage: cov
          });
        }
      }
    }

    weakPoints.sort((a, b) => b.score - a.score);
    return weakPoints.slice(0, 5);
  }

  computeWeightMap(towers: Tower[], enemyType: EnemyType): PathWeightMap {
    this.computeTowerCoverage(towers);
    this.lastWeakPoints = this.findWeakPoints();

    const features = this.extractFeatures(towers);
    const weightMultipliers = this.evaluateTree(this.decisionTree, features);
    const multiplier = weightMultipliers[enemyType];

    const weights: PathWeightMap = {};
    const coverageValues: number[] = [];
    this.towerCoverage.forEach(v => coverageValues.push(v));
    const maxCov = coverageValues.length > 0 ? Math.max(...coverageValues) : 1;

    for (let gy = 0; gy < GRID_ROWS; gy++) {
      for (let gx = 0; gx < GRID_COLS; gx++) {
        if (this.mapGrid.isObstacle(gx, gy)) continue;

        const key = gridKey(gx, gy);
        const cov = this.towerCoverage.get(key) ?? 0;
        const covRatio = maxCov > 0 ? cov / maxCov : 0;

        let baseWeight: number;
        switch (enemyType) {
          case 'fast':
            baseWeight = 1.0 + covRatio * 3.0 * multiplier;
            break;
          case 'heavy':
            baseWeight = 1.0 + covRatio * 0.5 * multiplier;
            if (covRatio > 0.3) baseWeight -= 0.3;
            break;
          case 'normal':
          default:
            baseWeight = 1.0 + covRatio * 1.5 * multiplier;
            break;
        }

        baseWeight = Math.max(0.5, baseWeight);
        weights[key] = baseWeight;
      }
    }

    const end = this.mapGrid.getEnd();
    for (const wp of this.lastWeakPoints) {
      const distToEnd = Math.abs(wp.pos.gx - end.gx) + Math.abs(wp.pos.gy - end.gy);
      if (distToEnd < GRID_COLS * 0.6) {
        const key = gridKey(wp.pos.gx, wp.pos.gy);
        weights[key] = Math.max(0.3, (weights[key] ?? 1.0) * Math.min(0.3, 1 / (1 + wp.score)));

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ngx = wp.pos.gx + dx;
            const ngy = wp.pos.gy + dy;
            const nkey = gridKey(ngx, ngy);
            if (weights[nkey] && (dx !== 0 || dy !== 0)) {
              weights[nkey] = Math.max(0.4, weights[nkey] * 0.7);
            }
          }
        }
      }
    }

    return weights;
  }

  private extractFeatures(towers: Tower[]): Record<string, number> {
    const coverageValues: number[] = [];
    this.towerCoverage.forEach(v => coverageValues.push(v));

    const towerCount = towers.length;
    const avgCoverage = coverageValues.length > 0 ? _.sum(coverageValues) / coverageValues.length : 0;
    const coverageStd = coverageValues.length > 1
      ? Math.sqrt(_.sum(coverageValues.map(v => (v - avgCoverage) ** 2)) / coverageValues.length)
      : 0;
    const weakPointCount = this.lastWeakPoints.length;

    const densityGrid: number[][] = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(0));
    for (const tower of towers) {
      const gridX = tower.gridPos.gx;
      const gridY = tower.gridPos.gy;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ngx = gridX + dx;
          const ngy = gridY + dy;
          if (this.mapGrid.isInBounds(ngx, ngy)) {
            densityGrid[ngy][ngx]++;
          }
        }
      }
    }
    let maxDensity = 0;
    for (let gy = 0; gy < GRID_ROWS; gy++) {
      for (let gx = 0; gx < GRID_COLS; gx++) {
        if (densityGrid[gy][gx] > maxDensity) {
          maxDensity = densityGrid[gy][gx];
        }
      }
    }

    return {
      towerCount,
      avgCoverage,
      coverageStd: coverageStd / Math.max(avgCoverage, 0.01),
      weakPointCount,
      maxDensity
    };
  }

  getWeakPoints(): WeakPoint[] {
    return [...this.lastWeakPoints];
  }

  getCoverageAt(gx: number, gy: number): number {
    return this.towerCoverage.get(gridKey(gx, gy)) ?? 0;
  }

  getAllCoverage(): Map<string, number> {
    return new Map(this.towerCoverage);
  }
}
