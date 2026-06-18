import { create } from 'zustand';
import type { DataPoint, AnomalyRecord, Statistics, ChartType, AnomalyAlgorithm, ColumnInfo } from '../types';

interface AppState {
  rawData: Record<string, unknown>[];
  columns: ColumnInfo[];
  dataPoints: DataPoint[];
  xColumn: string | null;
  yColumn: string | null;
  manualAnomalies: Set<number>;
  autoAnomalies: Set<number>;
  anomalyRecords: AnomalyRecord[];
  statistics: Statistics | null;
  chartType: ChartType;
  algorithm: AnomalyAlgorithm;
  zThreshold: number;
  iqrThreshold: number;
  isPanelOpen: boolean;
  viewport: { xMin: number; xMax: number; yMin: number; yMax: number } | null;

  setRawData: (data: Record<string, unknown>[], columns: ColumnInfo[]) => void;
  setXColumn: (col: string | null) => void;
  setYColumn: (col: string | null) => void;
  setChartType: (type: ChartType) => void;
  setAlgorithm: (alg: AnomalyAlgorithm) => void;
  setZThreshold: (v: number) => void;
  setIqrThreshold: (v: number) => void;
  setDataPoints: (points: DataPoint[]) => void;
  setStatistics: (stats: Statistics | null) => void;
  setAutoAnomalies: (indices: Set<number>, records: AnomalyRecord[]) => void;
  addManualAnomalies: (indices: number[], records: AnomalyRecord[]) => void;
  removeAnomaly: (index: number) => void;
  resetAll: () => void;
  togglePanel: () => void;
  setViewport: (vp: { xMin: number; xMax: number; yMin: number; yMax: number } | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  rawData: [],
  columns: [],
  dataPoints: [],
  xColumn: null,
  yColumn: null,
  manualAnomalies: new Set(),
  autoAnomalies: new Set(),
  anomalyRecords: [],
  statistics: null,
  chartType: 'scatter',
  algorithm: 'zscore',
  zThreshold: 3,
  iqrThreshold: 1.5,
  isPanelOpen: true,
  viewport: null,

  setRawData: (data, columns) => set({
    rawData: data, columns,
    xColumn: null, yColumn: null,
    dataPoints: [], manualAnomalies: new Set(), autoAnomalies: new Set(),
    anomalyRecords: [], statistics: null, viewport: null
  }),

  setXColumn: (col) => set({ xColumn: col }),
  setYColumn: (col) => set({ yColumn: col }),
  setChartType: (type) => set({ chartType: type }),
  setAlgorithm: (alg) => set({ algorithm: alg }),
  setZThreshold: (v) => set({ zThreshold: v }),
  setIqrThreshold: (v) => set({ iqrThreshold: v }),
  setDataPoints: (points) => set({ dataPoints: points, viewport: null }),
  setStatistics: (stats) => set({ statistics: stats }),

  setAutoAnomalies: (indices, records) => {
    const manualRecords = get().anomalyRecords.filter(r => r.source === 'manual');
    set({
      autoAnomalies: indices,
      anomalyRecords: [...manualRecords, ...records]
    });
  },

  addManualAnomalies: (indices, records) => {
    const manual = new Set(get().manualAnomalies);
    indices.forEach(i => manual.add(i));
    const existing = new Set(get().anomalyRecords.map(r => r.index));
    const newRecords = records.filter(r => !existing.has(r.index));
    set({
      manualAnomalies: manual,
      anomalyRecords: [...get().anomalyRecords, ...newRecords]
    });
  },

  removeAnomaly: (index) => {
    const manual = new Set(get().manualAnomalies);
    const auto = new Set(get().autoAnomalies);
    manual.delete(index);
    auto.delete(index);
    const records = get().anomalyRecords.filter(r => r.index !== index);
    set({ manualAnomalies: manual, autoAnomalies: auto, anomalyRecords: records });
  },

  resetAll: () => set({
    manualAnomalies: new Set(),
    autoAnomalies: new Set(),
    anomalyRecords: [],
    viewport: null
  }),

  togglePanel: () => set(s => ({ isPanelOpen: !s.isPanelOpen })),
  setViewport: (vp) => set({ viewport: vp })
}));
