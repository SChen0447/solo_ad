import axios from 'axios';

export type CellType = 'empty' | 'path' | 'tower_slot';

export interface Position {
  x: number;
  y: number;
}

export interface Tower {
  id: string;
  position: Position;
  damage: number;
  range: number;
  attackSpeed: number;
  lastAttackTime: number;
  targetId: string | null;
}

export interface LevelConfig {
  id?: string;
  name: string;
  grid: CellType[][];
  path: Position[];
  towers: Tower[];
  createdAt?: number;
}

const GRID_SIZE = 10;
const CELL_SIZE = 40;

export class LevelEditor {
  grid: CellType[][];
  path: Position[];
  towers: Tower[];
  editMode: 'path' | 'tower';

  constructor() {
    this.grid = this.createEmptyGrid();
    this.path = [];
    this.towers = [];
    this.editMode = 'path';
  }

  private createEmptyGrid(): CellType[][] {
    return Array(GRID_SIZE).fill(null).map(() =>
      Array(GRID_SIZE).fill('empty')
    );
  }

  setEditMode(mode: 'path' | 'tower'): void {
    this.editMode = mode;
  }

  toggleCell(x: number, y: number): void {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

    if (this.editMode === 'path') {
      this.togglePathCell(x, y);
    } else {
      this.toggleTowerSlot(x, y);
    }
  }

  private togglePathCell(x: number, y: number): void {
    const current = this.grid[y][x];
    
    if (current === 'empty') {
      this.grid[y][x] = 'path';
    } else if (current === 'path') {
      this.grid[y][x] = 'empty';
    }
    
    this.generatePath();
  }

  private toggleTowerSlot(x: number, y: number): void {
    const current = this.grid[y][x];
    
    if (current === 'empty') {
      this.grid[y][x] = 'tower_slot';
    } else if (current === 'tower_slot') {
      this.grid[y][x] = 'empty';
      const towerIndex = this.towers.findIndex(
        t => t.position.x === x && t.position.y === y
      );
      if (towerIndex !== -1) {
        this.towers.splice(towerIndex, 1);
      }
    }
  }

  placeTower(x: number, y: number): boolean {
    if (this.grid[y][x] !== 'tower_slot') return false;
    
    const existingTower = this.towers.find(
      t => t.position.x === x && t.position.y === y
    );
    if (existingTower) return false;

    const tower: Tower = {
      id: `tower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: { x, y },
      damage: 10,
      range: 2,
      attackSpeed: 0.5,
      lastAttackTime: 0,
      targetId: null
    };
    
    this.towers.push(tower);
    return true;
  }

  removeTower(towerId: string): void {
    const index = this.towers.findIndex(t => t.id === towerId);
    if (index !== -1) {
      const tower = this.towers[index];
      this.grid[tower.position.y][tower.position.x] = 'tower_slot';
      this.towers.splice(index, 1);
    }
  }

  generatePath(): Position[] {
    const pathCells: Position[] = [];
    const visited = new Set<string>();

    const startCells: Position[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.grid[y][x] === 'path' && x === 0) {
          startCells.push({ x, y });
        }
      }
    }

    if (startCells.length === 0) {
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          if (this.grid[y][x] === 'path') {
            startCells.push({ x, y });
            break;
          }
        }
        if (startCells.length > 0) break;
      }
    }

    const queue: Position[] = [...startCells];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.x},${current.y}`;
      
      if (visited.has(key)) continue;
      visited.add(key);
      pathCells.push(current);

      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 }
      ];

      for (const neighbor of neighbors) {
        const nKey = `${neighbor.x},${neighbor.y}`;
        if (
          neighbor.x >= 0 && neighbor.x < GRID_SIZE &&
          neighbor.y >= 0 && neighbor.y < GRID_SIZE &&
          this.grid[neighbor.y][neighbor.x] === 'path' &&
          !visited.has(nKey)
        ) {
          queue.push(neighbor);
        }
      }
    }

    this.path = pathCells;
    return pathCells;
  }

  exportConfig(): LevelConfig {
    this.generatePath();
    return {
      name: `Level_${Date.now()}`,
      grid: this.grid.map(row => [...row]),
      path: this.path.map(p => ({ ...p })),
      towers: this.towers.map(t => ({ ...t, position: { ...t.position } }))
    };
  }

  async saveLevel(name: string): Promise<string> {
    const config = this.exportConfig();
    config.name = name;
    
    try {
      const response = await axios.post('/api/map', config);
      if (response.data.success) {
        return response.data.id;
      }
      throw new Error(response.data.message || 'Failed to save level');
    } catch (error) {
      console.error('Error saving level:', error);
      throw error;
    }
  }

  async loadLevel(levelId: string): Promise<void> {
    try {
      const response = await axios.get(`/api/map/${levelId}`);
      const config: LevelConfig = response.data;
      
      this.grid = config.grid.map(row => [...row]);
      this.path = config.path.map(p => ({ ...p }));
      this.towers = config.towers.map(t => ({ ...t, position: { ...t.position } }));
    } catch (error) {
      console.error('Error loading level:', error);
      throw error;
    }
  }

  getTowerAt(x: number, y: number): Tower | undefined {
    return this.towers.find(t => t.position.x === x && t.position.y === y);
  }

  clear(): void {
    this.grid = this.createEmptyGrid();
    this.path = [];
    this.towers = [];
  }
}

export { GRID_SIZE, CELL_SIZE };
