export interface PlayerInfo {
  player_id: string;
  nickname: string;
  is_host: boolean;
  color: string;
}

export interface RoomSettings {
  round_duration: number;
  total_rounds: number;
}

export interface Instruction {
  type: 'click_button' | 'key_combo' | 'combo_hit' | 'quick_swipe';
  emoji: string;
  description: string;
  target: string;
  combo_count: number;
  time_limit: number;
  target_color?: string;
}

export interface PlayerResult {
  nickname: string;
  success: boolean;
  reaction_time: number | null;
  score: number;
}

export interface RankingEntry {
  rank: number;
  player_id: string;
  nickname: string;
  score: number;
  fail_count: number;
  eliminated: boolean;
  color: string;
}

export interface PlayerState {
  nickname: string;
  score: number;
  fail_count: number;
  eliminated: boolean;
  color: string;
}

export type GamePhase = 'lobby' | 'game' | 'result';

export const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
