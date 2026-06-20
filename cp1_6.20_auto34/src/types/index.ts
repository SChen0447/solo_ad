export interface Diagnosis {
  disease: string;
  confidence: number;
  description: string;
  treatment: string;
  severity: 'low' | 'medium' | 'high' | 'unknown';
  image?: string;
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: number;
}

export interface PlantCase {
  id: string;
  plant_name: string;
  symptoms: string[];
  temperature: number;
  humidity: number;
  light_hours: number;
  image: string;
  diagnosis: Diagnosis;
  likes: number;
  comments: Comment[];
  timestamp: number;
}

export interface SubmitFormData {
  plant_name: string;
  symptoms: string[];
  temperature: number;
  humidity: number;
  light_hours: number;
  image: string;
}

export interface PaginatedCases {
  cases: PlantCase[];
  has_more: boolean;
  total: number;
}

export const SYMPTOM_OPTIONS = [
  { key: '叶斑', label: '叶斑' },
  { key: '黄化', label: '黄化' },
  { key: '卷曲', label: '卷曲' },
  { key: '霉斑', label: '霉斑' },
  { key: '虫蛀', label: '虫蛀' },
  { key: '枯梢', label: '枯梢' },
  { key: '萎蔫', label: '萎蔫' },
  { key: '畸形', label: '畸形' },
] as const;

export type SymptomKey = typeof SYMPTOM_OPTIONS[number]['key'];
