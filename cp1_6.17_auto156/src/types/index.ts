export interface Player {
  id: string;
  name: string;
  avatar: string;
  avatar_bg: string;
  is_host: boolean;
  total_score: number;
  round_scores: number[];
  submitted_round: boolean;
}

export type GamePhase = 'lobby' | 'round_prep' | 'recording' | 'round_end' | 'game_end';

export interface RoomState {
  room_code: string;
  phase: GamePhase;
  players: Player[];
  current_round: number;
  total_rounds: number;
  current_twister: string;
  countdown: number;
}

export interface RoundRankingItem {
  rank: number;
  player_id: string;
  name: string;
  avatar: string;
  avatar_bg: string;
  accuracy: number;
  duration: number;
  recognized_text: string;
  round_score: number;
  accuracy_score: number;
  duration_score: number;
  final_score: number;
}

export interface RoundEndData {
  round: number;
  total_rounds: number;
  rankings: RoundRankingItem[];
  twister: string;
}

export interface FinalRankingItem {
  rank: number;
  player_id: string;
  name: string;
  avatar: string;
  avatar_bg: string;
  total_score: number;
  round_scores: number[];
}

export interface GameEndData {
  final_rankings: FinalRankingItem[];
  total_rounds: number;
}

export interface CurrentPlayer {
  id: string;
  name: string;
  avatar: string;
  avatar_bg: string;
  room_code: string;
}
