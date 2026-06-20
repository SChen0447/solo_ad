import { create } from 'zustand';
import type { FilterState, Commit } from './types';
import { generateCommits, filterCommits, CONTRIBUTORS, MODULES } from './dataGenerator';

interface AppStore {
  commits: Commit[];
  filteredCommits: Commit[];
  filters: FilterState;
  selectedCommitId: string | null;
  sidebarOpen: boolean;
  setFilters: (partial: Partial<FilterState>) => void;
  setSelectedCommitId: (id: string | null) => void;
  toggleSidebar: () => void;
}

const allCommits = generateCommits(120);

const initialFilters: FilterState = {
  authors: [],
  dateRange: [
    allCommits.length > 0 ? allCommits[0].timestamp : Date.now() - 180 * 24 * 60 * 60 * 1000,
    allCommits.length > 0 ? allCommits[allCommits.length - 1].timestamp : Date.now(),
  ],
  modules: [],
};

export const useStore = create<AppStore>((set, get) => ({
  commits: allCommits,
  filteredCommits: allCommits,
  filters: initialFilters,
  selectedCommitId: null,
  sidebarOpen: true,

  setFilters: (partial) => {
    const newFilters = { ...get().filters, ...partial };
    const filtered = filterCommits(get().commits, newFilters);
    set({ filters: newFilters, filteredCommits: filtered });
  },

  setSelectedCommitId: (id) => set({ selectedCommitId: id }),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));

export { CONTRIBUTORS, MODULES };
