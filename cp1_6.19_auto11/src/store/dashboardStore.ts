import { create } from 'zustand';
import { CSVData } from '../utils/csvParser';
import { ChartConfig } from '../hooks/useChartData';

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DashboardState {
  data: CSVData | null;
  charts: ChartConfig[];
  layout: LayoutItem[];
  isUploadModalOpen: boolean;
  fullscreenChartId: string | null;

  setData: (data: CSVData) => void;
  addChart: (chart: ChartConfig) => void;
  removeChart: (id: string) => void;
  updateChart: (id: string, updates: Partial<ChartConfig>) => void;
  setLayout: (layout: LayoutItem[]) => void;
  resetLayout: () => void;
  openUploadModal: () => void;
  closeUploadModal: () => void;
  setFullscreenChartId: (id: string | null) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useDashboardStore = create<DashboardState>((set, get) => ({
  data: null,
  charts: [],
  layout: [],
  isUploadModalOpen: false,
  fullscreenChartId: null,

  setData: (data) => set({ data }),

  addChart: (chart) => {
    const { charts, layout } = get();
    const newChart = { ...chart, id: chart.id || generateId() };
    const colCount = 12;
    const chartWidth = 6;
    const chartHeight = 4;

    let maxY = 0;
    layout.forEach(item => {
      const y = item.y + item.h;
      if (y > maxY) maxY = y;
    });

    const x = (charts.length * chartWidth) % colCount;
    const y = Math.floor((charts.length * chartWidth) / colCount) * chartHeight;

    const newLayoutItem: LayoutItem = {
      i: newChart.id,
      x,
      y,
      w: chartWidth,
      h: chartHeight
    };

    set({
      charts: [...charts, newChart],
      layout: [...layout, newLayoutItem]
    });
  },

  removeChart: (id) => {
    const { charts, layout } = get();
    set({
      charts: charts.filter(c => c.id !== id),
      layout: layout.filter(l => l.i !== id)
    });
  },

  updateChart: (id, updates) => {
    const { charts } = get();
    set({
      charts: charts.map(c =>
        c.id === id ? { ...c, ...updates } : c
      )
    });
  },

  setLayout: (layout) => set({ layout }),

  resetLayout: () => {
    const { charts } = get();
    const colCount = 12;
    const chartWidth = 6;
    const chartHeight = 4;

    const newLayout = charts.map((chart, index) => ({
      i: chart.id,
      x: (index * chartWidth) % colCount,
      y: Math.floor((index * chartWidth) / colCount) * chartHeight,
      w: chartWidth,
      h: chartHeight
    }));

    set({ layout: newLayout });
  },

  openUploadModal: () => set({ isUploadModalOpen: true }),
  closeUploadModal: () => set({ isUploadModalOpen: false }),

  setFullscreenChartId: (id) => set({ fullscreenChartId: id })
}));
