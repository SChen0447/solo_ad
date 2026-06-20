import { create } from "zustand";
import type { Dashboard, ChartCardData, DataSource } from "@/types";

interface AppState {
  dashboards: Dashboard[];
  currentDashboardId: string | null;
  chartCards: ChartCardData[];
  dataSources: DataSource[];
  drawerOpen: boolean;

  addDashboard: (name: string) => void;
  renameDashboard: (id: string, name: string) => void;
  deleteDashboard: (id: string) => void;
  selectDashboard: (id: string) => void;

  addChartCard: (card: Omit<ChartCardData, "id" | "order">) => void;
  deleteChartCard: (id: string) => void;
  updateChartCard: (id: string, updates: Partial<ChartCardData>) => void;
  reorderChartCards: (dashboardId: string, cardIds: string[]) => void;

  addDataSource: (ds: Omit<DataSource, "id" | "lastUpdated">) => void;
  updateDataSource: (id: string, updates: Partial<DataSource>) => void;
  deleteDataSource: (id: string) => void;

  toggleDrawer: () => void;
  setDrawerOpen: (open: boolean) => void;
}

let nextId = 1;
function uid(): string {
  return `id_${Date.now()}_${nextId++}`;
}

export const useStore = create<AppState>((set) => ({
  dashboards: [
    { id: "default", name: "默认仪表盘" },
  ],
  currentDashboardId: "default",
  chartCards: [],
  dataSources: [],
  drawerOpen: false,

  addDashboard: (name) =>
    set((s) => ({
      dashboards: [...s.dashboards, { id: uid(), name }],
    })),

  renameDashboard: (id, name) =>
    set((s) => ({
      dashboards: s.dashboards.map((d) => (d.id === id ? { ...d, name } : d)),
    })),

  deleteDashboard: (id) =>
    set((s) => {
      const remaining = s.dashboards.filter((d) => d.id !== id);
      return {
        dashboards: remaining,
        currentDashboardId: s.currentDashboardId === id ? (remaining[0]?.id ?? null) : s.currentDashboardId,
        chartCards: s.chartCards.filter((c) => c.dashboardId !== id),
      };
    }),

  selectDashboard: (id) => set({ currentDashboardId: id }),

  addChartCard: (card) =>
    set((s) => {
      const existing = s.chartCards.filter((c) => c.dashboardId === card.dashboardId);
      return {
        chartCards: [...s.chartCards, { ...card, id: uid(), order: existing.length }],
      };
    }),

  deleteChartCard: (id) =>
    set((s) => ({
      chartCards: s.chartCards.filter((c) => c.id !== id),
    })),

  updateChartCard: (id, updates) =>
    set((s) => ({
      chartCards: s.chartCards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  reorderChartCards: (dashboardId, cardIds) =>
    set((s) => ({
      chartCards: s.chartCards.map((c) => {
        if (c.dashboardId !== dashboardId) return c;
        const newOrder = cardIds.indexOf(c.id);
        return newOrder >= 0 ? { ...c, order: newOrder } : c;
      }),
    })),

  addDataSource: (ds) =>
    set((s) => ({
      dataSources: [...s.dataSources, { ...ds, id: uid(), lastUpdated: new Date().toISOString() }],
    })),

  updateDataSource: (id, updates) =>
    set((s) => ({
      dataSources: s.dataSources.map((d) =>
        d.id === id ? { ...d, ...updates, lastUpdated: new Date().toISOString() } : d
      ),
    })),

  deleteDataSource: (id) =>
    set((s) => ({
      dataSources: s.dataSources.filter((d) => d.id !== id),
    })),

  toggleDrawer: () =>
    set((s) => ({ drawerOpen: !s.drawerOpen })),

  setDrawerOpen: (open) => set({ drawerOpen: open }),
}));
