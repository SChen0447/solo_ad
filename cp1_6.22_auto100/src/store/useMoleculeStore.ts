import { create } from 'zustand';
import type { MoleculeData, AtomData, BondData, RenderParams } from '../types';

interface MoleculeState {
  currentMolecule: MoleculeData | null;
  molecules: MoleculeData[];
  params: RenderParams;
  selectedAtom: AtomData | null;
  selectedBond: BondData | null;
  loading: boolean;
  error: string | null;
  setCurrentMolecule: (molecule: MoleculeData | null) => void;
  setMolecules: (molecules: MoleculeData[]) => void;
  setParams: (params: Partial<RenderParams>) => void;
  setSelectedAtom: (atom: AtomData | null) => void;
  setSelectedBond: (bond: BondData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchMolecules: () => Promise<void>;
}

export const useMoleculeStore = create<MoleculeState>((set) => ({
  currentMolecule: null,
  molecules: [],
  params: {
    bondScale: 1.0,
    atomScale: 1.0,
    lightIntensity: 1.0,
  },
  selectedAtom: null,
  selectedBond: null,
  loading: false,
  error: null,
  
  setCurrentMolecule: (molecule) => set({ currentMolecule: molecule, selectedAtom: null, selectedBond: null }),
  setMolecules: (molecules) => set({ molecules }),
  setParams: (newParams) => set((state) => ({
    params: { ...state.params, ...newParams },
  })),
  setSelectedAtom: (atom) => set({ selectedAtom: atom, selectedBond: null }),
  setSelectedBond: (bond) => set({ selectedBond: bond, selectedAtom: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  fetchMolecules: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch('http://localhost:3001/api/molecules');
      if (!response.ok) {
        throw new Error('Failed to fetch molecules');
      }
      const data = await response.json();
      set({ molecules: data, currentMolecule: data[0] || null, loading: false });
    } catch (error) {
      const fallbackData = await import('../data/fallbackMolecules.json');
      set({ 
        molecules: fallbackData.default, 
        currentMolecule: fallbackData.default[0] || null,
        loading: false 
      });
    }
  },
}));
