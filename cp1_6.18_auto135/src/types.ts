export type ElementType = 'C' | 'N' | 'O' | 'S' | 'H' | 'P' | 'F' | 'Cl' | 'Br' | 'I';

export type ResidueType =
  | 'ALA' | 'ARG' | 'ASN' | 'ASP' | 'CYS'
  | 'GLN' | 'GLU' | 'GLY' | 'HIS' | 'ILE'
  | 'LEU' | 'LYS' | 'MET' | 'PHE' | 'PRO'
  | 'SER' | 'THR' | 'TRP' | 'TYR' | 'VAL';

export type SideChainType = 'hydrophobic' | 'hydrophilic' | 'charged' | 'polar' | 'special';

export type RenderMode = 'backbone' | 'cartoon' | 'surface' | 'ballstick';

export type ViewPreset = 'front' | 'side' | 'top' | 'inside';

export interface Atom {
  id: string;
  element: ElementType;
  x: number;
  y: number;
  z: number;
  residueId: string;
  chainId: string;
  isBackbone: boolean;
  isSideChain: boolean;
  name?: string;
}

export interface Bond {
  id: string;
  atom1: string;
  atom2: string;
  order: number;
}

export interface Residue {
  id: string;
  name: ResidueType;
  sequenceNumber: number;
  chainId: string;
  atoms: Atom[];
  bonds: Bond[];
  position: { x: number; y: number; z: number };
  sideChainType: SideChainType;
  hydrophobicity: number;
  phi?: number;
  psi?: number;
  isMutated?: boolean;
}

export interface Chain {
  id: string;
  name: string;
  residues: Residue[];
}

export interface Molecule {
  id: string;
  name: string;
  description: string;
  chains: Chain[];
  allAtoms: Atom[];
  allBonds: Bond[];
  center: { x: number; y: number; z: number };
  radius: number;
}

export interface MutationRecord {
  id: string;
  timestamp: number;
  residueId: string;
  chainId: string;
  originalResidue: ResidueType;
  newResidue: ResidueType;
  position: number;
  snapshot?: Residue;
}

export interface MutationResult {
  success: boolean;
  message?: string;
  affectedResidueIds?: string[];
  newAtoms?: Atom[];
  newBonds?: Bond[];
}

export interface HighlightState {
  residueId: string | null;
  isMutating: boolean;
  effectEndTime?: number;
}

export interface ResidueInfo {
  id: string;
  name: ResidueType;
  threeLetterCode: string;
  oneLetterCode: string;
  sequenceNumber: number;
  sideChainType: SideChainType;
  hydrophobicity: number;
  prevResidue?: ResidueType | null;
  nextResidue?: ResidueType | null;
  atomCount: number;
  isMutated: boolean;
}

export const RESIDUE_PROPERTIES: Record<ResidueType, {
  oneLetter: string;
  sideChainType: SideChainType;
  hydrophobicity: number;
  fullName: string;
}> = {
  ALA: { oneLetter: 'A', sideChainType: 'hydrophobic', hydrophobicity: 1.8, fullName: '丙氨酸' },
  ARG: { oneLetter: 'R', sideChainType: 'charged', hydrophobicity: -4.5, fullName: '精氨酸' },
  ASN: { oneLetter: 'N', sideChainType: 'polar', hydrophobicity: -3.5, fullName: '天冬酰胺' },
  ASP: { oneLetter: 'D', sideChainType: 'charged', hydrophobicity: -3.5, fullName: '天冬氨酸' },
  CYS: { oneLetter: 'C', sideChainType: 'special', hydrophobicity: 2.5, fullName: '半胱氨酸' },
  GLN: { oneLetter: 'Q', sideChainType: 'polar', hydrophobicity: -3.5, fullName: '谷氨酰胺' },
  GLU: { oneLetter: 'E', sideChainType: 'charged', hydrophobicity: -3.5, fullName: '谷氨酸' },
  GLY: { oneLetter: 'G', sideChainType: 'special', hydrophobicity: -0.4, fullName: '甘氨酸' },
  HIS: { oneLetter: 'H', sideChainType: 'charged', hydrophobicity: -3.2, fullName: '组氨酸' },
  ILE: { oneLetter: 'I', sideChainType: 'hydrophobic', hydrophobicity: 4.5, fullName: '异亮氨酸' },
  LEU: { oneLetter: 'L', sideChainType: 'hydrophobic', hydrophobicity: 3.8, fullName: '亮氨酸' },
  LYS: { oneLetter: 'K', sideChainType: 'charged', hydrophobicity: -3.9, fullName: '赖氨酸' },
  MET: { oneLetter: 'M', sideChainType: 'hydrophobic', hydrophobicity: 1.9, fullName: '甲硫氨酸' },
  PHE: { oneLetter: 'F', sideChainType: 'hydrophobic', hydrophobicity: 2.8, fullName: '苯丙氨酸' },
  PRO: { oneLetter: 'P', sideChainType: 'special', hydrophobicity: -1.6, fullName: '脯氨酸' },
  SER: { oneLetter: 'S', sideChainType: 'polar', hydrophobicity: -0.8, fullName: '丝氨酸' },
  THR: { oneLetter: 'T', sideChainType: 'polar', hydrophobicity: -0.7, fullName: '苏氨酸' },
  TRP: { oneLetter: 'W', sideChainType: 'hydrophobic', hydrophobicity: -0.9, fullName: '色氨酸' },
  TYR: { oneLetter: 'Y', sideChainType: 'polar', hydrophobicity: -1.3, fullName: '酪氨酸' },
  VAL: { oneLetter: 'V', sideChainType: 'hydrophobic', hydrophobicity: 4.2, fullName: '缬氨酸' },
};

export const ELEMENT_COLORS: Record<ElementType, string> = {
  C: '#808080',
  N: '#3333ff',
  O: '#ff3333',
  S: '#cccc00',
  H: '#ffffff',
  P: '#ff9933',
  F: '#00ff00',
  Cl: '#00ff00',
  Br: '#8b0000',
  I: '#9400d3',
};

export const SIDE_CHAIN_COLORS: Record<SideChainType, string> = {
  hydrophobic: '#888888',
  hydrophilic: '#4488ff',
  charged: '#ff4444',
  polar: '#44aaff',
  special: '#aa44aa',
};

export const ALL_AMINO_ACIDS: ResidueType[] = [
  'ALA', 'ARG', 'ASN', 'ASP', 'CYS', 'GLN', 'GLU', 'GLY', 'HIS', 'ILE',
  'LEU', 'LYS', 'MET', 'PHE', 'PRO', 'SER', 'THR', 'TRP', 'TYR', 'VAL',
];
