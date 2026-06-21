export interface AtomData {
  id: number;
  element: string;
  name: string;
  symbol: string;
  atomicNumber: number;
  position: { x: number; y: number; z: number };
  radius: number;
  color: string;
  hybridization: string;
  bondCount: number;
}

export interface BondData {
  from: number;
  to: number;
  type: 1 | 2 | 3;
}

export interface MoleculeData {
  name: string;
  formula: string;
  atoms: AtomData[];
  bonds: BondData[];
}

const ATOM_COLORS: Record<string, string> = {
  C: '#808080',
  H: '#ffffff',
  N: '#3050f8',
  O: '#ff0d0d',
};

const ATOM_RADII: Record<string, number> = {
  C: 0.77,
  H: 0.37,
  N: 0.75,
  O: 0.73,
};

const ATOM_NAMES: Record<string, string> = {
  C: '碳',
  H: '氢',
  N: '氮',
  O: '氧',
};

const ATOMIC_NUMBERS: Record<string, number> = {
  C: 6,
  H: 1,
  N: 7,
  O: 8,
};

function createAtom(
  id: number,
  element: string,
  x: number,
  y: number,
  z: number,
  hybridization: string,
  bondCount: number
): AtomData {
  return {
    id,
    element,
    name: ATOM_NAMES[element] || element,
    symbol: element,
    atomicNumber: ATOMIC_NUMBERS[element] || 0,
    position: { x, y, z },
    radius: ATOM_RADII[element] || 0.5,
    color: ATOM_COLORS[element] || '#888888',
    hybridization,
    bondCount,
  };
}

export const caffeineMolecule: MoleculeData = {
  name: '咖啡因',
  formula: 'C₈H₁₀N₄O₂',
  atoms: [
    createAtom(1, 'N', 0.0, 1.38, 0.0, 'sp2', 3),
    createAtom(2, 'C', 1.20, 0.80, 0.0, 'sp2', 3),
    createAtom(3, 'C', 1.20, -0.60, 0.0, 'sp2', 3),
    createAtom(4, 'N', 0.0, -1.20, 0.0, 'sp2', 3),
    createAtom(5, 'C', -1.20, -0.60, 0.0, 'sp2', 3),
    createAtom(6, 'C', -1.20, 0.80, 0.0, 'sp2', 3),
    createAtom(7, 'N', 0.0, 0.20, 0.0, 'sp2', 2),
    createAtom(8, 'O', 2.30, 1.35, 0.0, 'sp2', 1),
    createAtom(9, 'O', -2.30, 1.35, 0.0, 'sp2', 1),
    createAtom(10, 'C', 2.00, -1.40, 0.0, 'sp3', 4),
    createAtom(11, 'C', -2.00, -1.40, 0.0, 'sp3', 4),
    createAtom(12, 'C', 0.0, -2.60, 0.0, 'sp3', 4),
    createAtom(13, 'H', 2.95, -0.85, 0.0, 's', 1),
    createAtom(14, 'H', 2.10, -2.05, 0.90, 's', 1),
    createAtom(15, 'H', 2.10, -2.05, -0.90, 's', 1),
    createAtom(16, 'H', -2.95, -0.85, 0.0, 's', 1),
    createAtom(17, 'H', -2.10, -2.05, 0.90, 's', 1),
    createAtom(18, 'H', -2.10, -2.05, -0.90, 's', 1),
    createAtom(19, 'H', 0.90, -3.10, 0.0, 's', 1),
    createAtom(20, 'H', -0.45, -3.05, 0.80, 's', 1),
    createAtom(21, 'H', -0.45, -3.05, -0.80, 's', 1),
    createAtom(22, 'H', 0.0, 2.45, 0.0, 's', 1),
    createAtom(23, 'C', 1.50, 2.00, -0.30, 'sp3', 4),
    createAtom(24, 'H', 1.60, 2.10, 0.80, 's', 1),
  ],
  bonds: [
    { from: 1, to: 2, type: 1 },
    { from: 1, to: 6, type: 1 },
    { from: 1, to: 22, type: 1 },
    { from: 2, to: 3, type: 1 },
    { from: 2, to: 8, type: 2 },
    { from: 2, to: 23, type: 1 },
    { from: 3, to: 4, type: 2 },
    { from: 3, to: 10, type: 1 },
    { from: 4, to: 5, type: 1 },
    { from: 4, to: 12, type: 1 },
    { from: 5, to: 6, type: 1 },
    { from: 5, to: 9, type: 2 },
    { from: 5, to: 11, type: 1 },
    { from: 6, to: 7, type: 1 },
    { from: 7, to: 3, type: 1 },
    { from: 10, to: 13, type: 1 },
    { from: 10, to: 14, type: 1 },
    { from: 10, to: 15, type: 1 },
    { from: 11, to: 16, type: 1 },
    { from: 11, to: 17, type: 1 },
    { from: 11, to: 18, type: 1 },
    { from: 12, to: 19, type: 1 },
    { from: 12, to: 20, type: 1 },
    { from: 12, to: 21, type: 1 },
    { from: 23, to: 24, type: 1 },
  ],
};
