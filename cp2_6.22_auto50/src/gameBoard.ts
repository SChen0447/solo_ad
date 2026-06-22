export enum CellType {
  Normal = 'normal',
  Start = 'start',
  Event = 'event',
  Property = 'property'
}

export interface CellData {
  pathIndex: number;
  col: number;
  row: number;
  type: CellType;
  name: string;
  price: number;
  owner: number;
  rent: number;
}

const GRID_SIZE = 10;
const TOTAL_PATH = 36;

const PATH_COORDS: [number, number][] = [];
(function buildPath() {
  for (let c = 0; c <= 9; c++) PATH_COORDS.push([c, 9]);
  for (let r = 8; r >= 0; r--) PATH_COORDS.push([9, r]);
  for (let c = 8; c >= 0; c--) PATH_COORDS.push([c, 0]);
  for (let r = 1; r <= 8; r++) PATH_COORDS.push([0, r]);
})();

interface CellConfig {
  index: number;
  type: CellType;
  name: string;
  price: number;
}

const CELL_CONFIGS: CellConfig[] = [
  { index: 0, type: CellType.Start, name: '起点', price: 0 },
  { index: 2, type: CellType.Property, name: '明珠路', price: 100 },
  { index: 4, type: CellType.Event, name: '命运', price: 0 },
  { index: 6, type: CellType.Property, name: '南京街', price: 120 },
  { index: 8, type: CellType.Property, name: '长安道', price: 150 },
  { index: 11, type: CellType.Property, name: '朝阳路', price: 180 },
  { index: 12, type: CellType.Event, name: '机会', price: 0 },
  { index: 14, type: CellType.Property, name: '学府街', price: 200 },
  { index: 17, type: CellType.Property, name: '金融巷', price: 220 },
  { index: 20, type: CellType.Event, name: '命运', price: 0 },
  { index: 22, type: CellType.Property, name: '和平路', price: 250 },
  { index: 25, type: CellType.Property, name: '文化街', price: 280 },
  { index: 29, type: CellType.Property, name: '科技道', price: 300 },
  { index: 31, type: CellType.Event, name: '机会', price: 0 },
  { index: 33, type: CellType.Property, name: '商业街', price: 350 },
];

export const PLAYER_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#EAB308'];
export const PLAYER_NAMES = ['玩家一', '玩家二', '玩家三', '玩家四'];

export class GameBoard {
  pathCells: CellData[] = [];
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  cellSize: number;
  canvasSize: number;
  playerPositions: number[] = [0, 0, 0, 0];
  playerColors: string[] = PLAYER_COLORS;
  animatingPlayer: number = -1;
  animProgress: number = 0;
  animFromX: number = 0;
  animFromY: number = 0;
  animToX: number = 0;
  animToY: number = 0;

  constructor(canvasSize: number) {
    this.canvasSize = canvasSize;
    this.cellSize = Math.floor(canvasSize / GRID_SIZE);
    this.canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = canvasSize * dpr;
    this.canvas.height = canvasSize * dpr;
    this.canvas.style.width = canvasSize + 'px';
    this.canvas.style.height = canvasSize + 'px';
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.scale(dpr, dpr);
    this.initCells();
  }

  private initCells() {
    const configMap = new Map(CELL_CONFIGS.map(c => [c.index, c]));
    for (let i = 0; i < TOTAL_PATH; i++) {
      const [col, row] = PATH_COORDS[i];
      const cfg = configMap.get(i);
      this.pathCells.push({
        pathIndex: i,
        col,
        row,
        type: cfg?.type ?? CellType.Normal,
        name: cfg?.name ?? '',
        price: cfg?.price ?? 0,
        owner: -1,
        rent: cfg ? Math.floor(cfg.price * 0.3) : 0,
      });
    }
  }

  getCellAt(pathIndex: number): CellData {
    return this.pathCells[pathIndex];
  }

  setCellOwner(pathIndex: number, playerIndex: number) {
    this.pathCells[pathIndex].owner = playerIndex;
  }

  updatePlayerPosition(playerIndex: number, pathIndex: number) {
    this.playerPositions[playerIndex] = pathIndex;
  }

  getCellCenter(pathIndex: number): { x: number; y: number } {
    const cell = this.pathCells[pathIndex];
    return {
      x: cell.col * this.cellSize + this.cellSize / 2,
      y: cell.row * this.cellSize + this.cellSize / 2,
    };
  }

  setAnimation(playerIndex: number, fromPath: number, toPath: number) {
    this.animatingPlayer = playerIndex;
    this.animProgress = 0;
    const from = this.getCellCenter(fromPath);
    const to = this.getCellCenter(toPath);
    this.animFromX = from.x;
    this.animFromY = from.y;
    this.animToX = to.x;
    this.animToY = to.y;
  }

  clearAnimation() {
    this.animatingPlayer = -1;
    this.animProgress = 0;
  }

  render(timestamp: number) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    ctx.clearRect(0, 0, this.canvasSize, this.canvasSize);

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = col * cs;
        const y = row * cs;
        const isEven = (col + row) % 2 === 0;
        const cell = this.pathCells.find(c => c.col === col && c.row === row);

        if (cell) {
          switch (cell.type) {
            case CellType.Start:
              ctx.fillStyle = '#EF4444';
              break;
            case CellType.Event:
              ctx.fillStyle = '#A855F7';
              break;
            case CellType.Property:
              ctx.fillStyle = '#BBF7D0';
              break;
            default:
              ctx.fillStyle = isEven ? '#E0F2FE' : '#FFFFFF';
          }
        } else {
          ctx.fillStyle = isEven ? '#1E293B' : '#263548';
        }

        ctx.fillRect(x, y, cs, cs);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, cs, cs);

        if (cell) {
          this.renderCellContent(ctx, cell, x, y, cs);
        }
      }
    }

    this.renderCenterText(ctx);
    this.renderPlayers(ctx, timestamp);
  }

  private renderCellContent(ctx: CanvasRenderingContext2D, cell: CellData, x: number, y: number, cs: number) {
    if (!cell.name) return;

    const textColor = cell.type === CellType.Property ? '#065F46' :
      cell.type === CellType.Event ? '#FFFFFF' :
      cell.type === CellType.Start ? '#FFFFFF' : '#1E293B';

    ctx.fillStyle = textColor;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cell.name, x + cs / 2, y + cs / 2 - (cell.price > 0 ? 7 : 0));

    if (cell.price > 0) {
      ctx.font = '9px sans-serif';
      ctx.fillText('¥' + cell.price, x + cs / 2, y + cs / 2 + 7);
    }

    if (cell.owner >= 0) {
      ctx.fillStyle = this.playerColors[cell.owner];
      ctx.beginPath();
      ctx.arc(x + cs - 8, y + 8, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderCenterText(ctx: CanvasRenderingContext2D) {
    const cx = this.canvasSize / 2;
    const cy = this.canvasSize / 2;
    ctx.fillStyle = '#F1F5F9';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('骰子大富翁', cx, cy - 12);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('点击下方骰子开始游戏', cx, cy + 16);
  }

  private renderPlayers(ctx: CanvasRenderingContext2D, _timestamp: number) {
    const posGroups = new Map<number, number[]>();
    for (let i = 0; i < 4; i++) {
      const pos = this.playerPositions[i];
      if (!posGroups.has(pos)) posGroups.set(pos, []);
      posGroups.get(pos)!.push(i);
    }

    for (const [pathIdx, players] of posGroups) {
      const cell = this.pathCells[pathIdx];
      const cx = cell.col * this.cellSize + this.cellSize / 2;
      const cy = cell.row * this.cellSize + this.cellSize / 2;
      const offsets = this.getOffsets(players.length);

      for (let i = 0; i < players.length; i++) {
        const pi = players[i];
        const off = offsets[i];

        if (pi === this.animatingPlayer) {
          continue;
        }

        this.drawPiece(ctx, cx + off[0], cy + off[1], pi);
      }
    }

    if (this.animatingPlayer >= 0) {
      const t = this.easeInOut(this.animProgress);
      const px = this.animFromX + (this.animToX - this.animFromX) * t;
      const py = this.animFromY + (this.animToY - this.animFromY) * t;
      this.drawPiece(ctx, px, py, this.animatingPlayer);
    }
  }

  private drawPiece(ctx: CanvasRenderingContext2D, x: number, y: number, playerIndex: number) {
    const r = 12;
    ctx.beginPath();
    ctx.arc(x, y + 6, r, 0, Math.PI * 2);
    ctx.fillStyle = this.playerColors[playerIndex];
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(playerIndex + 1), x, y + 6);
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private getOffsets(count: number): [number, number][] {
    if (count === 1) return [[0, 0]];
    if (count === 2) return [[-9, 0], [9, 0]];
    if (count === 3) return [[-9, -7], [9, -7], [0, 7]];
    return [[-9, -7], [9, -7], [-9, 7], [9, 7]];
  }
}
