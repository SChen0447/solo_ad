import { create } from 'zustand';
import type { PivotConfig, ActiveFilters, ChartState, AggregatedResult, RawDataRow, FieldDef, FilterEvent } from '@/types';
import { generateSampleData, aggregateData, extractChartData } from '@/modules/dataEngine';

type EventCallback = (event: FilterEvent) => void;

const FIELD_DEFS: FieldDef[] = [
  { key: 'region', label: '地区', type: 'dimension' },
  { key: 'year', label: '年份', type: 'dimension' },
  { key: 'category', label: '品类', type: 'dimension' },
  { key: 'sales', label: '销售额', type: 'measure' },
  { key: 'profit', label: '利润', type: 'measure' },
  { key: 'quantity', label: '数量', type: 'measure' },
];

const listeners: Map<string, Set<EventCallback>> = new Map();

function publish(event: FilterEvent) {
  const set = listeners.get(event.dimension);
  if (set) {
    set.forEach(cb => cb(event));
  }
  const allSet = listeners.get('*');
  if (allSet) {
    allSet.forEach(cb => cb(event));
  }
}

function subscribe(dimension: string, cb: EventCallback): () => void {
  if (!listeners.has(dimension)) {
    listeners.set(dimension, new Set());
  }
  listeners.get(dimension)!.add(cb);
  return () => {
    listeners.get(dimension)?.delete(cb);
  };
}

interface DashboardStore {
  rawData: RawDataRow[];
  fieldDefs: FieldDef[];
  pivotConfig: PivotConfig;
  activeFilters: ActiveFilters;
  chartState: ChartState;
  aggregatedResult: AggregatedResult;
  selectedCell: { rowKey: string; colKey: string } | null;
  chartTransitioning: boolean;

  setPivotConfig: (config: PivotConfig) => void;
  addFieldToZone: (fieldKey: string, zone: 'row' | 'col' | 'val') => void;
  removeFieldFromZone: (fieldKey: string, zone: 'row' | 'col' | 'val') => void;
  toggleFilter: (dimension: string, value: string) => void;
  setActiveFilters: (filters: ActiveFilters) => void;
  clearFilter: (dimension: string) => void;
  clearAllFilters: () => void;
  setChartType: (chartType: ChartState['chartType']) => void;
  setSortOrder: (sortOrder: ChartState['sortOrder']) => void;
  setHighlightedKeys: (keys: string[]) => void;
  selectCell: (rowKey: string, colKey: string) => void;
  clearSelection: () => void;
  setChartTransitioning: (v: boolean) => void;
  recompute: () => void;
  subscribeToFilterEvents: (dimension: string, cb: EventCallback) => () => void;
}

function computeResult(rawData: RawDataRow[], pivotConfig: PivotConfig, activeFilters: ActiveFilters): AggregatedResult {
  return aggregateData(rawData, pivotConfig, activeFilters);
}

export const useStore = create<DashboardStore>((set, get) => {
  const rawData = generateSampleData();
  const initialConfig: PivotConfig = { rowFields: ['region'], colFields: ['year'], valFields: ['sales'] };
  const initialResult = computeResult(rawData, initialConfig, {});

  return {
    rawData,
    fieldDefs: FIELD_DEFS,
    pivotConfig: initialConfig,
    activeFilters: {},
    chartState: { chartType: 'bar', sortOrder: 'none', highlightedKeys: [] },
    aggregatedResult: initialResult,
    selectedCell: null,
    chartTransitioning: false,

    setPivotConfig: (config) => {
      set({ pivotConfig: config });
      get().recompute();
    },

    addFieldToZone: (fieldKey, zone) => {
      const config = { ...get().pivotConfig };
      const fieldArr = zone === 'row' ? 'rowFields' : zone === 'col' ? 'colFields' : 'valFields';
      const otherZones = (zone === 'row' ? ['colFields', 'valFields'] : zone === 'col' ? ['rowFields', 'valFields'] : ['rowFields', 'colFields']) as (keyof PivotConfig)[];
      
      for (const oz of otherZones) {
        config[oz] = config[oz].filter(f => f !== fieldKey);
      }
      
      if (!config[fieldArr].includes(fieldKey)) {
        config[fieldArr] = [...config[fieldArr], fieldKey];
      }
      set({ pivotConfig: config });
      get().recompute();
    },

    removeFieldFromZone: (fieldKey, zone) => {
      const config = { ...get().pivotConfig };
      const fieldArr = zone === 'row' ? 'rowFields' : zone === 'col' ? 'colFields' : 'valFields';
      config[fieldArr] = config[fieldArr].filter(f => f !== fieldKey);
      set({ pivotConfig: config });
      get().recompute();
    },

    toggleFilter: (dimension, value) => {
      const filters = { ...get().activeFilters };
      const current = filters[dimension] || [];
      if (current.includes(value)) {
        filters[dimension] = current.filter(v => v !== value);
        if (filters[dimension].length === 0) delete filters[dimension];
      } else {
        filters[dimension] = [...current, value];
      }
      set({ activeFilters: filters });
      get().recompute();
      publish({ dimension, values: filters[dimension] || [] });
    },

    setActiveFilters: (filters) => {
      set({ activeFilters: filters });
      get().recompute();
    },

    clearFilter: (dimension) => {
      const filters = { ...get().activeFilters };
      delete filters[dimension];
      set({ activeFilters: filters });
      get().recompute();
      publish({ dimension, values: [] });
    },

    clearAllFilters: () => {
      set({ activeFilters: {}, selectedCell: null, chartState: { ...get().chartState, highlightedKeys: [] } });
      get().recompute();
      publish({ dimension: '*', values: [] });
    },

    setChartType: (chartType) => {
      set({ chartTransitioning: true, chartState: { ...get().chartState, chartType } });
      requestAnimationFrame(() => {
        setTimeout(() => set({ chartTransitioning: false }), 150);
      });
    },

    setSortOrder: (sortOrder) => {
      set({ chartTransitioning: true, chartState: { ...get().chartState, sortOrder } });
      requestAnimationFrame(() => {
        setTimeout(() => set({ chartTransitioning: false }), 300);
      });
    },

    setHighlightedKeys: (keys) => {
      set({ chartState: { ...get().chartState, highlightedKeys: keys } });
    },

    selectCell: (rowKey, colKey) => {
      const { selectedCell, chartState } = get();
      if (selectedCell?.rowKey === rowKey && selectedCell?.colKey === colKey) {
        set({ selectedCell: null, chartState: { ...chartState, highlightedKeys: [] } });
        return;
      }
      const compositeKey = `${rowKey}::${colKey}`;
      set({
        selectedCell: { rowKey, colKey },
        chartState: { ...chartState, highlightedKeys: [compositeKey] },
      });
    },

    clearSelection: () => {
      set({ selectedCell: null, chartState: { ...get().chartState, highlightedKeys: [] } });
    },

    setChartTransitioning: (v) => set({ chartTransitioning: v }),

    recompute: () => {
      const { rawData, pivotConfig, activeFilters } = get();
      const result = computeResult(rawData, pivotConfig, activeFilters);
      set({ aggregatedResult: result });
    },

    subscribeToFilterEvents: (dimension, cb) => subscribe(dimension, cb),
  };
});

export function getChartData() {
  const { aggregatedResult, chartState } = useStore.getState();
  return extractChartData(aggregatedResult, chartState.chartType, chartState.highlightedKeys);
}
