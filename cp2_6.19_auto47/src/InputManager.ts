import { BuildingType, GRID_SIZE } from './types';
import { GameEngine } from './GameEngine';
import { Renderer } from './Renderer';
import { AudioManager } from './AudioManager';

export class InputManager {
  engine: GameEngine;
  renderer: Renderer;
  audio: AudioManager;
  canvas: HTMLCanvasElement;

  private isMouseDown: boolean = false;
  private isDrag: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragThreshold: number = 5;
  private lastClickTime: number = 0;
  private lastClickedBuildingId: number | null = null;
  private touchStartTime: number = 0;
  private lastTouchX: number = 0;
  private lastTouchY: number = 0;
  private longPressTimer: number | null = null;

  constructor(canvas: HTMLCanvasElement, engine: GameEngine, renderer: Renderer, audio: AudioManager) {
    this.canvas = canvas;
    this.engine = engine;
    this.renderer = renderer;
    this.audio = audio;
    this.bindEvents();
  }

  private bindEvents() {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));

    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
    this.canvas.addEventListener('touchcancel', this.onTouchEnd.bind(this), { passive: false });

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize() {
    this.renderer.resize();
  }

  private getMousePos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private onMouseDown(e: MouseEvent) {
    if (e.button !== 0 && e.button !== 2) return;

    const pos = this.getMousePos(e);
    this.isMouseDown = true;
    this.isDrag = false;
    this.dragStartX = pos.x;
    this.dragStartY = pos.y;

    if (e.button === 0) {
      this.handleLeftDown(pos.x, pos.y);
    }
  }

  private handleLeftDown(x: number, y: number) {
    const toolbarType = this.renderer.getToolbarBuildingAt(x, y);
    if (toolbarType) {
      this.engine.draggingNewBuilding = toolbarType;
      this.renderer.dragPreview = { type: toolbarType, x, y };
      this.audio.playDragStartSound();
      return;
    }

    const building = this.renderer.getBuildingAt(x, y);
    if (building) {
      building.isDragging = true;
      building.dragOffsetX = x - (this.renderer.offsetX + (building.gridX + 0.5) * this.engine.cellSize);
      building.dragOffsetY = y - (this.renderer.offsetY + (building.gridY + 0.5) * this.engine.cellSize);
      this.renderer.buildingDragPreview = { buildingId: building.id, x, y };
      this.engine.selectedBuildingId = building.id;
      this.engine.upgradeMenuOpenFor = null;
      this.audio.playDragStartSound();
      return;
    }

    const menuBtn = this.renderer.getUpgradeMenuButtonAt(x, y);
    if (menuBtn) {
      if (menuBtn === 'upgrade') {
        const b = this.engine.buildings.find(bx => bx.id === this.engine.upgradeMenuOpenFor);
        if (b && this.engine.upgradeBuilding(b.id)) {
          this.audio.playUpgradeSound();
        } else {
          this.audio.playErrorSound();
        }
      } else if (menuBtn === 'delete') {
        if (this.engine.upgradeMenuOpenFor !== null) {
          this.engine.removeBuilding(this.engine.upgradeMenuOpenFor);
          this.audio.playClickSound();
        }
      }
      return;
    }

    if (this.renderer.getStatsButtonAt(x, y)) {
      this.engine.toggleStatsPanel();
      this.audio.playClickSound();
      return;
    }

    if (this.engine.isMobile && this.engine.statsPanelTargetOpen) {
      const panelTop = window.innerHeight - window.innerHeight * 0.7 * this.engine.statsPanelAnimProgress;
      if (y < panelTop) {
        this.engine.toggleStatsPanel();
      }
    }

    this.engine.selectedBuildingId = null;
    this.engine.upgradeMenuOpenFor = null;
  }

  private onMouseMove(e: MouseEvent) {
    const pos = this.getMousePos(e);

    if (this.isMouseDown) {
      const dx = pos.x - this.dragStartX;
      const dy = pos.y - this.dragStartY;
      if (Math.abs(dx) > this.dragThreshold || Math.abs(dy) > this.dragThreshold) {
        this.isDrag = true;
      }
    }

    const grid = this.renderer.screenToGrid(pos.x, pos.y);
    this.renderer.hoverCellX = grid.x;
    this.renderer.hoverCellY = grid.y;

    if (this.engine.draggingNewBuilding) {
      this.renderer.dragPreview = { type: this.engine.draggingNewBuilding, x: pos.x, y: pos.y };
    }

    for (const b of this.engine.buildings) {
      if (b.isDragging) {
        this.renderer.buildingDragPreview = { buildingId: b.id, x: pos.x, y: pos.y };
      }
    }
  }

  private onMouseUp(e: MouseEvent) {
    if (e.button !== 0 && e.button !== 2) return;
    const pos = this.getMousePos(e);
    this.handleRelease(pos.x, pos.y);
  }

  private handleRelease(x: number, y: number) {
    if (this.engine.draggingNewBuilding) {
      const grid = this.renderer.screenToGrid(x, y);
      if (grid.x >= 0 && grid.x < GRID_SIZE && grid.y >= 0 && grid.y < GRID_SIZE) {
        if (this.engine.placeBuilding(this.engine.draggingNewBuilding, grid.x, grid.y)) {
          this.audio.playPlaceSound();
        } else {
          this.audio.playErrorSound();
        }
      }
      this.engine.draggingNewBuilding = null;
      this.renderer.dragPreview = null;
      this.isMouseDown = false;
      this.isDrag = false;
      return;
    }

    for (const b of this.engine.buildings) {
      if (b.isDragging) {
        const grid = this.renderer.screenToGrid(x, y);
        if (grid.x >= 0 && grid.x < GRID_SIZE && grid.y >= 0 && grid.y < GRID_SIZE) {
          const oldX = b.gridX;
          const oldY = b.gridY;
          if (this.engine.moveBuilding(b.id, grid.x, grid.y)) {
            this.audio.playPlaceSound();
          } else {
            this.audio.playErrorSound();
          }
        }
        b.isDragging = false;
      }
    }
    this.renderer.buildingDragPreview = null;

    if (!this.isDrag && this.isMouseDown) {
      this.handleClick(x, y);
    }

    this.isMouseDown = false;
    this.isDrag = false;
  }

  private handleClick(x: number, y: number) {
    const now = Date.now();
    const building = this.renderer.getBuildingAt(x, y);

    if (this.renderer.getStatsButtonAt(x, y)) {
      return;
    }

    if (this.renderer.getUpgradeMenuButtonAt(x, y)) {
      return;
    }

    if (this.renderer.getToolbarBuildingAt(x, y)) {
      return;
    }

    if (building) {
      if (now - this.lastClickTime < 500 && this.lastClickedBuildingId === building.id) {
        this.engine.upgradeMenuOpenFor = building.id;
        this.audio.playClickSound();
        this.lastClickTime = 0;
        this.lastClickedBuildingId = null;
      } else {
        this.engine.selectedBuildingId = building.id;
        this.lastClickTime = now;
        this.lastClickedBuildingId = building.id;
        this.audio.playClickSound();
      }
    } else {
      this.engine.selectedBuildingId = null;
      this.engine.upgradeMenuOpenFor = null;
    }
  }

  private onContextMenu(e: MouseEvent) {
    e.preventDefault();
    const pos = this.getMousePos(e);
    const building = this.renderer.getBuildingAt(pos.x, pos.y);
    if (building) {
      this.engine.selectedBuildingId = building.id;
      this.engine.upgradeMenuOpenFor = building.id;
      this.audio.playClickSound();
    }
  }

  private onTouchStart(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const pos = this.getMousePos(touch);

    this.touchStartTime = Date.now();
    this.lastTouchX = pos.x;
    this.lastTouchY = pos.y;
    this.isMouseDown = true;
    this.isDrag = false;
    this.dragStartX = pos.x;
    this.dragStartY = pos.y;

    this.longPressTimer = window.setTimeout(() => {
      const building = this.renderer.getBuildingAt(pos.x, pos.y);
      if (building && this.isMouseDown && !this.isDrag) {
        this.engine.selectedBuildingId = building.id;
        this.engine.upgradeMenuOpenFor = building.id;
        this.audio.playClickSound();
      }
    }, 600);

    this.handleLeftDown(pos.x, pos.y);
  }

  private onTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const pos = this.getMousePos(touch);

    const dx = pos.x - this.dragStartX;
    const dy = pos.y - this.dragStartY;
    if (Math.abs(dx) > this.dragThreshold || Math.abs(dy) > this.dragThreshold) {
      this.isDrag = true;
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    }

    this.lastTouchX = pos.x;
    this.lastTouchY = pos.y;

    const grid = this.renderer.screenToGrid(pos.x, pos.y);
    this.renderer.hoverCellX = grid.x;
    this.renderer.hoverCellY = grid.y;

    if (this.engine.draggingNewBuilding) {
      this.renderer.dragPreview = { type: this.engine.draggingNewBuilding, x: pos.x, y: pos.y };
    }

    for (const b of this.engine.buildings) {
      if (b.isDragging) {
        this.renderer.buildingDragPreview = { buildingId: b.id, x: pos.x, y: pos.y };
      }
    }
  }

  private onTouchEnd(e: TouchEvent) {
    e.preventDefault();
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.handleRelease(this.lastTouchX, this.lastTouchY);
  }
}
