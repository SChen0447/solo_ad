import type { TerrainType, ToolType, Tile, Enemy as _Enemy, Collectible as _Collectible, LevelData } from './renderer';
import { Renderer } from './renderer';

export interface EditorState {
  currentTool: ToolType;
  level: LevelData;
  hoverTile: { x: number; y: number } | null;
  isMouseDown: boolean;
  lastPlacedTile: { x: number; y: number } | null;
}

export interface EditorCallbacks {
  onLevelChange: (level: LevelData) => void;
  onHoverChange: (tile: { x: number; y: number } | null) => void;
  onToolChange: (tool: ToolType) => void;
}

export class LevelEditor {
  private state: EditorState;
  private callbacks: EditorCallbacks;
  private gridWidth: number;
  private gridHeight: number;
  private tileSize: number;
  private canvas: HTMLCanvasElement;
  private offsetX: number;
  private offsetY: number;
  private _toolbarContainer: HTMLElement | null = null;
  private terrainContainer: HTMLElement | null = null;
  private entityContainer: HTMLElement | null = null;
  private utilityContainer: HTMLElement | null = null;
  private editorAreaWidth: number;
  private editorAreaHeight: number;

  constructor(
    canvas: HTMLCanvasElement,
    gridWidth: number,
    gridHeight: number,
    tileSize: number,
    callbacks: EditorCallbacks,
    offsetX: number = 0,
    offsetY: number = 0
  ) {
    this.canvas = canvas;
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.tileSize = tileSize;
    this.callbacks = callbacks;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.editorAreaWidth = gridWidth * tileSize;
    this.editorAreaHeight = gridHeight * tileSize;

    this.state = {
      currentTool: 'brick',
      level: this.createEmptyLevel(),
      hoverTile: null,
      isMouseDown: false,
      lastPlacedTile: null,
    };

    this.bindEvents();
  }

  private createEmptyLevel(): LevelData {
    const tiles: Tile[] = [];
    for (let x = 0; x < this.gridWidth; x++) {
      tiles.push({ x, y: this.gridHeight - 1, type: 'grass' });
      tiles.push({ x, y: this.gridHeight - 2, type: 'brick' });
    }
    tiles.push({ x: 5, y: this.gridHeight - 5, type: 'platform' });
    tiles.push({ x: 6, y: this.gridHeight - 5, type: 'platform' });
    tiles.push({ x: 7, y: this.gridHeight - 5, type: 'platform' });
    tiles.push({ x: 10, y: this.gridHeight - 7, type: 'platform' });
    tiles.push({ x: 11, y: this.gridHeight - 7, type: 'platform' });
    tiles.push({ x: 14, y: this.gridHeight - 4, type: 'spike' });

    return {
      tiles,
      enemies: [
        {
          x: 8,
          y: this.gridHeight - 2,
          patrolLeft: 7,
          patrolRight: 10,
          speed: 0.02,
          direction: 1,
          initialX: 8,
        },
      ],
      collectibles: [
        { x: 6, y: this.gridHeight - 6, collected: false, rotation: 0, collectAnim: 0 },
        { x: 11, y: this.gridHeight - 8, collected: false, rotation: 0, collectAnim: 0 },
      ],
      spawnPoint: { x: 2, y: this.gridHeight - 3 },
    };
  }

  initToolbar(terrainContainerId: string, entityContainerId: string, utilityContainerId: string): void {
    this.terrainContainer = document.getElementById(terrainContainerId);
    this.entityContainer = document.getElementById(entityContainerId);
    this.utilityContainer = document.getElementById(utilityContainerId);

    this.buildTerrainTools();
    this.buildEntityTools();
    this.buildUtilityTools();
    this.updateToolButtons();
  }

  private buildTerrainTools(): void {
    if (!this.terrainContainer) return;
    this.terrainContainer.innerHTML = '';

    const terrains: { type: TerrainType; label: string }[] = [
      { type: 'brick', label: '砖块' },
      { type: 'grass', label: '草地' },
      { type: 'spike', label: '尖刺' },
      { type: 'platform', label: '平台' },
    ];

    for (const t of terrains) {
      const btn = this.createToolButton(t.type, t.label);
      btn.addEventListener('click', () => this.setCurrentTool(t.type));
      this.terrainContainer.appendChild(btn);
    }
  }

  private buildEntityTools(): void {
    if (!this.entityContainer) return;
    this.entityContainer.innerHTML = '';

    const entities: { type: 'enemy' | 'collectible'; label: string }[] = [
      { type: 'enemy', label: '敌人' },
      { type: 'collectible', label: '星星' },
    ];

    for (const e of entities) {
      const btn = this.createToolButton(e.type, e.label);
      btn.addEventListener('click', () => this.setCurrentTool(e.type));
      this.entityContainer.appendChild(btn);
    }
  }

  private buildUtilityTools(): void {
    if (!this.utilityContainer) return;
    this.utilityContainer.innerHTML = '';

    const btn = this.createToolButton('eraser', '橡皮');
    btn.addEventListener('click', () => this.setCurrentTool('eraser'));
    this.utilityContainer.appendChild(btn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'tool-btn';
    clearBtn.textContent = '清空';
    clearBtn.style.width = 'auto';
    clearBtn.style.flex = '1';
    clearBtn.addEventListener('click', () => this.clearLevel());
    this.utilityContainer.appendChild(clearBtn);
  }

  private createToolButton(toolType: ToolType, label: string): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'tool-btn';
    btn.dataset.tool = toolType;
    btn.title = label;

    const preview = document.createElement('canvas');
    preview.width = 32;
    preview.height = 32;
    preview.className = 'tool-preview';
    const ctx = preview.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      this.drawToolIcon(ctx, toolType, 32);
    }
    btn.appendChild(preview);

    return btn;
  }

  private drawToolIcon(ctx: CanvasRenderingContext2D, toolType: ToolType, size: number): void {
    switch (toolType) {
      case 'brick':
      case 'grass':
      case 'spike':
      case 'platform':
        Renderer.drawTerrainIcon(ctx, toolType, size);
        break;
      case 'enemy':
        this.drawEnemyIcon(ctx, size);
        break;
      case 'collectible':
        this.drawStarIcon(ctx, size);
        break;
      case 'eraser':
        this.drawEraserIcon(ctx, size);
        break;
    }
  }

  private drawEnemyIcon(ctx: CanvasRenderingContext2D, size: number): void {
    const s = size * 0.8;
    const ox = (size - s) / 2;
    const oy = size - s;

    ctx.fillStyle = '#DC143C';
    ctx.beginPath();
    ctx.arc(ox + s / 2, oy + s * 0.6, s / 2, Math.PI, 0, false);
    ctx.lineTo(ox + s, oy + s * 0.85);
    ctx.quadraticCurveTo(ox + s / 2, oy + s * 1.1, ox, oy + s * 0.85);
    ctx.closePath();
    ctx.fill();

    const eyeY = oy + s * 0.4;
    const eyeSize = s * 0.2;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(ox + s * 0.3, eyeY, eyeSize, eyeSize);
    ctx.fillRect(ox + s * 0.55, eyeY, eyeSize, eyeSize);
    ctx.fillStyle = '#000000';
    ctx.fillRect(ox + s * 0.35, eyeY + eyeSize * 0.3, eyeSize * 0.4, eyeSize * 0.4);
    ctx.fillRect(ox + s * 0.6, eyeY + eyeSize * 0.3, eyeSize * 0.4, eyeSize * 0.4);
  }

  private drawStarIcon(ctx: CanvasRenderingContext2D, size: number): void {
    const cx = size / 2;
    const cy = size / 2;
    const outerR = size * 0.4;
    const innerR = size * 0.2;
    const points = 5;

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFFF00';
    ctx.fillRect(cx - 1, cy - outerR * 0.3, 2, outerR * 0.4);
    ctx.fillRect(cx - outerR * 0.3, cy - 1, outerR * 0.4, 2);
  }

  private drawEraserIcon(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.fillStyle = '#FF69B4';
    ctx.fillRect(4, 8, size - 8, size - 16);
    ctx.fillStyle = '#FFC0CB';
    ctx.fillRect(4, 8, size - 8, 6);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(4, 8, size - 8, size - 16);
  }

  setCurrentTool(tool: ToolType): void {
    this.state.currentTool = tool;
    this.updateToolButtons();
    this.callbacks.onToolChange(tool);
    if (this.state.hoverTile) {
      this.callbacks.onHoverChange({ ...this.state.hoverTile });
    }
  }

  private updateToolButtons(): void {
    const buttons = document.querySelectorAll('.tool-btn');
    buttons.forEach((btn) => {
      const el = btn as HTMLElement;
      if (el.dataset.tool === this.state.currentTool) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.addEventListener('mouseenter', this.handleMouseEnter);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private isInEditorArea(mouseX: number, mouseY: number): boolean {
    return (
      mouseX >= this.offsetX &&
      mouseX < this.offsetX + this.editorAreaWidth &&
      mouseY >= this.offsetY &&
      mouseY < this.offsetY + this.editorAreaHeight
    );
  }

  private handleMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    if (!this.isInEditorArea(mouseX, mouseY)) {
      this.clearHover();
      return;
    }

    const localX = mouseX - this.offsetX;
    const localY = mouseY - this.offsetY;
    const tileX = Math.floor(localX / this.tileSize);
    const tileY = Math.floor(localY / this.tileSize);

    const inBounds = tileX >= 0 && tileX < this.gridWidth && tileY >= 0 && tileY < this.gridHeight;
    const newHover = inBounds ? { x: tileX, y: tileY } : null;

    const hoverChanged =
      (!this.state.hoverTile && newHover) ||
      (this.state.hoverTile && !newHover) ||
      (this.state.hoverTile && newHover && (this.state.hoverTile.x !== newHover.x || this.state.hoverTile.y !== newHover.y));

    if (hoverChanged) {
      this.state.hoverTile = newHover;
      this.callbacks.onHoverChange(newHover);
    }

    if (this.state.isMouseDown && newHover && this.canPlaceAt(tileX, tileY)) {
      this.placeAt(tileX, tileY);
    }
  };

  private handleMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0 && e.button !== 2) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    if (!this.isInEditorArea(mouseX, mouseY)) {
      this.clearHover();
      return;
    }

    const localX = mouseX - this.offsetX;
    const localY = mouseY - this.offsetY;
    const tileX = Math.floor(localX / this.tileSize);
    const tileY = Math.floor(localY / this.tileSize);

    if (tileX < 0 || tileX >= this.gridWidth || tileY < 0 || tileY >= this.gridHeight) {
      this.clearHover();
      return;
    }

    this.state.isMouseDown = true;
    this.state.hoverTile = { x: tileX, y: tileY };
    this.callbacks.onHoverChange({ x: tileX, y: tileY });

    if (e.button === 2) {
      this.eraseAt(tileX, tileY);
    } else {
      this.placeAt(tileX, tileY);
    }
  };

  private handleMouseUp = (): void => {
    this.state.isMouseDown = false;
    this.state.lastPlacedTile = null;
  };

  private handleMouseLeave = (): void => {
    this.state.isMouseDown = false;
    this.state.lastPlacedTile = null;
    this.clearHover();
  };

  private handleMouseEnter = (_e: MouseEvent): void => {
    if (!this.state.hoverTile) {
      return;
    }
  };

  private clearHover(): void {
    if (this.state.hoverTile) {
      this.state.hoverTile = null;
      this.callbacks.onHoverChange(null);
    }
  }

  private canPlaceAt(x: number, y: number): boolean {
    if (!this.state.lastPlacedTile) return true;
    return this.state.lastPlacedTile.x !== x || this.state.lastPlacedTile.y !== y;
  }

  private placeAt(x: number, y: number): void {
    const tool = this.state.currentTool;
    const level = this.state.level;

    if (tool === 'eraser') {
      this.eraseAt(x, y);
      return;
    }

    if (tool === 'enemy') {
      const existing = level.enemies.findIndex((e) => e.x === x && e.y === y);
      if (existing >= 0) return;

      level.enemies.push({
        x,
        y: Math.max(0, y),
        patrolLeft: Math.max(0, x - 2),
        patrolRight: Math.min(this.gridWidth - 1, x + 2),
        speed: 0.02,
        direction: 1,
        initialX: x,
      });
      this.state.lastPlacedTile = { x, y };
      this.callbacks.onLevelChange({ ...level, enemies: [...level.enemies] });
      return;
    }

    if (tool === 'collectible') {
      const existing = level.collectibles.findIndex((c) => c.x === x && c.y === y);
      if (existing >= 0) return;

      level.collectibles.push({
        x,
        y: Math.max(0, y),
        collected: false,
        rotation: 0,
        collectAnim: 0,
      });
      this.state.lastPlacedTile = { x, y };
      this.callbacks.onLevelChange({ ...level, collectibles: [...level.collectibles] });
      return;
    }

    const tileType = tool as TerrainType;
    const existingIdx = level.tiles.findIndex((t) => t.x === x && t.y === y);

    if (existingIdx >= 0) {
      if (level.tiles[existingIdx].type === tileType) return;
      level.tiles[existingIdx].type = tileType;
    } else {
      level.tiles.push({ x, y, type: tileType });
    }

    this.state.lastPlacedTile = { x, y };
    this.callbacks.onLevelChange({ ...level, tiles: [...level.tiles] });
  }

  private eraseAt(x: number, y: number): void {
    const level = this.state.level;
    let changed = false;

    const tileIdx = level.tiles.findIndex((t) => t.x === x && t.y === y);
    if (tileIdx >= 0) {
      level.tiles.splice(tileIdx, 1);
      changed = true;
    }

    const enemyIdx = level.enemies.findIndex((e) => e.x === x && e.y === y);
    if (enemyIdx >= 0) {
      level.enemies.splice(enemyIdx, 1);
      changed = true;
    }

    const collectibleIdx = level.collectibles.findIndex((c) => c.x === x && c.y === y);
    if (collectibleIdx >= 0) {
      level.collectibles.splice(collectibleIdx, 1);
      changed = true;
    }

    if (changed) {
      this.state.lastPlacedTile = { x, y };
      this.callbacks.onLevelChange({
        tiles: [...level.tiles],
        enemies: [...level.enemies],
        collectibles: [...level.collectibles],
        spawnPoint: level.spawnPoint,
      });
    }
  }

  clearLevel(): void {
    this.state.level = {
      tiles: [],
      enemies: [],
      collectibles: [],
      spawnPoint: { x: 2, y: this.gridHeight - 3 },
    };
    this.callbacks.onLevelChange({ ...this.state.level });
  }

  getLevel(): LevelData {
    return {
      tiles: [...this.state.level.tiles],
      enemies: this.state.level.enemies.map((e) => ({ ...e })),
      collectibles: this.state.level.collectibles.map((c) => ({ ...c })),
      spawnPoint: { ...this.state.level.spawnPoint },
    };
  }

  setLevel(level: LevelData): void {
    this.state.level = {
      tiles: [...level.tiles],
      enemies: level.enemies.map((e) => ({ ...e })),
      collectibles: level.collectibles.map((c) => ({ ...c })),
      spawnPoint: { ...level.spawnPoint },
    };
  }

  getCurrentTool(): ToolType {
    return this.state.currentTool;
  }

  getHoverTile(): { x: number; y: number } | null {
    return this.state.hoverTile;
  }

  setOffset(offsetX: number, offsetY: number): void {
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.editorAreaWidth = this.gridWidth * this.tileSize;
    this.editorAreaHeight = this.gridHeight * this.tileSize;
  }

  destroy(): void {
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.removeEventListener('mouseenter', this.handleMouseEnter);
  }
}
