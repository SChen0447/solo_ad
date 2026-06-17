import axios from 'axios';
import type { LineData, PublishLineRequest, SnapshotData, LeaderboardItem } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.message);
    throw error;
  }
);

export const canvasApi = {
  async getLines(limit = 1000): Promise<{ lines: LineData[]; total: number; first_time: number }> {
    return api.get('/lines', { params: { limit } });
  },

  async publishLines(lines: PublishLineRequest[]): Promise<{
    success: boolean;
    count: number;
    user_id: string;
    lines: LineData[];
  }> {
    return api.post('/lines', { lines });
  },

  async likeLine(lineId: string): Promise<{
    success: boolean;
    line_id: string;
    likes: number;
    liked: boolean;
  }> {
    return api.put(`/lines/${lineId}/like`);
  },

  async getLeaderboard(): Promise<{ leaderboard: LeaderboardItem[] }> {
    return api.get('/leaderboard');
  },

  async getSnapshot(time: number): Promise<SnapshotData> {
    return api.get('/snapshots', { params: { time } });
  },

  async heartbeat(): Promise<{ online_users: number; user_id: string }> {
    return api.post('/heartbeat');
  },

  async getNewLines(since: number): Promise<{ lines: LineData[]; count: number }> {
    return api.get('/new-lines', { params: { since } });
  },
};
