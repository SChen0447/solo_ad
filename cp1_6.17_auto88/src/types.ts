export type EmotionType = 'happy' | 'calm' | 'sad' | 'angry' | 'anxious';

export type SceneType = 'street' | 'park' | 'cafe' | 'subway' | 'construction';

export interface EmotionReaction {
  id: string;
  recordId: string;
  emotion: EmotionType;
  userNickname: string;
  userAvatar: string;
  timestamp: number;
}

export interface SoundRecord {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  audioData: string;
  duration: number;
  recorderNickname: string;
  emotion: EmotionType;
  scene: SceneType;
  createdAt: number;
  reactions: EmotionReaction[];
}

export interface EmotionStats {
  happy: number;
  calm: number;
  sad: number;
  angry: number;
  anxious: number;
}

export const EMOTION_COLORS: Record<EmotionType, string> = {
  happy: '#FFD93D',
  calm: '#6BCB77',
  sad: '#4D96FF',
  angry: '#FF6B6B',
  anxious: '#9D4EDD',
};

export const EMOTION_NAMES: Record<EmotionType, string> = {
  happy: '开心',
  calm: '宁静',
  sad: '悲伤',
  angry: '愤怒',
  anxious: '焦虑',
};

export const EMOTION_EMOJIS: Record<EmotionType, string> = {
  happy: '😊',
  calm: '😌',
  sad: '😢',
  angry: '😠',
  anxious: '😰',
};

export const SCENE_NAMES: Record<SceneType, string> = {
  street: '街道',
  park: '公园',
  cafe: '咖啡馆',
  subway: '地铁站',
  construction: '工地',
};
