export type ElementType = 'C' | 'H' | 'O' | 'N';

export interface AtomData {
  id: string;
  element: ElementType;
  x: number;
  y: number;
  z: number;
  index: number;
}

export interface BondData {
  id: string;
  atom1Id: string;
  atom2Id: string;
  order: number;
}

export interface MoleculeData {
  id: string;
  name: string;
  formula: string;
  atoms: AtomData[];
  bonds: BondData[];
}
