export interface Track {
  id: number;
  title: string;
  artist: string;
  cover_url: string;
  audio_url: string;
  lyrics: string;
  user_id: number;
  created_at: string;
}

export interface Studio {
  id: number;
  track_id: number;
  host_id: number;
  started_at: string;
  duration: number;
  is_active: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  is_musician: boolean;
}

export interface Danmaku {
  id: number;
  content: string;
  nickname: string;
  created_at: string;
}

export interface DanmakuMessage {
  content: string;
  nickname: string;
  color: string;
  font_size: number;
}

export interface StudioUser {
  user_id: number;
  nickname: string;
  color: string;
  x: number;
  y: number;
}

export interface ChatBubble {
  user_id: number;
  content: string;
  nickname: string;
  x: number;
  y: number;
  opacity: number;
}
