/**
 * MazeService - 迷宫数据服务
 *
 * 职责：调用后端 Flask API 获取迷宫数据，解析成结构化模型供 GameScene 使用
 * 数据流向：
 *   GameScene → fetchMaze(seed) → HTTP GET /api/maze/seed
 *   → 连通性+格式校验 → 返回 MazeData 给 GameScene 渲染墙壁/金币/出口
 *   → 校验失败 → 自动降级 localGenerate()
 *
 * 调用关系：
 *   GameScene.ts → fetchMaze() → isWalkable() / findPath()
 */

import axios from 'axios';
import { AppConfig } from '../config/AppConfig';

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

export interface MazeValidationResult {
  valid: boolean;
  errors: string[];
}

export class MazeService {
  /**
   * 迷宫数据格式与连通性校验
   * 检查项：
   *   1. 尺寸与grid行列数匹配
   *   2. grid元素仅为 0 或 1
   *   3. start/exit 在边界内且为走廊
   *   4. start 到 exit 存在可达路径（BFS）
   *   5. 所有金币位置均为走廊
   *   6. 至少 MIN_COINS 个金币
   */
  static validate(maze: Partial<MazeData>): MazeValidationResult {
    const errors: string[] = [];

    if (!maze || typeof maze !== 'object') {
      return { valid: false, errors: ['maze 为空或非对象'] };
    }

    const size = Number(maze.size);
    if (!isFinite(size) || size < 3 || size > 100) {
      errors.push(`size 非法: ${maze.size}`);
    }

    const grid = maze.grid;
    if (!Array.isArray(grid) || grid.length !== size) {
      errors.push(`grid 行数不匹配: 期望 ${size}, 实际 ${grid?.length}`);
    } else {
      for (let y = 0; y < grid.length; y++) {
        const row = grid[y];
        if (!Array.isArray(row) || row.length !== size) {
          errors.push(`grid[${y}] 列数不匹配`);
          break;
        }
        for (let x = 0; x < row.length; x++) {
          const v = row[x];
          if (v !== 0 && v !== 1) {
            errors.push(`grid[${y}][${x}] 非法值: ${v}`);
            break;
          }
        }
        if (errors.length > 2) break;
      }
    }

    const isValidCell = (c: any): c is CellPos =>
      c && typeof c === 'object' &&
      typeof c.x === 'number' && typeof c.y === 'number' &&
      isFinite(c.x) && isFinite(c.y) &&
      c.x >= 0 && c.x < size && c.y >= 0 && c.y < size;

    if (!isValidCell(maze.start)) {
      errors.push('start 坐标非法');
    } else if (Array.isArray(grid) && grid[maze.start.y]?.[maze.start.x] !== 0) {
      errors.push('start 非走廊');
    }

    if (!isValidCell(maze.exit)) {
      errors.push('exit 坐标非法');
    } else if (Array.isArray(grid) && grid[maze.exit.y]?.[maze.exit.x] !== 0) {
      errors.push('exit 非走廊');
    }

    if (Array.isArray(maze.coins)) {
      for (let i = 0; i < maze.coins.length; i++) {
        const c = maze.coins[i];
        if (!isValidCell(c)) {
          errors.push(`coins[${i}] 非法`);
          break;
        }
        if (Array.isArray(grid) && grid[c.y]?.[c.x] !== 0) {
          errors.push(`coins[${i}] 非走廊`);
          break;
        }
      }
      if (maze.coins.length < AppConfig.MIN_COINS) {
        errors.push(`coins 数量不足: 期望 >= ${AppConfig.MIN_COINS}, 实际 ${maze.coins.length}`);
      }
    } else {
      errors.push('coins 非数组');
    }

    if (Array.isArray(maze.aiSpawns)) {
      for (let i = 0; i < maze.aiSpawns.length; i++) {
        if (!isValidCell(maze.aiSpawns[i])) {
          errors.push(`aiSpawns[${i}] 非法`);
          break;
        }
      }
    }

    if (errors.length === 0 && Array.isArray(grid) && maze.start && maze.exit) {
      if (!this.isReachable(grid as number[][], maze.start, maze.exit)) {
        errors.push('start 到 exit 不连通');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private static isReachable(grid: number[][], from: CellPos, to: CellPos): boolean {
    const size = grid.length;
    const visited = new Set<string>();
    const key = (x: number, y: number) => `${x},${y}`;
    const stack: CellPos[] = [from];
    visited.add(key(from.x, from.y));
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur.x === to.x && cur.y === to.y) return true;
      for (const [dx, dy] of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        const nk = key(nx, ny);
        if (
          nx >= 0 && nx < size && ny >= 0 && ny < size &&
          grid[ny][nx] === 0 && !visited.has(nk)
        ) {
          visited.add(nk);
          stack.push({ x: nx, y: ny });
        }
      }
    }
    return false;
  }

  private static async requestWithRetry<T>(
    url: string,
    params?: Record<string, any>
  ): Promise<T> {
    const maxRetries = AppConfig.REQUEST_MAX_RETRIES;
    let lastErr: any = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const resp = await axios.get(`${AppConfig.API_BASE_URL}${url}`, {
          params,
          timeout: AppConfig.REQUEST_TIMEOUT_MS,
        });
        return resp.data as T;
      } catch (err) {
        lastErr = err;
        if (attempt < maxRetries) {
          const delay = 200 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }
    }
    console.warn('[MazeService] API多次尝试失败，降级本地生成', lastErr);
    throw lastErr;
  }

  /**
   * 从后端获取迷宫（带重试+校验），失败则使用本地 DFS 算法降级生成
   */
  static async fetchMaze(seed?: number, size = AppConfig.DEFAULT_MAZE_SIZE): Promise<MazeData> {
    const finalSeed = seed ?? Date.now() & 0x7fffffff;

    try {
      const data = await this.requestWithRetry<any>('/maze/seed', {
        seed: finalSeed,
        size,
      });

      const mazeData: MazeData = {
        seed: Number(data.seed) ?? finalSeed,
        size: Number(data.size) ?? size,
        grid: data.maze as number[][],
        start: data.start as CellPos,
        exit: data.exit as CellPos,
        coins: (data.coins as CellPos[]) ?? [],
        aiSpawns: (data.ai_spawns as CellPos[]) ?? [],
        generatedMs: Number(data.generated_ms) ?? 0,
      };

      const validation = this.validate(mazeData);
      if (!validation.valid) {
        console.warn(
          `[MazeService] 后端迷宫校验失败 (${validation.errors.join('; ')})，降级本地生成`
        );
        return this.localGenerate(finalSeed, size);
      }

      return mazeData;
    } catch {
      return this.localGenerate(finalSeed, size);
    }
  }

  /**
   * 本地降级生成：DFS 回溯（始终保证连通）
   */
  static localGenerate(seed: number, size: number): MazeData {
    size = Math.max(5, Math.min(50, size | 0));
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
          grid[y + (dy >> 1)][x + (dx >> 1)] = 0;
          carve(nx, ny);
        }
      }
    };

    carve(0, 0);
    grid[0][0] = 0;
    grid[size - 1][size - 1] = 0;

    if (!this.isReachable(grid, { x: 0, y: 0 }, { x: size - 1, y: size - 1 })) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (x < size - 1 || y < size - 1) grid[y][x] = 0;
        }
      }
    }

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

    const targetCoins = Math.min(corridor.length, Math.max(AppConfig.MIN_COINS, 8 + (rng() * 3 | 0)));
    const coins: CellPos[] = corridor.slice(0, targetCoins);
    while (coins.length < AppConfig.MIN_COINS && corridor.length > coins.length) {
      coins.push(corridor[coins.length]);
    }

    const aiSpawns: CellPos[] = [];
    for (const c of corridor) {
      if (c.x >= 3 || c.y >= 3) {
        aiSpawns.push(c);
        if (aiSpawns.length >= 3) break;
      }
    }

    const result: MazeData = {
      seed,
      size,
      grid,
      start: { x: 0, y: 0 },
      exit: { x: size - 1, y: size - 1 },
      coins,
      aiSpawns,
      generatedMs: 0,
    };

    const v = this.validate(result);
    if (!v.valid) {
      console.warn('[MazeService] localGenerate 校验未通过，应用紧急修复', v.errors);
      result.grid = result.grid.map((row) => row.map(() => 0));
    }
    return result;
  }

  /** 网格是否可通行 */
  static isWalkable(maze: MazeData, x: number, y: number): boolean {
    if (!maze || !maze.grid) return false;
    if (x < 0 || y < 0 || x >= maze.size || y >= maze.size) return false;
    return maze.grid[y][x] === 0;
  }

  /** 简单 BFS 找两个走廊格之间的路径（用于AI巡逻） */
  static findPath(maze: MazeData, from: CellPos, to: CellPos): CellPos[] {
    if (!maze || !maze.grid) return [from];
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
  let a = (seed >>> 0) || 1;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
