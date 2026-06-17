import axios from 'axios';

const API_BASE = 'http://localhost:5000';

export interface LeaderboardEntry {
  id: number;
  nickname: string;
  score: number;
  created_at: string;
  rank?: number;
  rankChange?: string;
}

export async function submitScore(nickname: string, score: number): Promise<LeaderboardEntry | null> {
  try {
    const response = await axios.post(`${API_BASE}/api/scores`, { nickname, score });
    return response.data;
  } catch {
    return null;
  }
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const response = await axios.get(`${API_BASE}/api/leaderboard`);
    return response.data;
  } catch {
    return [];
  }
}
