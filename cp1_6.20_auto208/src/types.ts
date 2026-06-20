export type Player = 1 | 2;

export type GamePhase = 'setup' | 'playing' | 'ended';

export type DifficultyMode = 'normal' | 'advanced' | 'master';

export type LineDirection = 'horizontal' | 'vertical' | 'diagonal-right' | 'diagonal-left';

export interface CellState {
  owner: Player | null;
  isPlanet: boolean;
}

export interface PlayerState {
  id: Player;
  score: number;
  tokensPlaced: number;
  energy: number;
  skillUsedCount: number;
}

export interface Line {
  player: Player;
  cells: [number, number][];
  direction: LineDirection;
  length: number;
}

export interface ScoreEntry {
  turn: number;
  player1: number;
  player2: number;
}

export interface DifficultyConfig {
  boardSize: number;
  hasSkill: boolean;
  targetScore: number;
  minPlanets: number;
  maxPlanets: number;
  label: string;
}

export interface GameState {
  board: CellState[][];
  boardSize: number;
  players: [PlayerState, PlayerState];
  currentPlayer: Player;
  phase: GamePhase;
  difficulty: DifficultyMode;
  targetScore: number;
  hasSkill: boolean;
  totalTurns: number;
  longestLine: number;
  activeLines: Line[];
  scoreHistory: ScoreEntry[];
  skillMode: boolean;
  winner: Player | null;
  lastError: string | null;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyMode, DifficultyConfig> = {
  normal: {
    boardSize: 8,
    hasSkill: false,
    targetScore: 20,
    minPlanets: 5,
    maxPlanets: 8,
    label: '普通模式',
  },
  advanced: {
    boardSize: 8,
    hasSkill: true,
    targetScore: 20,
    minPlanets: 5,
    maxPlanets: 8,
    label: '进阶模式',
  },
  master: {
    boardSize: 10,
    hasSkill: true,
    targetScore: 30,
    minPlanets: 8,
    maxPlanets: 11,
    label: '大师模式',
  },
};
