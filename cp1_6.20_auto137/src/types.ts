export type EmotionType = 'happy' | 'sad' | 'anxious' | 'calm' | 'excited' | 'angry' | 'tired' | 'grateful';

export interface EmojiItem {
  emoji: string;
  x: number;
  y: number;
  scale: number;
}

export interface Diary {
  id: string;
  emotion: EmotionType;
  text: string;
  emojis: EmojiItem[];
  collageUrl?: string;
  template?: CollageTemplate;
  createdAt: string;
}

export type CollageTemplate = 'movie_poster' | 'vintage_stamp' | 'minimal_geo' | 'watercolor' | 'pixel_mosaic';

export interface CollageRequest {
  emotion: EmotionType;
  text: string;
  emojis: string[];
  template: CollageTemplate;
}

export interface CollageResponse {
  collageUrl: string;
  template: string;
}

export interface EmotionStats {
  date: string;
  emotion: EmotionType;
}

export const EMOTION_CONFIG: Record<EmotionType, { label: string; color: string; emoji: string; gradient: string }> = {
  happy: { label: '开心', color: '#FFD93D', emoji: '😊', gradient: 'linear-gradient(135deg, #FFD93D, #FF9A3C)' },
  sad: { label: '悲伤', color: '#6C5B7B', emoji: '😢', gradient: 'linear-gradient(135deg, #6C5B7B, #3D3A50)' },
  anxious: { label: '焦虑', color: '#E84545', emoji: '😰', gradient: 'linear-gradient(135deg, #E84545, #C23152)' },
  calm: { label: '平静', color: '#81B29A', emoji: '😌', gradient: 'linear-gradient(135deg, #81B29A, #52796F)' },
  excited: { label: '兴奋', color: '#FF6F61', emoji: '🤩', gradient: 'linear-gradient(135deg, #FF6F61, #FF3F34)' },
  angry: { label: '愤怒', color: '#FF4757', emoji: '😤', gradient: 'linear-gradient(135deg, #FF4757, #C0392B)' },
  tired: { label: '疲惫', color: '#A29BFE', emoji: '😴', gradient: 'linear-gradient(135deg, #A29BFE, #6C5CE7)' },
  grateful: { label: '感恩', color: '#F8B500', emoji: '🙏', gradient: 'linear-gradient(135deg, #F8B500, #FF8C00)' },
};

export const EMOTION_LIST: EmotionType[] = ['happy', 'sad', 'anxious', 'calm', 'excited', 'angry', 'tired', 'grateful'];

export const EMOJI_PALETTE = ['😊', '😢', '😰', '😌', '🤩', '😤', '😴', '🙏', '❤️', '🌟', '🌈', '🎵', '🎨', '✨', '🌸', '🍀', '🔥', '💧', '🌙', '☀️', '🦋', '🌺', '🍄', '🎯'];

export const COLLAGE_TEMPLATES: { key: CollageTemplate; label: string; desc: string }[] = [
  { key: 'movie_poster', label: '电影海报风', desc: '大字标题+暗角+胶片质感' },
  { key: 'vintage_stamp', label: '复古邮票风', desc: '锯齿边框+泛黄底色+复古色调' },
  { key: 'minimal_geo', label: '极简几何风', desc: '纯色块+线条分割+留白' },
  { key: 'watercolor', label: '水彩晕染风', desc: '柔和渐变+水墨扩散效果' },
  { key: 'pixel_mosaic', label: '像素马赛克风', desc: '像素化处理+网格装饰+8-bit配色' },
];
