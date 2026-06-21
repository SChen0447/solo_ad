export interface Atom {
  id: number;
  element: string;
  atomicNumber: number;
  name: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  mass: number;
  residueId: number;
  chainId: string;
}

export interface Bond {
  id: number;
  atom1Id: number;
  atom2Id: number;
  type: 'single' | 'double' | 'triple' | 'aromatic';
  length: number;
}

export interface Residue {
  id: number;
  name: string;
  sequenceNumber: number;
  chainId: string;
  atomIds: number[];
  secondaryStructure: 'helix' | 'sheet' | 'coil';
  hydrophobicity: number;
  cartoonPosition?: [number, number, number];
}

export interface Chain {
  id: string;
  name: string;
  residueIds: number[];
}

export interface Molecule {
  id: string;
  name: string;
  pdbId: string;
  atoms: Atom[];
  bonds: Bond[];
  chains: Chain[];
  residues: Residue[];
  center: [number, number, number];
  atomCount: number;
  residueCount: number;
}

export type RenderMode = 'ballstick' | 'cartoon';

export interface ElementProperty {
  symbol: string;
  name: string;
  atomicNumber: number;
  mass: number;
  vanDerWaalsRadius: number;
  cpkColor: string;
}

export interface ViewerState {
  currentMolecule: Molecule | null;
  selectedAtom: Atom | null;
  renderMode: RenderMode;
  isLoading: boolean;
  backgroundColor: string;
  showHelp: boolean;
  sidebarCollapsed: boolean;
  transitionProgress: number;
}

export interface ViewerActions {
  setMolecule: (mol: Molecule) => void;
  selectAtom: (atom: Atom | null) => void;
  setRenderMode: (mode: RenderMode) => void;
  setLoading: (loading: boolean) => void;
  toggleHelp: () => void;
  toggleSidebar: () => void;
  setBackgroundColor: (color: string) => void;
  setTransitionProgress: (progress: number) => void;
}

export type ViewerStore = ViewerState & ViewerActions;
