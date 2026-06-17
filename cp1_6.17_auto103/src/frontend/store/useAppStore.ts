import { create } from 'zustand';
import type { Work, Layer, Order } from '../types';

interface AppState {
  currentUser: {
    id: string;
    name: string;
    role: 'creator' | 'buyer';
  };
  currentWork: Work | null;
  selectedLayerId: string | null;
  layers: Layer[];
  orders: Order[];
  setCurrentWork: (work: Work | null) => void;
  setSelectedLayerId: (id: string | null) => void;
  setLayers: (layers: Layer[]) => void;
  toggleLayerVisibility: (layerId: string) => void;
  updateLayerOpacity: (layerId: string, opacity: number) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  addOrder: (order: Order) => void;
  setOrders: (orders: Order[]) => void;
}

const flattenLayers = (layers: Layer[]): Layer[] => {
  const result: Layer[] = [];
  const traverse = (items: Layer[]) => {
    items.forEach((layer) => {
      result.push(layer);
      if (layer.children && layer.children.length > 0) {
        traverse(layer.children);
      }
    });
  };
  traverse(layers);
  return result;
};

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: {
    id: 'user-001',
    name: 'Demo User',
    role: 'buyer'
  },
  currentWork: null,
  selectedLayerId: null,
  layers: [],
  orders: [],
  setCurrentWork: (work) =>
    set({ currentWork: work, layers: work ? flattenLayers(work.layers) : [] }),
  setSelectedLayerId: (id) => set({ selectedLayerId: id }),
  setLayers: (layers) => set({ layers }),
  toggleLayerVisibility: (layerId) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      )
    })),
  updateLayerOpacity: (layerId, opacity) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === layerId ? { ...l, opacity } : l
      )
    })),
  reorderLayers: (fromIndex, toIndex) =>
    set((state) => {
      const newLayers = [...state.layers];
      const [removed] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, removed);
      return { layers: newLayers };
    }),
  addOrder: (order) => set((state) => ({ orders: [...state.orders, order] })),
  setOrders: (orders) => set({ orders })
}));
