/**
 * MazeService - 迷宫数据服务
 *
 * 职责：调用后端 Flask API 获取迷宫数据，解析成结构化模型供 GameScene 使用
 * 数据流向：
 *   GameScene → fetchMaze(seed) → HTTP GET /api/maze/seed
 *   → 解析 JSON → 返回 MazeData 给 GameScene 渲染墙壁/金币/出口
 *
 * 调用关系：
 *   GameScene.ts → fetchMaze() → renderMaze() 渲染到 Phaser 场景
 */

import axios from 'axios';

export interface CellPos {
  x: number;
  y: number;
}

export interface MazeData {
  seed: number;
  size: number;
  grid: number[][];
  start: CellPos;
  exit: CellPos;
  coins: CellPos[];
  aiSpawns: CellPos[];
  generatedMs: number;
}

const API_BASE = '/api';

export class MazeService {
  private static async request<T>(url: string, params?: Record<string, any>): Promise<T> {
    try {
      const resp = await axios.get(`${API_BASE}${url}`, {
        params,
        timeout: 3000,
      });
      return resp.data as T;
    } catch (err) {
      console.warn('[MazeService] API请求失败，使用本地生成', err);
      throw err;
    }
  }

  /**
   * 从后端获取迷宫，失败则使用本地 DFS 算法降级生成
   */
  static async fetchMaze(seed?: number, size = 10): Promise<MazeData> {
    const finalSeed = seed ?? Date.now() & 0x7fffffff;

    try {
      const data = await this.request<any>('/maze/seed', { seed: finalSeed, size });
      return {
        seed: data.seed,
        size: data.size,
        grid: data.maze as number[][],
        start: data.start as CellPos,
        exit: data.exit as CellPos,
        coins: data.coins as CellPos[],
        aiSpawns: data.ai_spawns as CellPos[],
        generatedMs: data.generated_ms ?? 0,
      };
    } catch {
      return this.localGenerate(finalSeed, size);
    }
  }

  /**
   * 本地降级生成：DFS 回溯
   */
  static localGenerate(seed: number, size: number): MazeData {
    const grid: number[][] = Array.from({ length: size }, () => Array(size).fill(1));
    const rng = mulberry32(seed);

    const carve = (x: number, y: number) => {
      grid[y][x] = 0;
      const dirs = [
        [2, 0],
        [-2, 0],
        [0, 2],
        [0, -2],
      ].sort(() => rng() - 0.5);
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < size && ny >= 0 && ny < size && grid[ny][nx] === 1) {
          grid[y + dy / 2][x + dx / 2] = 0;
          carve(nx, ny);
        }
      }
    };

    carve(0, 0);
    grid[0][0] = 0;
    grid[size - 1][size - 1] = 0;
    if (size >= 2 && grid[0][1] === 1 && grid[1][0] === 0) grid[0][1] = 0;
    if (size >= 2 && grid[1][0] === 1 && grid[0][1] === 0) grid[1][0] = 0;

    const corridor: CellPos[] = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (grid[y][x] === 0 && !(x === 0 && y === 0) && !(x === size - 1 && y === size - 1)) {
          corridor.push({ x, y });
        }
      }
    }
    corridor.sort(() => rng() - 0.5);

    const coins: CellPos[] = corridor.slice(0, Math.min(corridor.length, 10));
    if (coins.length < 8 && corridor.length >= 8) {
      for (let i = coins.length; i < 8; i++) coins.push(corridor[i]);
    }

    const aiSpawns: CellPos[] = [];
    for (const c of corridor) {
      if (c.x >= 3 || c.y >= 3) {
        aiSpawns.push(c);
        if (aiSpawns.length >= 3) break;
      }
    }

    return {
      seed,
      size,
      grid,
      start: { x: 0, y: 0 },
      exit: { x: size - 1, y: size - 1 },
      coins,
      aiSpawns,
      generatedMs: 0,
    };
  }

  /** 网格是否可通行 */
  static isWalkable(maze: MazeData, x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= maze.size || y >= maze.size) return false;
    return maze.grid[y][x] === 0;
  }

  /** 简单 BFS 找两个走廊格之间的路径（用于AI巡逻） */
  static findPath(maze: MazeData, from: CellPos, to: CellPos): CellPos[] {
    if (from.x === to.x && from.y === to.y) return [from];
    const key = (x: number, y: number) => `${x},${y}`;
    const visited = new Set<string>();
    const parent = new Map<string, string | null>();
    const queue: CellPos[] = [from];
    visited.add(key(from.x, from.y));
    parent.set(key(from.x, from.y), null);

    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    while (queue.length) {
      const cur = queue.shift()!;
      if (cur.x === to.x && cur.y === to.y) {
        const path: CellPos[] = [];
        let ck: string | null = key(cur.x, cur.y);
        while (ck) {
          const [xs, ys] = ck.split(',');
          path.unshift({ x: +xs, y: +ys });
          ck = parent.get(ck) ?? null;
        }
        return path;
      }
      for (const [dx, dy] of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        const nk = key(nx, ny);
        if (!visited.has(nk) && this.isWalkable(maze, nx, ny)) {
          visited.add(nk);
          parent.set(nk, key(cur.x, cur.y));
          queue.push({ x: nx, y: ny });
        }
      }
    }
    return [from];
  }
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
