export interface User {
  id: number;
  username: string;
  email: string;
  is_judge: boolean;
  created_at: string;
}

export interface Work {
  id: number;
  title: string;
  description: string;
  image_path: string;
  thumbnail_path: string;
  user_id: number;
  author: {
    username: string;
  };
  created_at: string;
  scores?: Score[];
}

export interface Score {
  id: number;
  work_id: number;
  judge_id: number;
  composition: number;
  color: number;
  creativity: number;
  emotion: number;
  total_score: number;
  judge?: {
    username: string;
  };
  created_at: string;
}

export interface RankingItem {
  rank: number;
  work_id: number;
  title: string;
  thumbnail_path: string;
  author: string;
  avg_total: number;
  avg_composition: number;
  avg_color: number;
  avg_creativity: number;
  avg_emotion: number;
  max_score: number;
  min_score: number;
  score_count: number;
}

export interface ScoreFormData {
  work_id: number;
  composition: number;
  color: number;
  creativity: number;
  emotion: number;
}

export interface PendingWork {
  id: number;
  title: string;
  thumbnail_path: string;
  created_at: string;
  is_scored: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface WorksResponse {
  works: Work[];
  total: number;
}
