import { create } from 'zustand';
import type { Inspiration, Connection, TagColor } from './types';

interface AppState {
  inspirations: Inspiration[];
  connections: Connection[];
  selectedTags: TagColor[];
  selectedInspirationId: string | null;
  isModalOpen: boolean;
  isTagPanelOpen: boolean;
  connectingFromId: string | null;

  setInspirations: (inspirations: Inspiration[]) => void;
  setConnections: (connections: Connection[]) => void;
  addInspiration: (inspiration: Inspiration) => void;
  updateInspiration: (id: string, updates: Partial<Inspiration>) => void;
  deleteInspiration: (id: string) => void;
  addConnection: (connection: Connection) => void;
  deleteConnection: (id: string) => void;

  toggleTag: (tag: TagColor) => void;
  clearTags: () => void;

  openModal: (id: string) => void;
  closeModal: () => void;

  setTagPanelOpen: (open: boolean) => void;

  startConnecting: (id: string) => void;
  cancelConnecting: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  inspirations: [],
  connections: [],
  selectedTags: [],
  selectedInspirationId: null,
  isModalOpen: false,
  isTagPanelOpen: false,
  connectingFromId: null,

  setInspirations: (inspirations) => set({ inspirations }),
  setConnections: (connections) => set({ connections }),
  addInspiration: (inspiration) =>
    set({ inspirations: [...get().inspirations, inspiration] }),
  updateInspiration: (id, updates) =>
    set({
      inspirations: get().inspirations.map((i) =>
        i.id === id ? { ...i, ...updates } : i
      )
    }),
  deleteInspiration: (id) => {
    set({
      inspirations: get().inspirations.filter((i) => i.id !== id),
      connections: get().connections.filter(
        (c) => c.from !== id && c.to !== id
      )
    });
    if (get().selectedInspirationId === id) {
      set({ selectedInspirationId: null, isModalOpen: false });
    }
  },
  addConnection: (connection) =>
    set({ connections: [...get().connections, connection] }),
  deleteConnection: (id) =>
    set({ connections: get().connections.filter((c) => c.id !== id) }),

  toggleTag: (tag) => {
    const { selectedTags } = get();
    if (selectedTags.includes(tag)) {
      set({ selectedTags: selectedTags.filter((t) => t !== tag) });
    } else {
      set({ selectedTags: [...selectedTags, tag] });
    }
  },
  clearTags: () => set({ selectedTags: [] }),

  openModal: (id) => set({ selectedInspirationId: id, isModalOpen: true }),
  closeModal: () => set({ selectedInspirationId: null, isModalOpen: false }),

  setTagPanelOpen: (open) => set({ isTagPanelOpen: open }),

  startConnecting: (id) => set({ connectingFromId: id }),
  cancelConnecting: () => set({ connectingFromId: null })
}));
