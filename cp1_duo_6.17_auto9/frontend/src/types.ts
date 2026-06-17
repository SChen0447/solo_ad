export interface PlayerInfo {
  id: string;
  nickname: string;
  color: string;
  score: number;
  isHost: boolean;
}

export interface WordCard {
  keyword: string;
  forbiddenWords: string[];
}

export interface PlayerAnswer {
  playerId: string;
  nickname: string;
  answer: string;
  correct: boolean | null;
}

export interface RoundStartData {
  round: number;
  totalRounds: number;
  describerId: string;
  describerNickname: string;
  keyword: string;
  forbiddenWords: string[];
  duration: number;
  palette: string[];
}

export interface RoundResult {
  round: number;
  keyword: string;
  forbiddenWords: string[];
  describerId: string;
  describerNickname: string;
  answers: PlayerAnswer[];
  correctGuessers: string[];
}

export interface RoundLog {
  round: number;
  keyword: string;
  describerNickname: string;
  correctGuessers: string[];
}

export interface GameFinalResult {
  roomId: string;
  theme: string;
  players: PlayerInfo[];
  rounds: RoundResult[];
  funniestAnswer: FunniestAnswer | null;
}

export interface FunniestAnswer {
  playerId: string;
  nickname: string;
  answer: string;
  keyword: string;
  reason: string;
}

export interface GameState {
  roomId: string;
  theme: string;
  players: PlayerInfo[];
  currentRound: number;
  totalRounds: number;
  currentDescriberId: string;
  currentDescriberNickname: string;
  keyword: string;
  forbiddenWords: string[];
  phase: 'waiting' | 'describing' | 'answering' | 'revealing' | 'roundEnd' | 'gameEnd';
  timeRemaining: number;
  answers: PlayerAnswer[];
  roundLogs: RoundLog[];
  funniestAnswer: FunniestAnswer | null;
  finalResult: GameFinalResult | null;
  palette: string[];
}

export type GameAction =
  | { type: 'SET_ROOM'; roomId: string; theme: string; players: PlayerInfo[]; isHost: boolean; myId: string }
  | { type: 'PLAYER_JOINED'; players: PlayerInfo[] }
  | { type: 'PLAYER_LEFT'; players: PlayerInfo[] }
  | { type: 'GAME_STARTED'; players: PlayerInfo[] }
  | { type: 'ROUND_START'; data: RoundStartData }
  | { type: 'COUNTDOWN_TICK' }
  | { type: 'ANSWER_SUBMITTED'; playerId: string; answer: string }
  | { type: 'ROUND_ENDED'; answers: PlayerAnswer[] }
  | { type: 'ANSWER_REVEALED'; answerIndex: number; correct: boolean }
  | { type: 'ROUND_RESULT'; result: RoundResult }
  | { type: 'SCORE_UPDATE'; players: PlayerInfo[] }
  | { type: 'GAME_ENDED'; finalResult: GameFinalResult }
  | { type: 'RESET' };

export const THEME_OPTIONS = [
  { id: 'fantasy', name: '奇幻世界', icon: '🏰' },
  { id: 'scifi', name: '科技未来', icon: '🚀' },
  { id: 'mythology', name: '古代神话', icon: '⚡' },
  { id: 'kitchen', name: '厨房战争', icon: '🍳' },
  { id: 'animals', name: '动物王国', icon: '🦁' },
  { id: 'superhero', name: '超级英雄', icon: '🦸' },
  { id: 'custom', name: '自定义主题', icon: '✨' },
] as const;

export const PLAYER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#FF8C42', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E9', '#F1948A',
];

export const THEME_PALETTES: Record<string, string[]> = {
  fantasy: ['#FFF8E7', '#FFE4B5', '#FFDAB9', '#FFEFD5', '#FFF0DB', '#FFFAF0', '#FDF5E6', '#FFEBCD'],
  scifi: ['#FFF8E7', '#E0F7FA', '#B2EBF2', '#E0F2F1', '#E8F5E9', '#F1F8E9', '#FFFDE7', '#FFF8E1'],
  mythology: ['#FFF8E7', '#F3E5F5', '#EDE7F6', '#E8EAF6', '#E3F2FD', '#E1F5FE', '#FCE4EC', '#FFF3E0'],
  kitchen: ['#FFF8E7', '#FFF3E0', '#FFE0B2', '#FFCC80', '#FFE082', '#FFF59D', '#F0F4C3', '#DCEDC8'],
  animals: ['#FFF8E7', '#E8F5E9', '#C8E6C9', '#DCEDC8', '#F0F4C3', '#FFF9C4', '#FFECB3', '#FFE0B2'],
  superhero: ['#FFF8E7', '#FCE4EC', '#F8BBD0', '#E1BEE7', '#D1C4E9', '#C5CAE9', '#BBDEFB', '#B3E5FC'],
  custom: ['#FFF8E7', '#F5F5F5', '#EEEEEE', '#E0E0E0', '#BDBDBD', '#9E9E9E', '#757575', '#616161'],
};
