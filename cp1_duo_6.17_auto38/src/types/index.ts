export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface LineData {
  id: string;
  points: Point[];
  color: string;
  size: number;
  user_id: string;
  created_at: number;
  likes: number;
  liked_by?: string[];
}

export interface PublishLineRequest {
  points: Point[];
  color: string;
  size: number;
}

export interface SnapshotData {
  time: number;
  lines: LineData[];
  online_users: number;
  new_lines: number;
  total_lines: number;
}

export interface LeaderboardItem {
  id: string;
  user_id: string;
  likes: number;
  created_at: number;
  color: string;
}

export interface ToolState {
  color: string;
  brushSize: number;
  hue: number;
  saturation: number;
  lightness: number;
}
