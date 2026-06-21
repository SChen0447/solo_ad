export interface Project {
  id: string;
  name: string;
  hourlyRate: number;
  estimatedHours: number;
  clientName: string;
  createdAt: string;
}

export interface TimeLog {
  id: string;
  projectId: string;
  date: string;
  hours: number;
  note: string;
  createdAt: string;
}

export interface ProjectWithStats extends Project {
  totalHours: number;
  totalIncome: number;
}

export const TAX_RATE = 0.2;

export function computeAfterTax(income: number): number {
  return income * (1 - TAX_RATE);
}

export function getProjectColor(rate: number): string {
  if (rate < 100) return '#D1FAE5';
  if (rate <= 200) return '#BAE6FD';
  return '#DDD6FE';
}

export function getProjectBorderColor(rate: number): string {
  if (rate < 100) return '#6EE7B7';
  if (rate <= 200) return '#7DD3FC';
  return '#C4B5FD';
}

export const PROJECT_CHART_COLORS = [
  '#6366F1',
  '#F59E0B',
  '#10B981',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#06B6D4',
  '#84CC16',
];
