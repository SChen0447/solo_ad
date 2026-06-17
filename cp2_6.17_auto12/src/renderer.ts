import { MazeData, CellType, MonsterData, ItemData, ChestData } from './maze';
import { Player } from './player';

const CELL_SIZE = 40;

export class Renderer {
  private mazeGrid: HTMLElement;
  private playerEl: HTMLElement;
  private cellElements: HTMLDivElement[][] = [];
  private monsterElements: Map<string, HTMLElement> = new Map();
  private itemElements: Map<string, HTMLElement> = new Map();
  private chestElements: Map<string, HTMLElement> = new Map();
  private currentMaze: MazeData | null = null;

  constructor() {
    this.mazeGrid = document.getElementById('maze-grid')!;
    this.playerEl = document.getElementById('player')!;
  }

  renderMaze(maze: MazeData): void {
    this.currentMaze = maze;
    this.mazeGrid.innerHTML = '';
    this.cellElements = [];
    this.monsterElements.clear();
    this.itemElements.clear();
    this.chestElements.clear();

    this.mazeGrid.style.gridTemplateColumns = `repeat(${maze.width}, ${CELL_SIZE}px)`;
    this.mazeGrid.style.gridTemplateRows = `repeat(${maze.height}, ${CELL_SIZE}px)`;

    for (let y = 0; y < maze.height; y++) {
      this.cellElements[y] = [];
      for (let x = 0; x < maze.width; x++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.x = String(x);
        cell.dataset.y = String(y);

        const cellType = maze.cells[y][x];
        if (cellType === CellType.Wall) {
          cell.classList.add('wall');
        } else if (cellType === CellType.Start) {
          cell.classList.add('start');
        } else if (cellType === CellType.End) {
          cell.classList.add('end');
        } else {
          cell.classList.add('corridor');
        }

        const delay = (y * maze.width + x) * 5;
        cell.style.animationDelay = `${delay}ms`;

        this.mazeGrid.appendChild(cell);
        this.cellElements[y][x] = cell;
      }
    }

    maze.monsters.forEach(m => {
      this.renderMonster(m);
    });

    maze.items.forEach(item => {
      this.renderItem(item);
    });

    maze.chests.forEach(chest => {
      this.renderChest(chest);
    });
  }

  private renderMonster(monster: MonsterData): void {
    if (!monster.alive) return;
    const cell = this.cellElements[monster.y]?.[monster.x];
    if (!cell) return;

    const el = document.createElement('span');
    el.className = 'monster-icon';
    el.textContent = '👹';
    cell.appendChild(el);
    this.monsterElements.set(`${monster.x},${monster.y}`, el);
  }

  private renderItem(item: ItemData): void {
    if (item.picked) return;
    const cell = this.cellElements[item.y]?.[item.x];
    if (!cell) return;

    const el = document.createElement('span');
    el.className = 'item-icon';
    const icons: Record<string, string> = { potion: '🧪', power: '⚗️', key: '🔑' };
    el.textContent = icons[item.type];
    cell.appendChild(el);
    this.itemElements.set(`${item.x},${item.y}`, el);
  }

  private renderChest(chest: ChestData): void {
    if (chest.opened) return;
    const cell = this.cellElements[chest.y]?.[chest.x];
    if (!cell) return;

    const el = document.createElement('span');
    el.className = 'chest-icon';
    el.textContent = chest.locked ? '🔒' : '📦';
    cell.appendChild(el);
    this.chestElements.set(`${chest.x},${chest.y}`, el);
  }

  updatePlayerPosition(player: Player): void {
    this.playerEl.style.left = `${player.x * CELL_SIZE + (CELL_SIZE - 20) / 2}px`;
    this.playerEl.style.top = `${player.y * CELL_SIZE + (CELL_SIZE - 20) / 2}px`;
  }

  updateFog(player: Player, maze: MazeData): void {
    const visibilityRange = 2;
    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        const cell = this.cellElements[y][x];
        if (!cell) continue;

        const dist = Math.abs(x - player.x) + Math.abs(y - player.y);
        cell.classList.remove('visible', 'fog', 'fog-edge');

        if (dist <= visibilityRange) {
          cell.classList.add('visible');
          player.markExplored(x, y);
        } else if (dist <= visibilityRange + 1) {
          cell.classList.add('fog-edge');
        } else {
          cell.classList.add('fog');
        }
      }
    }
  }

  removeMonster(x: number, y: number): void {
    const key = `${x},${y}`;
    const el = this.monsterElements.get(key);
    if (el) {
      el.remove();
      this.monsterElements.delete(key);
    }
  }

  pickItem(x: number, y: number): void {
    const key = `${x},${y}`;
    const el = this.itemElements.get(key);
    if (el) {
      el.classList.add('picked');
      setTimeout(() => {
        el.remove();
        this.itemElements.delete(key);
      }, 300);
    }
  }

  openChest(x: number, y: number): void {
    const key = `${x},${y}`;
    const el = this.chestElements.get(key);
    if (el) {
      el.textContent = '✨';
      setTimeout(() => {
        el.remove();
        this.chestElements.delete(key);
      }, 400);
    }
  }

  updateStatusBar(player: Player, floor: number): void {
    const floorEl = document.getElementById('floor-num')!;
    const hpNumEl = document.getElementById('hp-num')!;
    const hpBarEl = document.getElementById('hp-bar')!;
    const exploredEl = document.getElementById('explored-num')!;
    const killedEl = document.getElementById('killed-num')!;
    const invEl = document.getElementById('inventory-display')!;

    floorEl.textContent = String(floor);
    hpNumEl.textContent = `${player.hp}/${player.maxHp}`;
    hpBarEl.style.width = `${(player.hp / player.maxHp) * 100}%`;
    hpBarEl.style.background = this.getHpColor(player.hp, player.maxHp);
    exploredEl.textContent = String(player.getExploredCount());
    killedEl.textContent = String(player.killedMonsters);
    invEl.textContent = player.getInventoryDisplay();
  }

  private getHpColor(current: number, max: number): string {
    const ratio = current / max;
    if (ratio > 0.6) return '#4caf50';
    if (ratio > 0.3) return '#ff9800';
    return '#e53935';
  }

  showGameOver(score: number, explored: number, killed: number): void {
    const overlay = document.getElementById('game-over-overlay')!;
    const scoreEl = document.getElementById('final-score')!;
    const statsEl = document.getElementById('final-stats')!;

    scoreEl.textContent = `最终得分: ${score}`;
    statsEl.textContent = `探索: ${explored} 格 | 击败: ${killed} 个怪物`;

    overlay.classList.add('active');
  }

  hideGameOver(): void {
    const overlay = document.getElementById('game-over-overlay')!;
    overlay.classList.remove('active');
  }

  fadeContainer(fade: boolean): void {
    const container = document.getElementById('game-container')!;
    if (fade) {
      container.classList.add('fading');
    } else {
      container.classList.remove('fading');
    }
  }
}
