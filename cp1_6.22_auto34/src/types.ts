export type PlayerColor = 'black' | 'white';

export interface Position {
  row: number;
  col: number;
}

export interface Player {
  nickname: string;
  color: PlayerColor;
  remainingTime: number;
}

export interface Room {
  id: string;
  status: 'waiting' | 'playing' | 'finished';
  players: Player[];
  createdAt: number;
  creator: string;
}

export interface Move {
  order: number;
  position: Position;
  player: PlayerColor;
  timestamp: number;
}

export interface ChatMessage {
  sender: string;
  color: PlayerColor;
  text: string;
  timestamp: number;
}

export interface GameState {
  board: (PlayerColor | null)[][];
  currentTurn: PlayerColor;
  moves: Move[];
  winLine: Position[] | null;
  winner: PlayerColor | null;
  isFinished: boolean;
}

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

export const BOARD_SIZE = 15;
export const CELL_SIZE = 30;
export const INITIAL_TIME = 15 * 60 * 1000;
export const WIN_COUNT = 5;

export function createEmptyBoard(): (PlayerColor | null)[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
}

export function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function checkWin(
  board: (PlayerColor | null)[][],
  position: Position,
  player: PlayerColor
): Position[] | null {
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
  ];

  for (const { dr, dc } of directions) {
    const line: Position[] = [{ row: position.row, col: position.col }];

    for (let i = 1; i < WIN_COUNT; i++) {
      const r = position.row + dr * i;
      const c = position.col + dc * i;
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
      if (board[r][c] !== player) break;
      line.push({ row: r, col: c });
    }

    for (let i = 1; i < WIN_COUNT; i++) {
      const r = position.row - dr * i;
      const c = position.col - dc * i;
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
      if (board[r][c] !== player) break;
      line.push({ row: r, col: c });
    }

    if (line.length >= WIN_COUNT) {
      return line;
    }
  }

  return null;
}

export function formatTime(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
