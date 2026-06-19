import type { BuildingType } from './GameEngine';

export interface InputCallbacks {
  onPlaceBuilding: (type: BuildingType, gridX: number, gridY: number) => void;
  onMoveBuilding: (buildingId: number, gridX: number, gridY: number) => void;
  onUpgradeBuilding: (buildingId: number) => void;
  onSelectBuilding: (buildingId: number | null) => void;
  onToggleStats: () => void;
  onCloseUpgradeMenu: () => void;
}

interface DragState {
  active: boolean;
  source: 'toolbar' | 'grid';
  buildingType: BuildingType | null;
  buildingId: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  private callbacks: InputCallbacks;
  private drag: DragState;
  private mouseX = 0;
  private mouseY = 0;
  private isMobile: boolean;
  private toolbarWidth = 80;
  private statsButtonArea = { x: 0, y: 0, w: 0, h: 0 };
  private longPressTimer: number | null = null;
  private longPressFired = false;

  constructor(canvas: HTMLCanvasElement, callbacks: InputCallbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.drag = {
      active: false,
      source: 'toolbar',
      buildingType: null,
      buildingId: -1,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
    };
    this.isMobile = 'ontouchstart' in window;
    this.bindEvents();
  }

  setToolbarWidth(w: number): void {
    this.toolbarWidth = w;
  }

  setStatsButtonArea(x: number, y: number, w: number, h: number): void {
    this.statsButtonArea = { x, y, w, h };
  }

  getDragState(): DragState {
    return this.drag;
  }

  getMousePosition(): { x: number; y: number } {
    return { x: this.mouseX, y: this.mouseY };
  }

  private bindEvents(): void {
    if (this.isMobile) {
      this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
      this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
      this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
    } else {
      this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
      this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
      this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
      this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));
    }
  }

  private getCanvasPos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  private isOverStatsButton(x: number, y: number): boolean {
    const b = this.statsButtonArea;
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  private isOverToolbar(x: number): boolean {
    return x < this.toolbarWidth;
  }

  private getToolbarBuildingType(x: number, y: number): BuildingType | null {
    if (x >= this.toolbarWidth) return null;
    const types: BuildingType[] = ['fisherman', 'hotel', 'restaurant', 'lighthouse', 'garden'];
    const cardH = 70;
    const startY = 60;
    for (let i = 0; i < types.length; i++) {
      const cy = startY + i * cardH;
      if (y >= cy && y < cy + cardH - 5) {
        return types[i];
      }
    }
    return null;
  }

  onMouseDown(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);
    this.mouseX = pos.x;
    this.mouseY = pos.y;

    if (this.isOverStatsButton(pos.x, pos.y)) {
      this.callbacks.onToggleStats();
      return;
    }

    if (e.button === 2) return;

    const toolbarType = this.getToolbarBuildingType(pos.x, pos.y);
    if (toolbarType) {
      this.drag = {
        active: true,
        source: 'toolbar',
        buildingType: toolbarType,
        buildingId: -1,
        startX: pos.x,
        startY: pos.y,
        offsetX: 0,
        offsetY: 0,
      };
      this.callbacks.onSelectBuilding(null);
      return;
    }

    if (!this.isOverToolbar(pos.x)) {
      this.callbacks.onSelectBuilding(null);
    }
  }

  onMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);
    this.mouseX = pos.x;
    this.mouseY = pos.y;
  }

  onMouseUp(e: MouseEvent): void {
    const pos = this.getCanvasPos(e);
    this.mouseX = pos.x;
    this.mouseY = pos.y;

    if (e.button === 2) return;

    if (this.drag.active) {
      this.drag.active = false;
    }
  }

  onContextMenu(e: MouseEvent): void {
    e.preventDefault();
    const pos = this.getCanvasPos(e);
    this.mouseX = pos.x;
    this.mouseY = pos.y;

    if (this.isOverStatsButton(pos.x, pos.y)) return;
    if (this.isOverToolbar(pos.x)) return;
  }

  onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const pos = this.getCanvasPos(touch);
    this.mouseX = pos.x;
    this.mouseY = pos.y;
    this.longPressFired = false;

    if (this.isOverStatsButton(pos.x, pos.y)) {
      this.callbacks.onToggleStats();
      return;
    }

    const toolbarType = this.getToolbarBuildingType(pos.x, pos.y);
    if (toolbarType) {
      this.drag = {
        active: true,
        source: 'toolbar',
        buildingType: toolbarType,
        buildingId: -1,
        startX: pos.x,
        startY: pos.y,
        offsetX: 0,
        offsetY: 0,
      };
      this.callbacks.onSelectBuilding(null);
      return;
    }

    this.longPressTimer = window.setTimeout(() => {
      this.longPressFired = true;
      this.callbacks.onCloseUpgradeMenu();
    }, 500);
  }

  onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const pos = this.getCanvasPos(touch);
    this.mouseX = pos.x;
    this.mouseY = pos.y;

    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    const dx = pos.x - this.mouseX;
    const dy = pos.y - this.mouseY;
    if (!this.drag.active && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      this.drag.active = true;
    }
  }

  onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    if (this.drag.active) {
      this.drag.active = false;
    }

    this.longPressFired = false;
  }

  isDragging(): boolean {
    return this.drag.active;
  }

  getDragBuildingType(): BuildingType | null {
    return this.drag.active ? this.drag.buildingType : null;
  }

  getDragSource(): 'toolbar' | 'grid' {
    return this.drag.source;
  }

  getDragBuildingId(): number {
    return this.drag.buildingId;
  }
}
