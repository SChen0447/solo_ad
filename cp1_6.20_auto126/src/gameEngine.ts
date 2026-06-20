export type Attribute = 'light' | 'dark' | 'phantom';
export type Player = 0 | 1;

export interface Position {
  row: number;
  col: number;
}

export interface Piece {
  id: string;
  attribute: Attribute;
  player: Player;
  position: Position;
}

export interface BoardCell {
  piece: Piece | null;
  isEnergyNode: boolean;
  isBlocked: boolean;
}

export interface GameState {
  board: BoardCell[][];
  scores: [number, number];
  turn: Player;
  pieces: Piece[];
  isGameOver: boolean;
  winner: Player | null;
  turnCount: number;
}

export interface MoveEvent {
  piece: Piece;
  from: Position;
  to: Position;
}

export interface CaptureEvent {
  attacker: Piece;
  captured: Piece;
}

export interface ScoreEvent {
  player: Player;
  points: number;
}

export interface WinEvent {
  winner: Player;
  reason: string;
}

type EventCallback = (...args: unknown[]) => void;

const ENERGY_NODES: Position[] = [
  { row: 1, col: 1 },
  { row: 1, col: 6 },
  { row: 6, col: 1 },
  { row: 6, col: 6 },
];

const BEATS: Record<Attribute, Attribute> = {
  light: 'dark',
  dark: 'phantom',
  phantom: 'light',
};

const ATTRIBUTE_LABELS: Record<Attribute, string> = {
  light: '光',
  dark: '暗',
  phantom: '幻',
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function createEmptyBoard(): BoardCell[][] {
  const board: BoardCell[][] = [];
  for (let r = 0; r < 8; r++) {
    const row: BoardCell[] = [];
    for (let c = 0; c < 8; c++) {
      const isEnergyNode = ENERGY_NODES.some(n => n.row === r && n.col === c);
      row.push({ piece: null, isEnergyNode, isBlocked: false });
    }
    board.push(row);
  }
  return board;
}

export class GameEngine {
  private state: GameState;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private aiTimer: ReturnType<typeof setInterval> | null = null;
  private onStateChange: () => void;

  constructor(onStateChange: () => void) {
    this.onStateChange = onStateChange;
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      board: createEmptyBoard(),
      scores: [0, 0],
      turn: 0,
      pieces: [],
      isGameOver: false,
      winner: null,
      turnCount: 0,
    };
  }

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach(cb => cb(...args));
  }

  getState(): GameState {
    return this.state;
  }

  getAttributeLabel(attr: Attribute): string {
    return ATTRIBUTE_LABELS[attr];
  }

  canBeat(attacker: Attribute, defender: Attribute): boolean {
    return BEATS[attacker] === defender;
  }

  getCounterAttribute(attr: Attribute): Attribute {
    return BEATS[attr];
  }

  placePiece(row: number, col: number, attribute: Attribute, player: Player): boolean {
    if (this.state.isGameOver) return false;
    if (this.state.turn !== player) return false;
    if (row < 0 || row >= 8 || col < 0 || col >= 8) return false;

    const cell = this.state.board[row][col];
    if (cell.piece !== null || cell.isBlocked) return false;

    const piece: Piece = {
      id: generateId(),
      attribute,
      player,
      position: { row, col },
    };

    cell.piece = piece;
    this.state.pieces.push(piece);

    if (cell.isEnergyNode) {
      this.state.scores[player] += 1;
      this.emit('score', { player, points: 1 } as ScoreEvent);
    }

    this.checkCaptures(piece);
    this.emit('move', { piece, from: { row, col }, to: { row, col } } as MoveEvent);
    this.checkWinCondition();
    this.advanceTurn();
    this.onStateChange();
    return true;
  }

  movePiece(pieceId: string, toRow: number, toCol: number, player: Player): boolean {
    if (this.state.isGameOver) return false;
    if (this.state.turn !== player) return false;
    if (toRow < 0 || toRow >= 8 || toCol < 0 || toCol >= 8) return false;

    const piece = this.state.pieces.find(p => p.id === pieceId);
    if (!piece || piece.player !== player) return false;

    const dr = Math.abs(toRow - piece.position.row);
    const dc = Math.abs(toCol - piece.position.col);
    if (dr > 1 || dc > 1) return false;
    if (dr === 0 && dc === 0) return false;

    const targetCell = this.state.board[toRow][toCol];
    if (targetCell.isBlocked) return false;

    const from: Position = { ...piece.position };

    if (targetCell.piece !== null) {
      if (targetCell.piece.player === player) return false;
      if (!this.canBeat(piece.attribute, targetCell.piece.attribute)) return false;
      this.capturePiece(piece, targetCell.piece);
    }

    this.state.board[from.row][from.col].piece = null;
    piece.position = { row: toRow, col: toCol };
    this.state.board[toRow][toCol].piece = piece;

    if (targetCell.isEnergyNode) {
      this.state.scores[player] += 1;
      this.emit('score', { player, points: 1 } as ScoreEvent);
    }

    this.emit('move', { piece, from, to: { row: toRow, col: toCol } } as MoveEvent);
    this.checkWinCondition();
    this.advanceTurn();
    this.onStateChange();
    return true;
  }

  private capturePiece(attacker: Piece, captured: Piece): void {
    this.state.pieces = this.state.pieces.filter(p => p.id !== captured.id);
    this.state.board[captured.position.row][captured.position.col].piece = null;
    this.emit('capture', { attacker, captured } as CaptureEvent);
  }

  private checkCaptures(piece: Piece): void {
    const { row, col } = piece.position;
    const neighbors: Position[] = [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
    ];

    for (const n of neighbors) {
      if (n.row < 0 || n.row >= 8 || n.col < 0 || n.col >= 8) continue;
      const neighbor = this.state.board[n.row][n.col];
      if (neighbor.piece && neighbor.piece.player !== piece.player) {
        if (this.canBeat(piece.attribute, neighbor.piece.attribute)) {
          this.capturePiece(piece, neighbor.piece);
        }
      }
    }
  }

  private checkWinCondition(): void {
    if (this.state.scores[0] >= 10) {
      this.state.isGameOver = true;
      this.state.winner = 0;
      this.emit('win', { winner: 0, reason: '达到10分' } as WinEvent);
      this.stopAI();
      return;
    }
    if (this.state.scores[1] >= 10) {
      this.state.isGameOver = true;
      this.state.winner = 1;
      this.emit('win', { winner: 1, reason: '达到10分' } as WinEvent);
      this.stopAI();
      return;
    }

    const opponent: Player = this.state.turn === 0 ? 1 : 0;
    const hasMove = this.playerHasMoves(opponent);
    if (!hasMove) {
      this.state.isGameOver = true;
      this.state.winner = this.state.turn;
      this.emit('win', { winner: this.state.turn, reason: '封锁对手' } as WinEvent);
      this.stopAI();
    }
  }

  private playerHasMoves(player: Player): boolean {
    const playerPieces = this.state.pieces.filter(p => p.player === player);
    for (const piece of playerPieces) {
      if (this.getValidMoves(piece).length > 0) return true;
    }
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = this.state.board[r][c];
        if (cell.piece === null && !cell.isBlocked) return true;
      }
    }
    return playerPieces.length === 0;
  }

  getValidMoves(piece: Piece): Position[] {
    const moves: Position[] = [];
    const { row, col } = piece.position;
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];

    for (const [dr, dc] of directions) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
      const cell = this.state.board[nr][nc];
      if (cell.isBlocked) continue;
      if (cell.piece !== null) {
        if (cell.piece.player === piece.player) continue;
        if (!this.canBeat(piece.attribute, cell.piece.attribute)) continue;
      }
      moves.push({ row: nr, col: nc });
    }
    return moves;
  }

  private advanceTurn(): void {
    if (this.state.isGameOver) return;
    this.state.turn = this.state.turn === 0 ? 1 : 0;
    this.state.turnCount += 1;
  }

  startAI(): void {
    if (this.aiTimer) return;
    this.aiTimer = setInterval(() => this.aiStep(), 2000);
  }

  stopAI(): void {
    if (this.aiTimer) {
      clearInterval(this.aiTimer);
      this.aiTimer = null;
    }
  }

  private aiStep(): void {
    if (this.state.isGameOver || this.state.turn !== 1) return;

    const start = performance.now();

    const attackMove = this.findAttackMove();
    if (attackMove) {
      const elapsed = performance.now() - start;
      if (elapsed > 50) return;
      if (attackMove.type === 'place') {
        this.placePiece(attackMove.row, attackMove.col, attackMove.attribute, 1);
      } else {
        this.movePiece(attackMove.pieceId, attackMove.toRow, attackMove.toCol, 1);
      }
      return;
    }

    const nodeMove = this.findNodeMove();
    if (nodeMove) {
      const elapsed = performance.now() - start;
      if (elapsed > 50) return;
      if (nodeMove.type === 'place') {
        this.placePiece(nodeMove.row, nodeMove.col, nodeMove.attribute, 1);
      } else {
        this.movePiece(nodeMove.pieceId, nodeMove.toRow, nodeMove.toCol, 1);
      }
      return;
    }

    const randomMove = this.findRandomMove();
    if (randomMove) {
      if (randomMove.type === 'place') {
        this.placePiece(randomMove.row, randomMove.col, randomMove.attribute, 1);
      } else {
        this.movePiece(randomMove.pieceId, randomMove.toRow, randomMove.toCol, 1);
      }
    }
  }

  private findAttackMove(): { type: 'place' | 'move'; row?: number; col?: number; attribute?: Attribute; pieceId?: string; toRow?: number; toCol?: number } | null {
    const playerPieces = this.state.pieces.filter(p => p.player === 1);
    const attributes: Attribute[] = ['light', 'dark', 'phantom'];

    for (const piece of playerPieces) {
      const moves = this.getValidMoves(piece);
      for (const move of moves) {
        const targetCell = this.state.board[move.row][move.col];
        if (targetCell.piece && targetCell.piece.player === 0 && this.canBeat(piece.attribute, targetCell.piece.attribute)) {
          return { type: 'move', pieceId: piece.id, toRow: move.row, toCol: move.col };
        }
      }
    }

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = this.state.board[r][c];
        if (cell.piece !== null || cell.isBlocked) continue;
        const neighbors: Position[] = [
          { row: r - 1, col: c }, { row: r + 1, col: c },
          { row: r, col: c - 1 }, { row: r, col: c + 1 },
        ];
        for (const n of neighbors) {
          if (n.row < 0 || n.row >= 8 || n.col < 0 || n.col >= 8) continue;
          const neighbor = this.state.board[n.row][n.col];
          if (neighbor.piece && neighbor.piece.player === 0) {
            const counterAttr = this.getCounterAttribute(neighbor.piece.attribute);
            return { type: 'place', row: r, col: c, attribute: counterAttr };
          }
        }
      }
    }

    return null;
  }

  private findNodeMove(): { type: 'place' | 'move'; row?: number; col?: number; attribute?: Attribute; pieceId?: string; toRow?: number; toCol?: number } | null {
    const playerPieces = this.state.pieces.filter(p => p.player === 1);
    const attributes: Attribute[] = ['light', 'dark', 'phantom'];

    for (const piece of playerPieces) {
      const moves = this.getValidMoves(piece);
      for (const move of moves) {
        if (this.state.board[move.row][move.col].isEnergyNode) {
          const targetCell = this.state.board[move.row][move.col];
          if (targetCell.piece === null || this.canBeat(piece.attribute, targetCell.piece.attribute)) {
            return { type: 'move', pieceId: piece.id, toRow: move.row, toCol: move.col };
          }
        }
      }
    }

    for (const node of ENERGY_NODES) {
      const cell = this.state.board[node.row][node.col];
      if (cell.piece === null && !cell.isBlocked) {
        const attr = attributes[Math.floor(Math.random() * 3)];
        return { type: 'place', row: node.row, col: node.col, attribute: attr };
      }
    }

    return null;
  }

  private findRandomMove(): { type: 'place' | 'move'; row: number; col: number; attribute?: Attribute; pieceId?: string; toRow?: number; toCol?: number } | null {
    const playerPieces = this.state.pieces.filter(p => p.player === 1);
    const attributes: Attribute[] = ['light', 'dark', 'phantom'];

    if (playerPieces.length > 0 && Math.random() > 0.4) {
      const piece = playerPieces[Math.floor(Math.random() * playerPieces.length)];
      const moves = this.getValidMoves(piece);
      if (moves.length > 0) {
        const move = moves[Math.floor(Math.random() * moves.length)];
        return { type: 'move', pieceId: piece.id, toRow: move.row, toCol: move.col, row: move.row, col: move.col };
      }
    }

    const emptyCells: Position[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = this.state.board[r][c];
        if (cell.piece === null && !cell.isBlocked) {
          emptyCells.push({ row: r, col: c });
        }
      }
    }

    if (emptyCells.length === 0) return null;

    const pos = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const attr = attributes[Math.floor(Math.random() * 3)];
    return { type: 'place', row: pos.row, col: pos.col, attribute: attr };
  }

  reset(): void {
    this.stopAI();
    this.state = this.createInitialState();
    this.onStateChange();
  }

  undoLastAction(): boolean {
    return false;
  }

  getEnergyNodes(): Position[] {
    return ENERGY_NODES;
  }
}
