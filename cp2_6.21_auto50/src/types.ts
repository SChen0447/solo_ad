export type GameType = 'word-guess' | 'spy' | 'draw-relay';
export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface Player {
  id: string;
  name: string;
  socketId: string;
  isHost: boolean;
  score: number;
}

export interface RoundHistory {
  id: string;
  playerId: string;
  playerName: string;
  word: string;
  isCorrect: boolean;
  isFirst: boolean;
  timestamp: number;
  roundNumber: number;
}

export interface RoomState {
  id: string;
  inviteCode: string;
  gameType: GameType;
  hostId: string;
  players: Player[];
  gameStatus: GameStatus;
  currentRound: number;
  currentHint: { category: string; length: number };
  countdown: number;
  countdownDuration: number;
  roundHistory: RoundHistory[];
}

export interface PublicRoom {
  id: string;
  inviteCode: string;
  gameType: GameType;
  playerCount: number;
  gameStatus: GameStatus;
}

export interface AnswerResult {
  playerId: string;
  playerName: string;
  isCorrect: boolean;
  isFirst: boolean;
  answer: string;
}

export interface RoundEndData {
  correctWord: string;
  roundNumber: number;
}
