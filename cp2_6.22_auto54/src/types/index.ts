export interface Atom {
  type: string;
  x: number;
  y: number;
  z: number;
  index: number;
}

export interface Bond {
  atom1: number;
  atom2: number;
}

export interface MoleculeData {
  name: string;
  atoms: Atom[];
  bonds: Bond[];
}

export type DisplayMode = 'wireframe' | 'stick';

export interface AlignmentResult {
  offsets: { offset: number; index: number }[];
  rmsd: number;
  diffIndices: number[];
  transformation?: {
    rotation: number[][];
    translation: number[];
  };
}

export interface MoleculeGroup extends THREE.Group {
  userData: {
    moleculeId: string;
    moleculeName: string;
    mode: DisplayMode;
    atoms: Atom[];
    bonds: Bond[];
    atomMeshes: Map<number, THREE.Mesh>;
    bondSegments?: THREE.LineSegments;
    diffMarkers?: THREE.Group;
  };
}

export interface HighlightState {
  originalScale: number;
  originalColor: THREE.Color;
}

export const CPK_COLORS: Record<string, string> = {
  C: '#404040',
  O: '#FF0D0D',
  N: '#3050F8',
  H: '#FFFFFF',
  S: '#FFFF30',
  P: '#FF8000',
  F: '#00FF00',
  Cl: '#00FF00',
  Br: '#A62929',
  I: '#940094',
};

export const ATOM_RADII: Record<string, number> = {
  C: 0.4,
  O: 0.5,
  N: 0.4,
  H: 0.3,
  S: 0.5,
  P: 0.5,
  F: 0.35,
  Cl: 0.45,
  Br: 0.5,
  I: 0.55,
};
