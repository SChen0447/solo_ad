import axios, { AxiosError, AxiosResponse } from 'axios';

export interface Point {
  x: number;
  y: number;
  p?: number;
}

export interface LineData {
  id: string;
  points: Point[];
  color: string;
  size: number;
  author: string;
  timestamp: number;
  likes: number;
}

export interface PublishLineInput {
  points: Point[];
  color: string;
  size: number;
}

export interface PublishResult {
  success: boolean;
  lines: { id: string; author: string; timestamp: number }[];
  author: string;
  count: number;
}

export interface GetLinesResult {
  lines: LineData[];
  total: number;
  online_count: number;
  first_time: number;
}

export interface SnapshotResult {
  lines: LineData[];
  target_time: number;
  online_count: number;
  new_lines_count: number;
  snapshot_time: number;
}

export interface LikeResult {
  success: boolean;
  liked: boolean;
  likes: number;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  author: string;
  likes: number;
  color: string;
  timestamp: number;
}

export interface LeaderboardResult {
  leaderboard: LeaderboardEntry[];
  total_likes: number;
  total_lines: number;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as { error?: string } | undefined;
      console.error(`[Canvas API] 请求错误 ${status}:`, data?.error || error.message);
    } else if (error.request) {
      console.error('[Canvas API] 网络请求失败，请检查后端服务是否启动');
    } else {
      console.error('[Canvas API] 请求配置错误:', error.message);
    }
    return Promise.reject(error);
  }
);

export const canvasApi = {
  async publishLines(lines: PublishLineInput[]): Promise<PublishResult> {
    const response = await api.post<PublishResult>('/lines', { lines });
    return response.data;
  },

  async getRecentLines(limit = 1000, since?: number): Promise<GetLinesResult> {
    const params: Record<string, unknown> = { limit };
    if (since !== undefined) {
      params.since = since;
    }
    const response = await api.get<GetLinesResult>('/lines', { params });
    return response.data;
  },

  async getSnapshot(time: number): Promise<SnapshotResult> {
    const response = await api.get<SnapshotResult>('/snapshots', {
      params: { time },
    });
    return response.data;
  },

  async likeLine(lineId: string): Promise<LikeResult> {
    const response = await api.put<LikeResult>(`/lines/${lineId}/like`);
    return response.data;
  },

  async getLeaderboard(limit = 20): Promise<LeaderboardResult> {
    const response = await api.get<LeaderboardResult>('/leaderboard', {
      params: { limit },
    });
    return response.data;
  },

  async healthCheck(): Promise<{ status: string; lines_count: number }> {
    const response = await api.get('/health');
    return response.data;
  },
};

export default canvasApi;
