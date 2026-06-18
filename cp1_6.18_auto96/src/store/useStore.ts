import { create } from 'zustand';
import { MOLECULES, MoleculeData, LayerData, getLayerById, calculateAverageBondLength } from '@/data/molecules';

export type BackgroundColor = 'deep-space' | 'research-white' | 'pure-black';

export const BACKGROUND_COLORS: Record<BackgroundColor, string> = {
  'deep-space': '#0a0e1a',
  'research-white': '#f5f7fa',
  'pure-black': '#000000',
};

interface PeelState {
  layerId: string;
  progress: number;
  isAnimating: boolean;
  direction: 'peel' | 'recombine';
}

interface AppState {
  currentMoleculeId: string;
  peeledLayers: PeelState[];
  atomOpacity: number;
  peelSpeed: number;
  backgroundColor: BackgroundColor;
  selectedAtomId: string | null;
  isPanelExpanded: boolean;
  statusText: string;
  statusTextVisible: boolean;

  setCurrentMolecule: (id: string) => void;
  toggleLayerPeel: (layerId: string) => void;
  peelLayer: (layerId: string) => void;
  recombineLayer: (layerId: string) => void;
  recombineAll: () => void;
  updatePeelProgress: (layerId: string, progress: number) => void;
  finishPeelAnimation: (layerId: string) => void;
  setAtomOpacity: (opacity: number) => void;
  setPeelSpeed: (speed: number) => void;
  setBackgroundColor: (color: BackgroundColor) => void;
  setSelectedAtom: (atomId: string | null) => void;
  setPanelExpanded: (expanded: boolean) => void;
  updateStatusText: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  currentMoleculeId: 'water',
  peeledLayers: [],
  atomOpacity: 0.85,
  peelSpeed: 1,
  backgroundColor: 'deep-space',
  selectedAtomId: null,
  isPanelExpanded: true,
  statusText: '选择一个分子开始探索',
  statusTextVisible: true,

  setCurrentMolecule: (id: string) => {
    set({
      currentMoleculeId: id,
      peeledLayers: [],
      selectedAtomId: null,
    });
    get().updateStatusText();
  },

  toggleLayerPeel: (layerId: string) => {
    const { peeledLayers, peelLayer, recombineLayer } = get();
    const existing = peeledLayers.find(p => p.layerId === layerId);
    
    if (existing) {
      if (existing.progress >= 1) {
        recombineLayer(layerId);
      }
    } else {
      if (peeledLayers.filter(p => p.progress >= 1 || p.isAnimating).length >= 2) {
        return;
      }
      peelLayer(layerId);
    }
  },

  peelLayer: (layerId: string) => {
    const { peeledLayers } = get();
    if (peeledLayers.filter(p => p.progress >= 1 || p.isAnimating).length >= 2) {
      return;
    }
    
    set(state => ({
      peeledLayers: [
        ...state.peeledLayers.filter(p => p.layerId !== layerId),
        { layerId, progress: 0, isAnimating: true, direction: 'peel' },
      ],
    }));
    get().updateStatusText();
  },

  recombineLayer: (layerId: string) => {
    set(state => ({
      peeledLayers: state.peeledLayers.map(p =>
        p.layerId === layerId
          ? { ...p, isAnimating: true, direction: 'recombine' }
          : p
      ),
    }));
  },

  recombineAll: () => {
    set(state => ({
      peeledLayers: state.peeledLayers.map(p => ({
        ...p,
        isAnimating: true,
        direction: 'recombine',
      })),
    }));
  },

  updatePeelProgress: (layerId: string, progress: number) => {
    set(state => ({
      peeledLayers: state.peeledLayers.map(p =>
        p.layerId === layerId ? { ...p, progress } : p
      ),
    }));
  },

  finishPeelAnimation: (layerId: string) => {
    const state = get();
    const layer = state.peeledLayers.find(p => p.layerId === layerId);
    
    if (!layer) return;

    if (layer.direction === 'recombine') {
      set(state => ({
        peeledLayers: state.peeledLayers.filter(p => p.layerId !== layerId),
      }));
    } else {
      set(state => ({
        peeledLayers: state.peeledLayers.map(p =>
          p.layerId === layerId ? { ...p, isAnimating: false, progress: 1 } : p
        ),
      }));
    }
    
    get().updateStatusText();
  },

  setAtomOpacity: (opacity: number) => {
    set({ atomOpacity: opacity });
  },

  setPeelSpeed: (speed: number) => {
    set({ peelSpeed: speed });
  },

  setBackgroundColor: (color: BackgroundColor) => {
    set({ backgroundColor: color });
  },

  setSelectedAtom: (atomId: string | null) => {
    set({ selectedAtomId: atomId });
  },

  setPanelExpanded: (expanded: boolean) => {
    set({ isPanelExpanded: expanded });
  },

  updateStatusText: () => {
    const state = get();
    const molecule = MOLECULES.find(m => m.id === state.currentMoleculeId);
    if (!molecule) return;

    const fullyPeeled = state.peeledLayers.filter(p => p.progress >= 1);
    
    if (fullyPeeled.length === 0) {
      const animating = state.peeledLayers.filter(p => p.isAnimating);
      if (animating.length > 0) {
        const layer = getLayerById(molecule, animating[0].layerId);
        set({ 
          statusText: `正在${animating[0].direction === 'peel' ? '剥离' : '重组'}：${layer?.name || ''}`,
          statusTextVisible: true,
        });
      } else {
        set({ 
          statusText: `${molecule.name}（${molecule.formula}）- 点击原子或图层开始探索`,
          statusTextVisible: true,
        });
      }
    } else {
      const layer = getLayerById(molecule, fullyPeeled[0].layerId);
      if (layer) {
        const avgBondLength = calculateAverageBondLength(molecule, layer.id);
        set({
          statusText: `已剥离：${layer.name}，共${layer.atomIds.length}个原子，平均键长${avgBondLength.toFixed(2)}Å`,
          statusTextVisible: true,
        });
      }
    }
  },
}));

export function useCurrentMolecule(): MoleculeData {
  const currentMoleculeId = useStore(state => state.currentMoleculeId);
  const molecule = MOLECULES.find(m => m.id === currentMoleculeId);
  if (!molecule) throw new Error(`Molecule not found: ${currentMoleculeId}`);
  return molecule;
}

export function usePeeledLayerIds(): string[] {
  return useStore(state => 
    state.peeledLayers
      .filter(p => p.progress > 0)
      .map(p => p.layerId)
  );
}

export function useLayerPeelProgress(layerId: string): number {
  return useStore(state => {
    const layer = state.peeledLayers.find(p => p.layerId === layerId);
    return layer ? layer.progress : 0;
  });
}

export function useIsLayerPeeled(layerId: string): boolean {
  return useStore(state => {
    const layer = state.peeledLayers.find(p => p.layerId === layerId);
    return layer ? layer.progress >= 1 : false;
  });
}
