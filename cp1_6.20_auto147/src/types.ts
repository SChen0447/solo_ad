export interface ParsedData {
  rows: Record<string, string | number>[];
  columns: string[];
  headers: string[];
}

export interface BubbleConfig {
  xAxis: string;
  yAxis: string;
  zAxis: string;
  sizeColumn: string;
  colorGradient: [string, string];
  minRadius: number;
  maxRadius: number;
  timeColumn: string;
}

export interface BubbleData {
  position: [number, number, number];
  radius: number;
  color: string;
  values: Record<string, string | number>;
  matrixIndex: [number, number, number];
}

export const GRADIENT_OPTIONS: [string, string][] = [
  ['#00d4ff', '#ff6b35'],
  ['#7c3aed', '#ec4899'],
  ['#10b981', '#f59e0b'],
];

export const DEFAULT_CONFIG: BubbleConfig = {
  xAxis: '',
  yAxis: '',
  zAxis: '',
  sizeColumn: '',
  colorGradient: ['#00d4ff', '#ff6b35'],
  minRadius: 0.2,
  maxRadius: 1.2,
  timeColumn: '',
};
