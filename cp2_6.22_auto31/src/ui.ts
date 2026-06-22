import { Game, MAP_WIDTH, MAP_HEIGHT } from './game';
import { TowerType, TOWER_NAMES, TOWER_COLORS, Tower } from './entity';
import { TILE_SIZE, GRID_SIZE } from './map';
import { renderGame, RenderState } from './renderer';

const PANEL_WIDTH = 240;
const BUILD_MENU_W = 200;
const BUILD_MENU_H = 216;
const BUILD_BTN_H = 40;
const BUILD_GAP = 8;
const BUILD_PAD = 8;

export interface UIState {
  hoveredGrid: { gridX: number; gridY: number } | null;
  buildMenu: {
    visible: boolean;
    x: number;
    y: number;
    gridX: number;
    gridY: number;
    hoveredBtn: number;
  };
  upgradePanel: {
    visible: boolean;
    x: number;
    y: number;
    towerId: number;
    hoveredBtn: boolean;
  };
  selectedBuildingId: number | null;
  goldBounceTimer: number;
}

export function createUIState(): UIState {
  return {
    hoveredGrid: null,
    buildMenu: {
      visible: false,
      x: 0,
      y: 0,
      gridX: -1,
      gridY: -1,
      hoveredBtn: -1
    },
    upgradePanel: {
      visible: false,
      x: 0,
      y: 0,
      towerId: -1,
      hoveredBtn: false
    },
    selectedBuildingId: null,
    goldBounceTimer: 0
  };
}

export class UIManager {
  game: Game;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  state: UIState;
  onGoldCollected: () => void;

  constructor(game: Game, canvas: HTMLCanvasElement, onGoldCollected: () => void) {
    this.game = game;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.state = createUIState();
    this.onGoldCollected = onGoldCollected;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('contextmenu', this.handleRightClick);
  }

  destroy(): void {
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('click', this.handleClick);
    this.canvas.removeEventListener('contextmenu', this.handleRightClick);
  }

  update(dt: number): void {
    if (this.state.goldBounceTimer > 0) {
      this.state.goldBounceTimer -= dt;
    }
  }

  triggerGoldBounce(): void {
    this.state.goldBounceTimer = 0.3;
  }

  private getMousePos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private handleMouseMove = (e: MouseEvent): void => {
    const pos = this.getMousePos(e);

    this.state.buildMenu.hoveredBtn = -1;
    this.state.upgradePanel.hoveredBtn = false;

    if (this.state.buildMenu.visible) {
      const btnIdx = this.getBuildMenuButtonAt(pos.x, pos.y);
      if (btnIdx >= 0) {
        this.state.buildMenu.hoveredBtn = btnIdx;
        this.canvas.style.cursor = 'pointer';
        return;
      }
    }

    if (this.state.upgradePanel.visible) {
      if (this.isUpgradeButtonAt(pos.x, pos.y)) {
        this.state.upgradePanel.hoveredBtn = true;
        this.canvas.style.cursor = 'pointer';
        return;
      }
    }

    if (pos.x >= MAP_WIDTH && pos.x < MAP_WIDTH + PANEL_WIDTH) {
      const buildingId = this.getBuildingListItemAt(pos.x, pos.y);
      if (buildingId !== null) {
        this.canvas.style.cursor = 'pointer';
      } else {
        this.canvas.style.cursor = 'default';
      }
      this.state.hoveredGrid = null;
      return;
    }

    if (pos.x < 0 || pos.x >= MAP_WIDTH || pos.y < 0 || pos.y >= MAP_HEIGHT) {
      this.state.hoveredGrid = null;
      this.canvas.style.cursor = 'default';
      return;
    }

    const gridX = Math.floor(pos.x / TILE_SIZE);
    const gridY = Math.floor(pos.y / TILE_SIZE);
    this.state.hoveredGrid = { gridX, gridY };

    const tower = this.game.getTowerAt(gridX, gridY);
    this.canvas.style.cursor = tower ? 'pointer' : (this.game.canBuildAt(gridX, gridY) ? 'pointer' : 'not-allowed');
  };

  private handleClick = (e: MouseEvent): void => {
    const pos = this.getMousePos(e);

    if (this.state.buildMenu.visible) {
      const btnIdx = this.getBuildMenuButtonAt(pos.x, pos.y);
      if (btnIdx >= 0) {
        this.buildFromMenu(btnIdx);
        return;
      }
      if (this.isInsideBuildMenu(pos.x, pos.y)) {
        return;
      }
      this.state.buildMenu.visible = false;
    }

    if (this.state.upgradePanel.visible) {
      if (this.isUpgradeButtonAt(pos.x, pos.y)) {
        this.performUpgrade();
        return;
      }
      if (this.isInsideUpgradePanel(pos.x, pos.y)) {
        return;
      }
      this.state.upgradePanel.visible = false;
    }

    if (pos.x >= MAP_WIDTH && pos.x < MAP_WIDTH + PANEL_WIDTH) {
      const buildingId = this.getBuildingListItemAt(pos.x, pos.y);
      if (buildingId !== null) {
        this.selectBuilding(buildingId);
        this.centerOnBuilding(buildingId);
      }
      return;
    }

    if (pos.x < 0 || pos.x >= MAP_WIDTH || pos.y < 0 || pos.y >= MAP_HEIGHT) {
      this.state.selectedBuildingId = null;
      return;
    }

    const gridX = Math.floor(pos.x / TILE_SIZE);
    const gridY = Math.floor(pos.y / TILE_SIZE);

    const existingTower = this.game.getTowerAt(gridX, gridY);
    if (existingTower) {
      this.state.selectedBuildingId = existingTower.id;
      this.showUpgradePanel(existingTower, pos.x, pos.y);
      return;
    }

    if (this.game.canBuildAt(gridX, gridY)) {
      this.state.selectedBuildingId = null;
      this.showBuildMenu(gridX, gridY, pos.x, pos.y);
    } else {
      this.state.selectedBuildingId = null;
    }
  };

  private handleRightClick = (e: MouseEvent): void => {
    e.preventDefault();
    this.state.buildMenu.visible = false;
    this.state.upgradePanel.visible = false;
    this.state.selectedBuildingId = null;
  };

  private isInsideBuildMenu(mx: number, my: number): boolean {
    const m = this.state.buildMenu;
    let x = m.x;
    let y = m.y;
    if (x + BUILD_MENU_W > MAP_WIDTH) x = MAP_WIDTH - BUILD_MENU_W - 5;
    if (y + BUILD_MENU_H > MAP_HEIGHT) y = MAP_HEIGHT - BUILD_MENU_H - 5;
    if (x < 5) x = 5;
    if (y < 5) y = 5;
    return mx >= x && mx <= x + BUILD_MENU_W && my >= y && my <= y + BUILD_MENU_H;
  }

  private getBuildMenuButtonAt(mx: number, my: number): number {
    if (!this.state.buildMenu.visible) return -1;
    if (!this.isInsideBuildMenu(mx, my)) return -1;

    const m = this.state.buildMenu;
    let x = m.x;
    let y = m.y;
    if (x + BUILD_MENU_W > MAP_WIDTH) x = MAP_WIDTH - BUILD_MENU_W - 5;
    if (y + BUILD_MENU_H > MAP_HEIGHT) y = MAP_HEIGHT - BUILD_MENU_H - 5;
    if (x < 5) x = 5;
    if (y < 5) y = 5;

    const localX = mx - x - BUILD_PAD;
    const localY = my - y - BUILD_PAD;
    const btnW = BUILD_MENU_W - BUILD_PAD * 2;

    if (localX < 0 || localX > btnW) return -1;

    for (let i = 0; i < 4; i++) {
      const btnY = i * (BUILD_BTN_H + BUILD_GAP);
      if (localY >= btnY && localY <= btnY + BUILD_BTN_H) {
        return i;
      }
    }
    return -1;
  }

  private buildFromMenu(btnIdx: number): void {
    const types: TowerType[] = ['arrow', 'cannon', 'magic', 'collector'];
    const type = types[btnIdx];
    const m = this.state.buildMenu;
    const built = this.game.buildTower(type, m.gridX, m.gridY);
    if (built) {
      this.state.buildMenu.visible = false;
      this.state.selectedBuildingId = built.id;
    }
  }

  private showBuildMenu(gridX: number, gridY: number, wx: number, wy: number): void {
    this.state.buildMenu = {
      visible: true,
      x: wx + 10,
      y: wy + 10,
      gridX,
      gridY,
      hoveredBtn: -1
    };
    this.state.upgradePanel.visible = false;
  }

  private showUpgradePanel(tower: Tower, wx: number, wy: number): void {
    this.state.upgradePanel = {
      visible: true,
      x: wx + 15,
      y: wy - 20,
      towerId: tower.id,
      hoveredBtn: false
    };
    this.state.buildMenu.visible = false;
  }

  private isInsideUpgradePanel(mx: number, my: number): boolean {
    const u = this.state.upgradePanel;
    if (!u.visible) return false;
    const w = 220;
    const h = 220;
    let x = u.x;
    let y = u.y;
    if (x + w > MAP_WIDTH) x = MAP_WIDTH - w - 5;
    if (y + h > MAP_HEIGHT) y = MAP_HEIGHT - h - 5;
    if (x < 5) x = 5;
    if (y < 5) y = 5;
    return mx >= x && mx <= x + w && my >= y && my <= y + h;
  }

  private isUpgradeButtonAt(mx: number, my: number): boolean {
    const u = this.state.upgradePanel;
    if (!u.visible) return false;
    const tower = this.game.entities.towers.get(u.towerId);
    if (!tower || !tower.canUpgrade()) return false;

    const w = 220;
    const h = 220;
    let x = u.x;
    let y = u.y;
    if (x + w > MAP_WIDTH) x = MAP_WIDTH - w - 5;
    if (y + h > MAP_HEIGHT) y = MAP_HEIGHT - h - 5;
    if (x < 5) x = 5;
    if (y < 5) y = 5;

    const padding = 14;
    const btnY = y + h - 46;
    const btnH = 34;
    const btnW = w - padding * 2;
    const btnX = x + padding;

    return mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH;
  }

  private performUpgrade(): void {
    const u = this.state.upgradePanel;
    const tower = this.game.entities.towers.get(u.towerId);
    if (!tower) return;

    if (this.game.upgradeTower(tower.id)) {
      if (tower.level >= 3) {
        u.hoveredBtn = false;
      }
    }
  }

  private selectBuilding(id: number): void {
    this.state.selectedBuildingId = id;
    const tower = this.game.entities.towers.get(id);
    if (tower) {
      this.showUpgradePanel(tower, tower.x + 30, tower.y);
    }
  }

  private centerOnBuilding(_id: number): void {
  }

  private getBuildingListItemAt(mx: number, my: number): number | null {
    const list = this.game.getBuildingList();
    if (list.length === 0) return null;

    const panelX = MAP_WIDTH;
    const xStart = panelX + 15;
    const xEnd = panelX + PANEL_WIDTH - 15;
    if (mx < xStart || mx > xEnd) return null;

    let y = 155;
    for (const building of list) {
      if (my >= y && my <= y + 40) {
        return building.id;
      }
      y += 42;
      if (y > MAP_HEIGHT - 20) break;
    }
    return null;
  }

  getRenderState(): {
    goldBounceTimer: number;
    hoveredGrid: { gridX: number; gridY: number } | null;
    buildMenu: { visible: boolean; x: number; y: number; gridX: number; gridY: number; hoveredBtn: number };
    upgradePanel: { visible: boolean; x: number; y: number; towerId: number; hoveredBtn: boolean };
    selectedBuildingId: number | null;
    canvasWidth: number;
    canvasHeight: number;
  } {
    return {
      goldBounceTimer: this.state.goldBounceTimer,
      hoveredGrid: this.state.hoveredGrid,
      buildMenu: this.state.buildMenu,
      upgradePanel: this.state.upgradePanel,
      selectedBuildingId: this.state.selectedBuildingId,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height
    };
  }

  render(): void {
    const renderState = this.game.getRenderState(this.getRenderState()) as RenderState;
    renderGame(
      this.ctx,
      this.game.grid,
      this.game.entities.towers,
      this.game.entities.monsters,
      this.game.entities.projectiles,
      renderState
    );
  }
}

export { TOWER_NAMES, TOWER_COLORS, GRID_SIZE, TILE_SIZE };
