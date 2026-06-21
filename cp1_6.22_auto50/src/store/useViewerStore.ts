import { create } from 'zustand';
import type { ViewerStore, Molecule, Atom, RenderMode } from '@/types';

export const useViewerStore = create<ViewerStore>((set) => ({
  currentMolecule: null,
  selectedAtom: null,
  renderMode: 'ballstick',
  isLoading: true,
  backgroundColor: '#0a1929',
  showHelp: false,
  sidebarCollapsed: false,
  transitionProgress: 0,

  setMolecule: (molecule: Molecule) => set({ currentMolecule: molecule }),
  selectAtom: (atom: Atom | null) => set({ selectedAtom: atom }),
  setRenderMode: (mode: RenderMode) => set({ renderMode: mode }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  toggleHelp: () => set((state) => ({ showHelp: !state.showHelp })),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setBackgroundColor: (color: string) => set({ backgroundColor: color }),
  setTransitionProgress: (progress: number) => set({ transitionProgress: progress }),
}));
