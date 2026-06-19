import { Point, MapElements, MazeGrid, AppEvent, EventBus } from './types';

export interface ExportedMapData {
  width: number;
  height: number;
  grid: MazeGrid;
  startPoints: Point[];
  endPoints: Point[];
  monsterSpawnPoints: Point[];
  exportedAt: string;
  version: string;
}

export class Exporter {
  private grid: MazeGrid | null = null;
  private width = 0;
  private height = 0;
  private elements: MapElements = {
    starts: [],
    ends: [],
    monsters: []
  };

  constructor(private eventBus: EventBus) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on(AppEvent.MAZE_GENERATED, (payload) => {
      this.grid = payload.grid;
      this.width = payload.width;
      this.height = payload.height;
    });

    this.eventBus.on(AppEvent.ELEMENT_PLACED, (payload) => {
      this.updateElement(payload.type, payload.point, true);
    });

    this.eventBus.on(AppEvent.ELEMENT_REMOVED, (payload) => {
      this.updateElement(payload.type, payload.point, false);
    });

    this.eventBus.on(AppEvent.EXPORT_REQUESTED, () => {
      this.exportToJSON();
    });
  }

  private updateElement(type: string, point: Point, add: boolean): void {
    let list: Point[] | null = null;

    switch (type) {
      case 'start':
        list = this.elements.starts;
        break;
      case 'end':
        list = this.elements.ends;
        break;
      case 'monster':
        list = this.elements.monsters;
        break;
    }

    if (!list) return;

    if (add) {
      list.push(point);
    } else {
      const index = list.findIndex((p) => p.x === point.x && p.y === point.y);
      if (index !== -1) {
        list.splice(index, 1);
      }
    }
  }

  exportToJSON(): void {
    if (!this.grid) {
      this.eventBus.emit(AppEvent.SHOW_MESSAGE, {
        text: '请先生成迷宫',
        type: 'warning'
      });
      return;
    }

    const exportData: ExportedMapData = {
      width: this.width,
      height: this.height,
      grid: this.cloneGrid(this.grid),
      startPoints: [...this.elements.starts],
      endPoints: [...this.elements.ends],
      monsterSpawnPoints: [...this.elements.monsters],
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    this.downloadFile(jsonString, `maze_${this.width}x${this.height}_${Date.now()}.json`);

    this.eventBus.emit(AppEvent.SHOW_MESSAGE, {
      text: `迷宫数据已导出: ${this.width}x${this.height}`,
      type: 'info'
    });
  }

  importFromJSON(jsonString: string): ExportedMapData | null {
    try {
      const data = JSON.parse(jsonString) as ExportedMapData;

      if (!this.validateImportData(data)) {
        throw new Error('Invalid map data structure');
      }

      this.grid = this.cloneGrid(data.grid);
      this.width = data.width;
      this.height = data.height;
      this.elements = {
        starts: [...data.startPoints],
        ends: [...data.endPoints],
        monsters: [...data.monsterSpawnPoints]
      };

      this.eventBus.emit(AppEvent.MAZE_GENERATED, {
        grid: this.grid,
        width: this.width,
        height: this.height,
        entrance: data.startPoints[0] || { x: 1, y: 0 },
        exit: data.endPoints[0] || { x: this.width - 2, y: this.height - 1 }
      });

      return data;
    } catch (error) {
      console.error('Import failed:', error);
      this.eventBus.emit(AppEvent.SHOW_MESSAGE, {
        text: '导入失败: 无效的JSON格式',
        type: 'error'
      });
      return null;
    }
  }

  private validateImportData(data: unknown): data is ExportedMapData {
    const d = data as ExportedMapData;
    return (
      typeof d === 'object' &&
      d !== null &&
      typeof d.width === 'number' &&
      typeof d.height === 'number' &&
      Array.isArray(d.grid) &&
      d.grid.length === d.height &&
      d.grid.every((row) => Array.isArray(row) && row.length === d.width) &&
      Array.isArray(d.startPoints) &&
      Array.isArray(d.endPoints) &&
      Array.isArray(d.monsterSpawnPoints)
    );
  }

  private cloneGrid(grid: MazeGrid): MazeGrid {
    return grid.map((row) => [...row]);
  }

  private downloadFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  getCurrentData(): ExportedMapData | null {
    if (!this.grid) return null;
    return {
      width: this.width,
      height: this.height,
      grid: this.cloneGrid(this.grid),
      startPoints: [...this.elements.starts],
      endPoints: [...this.elements.ends],
      monsterSpawnPoints: [...this.elements.monsters],
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
  }
}
