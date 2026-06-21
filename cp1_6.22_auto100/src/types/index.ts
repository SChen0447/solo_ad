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

export interface AtomRenderData extends AtomData {
  color: string;
  radius: number;
}

export interface BondRenderData extends BondData {
  atom1: AtomData;
  atom2: AtomData;
  length: number;
}

export interface BondAngleData {
  id: string;
  atom1: AtomData;
  centralAtom: AtomData;
  atom2: AtomData;
  angle: number;
}

export interface MoleculeRenderData {
  atoms: AtomRenderData[];
  bonds: BondRenderData[];
  bondAngles: BondAngleData[];
}

export interface RenderParams {
  bondScale: number;
  atomScale: number;
  lightIntensity: number;
}

export const ELEMENT_COLORS: Record<ElementType, string> = {
  C: '#808080',
  O: '#ff3333',
  N: '#4d4dff',
  H: '#ffffff',
};

export const ELEMENT_RADII: Record<ElementType, number> = {
  C: 0.4,
  O: 0.35,
  N: 0.38,
  H: 0.25,
};

export const ELEMENT_NAMES: Record<ElementType, string> = {
  C: '碳',
  O: '氧',
  N: '氮',
  H: '氢',
};
