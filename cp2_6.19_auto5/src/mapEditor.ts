import {
  Point,
  ElementType,
  ToolType,
  MapElements,
  MazeGrid,
  AppEvent,
  EventBus,
  MAX_ELEMENTS
} from './types';
import { MazeGenerator } from './mazeGenerator';

export class MapEditor {
  private elements: MapElements = {
    starts: [],
    ends: [],
    monsters: []
  };

  private currentTool: ToolType = null;
  private mazeGrid: MazeGrid | null = null;
  private mazeGenerator: MazeGenerator;

  constructor(private eventBus: EventBus) {
    this.mazeGenerator = new MazeGenerator();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on(AppEvent.MAZE_GENERATED, (payload) => {
      this.mazeGrid = payload.grid;
      this.clearAllElements();
    });

    this.eventBus.on(AppEvent.TOOL_CHANGED, (payload) => {
      this.currentTool = payload.tool;
    });
  }

  handleCellClick(x: number, y: number): void {
    if (!this.mazeGrid) {
      this.showMessage('请先生成迷宫', 'warning');
      return;
    }

    if (!this.mazeGenerator.isPath(this.mazeGrid, x, y)) {
      this.showMessage('只能在通路上放置元素', 'warning');
      return;
    }

    const existingElement = this.findElementAt(x, y);

    if (this.currentTool === 'erase') {
      if (existingElement) {
        this.removeElement(existingElement.type, x, y);
      }
      return;
    }

    if (existingElement) {
      if (existingElement.type === this.currentTool) {
        this.removeElement(existingElement.type, x, y);
      } else {
        this.showMessage('该位置已有其他元素', 'warning');
      }
      return;
    }

    if (this.currentTool === 'start' || this.currentTool === 'end' || this.currentTool === 'monster') {
      this.placeElement(this.currentTool, x, y);
    }
  }

  private placeElement(type: ElementType, x: number, y: number): boolean {
    const point: Point = { x, y };

    if (!this.canPlaceElement(type, x, y)) {
      return false;
    }

    switch (type) {
      case 'start':
        this.elements.starts.push(point);
        break;
      case 'end':
        this.elements.ends.push(point);
        break;
      case 'monster':
        this.elements.monsters.push(point);
        break;
      default:
        return false;
    }

    this.eventBus.emit(AppEvent.ELEMENT_PLACED, { type, point });
    this.eventBus.emit(AppEvent.RENDER_UPDATE);
    return true;
  }

  private removeElement(type: ElementType, x: number, y: number): boolean {
    const point: Point = { x, y };
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
      default:
        return false;
    }

    const index = list.findIndex((p) => p.x === x && p.y === y);
    if (index === -1) {
      return false;
    }

    list.splice(index, 1);
    this.eventBus.emit(AppEvent.ELEMENT_REMOVED, { type, point });
    this.eventBus.emit(AppEvent.RENDER_UPDATE);
    return true;
  }

  private canPlaceElement(type: ElementType, x: number, y: number): boolean {
    const point: Point = { x, y };

    if (this.findElementAt(x, y)) {
      this.showMessage('该位置已有元素', 'warning');
      return false;
    }

    switch (type) {
      case 'start':
        if (this.elements.starts.length >= MAX_ELEMENTS) {
          this.showMessage(`起点最多放置${MAX_ELEMENTS}个`, 'warning');
          return false;
        }
        break;
      case 'end':
        if (this.elements.ends.length >= MAX_ELEMENTS) {
          this.showMessage(`终点最多放置${MAX_ELEMENTS}个`, 'warning');
          return false;
        }
        break;
      case 'monster':
        if (this.elements.monsters.length >= MAX_ELEMENTS) {
          this.showMessage(`怪物刷新点最多放置${MAX_ELEMENTS}个`, 'warning');
          return false;
        }

        const isAdjacentToStartOrEnd =
          this.elements.starts.some((s) => this.mazeGenerator.arePointsAdjacent(s, point)) ||
          this.elements.ends.some((e) => this.mazeGenerator.arePointsAdjacent(e, point));

        if (isAdjacentToStartOrEnd) {
          this.showMessage('怪物刷新点不能放置在起点或终点相邻的格子', 'warning');
          return false;
        }
        break;
    }

    return true;
  }

  findElementAt(x: number, y: number): { type: ElementType; point: Point } | null {
    if (this.elements.starts.some((p) => p.x === x && p.y === y)) {
      return { type: 'start', point: { x, y } };
    }
    if (this.elements.ends.some((p) => p.x === x && p.y === y)) {
      return { type: 'end', point: { x, y } };
    }
    if (this.elements.monsters.some((p) => p.x === x && p.y === y)) {
      return { type: 'monster', point: { x, y } };
    }
    return null;
  }

  clearAllElements(): void {
    this.elements = {
      starts: [],
      ends: [],
      monsters: []
    };
    this.eventBus.emit(AppEvent.RENDER_UPDATE);
  }

  getElements(): MapElements {
    return {
      starts: [...this.elements.starts],
      ends: [...this.elements.ends],
      monsters: [...this.elements.monsters]
    };
  }

  getElementCount(type: 'starts' | 'ends' | 'monsters'): number {
    return this.elements[type].length;
  }

  getCurrentTool(): ToolType {
    return this.currentTool;
  }

  private showMessage(text: string, type: 'info' | 'warning' | 'error'): void {
    this.eventBus.emit(AppEvent.SHOW_MESSAGE, { text, type });
  }
}
