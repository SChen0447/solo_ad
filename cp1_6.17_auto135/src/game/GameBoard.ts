import axios from 'axios';
import type { LevelData, Position } from './types';

export class GameBoard {
  static DEFAULT_SIZE = 12;

  static async fetchLevels(): Promise<Array<{ id: number; name: string; unlocked: boolean }>> {
    try {
      const res = await axios.get('/api/levels');
      return res.data;
    } catch {
      return [];
    }
  }

  static async fetchLevel(id: number): Promise<LevelData | null> {
    try {
      const res = await axios.get(`/api/level/${id}`);
      return this.parseLevel(res.data);
    } catch {
      return null;
    }
  }

  static async saveProgress(data: {
    currentLevel?: number;
    lives?: number;
    completedLevel?: number;
  }): Promise<boolean> {
    try {
      await axios.post('/api/save', data);
      return true;
    } catch {
      return false;
    }
  }

  static async loadSave(): Promise<{ currentLevel: number; lives: number; unlockedLevels: number[] }> {
    try {
      const res = await axios.get('/api/save');
      return res.data;
    } catch {
      return { currentLevel: 1, lives: 5, unlockedLevels: [1] };
    }
  }

  static parseLevel(data: any): LevelData {
    return {
      id: data.id,
      name: data.name,
      size: data.size || this.DEFAULT_SIZE,
      walls: data.walls || [],
      lightSources: data.lightSources || [],
      targets: (data.targets || []).map((t: any) => ({ ...t, activated: false })),
      boxes: data.boxes || [],
      player: data.player || { x: 1, y: 1 },
      mirrors: data.mirrors ?? 3,
      prisms: data.prisms ?? 2,
    };
  }

  static serializeLevel(level: LevelData): object {
    return {
      id: level.id,
      name: level.name,
      size: level.size,
      walls: level.walls,
      lightSources: level.lightSources,
      targets: level.targets.map((t) => ({ x: t.x, y: t.y, color: t.color })),
      boxes: level.boxes,
      player: { x: level.player.x, y: level.player.y },
      mirrors: level.mirrors,
      prisms: level.prisms,
    };
  }

  static posEq(a: Position, b: Position): boolean {
    return a.x === b.x && a.y === b.y;
  }

  static isInBounds(pos: Position, size: number): boolean {
    return pos.x >= 0 && pos.x < size && pos.y >= 0 && pos.y < size;
  }

  static dirToDelta(direction: string): Position {
    switch (direction) {
      case 'up':
        return { x: 0, y: -1 };
      case 'down':
        return { x: 0, y: 1 };
      case 'left':
        return { x: -1, y: 0 };
      case 'right':
        return { x: 1, y: 0 };
      default:
        return { x: 0, y: 0 };
    }
  }
}
