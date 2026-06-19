import { create } from 'zustand';
import type { AppState, OceanCurrent, LayerType } from '../types';

export const useStore = create<AppState>((set) => ({
  selectedCurrent: null,
  activeLayer: 'temperature',
  isLoading: true,
  searchQuery: '',
  
  setSelectedCurrent: (current: OceanCurrent | null) => 
    set({ selectedCurrent: current }),
    
  setActiveLayer: (layer: LayerType) => 
    set({ activeLayer: layer }),
    
  setSearchQuery: (query: string) => 
    set({ searchQuery: query }),
    
  setIsLoading: (loading: boolean) => 
    set({ isLoading: loading }),
}));
