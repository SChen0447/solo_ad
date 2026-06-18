import { create } from 'zustand';
import {
  Molecule,
  Residue,
  ResidueType,
  RenderMode,
  MutationRecord,
  ResidueInfo,
  RESIDUE_PROPERTIES,
  ViewPreset,
} from '@/types';

interface MoleculeState {
  molecules: Molecule[];
  currentMolecule: Molecule | null;
  currentMoleculeId: string | null;
  renderMode: RenderMode;
  selectedResidueId: string | null;
  selectedResidueInfo: ResidueInfo | null;
  mutationHistory: MutationRecord[];
  undoStack: MutationRecord[];
  isInfoPanelOpen: boolean;
  isMutationPanelOpen: boolean;
  isLeftPanelCollapsed: boolean;
  currentViewPreset: ViewPreset;
  highlightedMutatedResidues: Record<string, number>;
  isExporting: boolean;
  exportProgress: number;

  setMolecules: (molecules: Molecule[]) => void;
  loadMolecule: (moleculeId: string) => void;
  setRenderMode: (mode: RenderMode) => void;
  selectResidue: (residueId: string | null) => void;
  updateSelectedResidueInfo: (molecule: Molecule | null, residueId: string | null) => void;
  openInfoPanel: () => void;
  closeInfoPanel: () => void;
  openMutationPanel: () => void;
  closeMutationPanel: () => void;
  toggleLeftPanel: () => void;
  applyMutation: (chainId: string, residueId: string, newResidue: ResidueType) => MutationRecord | null;
  undoMutation: (mutationId: string) => MutationRecord | null;
  setViewPreset: (preset: ViewPreset) => void;
  markMutatedResidue: (residueId: string) => void;
  removeMutatedHighlight: (residueId: string) => void;
  updateCurrentMolecule: (molecule: Molecule) => void;
  setExporting: (exporting: boolean) => void;
  setExportProgress: (progress: number) => void;
}

export const useMoleculeStore = create<MoleculeState>((set, get) => ({
  molecules: [],
  currentMolecule: null,
  currentMoleculeId: null,
  renderMode: 'cartoon',
  selectedResidueId: null,
  selectedResidueInfo: null,
  mutationHistory: [],
  undoStack: [],
  isInfoPanelOpen: false,
  isMutationPanelOpen: false,
  isLeftPanelCollapsed: false,
  currentViewPreset: 'front',
  highlightedMutatedResidues: {},
  isExporting: false,
  exportProgress: 0,

  setMolecules: (molecules) => set({ molecules }),

  loadMolecule: (moleculeId) => {
    const { molecules } = get();
    const molecule = molecules.find((m) => m.id === moleculeId);
    if (molecule) {
      set({
        currentMolecule: molecule,
        currentMoleculeId: moleculeId,
        mutationHistory: [],
        undoStack: [],
        selectedResidueId: null,
        selectedResidueInfo: null,
        highlightedMutatedResidues: {},
      });
    }
  },

  setRenderMode: (mode) => set({ renderMode: mode }),

  selectResidue: (residueId) => {
    const { currentMolecule } = get();
    if (residueId) {
      get().updateSelectedResidueInfo(currentMolecule, residueId);
      set({ selectedResidueId: residueId, isInfoPanelOpen: true });
    } else {
      set({ selectedResidueId: null, selectedResidueInfo: null, isInfoPanelOpen: false });
    }
  },

  updateSelectedResidueInfo: (molecule, residueId) => {
    if (!molecule || !residueId) {
      set({ selectedResidueInfo: null });
      return;
    }

    let targetResidue: Residue | null = null;
    let prevResidue: ResidueType | null = null;
    let nextResidue: ResidueType | null = null;

    for (const chain of molecule.chains) {
      for (let i = 0; i < chain.residues.length; i++) {
        if (chain.residues[i].id === residueId) {
          targetResidue = chain.residues[i];
          if (i > 0) prevResidue = chain.residues[i - 1].name;
          if (i < chain.residues.length - 1) nextResidue = chain.residues[i + 1].name;
          break;
        }
      }
      if (targetResidue) break;
    }

    if (targetResidue) {
      const props = RESIDUE_PROPERTIES[targetResidue.name];
      const info: ResidueInfo = {
        id: targetResidue.id,
        name: targetResidue.name,
        threeLetterCode: targetResidue.name,
        oneLetterCode: props.oneLetter,
        sequenceNumber: targetResidue.sequenceNumber,
        sideChainType: targetResidue.sideChainType,
        hydrophobicity: targetResidue.hydrophobicity,
        prevResidue,
        nextResidue,
        atomCount: targetResidue.atoms.length,
        isMutated: !!targetResidue.isMutated,
      };
      set({ selectedResidueInfo: info });
    }
  },

  openInfoPanel: () => set({ isInfoPanelOpen: true }),
  closeInfoPanel: () => set({ isInfoPanelOpen: false }),
  openMutationPanel: () => set({ isMutationPanelOpen: true }),
  closeMutationPanel: () => set({ isMutationPanelOpen: false }),
  toggleLeftPanel: () => set((s) => ({ isLeftPanelCollapsed: !s.isLeftPanelCollapsed })),

  applyMutation: (chainId, residueId, newResidue) => {
    const { currentMolecule, mutationHistory } = get();
    if (!currentMolecule) return null;

    let originalResidue: ResidueType | null = null;
    let position = -1;
    let snapshot: Residue | null = null;

    for (const chain of currentMolecule.chains) {
      if (chain.id !== chainId) continue;
      for (const residue of chain.residues) {
        if (residue.id === residueId) {
          originalResidue = residue.name;
          position = residue.sequenceNumber;
          snapshot = JSON.parse(JSON.stringify(residue));
          break;
        }
      }
      if (originalResidue) break;
    }

    if (!originalResidue || originalResidue === newResidue) return null;

    const record: MutationRecord = {
      id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      residueId,
      chainId,
      originalResidue,
      newResidue,
      position,
      snapshot,
    };

    const newHistory = [record, ...mutationHistory].slice(0, 20);
    set({ mutationHistory: newHistory, isMutationPanelOpen: false });
    get().markMutatedResidue(residueId);

    return record;
  },

  undoMutation: (mutationId) => {
    const { mutationHistory, undoStack } = get();
    const idx = mutationHistory.findIndex((m) => m.id === mutationId);
    if (idx === -1) return null;

    const record = mutationHistory[idx];
    const newHistory = mutationHistory.filter((m) => m.id !== mutationId);
    const newUndoStack = [record, ...undoStack].slice(0, 20);

    set({ mutationHistory: newHistory, undoStack: newUndoStack });
    get().removeMutatedHighlight(record.residueId);

    return record;
  },

  setViewPreset: (preset) => set({ currentViewPreset: preset }),

  markMutatedResidue: (residueId) =>
    set((s) => ({
      highlightedMutatedResidues: {
        ...s.highlightedMutatedResidues,
        [residueId]: Date.now() + 5000,
      },
    })),

  removeMutatedHighlight: (residueId) =>
    set((s) => {
      const next = { ...s.highlightedMutatedResidues };
      delete next[residueId];
      return { highlightedMutatedResidues: next };
    }),

  updateCurrentMolecule: (molecule) => set({ currentMolecule: molecule }),

  setExporting: (exporting) => set({ isExporting: exporting }),
  setExportProgress: (progress) => set({ exportProgress: progress }),
}));
