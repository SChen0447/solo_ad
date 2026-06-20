export type EmotionType = 'happy' | 'calm' | 'sad' | 'angry' | 'surprised' | 'anxious';

export interface Emotion {
  type: EmotionType;
  emoji: string;
  label: string;
  color: string;
}

export interface ColorScheme {
  id: number;
  name: string;
  themeColor: string;
  distractorColors: string[];
}

export interface ChallengeRecord {
  date: string;
  score: number;
  timeSpent: number;
  themeColor: string;
  distractorColors: string[];
  schemeId: number;
  schemeName: string;
}

export interface EmotionRecord {
  date: string;
  emotion: EmotionType;
  emotionColor: string;
}

export interface DayRecord {
  date: string;
  challenge?: ChallengeRecord;
  emotion?: EmotionRecord;
}

export interface AppState {
  user: {
    name: string;
    totalScore: number;
  };
  todayChallenge?: ChallengeRecord;
  todayEmotion?: EmotionRecord;
  records: Record<string, DayRecord>;
  currentPage: 'challenge' | 'emotion' | 'calendar';
}

export const EMOTIONS: Emotion[] = [
  { type: 'happy', emoji: '😊', label: '开心', color: '#FFD700' },
  { type: 'calm', emoji: '😌', label: '平静', color: '#87CEEB' },
  { type: 'sad', emoji: '😢', label: '悲伤', color: '#4A90D9' },
  { type: 'angry', emoji: '😠', label: '愤怒', color: '#FF4500' },
  { type: 'surprised', emoji: '😮', label: '惊讶', color: '#9B59B6' },
  { type: 'anxious', emoji: '😰', label: '焦虑', color: '#B0B0B0' },
];

export const COLOR_SCHEMES: ColorScheme[] = [
  { id: 1, name: '日落橙', themeColor: '#FF6B35', distractorColors: ['#E85D04', '#DC2F02', '#F48C06', '#FAA307'] },
  { id: 2, name: '海洋蓝', themeColor: '#0077B6', distractorColors: ['#00B4D8', '#0096C7', '#023E8A', '#48CAE4'] },
  { id: 3, name: '森林绿', themeColor: '#2D6A4F', distractorColors: ['#40916C', '#52B788', '#1B4332', '#74C69D'] },
  { id: 4, name: '玫瑰粉', themeColor: '#E63946', distractorColors: ['#F72585', '#B5179E', '#7209B7', '#FF006E'] },
  { id: 5, name: '柠檬黄', themeColor: '#FFD60A', distractorColors: ['#FFC300', '#FFBA08', '#FAA307', '#E85D04'] },
  { id: 6, name: '薰衣紫', themeColor: '#7B2CBF', distractorColors: ['#9D4EDD', '#C77DFF', '#5A189A', '#3C096C'] },
  { id: 7, name: '薄荷青', themeColor: '#06D6A0', distractorColors: ['#118AB2', '#073B4C', '#06A77D', '#1B9AAA'] },
  { id: 8, name: '珊瑚红', themeColor: '#EF476F', distractorColors: ['#FFD166', '#F78C6B', '#E63946', '#F4A261'] },
  { id: 9, name: '深邃灰', themeColor: '#343A40', distractorColors: ['#495057', '#6C757D', '#212529', '#ADB5BD'] },
  { id: 10, name: '焦糖棕', themeColor: '#BC6C25', distractorColors: ['#DDA15E', '#FEFAE0', '#606C38', '#283618'] },
];
