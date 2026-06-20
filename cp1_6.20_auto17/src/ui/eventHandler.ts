import {
  TowerType,
  Tower,
  GridPos,
  Position,
  pixelToGrid,
  GRID_SIZE,
  TOWER_CONFIGS
} from '../types';
import { Renderer, HoverInfo } from './renderer';
import { MapGrid } from '../map/mapGrid';

// 数据流向：接收浏览器事件 → 转换为游戏指令 → 调用 main.ts 的回调
// 事件类型：鼠标点击(放置炮塔/选中炮塔)、鼠标移动(预览放置)、右键取消、键盘快捷键

export interface GameCallbacks {
  onPlaceTower: (type: TowerType, pos: GridPos) => void;
  onSelectTower: (towerId: number | null) => void;
  onUpgradeTower: () => void;
  onSellTower: () => void;
  onStartWave: () => void;
  onRestart: () => void;
  getTowerAt: (pos: GridPos) => Tower | undefined;
  getTowers: () => Tower[];
}

export class EventHandler {
  private container: HTMLElement;
  private renderer: Renderer;
  private mapGrid: MapGrid;
  private callbacks: GameCallbacks;
  private selectedType: TowerType | null = null;
  private tooltipEl: HTMLElement;
  private waveIndicatorEl: HTMLElement;

  constructor(
    container: HTMLElement,
    renderer: Renderer,
    mapGrid: MapGrid,
    callbacks: GameCallbacks
  ) {
    this.container = container;
    this.renderer = renderer;
    this.mapGrid = mapGrid;
    this.callbacks = callbacks;
    this.tooltipEl = document.getElementById('tooltip-panel')!;
    this.waveIndicatorEl = document.getElementById('wave-indicator')!;

    this.bindEvents();
    this.setupButtons();
  }

  private bindEvents(): void {
    this.container.addEventListener('mousemove', this.onMouseMove);
    this.container.addEventListener('click', this.onClick);
    this.container.addEventListener('contextmenu', this.onRightClick);
    this.container.addEventListener('mouseleave', this.onMouseLeave);
    window.addEventListener('keydown', this.onKeyDown);
  }

  private setupButtons(): void {
    const towerBtns = document.querySelectorAll('.tower-btn');
    towerBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = (btn as HTMLElement).dataset.tower as TowerType;
        this.selectTowerType(type);
        this.updateTowerBtnStyles();
      });
    });

    document.getElementById('btn-wave')?.addEventListener('click', () => {
      this.callbacks.onStartWave();
    });

    document.getElementById('btn-upgrade')?.addEventListener('click', () => {
      this.callbacks.onUpgradeTower();
    });

    document.getElementById('btn-sell')?.addEventListener('click', () => {
      this.callbacks.onSellTower();
    });

    document.getElementById('btn-restart')?.addEventListener('click', () => {
      this.callbacks.onRestart();
    });
  }

  selectTowerType(type: TowerType | null): void {
    this.selectedType = type;
    this.callbacks.onSelectTower(null);
    this.renderer.setSelectedTower(null);
    if (type) {
      this.renderer.setPreview(type, null, false);
    } else {
      this.renderer.setPreview(null, null, false);
    }
    this.updateTowerBtnStyles();
  }

  updateTowerBtnStyles(): void {
    const towerBtns = document.querySelectorAll('.tower-btn');
    towerBtns.forEach(btn => {
      const type = (btn as HTMLElement).dataset.tower;
      if (type === this.selectedType) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }

  private getCanvasPos(e: MouseEvent): Position {
    const rect = this.container.getBoundingClientRect();
    return this.renderer.screenToCanvas(e.clientX - rect.left, e.clientY - rect.top);
  }

  private onMouseMove = (e: MouseEvent): void => {
    const canvasPos = this.getCanvasPos(e);

    if (this.selectedType) {
      const gridPos = pixelToGrid(canvasPos);
      if (this.mapGrid.isInBounds(gridPos.gx, gridPos.gy)) {
        const canPlace = this.canPlaceAt(gridPos);
        this.renderer.setPreview(this.selectedType, gridPos, canPlace);
      } else {
        this.renderer.setPreview(null, null, false);
      }
    }

    const gridPos = pixelToGrid(canvasPos);
    if (this.mapGrid.isInBounds(gridPos.gx, gridPos.gy)) {
      const hoveredTower = this.callbacks.getTowerAt(gridPos);
      const info: HoverInfo = {
        tower: hoveredTower ?? null,
        screenPos: { x: e.clientX, y: e.clientY }
      };
      this.renderer.setHover(info);
      this.updateTooltip(info);
    } else {
      this.renderer.setHover({ tower: null, screenPos: null });
      this.hideTooltip();
    }
  };

  private canPlaceAt(gridPos: GridPos): boolean {
    if (!this.mapGrid.canPlaceTower(gridPos.gx, gridPos.gy)) return false;
    if (this.callbacks.getTowerAt(gridPos)) return false;
    return true;
  }

  private onClick = (e: MouseEvent): void => {
    if (e.button !== 0) return;

    const canvasPos = this.getCanvasPos(e);
    const gridPos = pixelToGrid(canvasPos);
    if (!this.mapGrid.isInBounds(gridPos.gx, gridPos.gy)) return;

    const existingTower = this.callbacks.getTowerAt(gridPos);
    if (this.selectedType) {
      if (this.canPlaceAt(gridPos)) {
        this.callbacks.onPlaceTower(this.selectedType, gridPos);
      }
    } else {
      if (existingTower) {
        this.callbacks.onSelectTower(existingTower.id);
        this.renderer.setSelectedTower(existingTower.id);
      } else {
        this.callbacks.onSelectTower(null);
        this.renderer.setSelectedTower(null);
      }
    }
  };

  private onRightClick = (e: MouseEvent): void => {
    e.preventDefault();
    this.selectTowerType(null);
    this.callbacks.onSelectTower(null);
    this.renderer.setSelectedTower(null);
    this.renderer.setPreview(null, null, false);
    this.hideTooltip();
  };

  private onMouseLeave = (): void => {
    this.renderer.setPreview(null, null, false);
    this.renderer.setHover({ tower: null, screenPos: null });
    this.hideTooltip();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case '1':
        this.selectTowerType('arrow');
        break;
      case '2':
        this.selectTowerType('magic');
        break;
      case '3':
        this.selectTowerType('cannon');
        break;
      case 'Escape':
        this.selectTowerType(null);
        this.callbacks.onSelectTower(null);
        this.renderer.setSelectedTower(null);
        break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        this.callbacks.onStartWave();
        break;
      case 'u':
      case 'U':
        this.callbacks.onUpgradeTower();
        break;
      case 's':
      case 'S':
        this.callbacks.onSellTower();
        break;
    }
  };

  private updateTooltip(info: HoverInfo): void {
    if (!info.tower || !info.screenPos) {
      this.hideTooltip();
      return;
    }

    this.tooltipEl.innerHTML = this.renderer.getTooltipContent(info.tower);
    this.tooltipEl.classList.add('visible');
    this.tooltipEl.style.display = 'block';

    const tw = this.tooltipEl.offsetWidth;
    const th = this.tooltipEl.offsetHeight;
    let x = info.screenPos.x + 16;
    let y = info.screenPos.y + 16;

    if (x + tw > window.innerWidth) {
      x = info.screenPos.x - tw - 16;
    }
    if (y + th > window.innerHeight) {
      y = info.screenPos.y - th - 16;
    }

    this.tooltipEl.style.left = x + 'px';
    this.tooltipEl.style.top = y + 'px';
  }

  private hideTooltip(): void {
    this.tooltipEl.classList.remove('visible');
    this.tooltipEl.style.display = 'none';
  }

  showWaveIndicator(wave: number): void {
    this.waveIndicatorEl.textContent = `WAVE ${wave}`;
    this.waveIndicatorEl.classList.remove('show');
    void this.waveIndicatorEl.offsetWidth;
    this.waveIndicatorEl.classList.add('show');
  }

  updateHud(wave: number, hp: number, gold: number, enemies: number): void {
    const waveEl = document.getElementById('hud-wave');
    const hpEl = document.getElementById('hud-hp');
    const goldEl = document.getElementById('hud-gold');
    const enemiesEl = document.getElementById('hud-enemies');

    if (waveEl) waveEl.textContent = String(wave);
    if (hpEl) hpEl.textContent = String(Math.max(0, hp));
    if (goldEl) goldEl.textContent = String(gold);
    if (enemiesEl) enemiesEl.textContent = String(enemies);
  }

  showGameOver(wave: number): void {
    const overlay = document.getElementById('game-over');
    const text = document.getElementById('game-over-text');
    if (text) text.textContent = `坚持了 ${wave} 波敌人的进攻`;
    if (overlay) overlay.style.display = 'block';
  }

  hideGameOver(): void {
    const overlay = document.getElementById('game-over');
    if (overlay) overlay.style.display = 'none';
  }

  destroy(): void {
    this.container.removeEventListener('mousemove', this.onMouseMove);
    this.container.removeEventListener('click', this.onClick);
    this.container.removeEventListener('contextmenu', this.onRightClick);
    this.container.removeEventListener('mouseleave', this.onMouseLeave);
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
