export type DataPoint = {
  index: number;
  x: number;
  y: number;
  rawX?: string | number;
  rawY: string | number;
};

export type AnomalyRecord = {
  index: number;
  rowIndex: number;
  value: number;
  deviation: number;
  source: 'manual' | 'auto';
};

export type Statistics = {
  mean: number;
  stdDev: number;
  q1: number;
  q3: number;
  iqr: number;
  min: number;
  max: number;
  median: number;
  zThreshold: number;
  iqrThreshold: number;
  lowerBound: number;
  upperBound: number;
  totalCount: number;
  anomalyCount: number;
  anomalyRatio: number;
};

export type ChartType = 'scatter' | 'box' | 'line';

export type AnomalyAlgorithm = 'zscore' | 'iqr';

export type ColumnInfo = {
  name: string;
  numeric: boolean;
};
