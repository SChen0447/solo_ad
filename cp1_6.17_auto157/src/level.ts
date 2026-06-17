export enum ElementType {
  GROUND = 'ground',
  SPIKE = 'spike',
  MOVING_PLATFORM = 'moving_platform',
  SPRING = 'spring',
  PORTAL = 'portal',
  COIN = 'coin',
  FLAG = 'flag',
  HIDDEN_BLOCK = 'hidden_block'
}

export interface LevelElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  passable: boolean;
}

export interface LevelState {
  elements: LevelElement[];
  gridSize: number;
  width: number;
  height: number;
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  selectedIds: string[];
}

export interface ElementConfig {
  type: ElementType;
  name: string;
  color: string;
  passable: boolean;
  defaultWidth: number;
  defaultHeight: number;
  description: string;
}

export const ELEMENT_CONFIGS: Record<ElementType, ElementConfig> = {
  [ElementType.GROUND]: {
    type: ElementType.GROUND,
    name: '地面砖块',
    color: '#4D4D4D',
    passable: false,
    defaultWidth: 2,
    defaultHeight: 1,
    description: '不可通行'
  },
  [ElementType.SPIKE]: {
    type: ElementType.SPIKE,
    name: '尖刺',
    color: '#E74C3C',
    passable: false,
    defaultWidth: 1,
    defaultHeight: 1,
    description: '不可通行，造成伤害'
  },
  [ElementType.MOVING_PLATFORM]: {
    type: ElementType.MOVING_PLATFORM,
    name: '移动平台',
    color: '#5DADE2',
    passable: true,
    defaultWidth: 3,
    defaultHeight: 1,
    description: '可通行，可移动'
  },
  [ElementType.SPRING]: {
    type: ElementType.SPRING,
    name: '弹簧',
    color: '#27AE60',
    passable: true,
    defaultWidth: 1,
    defaultHeight: 1,
    description: '可通行，提供弹跳'
  },
  [ElementType.PORTAL]: {
    type: ElementType.PORTAL,
    name: '传送门',
    color: '#8E44AD',
    passable: true,
    defaultWidth: 1,
    defaultHeight: 2,
    description: '可通行，传送玩家'
  },
  [ElementType.COIN]: {
    type: ElementType.COIN,
    name: '金币',
    color: '#F1C40F',
    passable: true,
    defaultWidth: 1,
    defaultHeight: 1,
    description: '可通行，收集物品'
  },
  [ElementType.FLAG]: {
    type: ElementType.FLAG,
    name: '终点旗杆',
    color: '#900C3F',
    passable: true,
    defaultWidth: 1,
    defaultHeight: 3,
    description: '可通行，关卡终点'
  },
  [ElementType.HIDDEN_BLOCK]: {
    type: ElementType.HIDDEN_BLOCK,
    name: '隐藏砖块',
    color: '#BDC3C7',
    passable: false,
    defaultWidth: 1,
    defaultHeight: 1,
    description: '不可通行，隐藏显示'
  }
};

let elementIdCounter = 0;

function generateId(): string {
  return `element_${Date.now()}_${elementIdCounter++}`;
}

export class LevelManager {
  private state: LevelState;

  constructor(gridSize: number = 10, width: number = 100, height: number = 50) {
    this.state = {
      elements: [],
      gridSize,
      width,
      height,
      startPos: { x: 1, y: height - 2 },
      endPos: { x: width - 2, y: height - 2 },
      selectedIds: []
    };
  }

  getState(): LevelState {
    return { ...this.state };
  }

  getElements(): LevelElement[] {
    return [...this.state.elements];
  }

  getGridSize(): number {
    return this.state.gridSize;
  }

  getDimensions(): { width: number; height: number } {
    return { width: this.state.width, height: this.state.height };
  }

  setDimensions(width: number, height: number): void {
    this.state.width = width;
    this.state.height = height;
    if (this.state.startPos.x >= width) this.state.startPos.x = width - 2;
    if (this.state.startPos.y >= height) this.state.startPos.y = height - 2;
    if (this.state.endPos.x >= width) this.state.endPos.x = width - 2;
    if (this.state.endPos.y >= height) this.state.endPos.y = height - 2;
  }

  getStartPos(): { x: number; y: number } {
    return { ...this.state.startPos };
  }

  setStartPos(x: number, y: number): void {
    this.state.startPos = { x, y };
  }

  getEndPos(): { x: number; y: number } {
    return { ...this.state.endPos };
  }

  setEndPos(x: number, y: number): void {
    this.state.endPos = { x, y };
  }

  getSelectedIds(): string[] {
    return [...this.state.selectedIds];
  }

  setSelectedIds(ids: string[]): void {
    this.state.selectedIds = [...ids];
  }

  clearSelection(): void {
    this.state.selectedIds = [];
  }

  addElement(type: ElementType, gridX: number, gridY: number): LevelElement | null {
    const config = ELEMENT_CONFIGS[type];
    if (!config) return null;

    if (gridX < 0 || gridY < 0 || 
        gridX + config.defaultWidth > this.state.width || 
        gridY + config.defaultHeight > this.state.height) {
      return null;
    }

    const element: LevelElement = {
      id: generateId(),
      type,
      x: gridX,
      y: gridY,
      width: config.defaultWidth,
      height: config.defaultHeight,
      rotation: 0,
      passable: config.passable
    };

    this.state.elements.push(element);
    return element;
  }

  removeElement(id: string): boolean {
    const index = this.state.elements.findIndex(e => e.id === id);
    if (index !== -1) {
      this.state.elements.splice(index, 1);
      this.state.selectedIds = this.state.selectedIds.filter(sid => sid !== id);
      return true;
    }
    return false;
  }

  removeElements(ids: string[]): number {
    let count = 0;
    for (const id of ids) {
      if (this.removeElement(id)) count++;
    }
    return count;
  }

  getElement(id: string): LevelElement | undefined {
    return this.state.elements.find(e => e.id === id);
  }

  findElementAt(gridX: number, gridY: number): LevelElement | undefined {
    return this.state.elements.find(e => 
      gridX >= e.x && gridX < e.x + e.width &&
      gridY >= e.y && gridY < e.y + e.height
    );
  }

  findElementsInRect(startX: number, startY: number, endX: number, endY: number): LevelElement[] {
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);

    return this.state.elements.filter(e => 
      e.x < maxX && e.x + e.width > minX &&
      e.y < maxY && e.y + e.height > minY
    );
  }

  moveElement(id: string, newGridX: number, newGridY: number): boolean {
    const element = this.getElement(id);
    if (!element) return false;

    if (newGridX < 0 || newGridY < 0 ||
        newGridX + element.width > this.state.width ||
        newGridY + element.height > this.state.height) {
      return false;
    }

    element.x = newGridX;
    element.y = newGridY;
    return true;
  }

  rotateElement(id: string, direction: 1 | -1 = 1): boolean {
    const element = this.getElement(id);
    if (!element) return false;
    
    element.rotation = (element.rotation + direction * 90 + 360) % 360;
    
    const temp = element.width;
    element.width = element.height;
    element.height = temp;
    
    if (element.x + element.width > this.state.width ||
        element.y + element.height > this.state.height) {
      element.rotation = (element.rotation - direction * 90 + 360) % 360;
      element.height = element.width;
      element.width = temp;
      return false;
    }
    
    return true;
  }

  copyElement(id: string): LevelElement | null {
    const element = this.getElement(id);
    if (!element) return null;

    const newElement: LevelElement = {
      ...element,
      id: generateId(),
      x: element.x + 1,
      y: element.y
    };

    if (newElement.x + newElement.width > this.state.width) {
      newElement.x = Math.max(0, this.state.width - newElement.width);
    }

    this.state.elements.push(newElement);
    return newElement;
  }

  copyElements(ids: string[]): LevelElement[] {
    const newElements: LevelElement[] = [];
    for (const id of ids) {
      const newElement = this.copyElement(id);
      if (newElement) newElements.push(newElement);
    }
    return newElements;
  }

  selectInRect(startX: number, startY: number, endX: number, endY: number): string[] {
    const elements = this.findElementsInRect(startX, startY, endX, endY);
    this.state.selectedIds = elements.map(e => e.id);
    return this.state.selectedIds;
  }

  toggleSelection(id: string): void {
    const index = this.state.selectedIds.indexOf(id);
    if (index === -1) {
      this.state.selectedIds.push(id);
    } else {
      this.state.selectedIds.splice(index, 1);
    }
  }

  isSelected(id: string): boolean {
    return this.state.selectedIds.includes(id);
  }

  moveSelected(deltaX: number, deltaY: number): boolean {
    if (this.state.selectedIds.length === 0) return false;
    
    let canMove = true;
    for (const id of this.state.selectedIds) {
      const element = this.getElement(id);
      if (!element) continue;
      
      const newX = element.x + deltaX;
      const newY = element.y + deltaY;
      
      if (newX < 0 || newY < 0 ||
          newX + element.width > this.state.width ||
          newY + element.height > this.state.height) {
        canMove = false;
        break;
      }
    }
    
    if (!canMove) return false;
    
    for (const id of this.state.selectedIds) {
      const element = this.getElement(id);
      if (element) {
        element.x += deltaX;
        element.y += deltaY;
      }
    }
    
    return true;
  }

  getCollisionGrid(): boolean[][] {
    const grid: boolean[][] = [];
    for (let y = 0; y < this.state.height; y++) {
      grid[y] = [];
      for (let x = 0; x < this.state.width; x++) {
        grid[y][x] = false;
      }
    }

    for (const element of this.state.elements) {
      if (!element.passable) {
        for (let dy = 0; dy < element.height; dy++) {
          for (let dx = 0; dx < element.width; dx++) {
            const gy = element.y + dy;
            const gx = element.x + dx;
            if (gy >= 0 && gy < this.state.height && gx >= 0 && gx < this.state.width) {
              grid[gy][gx] = true;
            }
          }
        }
      }
    }

    return grid;
  }
}
