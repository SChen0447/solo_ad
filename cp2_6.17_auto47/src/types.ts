export type ElementSymbol = 'C' | 'H' | 'N' | 'O' | 'S' | 'P' | 'F' | 'Cl';

export type BondType = 'single' | 'double' | 'aromatic';

export interface Atom {
  id: number;
  element: ElementSymbol;
  x: number;
  y: number;
  z: number;
}

export interface Bond {
  id: number;
  atom1: number;
  atom2: number;
  type: BondType;
}

export interface Molecule {
  name: string;
  atoms: Atom[];
  bonds: Bond[];
}

export interface ElementInfo {
  symbol: ElementSymbol;
  color: string;
  radius: number;
  mass: number;
}

export const ELEMENT_INFO: Record<ElementSymbol, ElementInfo> = {
  C: { symbol: 'C', color: '#404040', radius: 0.8, mass: 12.011 },
  H: { symbol: 'H', color: '#FFFFFF', radius: 0.4, mass: 1.008 },
  N: { symbol: 'N', color: '#3050F8', radius: 0.7, mass: 14.007 },
  O: { symbol: 'O', color: '#FF0D0D', radius: 0.7, mass: 15.999 },
  S: { symbol: 'S', color: '#FFFF30', radius: 0.9, mass: 32.065 },
  P: { symbol: 'P', color: '#FF8000', radius: 0.85, mass: 30.974 },
  F: { symbol: 'F', color: '#90E050', radius: 0.5, mass: 18.998 },
  Cl: { symbol: 'Cl', color: '#1FF01F', radius: 0.6, mass: 35.453 },
};
