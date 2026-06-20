import * as THREE from 'three';
import { MazeData } from './mazeGenerator';

interface BFSResult {
  nextRow: number;
  nextCol: number;
  distance: number;
}

export class AIHunter {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  private maze: MazeData;
  private cellSize: number;
  private moveSpeed: number;
  private currentRow: number;
  private currentCol: number;
  private targetRow: number;
  private targetCol: number;
  private worldX: number;
  private worldZ: number;
  private nextRow: number;
  private nextCol: number;
  private pathRecalcInterval: number;
  private lastRecalcTime: number;
  private glowPhase: number = 0;

  constructor(
    maze: MazeData,
    cellSize: number,
    startRow: number,
    startCol: number,
    playerMoveSpeed: number
  ) {
    this.maze = maze;
    this.cellSize = cellSize;
    this.moveSpeed = playerMoveSpeed * 0.8;
    this.currentRow = startRow;
    this.currentCol = startCol;
    this.targetRow = startRow;
    this.targetCol = startCol;
    this.nextRow = startRow;
    this.nextCol = startCol;
    this.worldX = startCol * cellSize;
    this.worldZ = startRow * cellSize;
    this.pathRecalcInterval = 2.0;
    this.lastRecalcTime = -10;

    const geometry = new THREE.SphereGeometry(0.35, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.9,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(this.worldX, 0.5, this.worldZ);

    this.light = new THREE.PointLight(0xff0000, 2, 8);
    this.light.position.set(this.worldX, 1, this.worldZ);
  }

  update(delta: number, time: number, playerRow: number, playerCol: number): void {
    if (time - this.lastRecalcTime >= this.pathRecalcInterval) {
      this.lastRecalcTime = time;
      const result = this.bfs(this.currentRow, this.currentCol, playerRow, playerCol);
      if (result) {
        this.nextRow = result.nextRow;
        this.nextCol = result.nextCol;
      }
    }

    const targetX = this.nextCol * this.cellSize;
    const targetZ = this.nextRow * this.cellSize;
    const dx = targetX - this.worldX;
    const dz = targetZ - this.worldZ;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.1) {
      this.currentRow = this.nextRow;
      this.currentCol = this.nextCol;
      this.worldX = targetX;
      this.worldZ = targetZ;

      const result = this.bfs(this.currentRow, this.currentCol, playerRow, playerCol);
      if (result) {
        this.nextRow = result.nextRow;
        this.nextCol = result.nextCol;
      }
    } else {
      const step = this.moveSpeed * delta;
      const ratio = Math.min(step / dist, 1);
      this.worldX += dx * ratio;
      this.worldZ += dz * ratio;
    }

    this.mesh.position.x = this.worldX;
    this.mesh.position.z = this.worldZ;

    this.light.position.x = this.worldX;
    this.light.position.z = this.worldZ;

    this.glowPhase += delta;
    const playerDist = this.getDistanceToPlayer(playerRow, playerCol);
    const glowSpeed = playerDist < 3 ? 8 : 3;
    const glow = 0.5 + Math.sin(this.glowPhase * glowSpeed) * 0.5;
    this.light.intensity = 1 + glow * 3;
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 + glow * 0.4;
  }

  private bfs(
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ): BFSResult | null {
    const rows = this.maze.length;
    const cols = this.maze[0].length;

    if (
      fromRow < 0 || fromRow >= rows || fromCol < 0 || fromCol >= cols ||
      toRow < 0 || toRow >= rows || toCol < 0 || toCol >= cols
    ) return null;

    if (this.maze[fromRow][fromCol] === 1 || this.maze[toRow][toCol] === 1) return null;

    const visited: boolean[][] = Array.from({ length: rows }, () =>
      Array(cols).fill(false)
    );
    const parent: Map<string, string> = new Map();
    const queue: [number, number][] = [[fromRow, fromCol]];
    visited[fromRow][fromCol] = true;

    const dirs: [number, number][] = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;

      if (r === toRow && c === toCol) {
        let cur = `${toRow},${toCol}`;
        let steps = 0;
        while (parent.get(cur) && parent.get(cur) !== `${fromRow},${fromCol}`) {
          cur = parent.get(cur)!;
          steps++;
        }
        const parts = cur.split(',');
        return {
          nextRow: parseInt(parts[0]),
          nextCol: parseInt(parts[1]),
          distance: steps + 1,
        };
      }

      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (
          nr >= 0 && nr < rows && nc >= 0 && nc < cols &&
          !visited[nr][nc] && this.maze[nr][nc] === 0
        ) {
          visited[nr][nc] = true;
          parent.set(`${nr},${nc}`, `${r},${c}`);
          queue.push([nr, nc]);
        }
      }
    }

    return null;
  }

  private getDistanceToPlayer(playerRow: number, playerCol: number): number {
    const dr = this.currentRow - playerRow;
    const dc = this.currentCol - playerCol;
    return Math.sqrt(dr * dr + dc * dc);
  }

  getWorldPosition(): { x: number; z: number } {
    return { x: this.worldX, z: this.worldZ };
  }

  getGridPosition(): { row: number; col: number } {
    return { row: this.currentRow, col: this.currentCol };
  }

  getDistanceToPlayerWorld(px: number, pz: number): number {
    const dx = this.worldX - px;
    const dz = this.worldZ - pz;
    return Math.sqrt(dx * dx + dz * dz);
  }
}
