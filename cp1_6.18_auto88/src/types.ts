export const BOARD_SIZE = 19;

export type StoneColor = 1 | 2;

export const BLACK: StoneColor = 1;
export const WHITE: StoneColor = 2;

export type BoardState = (StoneColor | 0)[];

export interface Move {
  x: number;
  y: number;
  color: StoneColor;
  captures: number;
  capturedPositions: { x: number; y: number }[];
}

export interface AIRecommendation {
  x: number;
  y: number;
  score: number;
}

export interface GameState {
  board: BoardState;
  currentColor: StoneColor;
  moves: Move[];
  blackCaptures: number;
  whiteCaptures: number;
  koPoint: { x: number; y: number } | null;
  lastMove: { x: number; y: number } | null;
  aiEnabled: boolean;
  aiRecommendations: AIRecommendation[];
  viewMoveIndex: number;
}

export interface BoardClickEvent {
  x: number;
  y: number;
}

export const STAR_POINTS: { x: number; y: number }[] = [
  { x: 3, y: 3 }, { x: 3, y: 9 }, { x: 3, y: 15 },
  { x: 9, y: 3 }, { x: 9, y: 9 }, { x: 9, y: 15 },
  { x: 15, y: 3 }, { x: 15, y: 9 }, { x: 15, y: 15 },
];

export const COL_LABELS = 'ABCDEFGHJKLMNOPQRST';

export function toCoord(x: number, y: number): string {
  return `${COL_LABELS[x]}${BOARD_SIZE - y}`;
}

export function idx(x: number, y: number): number {
  return y * BOARD_SIZE + x;
}
