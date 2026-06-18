import { create } from 'zustand'

export interface Atom {
  id: number
  type: string
  x: number
  y: number
  z: number
  residue: string
  residueNumber: number
}

export interface Bond {
  id: number
  atom1: number
  atom2: number
}

export interface AnalysisResult {
  sasa: number
  sasaFormatted: string
  bondAngle: number | null
  bondAngleFormatted: string | null
  atomDistance: number | null
  atomDistanceFormatted: string | null
  showSurface: boolean
}

export interface CameraState {
  position: [number, number, number]
  target: [number, number, number]
}

export interface MoleculeState {
  atoms: Atom[]
  bonds: Bond[]
  selectedAtomIds: number[]
  editMode: boolean
  currentMolecule: string
  transitionProgress: number
  transitionPhase: 'idle' | 'fade-out' | 'fade-in'
  camera: CameraState
  analysis: AnalysisResult
  rotationSpeed: number
}

export interface MoleculeActions {
  setAtoms: (atoms: Atom[]) => void
  setBonds: (bonds: Bond[]) => void
  selectAtom: (id: number, additive?: boolean) => void
  clearSelection: () => void
  updateAtomPosition: (id: number, x: number, y: number, z: number) => void
  setEditMode: (enabled: boolean) => void
  setCurrentMolecule: (name: string) => void
  setTransitionProgress: (progress: number) => void
  setTransitionPhase: (phase: 'idle' | 'fade-out' | 'fade-in') => void
  setCameraPosition: (position: [number, number, number]) => void
  setCameraTarget: (target: [number, number, number]) => void
  setSasa: (value: number) => void
  setShowSurface: (show: boolean) => void
  setBondAngle: (value: number | null) => void
  setAtomDistance: (value: number | null) => void
  setRotationSpeed: (speed: number) => void
}

const initialState: MoleculeState = {
  atoms: [],
  bonds: [],
  selectedAtomIds: [],
  editMode: false,
  currentMolecule: 'peptide',
  transitionProgress: 1,
  transitionPhase: 'idle',
  camera: {
    position: [6, 4, 8],
    target: [0, 0, 0]
  },
  analysis: {
    sasa: 0,
    sasaFormatted: '0.00',
    bondAngle: null,
    bondAngleFormatted: null,
    atomDistance: null,
    atomDistanceFormatted: null,
    showSurface: false
  },
  rotationSpeed: 0
}

export const useStore = create<MoleculeState & MoleculeActions>((set, get) => ({
  ...initialState,

  setAtoms: (atoms) => set({ atoms }),
  setBonds: (bonds) => set({ bonds }),

  selectAtom: (id, additive = false) => {
    const { selectedAtomIds } = get()
    if (additive) {
      if (selectedAtomIds.includes(id)) {
        set({ selectedAtomIds: selectedAtomIds.filter(i => i !== id) })
      } else {
        set({ selectedAtomIds: [...selectedAtomIds, id].slice(0, 2) })
      }
    } else {
      set({ selectedAtomIds: [id] })
    }
  },

  clearSelection: () => set({ selectedAtomIds: [] }),

  updateAtomPosition: (id, x, y, z) => {
    const { atoms } = get()
    const updatedAtoms = atoms.map(atom =>
      atom.id === id ? { ...atom, x, y, z } : atom
    )
    set({ atoms: updatedAtoms })
  },

  setEditMode: (enabled) => set({ editMode: enabled, selectedAtomIds: [] }),

  setCurrentMolecule: (name) => set({ currentMolecule: name }),

  setTransitionProgress: (progress) => set({ transitionProgress: progress }),

  setTransitionPhase: (phase) => set({ transitionPhase: phase }),

  setCameraPosition: (position) =>
    set({ camera: { ...get().camera, position } }),

  setCameraTarget: (target) =>
    set({ camera: { ...get().camera, target } }),

  setSasa: (value) =>
    set({
      analysis: {
        ...get().analysis,
        sasa: value,
        sasaFormatted: value.toFixed(2)
      }
    }),

  setShowSurface: (show) =>
    set({ analysis: { ...get().analysis, showSurface: show } }),

  setBondAngle: (value) =>
    set({
      analysis: {
        ...get().analysis,
        bondAngle: value,
        bondAngleFormatted: value !== null ? value.toFixed(1) : null
      }
    }),

  setAtomDistance: (value) =>
    set({
      analysis: {
        ...get().analysis,
        atomDistance: value,
        atomDistanceFormatted: value !== null ? value.toFixed(2) : null
      }
    }),

  setRotationSpeed: (speed) => set({ rotationSpeed: speed })
}))
