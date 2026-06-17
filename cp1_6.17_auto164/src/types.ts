export type EmotionLevel = 'very_satisfied' | 'satisfied' | 'neutral' | 'dissatisfied' | 'very_dissatisfied';

export interface VoteCounts {
  very_satisfied: number;
  satisfied: number;
  neutral: number;
  dissatisfied: number;
  very_dissatisfied: number;
}

export interface ActivityStats {
  activity_id: string;
  activity_name: string;
  topic: string;
  invite_code: string;
  total_votes: number;
  votes: VoteCounts;
  expected_voters: number;
  created_at: string;
}

export interface HistoryData {
  times: string[];
  data: Record<EmotionLevel, number[]>;
}

export interface ReportData {
  activity_name: string;
  activity_id: string;
  date: string;
  total_votes: number;
  votes: VoteCounts;
  ratios: Record<EmotionLevel, number>;
  average_score: number;
  trend: HistoryData;
}

export const EMOTION_CONFIG: Record<EmotionLevel, { emoji: string; label: string; color: string; score: number }> = {
  very_satisfied: { emoji: '😂', label: '非常满意', color: '#2ECC71', score: 5 },
  satisfied: { emoji: '😊', label: '满意', color: '#3498DB', score: 4 },
  neutral: { emoji: '😐', label: '一般', color: '#F1C40F', score: 3 },
  dissatisfied: { emoji: '😟', label: '不满意', color: '#E67E22', score: 2 },
  very_dissatisfied: { emoji: '😭', label: '非常不满意', color: '#E74C3C', score: 1 },
};

export const EMOTION_ORDER: EmotionLevel[] = ['very_satisfied', 'satisfied', 'neutral', 'dissatisfied', 'very_dissatisfied'];
