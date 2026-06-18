import { BOARD_SIZE, BoardState, StoneColor, BLACK, WHITE, idx, Move } from './types';

const NEIGHBORS: Record<number, number[]> = {};

function initNeighbors() {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const i = idx(x, y);
      const nb: number[] = [];
      if (x > 0) nb.push(idx(x - 1, y));
      if (x < BOARD_SIZE - 1) nb.push(idx(x + 1, y));
      if (y > 0) nb.push(idx(x, y - 1));
      if (y < BOARD_SIZE - 1) nb.push(idx(x, y + 1));
      NEIGHBORS[i] = nb;
    }
  }
}
initNeighbors();

export function getGroup(board: BoardState, pos: number): { stones: number[]; liberties: Set<number> } {
  const color = board[pos];
  if (color === 0) return { stones: [], liberties: new Set() };

  const visited = new Set<number>();
  const stones: number[] = [];
  const liberties = new Set<number>();
  const stack = [pos];

  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (visited.has(cur)) continue;
    visited.add(cur);

    if (board[cur] === color) {
      stones.push(cur);
      for (const nb of NEIGHBORS[cur]) {
        if (!visited.has(nb)) {
          if (board[nb] === 0) {
            liberties.add(nb);
          } else if (board[nb] === color) {
            stack.push(nb);
          }
        }
      }
    }
  }

  return { stones, liberties };
}

export function getLibertyCount(board: BoardState, pos: number): number {
  return getGroup(board, pos).liberties.size;
}

export function opponent(color: StoneColor): StoneColor {
  return color === BLACK ? WHITE : BLACK;
}

export function boardToString(board: BoardState): string {
  return board.join(',');
}

export interface PlaceResult {
  board: BoardState;
  captures: number;
  capturedPositions: { x: number; y: number }[];
  koPoint: { x: number; y: number } | null;
  legal: boolean;
  reason?: string;
}

export function tryPlaceStone(
  board: BoardState,
  x: number,
  y: number,
  color: StoneColor,
  koPoint: { x: number; y: number } | null,
  prevBoardStr: string | null
): PlaceResult {
  const i = idx(x, y);

  if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
    return { board, captures: 0, capturedPositions: [], koPoint: null, legal: false, reason: '超出棋盘范围' };
  }

  if (board[i] !== 0) {
    return { board, captures: 0, capturedPositions: [], koPoint: null, legal: false, reason: '该位置已有棋子' };
  }

  if (koPoint && koPoint.x === x && koPoint.y === y) {
    return { board, captures: 0, capturedPositions: [], koPoint: null, legal: false, reason: '劫争禁入' };
  }

  const newBoard = board.slice();
  newBoard[i] = color;

  const opp = opponent(color);
  let totalCaptures = 0;
  const capturedPositions: { x: number; y: number }[] = [];

  for (const nb of NEIGHBORS[i]) {
    if (newBoard[nb] === opp) {
      const group = getGroup(newBoard, nb);
      if (group.liberties.size === 0) {
        for (const s of group.stones) {
          const sx = s % BOARD_SIZE;
          const sy = Math.floor(s / BOARD_SIZE);
          capturedPositions.push({ x: sx, y: sy });
          newBoard[s] = 0;
          totalCaptures++;
        }
      }
    }
  }

  const selfGroup = getGroup(newBoard, i);
  if (selfGroup.liberties.size === 0) {
    return { board, captures: 0, capturedPositions: [], koPoint: null, legal: false, reason: '禁入点（自杀）' };
  }

  if (prevBoardStr !== null && boardToString(newBoard) === prevBoardStr) {
    return { board, captures: 0, capturedPositions: [], koPoint: null, legal: false, reason: '劫争：不可立即回提' };
  }

  let newKoPoint: { x: number; y: number } | null = null;
  if (totalCaptures === 1 && selfGroup.stones.length === 1) {
    newKoPoint = capturedPositions[0];
  }

  return {
    board: newBoard,
    captures: totalCaptures,
    capturedPositions,
    koPoint: newKoPoint,
    legal: true,
  };
}

export function createEmptyBoard(): BoardState {
  return new Array(BOARD_SIZE * BOARD_SIZE).fill(0);
}

export function reconstructBoard(moves: Move[], upToIndex: number): BoardState {
  let board = createEmptyBoard();
  let koPoint: { x: number; y: number } | null = null;
  let prevBoardStr: string | null = null;

  for (let i = 0; i <= upToIndex && i < moves.length; i++) {
    const m = moves[i];
    const result = tryPlaceStone(board, m.x, m.y, m.color, koPoint, prevBoardStr);
    if (result.legal) {
      prevBoardStr = boardToString(board);
      board = result.board;
      koPoint = result.koPoint;
    }
  }

  return board;
}

export function getLegalMoves(
  board: BoardState,
  color: StoneColor,
  koPoint: { x: number; y: number } | null,
  prevBoardStr: string | null
): { x: number; y: number }[] {
  const moves: { x: number; y: number }[] = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const result = tryPlaceStone(board, x, y, color, koPoint, prevBoardStr);
      if (result.legal) {
        moves.push({ x, y });
      }
    }
  }
  return moves;
}
