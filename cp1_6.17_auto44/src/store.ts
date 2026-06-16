import { create } from 'zustand';
import axios from 'axios';
import type { FeedSource, Article, Stats, CompareData } from './types';

interface AppState {
  sources: FeedSource[];
  articles: Article[];
  stats: Stats;
  compareData: CompareData | null;
  isLoading: boolean;
  searchKeyword: string;
  filterSource: string;
  filterSentiment: string;
  sidebarOpen: boolean;
  fetchSources: () => Promise<void>;
  addSource: (url: string, name: string) => Promise<void>;
  deleteSource: (id: string) => Promise<void>;
  fetchArticles: () => Promise<void>;
  refreshAll: () => Promise<void>;
  fetchCompareData: () => Promise<void>;
  setSearchKeyword: (keyword: string) => void;
  setFilterSource: (sourceId: string) => void;
  setFilterSentiment: (sentiment: string) => void;
  toggleSidebar: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  sources: [],
  articles: [],
  stats: { totalArticles: 0, sourceCount: 0, avgSentiment: 0 },
  compareData: null,
  isLoading: false,
  searchKeyword: '',
  filterSource: '',
  filterSentiment: '',
  sidebarOpen: false,

  fetchSources: async () => {
    const res = await axios.get<FeedSource[]>('/api/sources');
    set({ sources: res.data });
  },

  addSource: async (url, name) => {
    await axios.post('/api/sources', { url, name });
    await get().fetchSources();
  },

  deleteSource: async (id) => {
    await axios.delete(`/api/sources/${id}`);
    await get().fetchSources();
  },

  fetchArticles: async () => {
    const { filterSource, searchKeyword, filterSentiment } = get();
    const params: Record<string, string> = {};
    if (filterSource) params.sourceId = filterSource;
    if (searchKeyword) params.keyword = searchKeyword;
    if (filterSentiment) params.sentiment = filterSentiment;
    const res = await axios.get<Article[]>('/api/articles', { params });
    set({ articles: res.data });
  },

  refreshAll: async () => {
    set({ isLoading: true });
    try {
      await axios.post('/api/refresh');
      await Promise.all([get().fetchArticles(), get().fetchCompareData()]);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCompareData: async () => {
    const res = await axios.get<CompareData>('/api/compare');
    set({ compareData: res.data });
  },

  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),

  setFilterSource: (sourceId) => set({ filterSource: sourceId }),

  setFilterSentiment: (sentiment) => set({ filterSentiment: sentiment }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
