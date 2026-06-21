export interface AtomData {
  id: number;
  element: string;
  x: number;
  y: number;
  z: number;
}

export interface BondData {
  from: number;
  to: number;
  order: 1 | 2 | 3;
}

export interface MoleculeData {
  name: string;
  formula: string;
  atoms: AtomData[];
  bonds: BondData[];
}

export const ELEMENT_COLORS: Record<string, number> = {
  C: 0x404040,
  N: 0x3050F8,
  O: 0xFF0D0D,
  H: 0xFFFFFF,
};

export const ELEMENT_RADII: Record<string, number> = {
  C: 0.4,
  N: 0.35,
  O: 0.3,
  H: 0.25,
};

export const ELEMENT_MASS: Record<string, number> = {
  C: 12.011,
  N: 14.007,
  O: 15.999,
  H: 1.008,
};

export const MOLECULES: Record<string, MoleculeData> = {
  caffeine: {
    name: 'Caffeine',
    formula: 'C₈H₁₀N₄O₂',
    atoms: [
      { id: 0, element: 'C', x: 0.000, y: 0.000, z: 0.000 },
      { id: 1, element: 'N', x: 1.350, y: 0.000, z: 0.000 },
      { id: 2, element: 'C', x: 2.030, y: 1.170, z: 0.000 },
      { id: 3, element: 'N', x: 1.350, y: 2.340, z: 0.000 },
      { id: 4, element: 'C', x: 0.000, y: 2.340, z: 0.000 },
      { id: 5, element: 'C', x: -0.680, y: 1.170, z: 0.000 },
      { id: 6, element: 'C', x: -2.030, y: 1.170, z: 0.000 },
      { id: 7, element: 'O', x: -2.720, y: 0.180, z: 0.000 },
      { id: 8, element: 'N', x: -2.510, y: 2.440, z: 0.000 },
      { id: 9, element: 'C', x: -1.480, y: 3.260, z: 0.000 },
      { id: 10, element: 'N', x: -0.680, y: 3.510, z: 0.000 },
      { id: 11, element: 'C', x: 3.480, y: 1.170, z: 0.000 },
      { id: 12, element: 'O', x: 4.160, y: 0.180, z: 0.000 },
      { id: 13, element: 'N', x: 3.880, y: 2.440, z: 0.000 },
      { id: 14, element: 'C', x: 3.200, y: 3.510, z: 0.000 },
      { id: 15, element: 'C', x: 5.230, y: 2.440, z: 0.000 },
      { id: 16, element: 'H', x: 1.900, y: -0.900, z: 0.000 },
      { id: 17, element: 'H', x: 3.620, y: 4.440, z: 0.000 },
      { id: 18, element: 'H', x: 2.140, y: 3.510, z: 0.000 },
      { id: 19, element: 'H', x: 5.640, y: 1.950, z: 0.890 },
      { id: 20, element: 'H', x: 5.640, y: 1.950, z: -0.890 },
      { id: 21, element: 'H', x: 5.640, y: 3.440, z: 0.000 },
      { id: 22, element: 'H', x: -3.020, y: 2.440, z: -0.890 },
      { id: 23, element: 'H', x: -3.020, y: 2.440, z: 0.890 },
    ],
    bonds: [
      { from: 0, to: 1, order: 1 },
      { from: 0, to: 5, order: 2 },
      { from: 1, to: 2, order: 1 },
      { from: 1, to: 16, order: 1 },
      { from: 2, to: 3, order: 1 },
      { from: 2, to: 11, order: 1 },
      { from: 3, to: 4, order: 2 },
      { from: 4, to: 5, order: 1 },
      { from: 4, to: 10, order: 1 },
      { from: 5, to: 6, order: 1 },
      { from: 6, to: 7, order: 2 },
      { from: 6, to: 8, order: 1 },
      { from: 8, to: 9, order: 1 },
      { from: 9, to: 10, order: 2 },
      { from: 8, to: 22, order: 1 },
      { from: 8, to: 23, order: 1 },
      { from: 11, to: 12, order: 2 },
      { from: 11, to: 13, order: 1 },
      { from: 13, to: 14, order: 1 },
      { from: 13, to: 15, order: 1 },
      { from: 14, to: 17, order: 1 },
      { from: 14, to: 18, order: 1 },
      { from: 15, to: 19, order: 1 },
      { from: 15, to: 20, order: 1 },
      { from: 15, to: 21, order: 1 },
    ],
  },
  salicylic: {
    name: 'Salicylic Acid',
    formula: 'C₇H₆O₃',
    atoms: [
      { id: 0, element: 'C', x: 0.000, y: 0.000, z: 0.000 },
      { id: 1, element: 'C', x: 1.400, y: 0.000, z: 0.000 },
      { id: 2, element: 'C', x: 2.100, y: 1.210, z: 0.000 },
      { id: 3, element: 'C', x: 1.400, y: 2.420, z: 0.000 },
      { id: 4, element: 'C', x: 0.000, y: 2.420, z: 0.000 },
      { id: 5, element: 'C', x: -0.700, y: 1.210, z: 0.000 },
      { id: 6, element: 'C', x: -2.100, y: 1.210, z: 0.000 },
      { id: 7, element: 'O', x: -2.800, y: 0.180, z: 0.000 },
      { id: 8, element: 'O', x: -2.800, y: 2.240, z: 0.000 },
      { id: 9, element: 'O', x: 2.100, y: 3.630, z: 0.000 },
      { id: 10, element: 'H', x: 3.190, y: 1.210, z: 0.000 },
      { id: 11, element: 'H', x: -0.700, y: 3.360, z: 0.000 },
      { id: 12, element: 'H', x: -3.730, y: 2.240, z: 0.000 },
      { id: 13, element: 'H', x: 2.090, y: 4.490, z: 0.000 },
      { id: 14, element: 'H', x: 1.400, y: -1.080, z: 0.000 },
      { id: 15, element: 'H', x: -1.090, y: -1.080, z: 0.000 },
    ],
    bonds: [
      { from: 0, to: 1, order: 2 },
      { from: 0, to: 5, order: 1 },
      { from: 0, to: 15, order: 1 },
      { from: 1, to: 2, order: 1 },
      { from: 1, to: 14, order: 1 },
      { from: 2, to: 3, order: 2 },
      { from: 2, to: 10, order: 1 },
      { from: 3, to: 4, order: 1 },
      { from: 3, to: 9, order: 1 },
      { from: 4, to: 5, order: 2 },
      { from: 4, to: 11, order: 1 },
      { from: 5, to: 6, order: 1 },
      { from: 6, to: 7, order: 2 },
      { from: 6, to: 8, order: 1 },
      { from: 8, to: 12, order: 1 },
      { from: 9, to: 13, order: 1 },
    ],
  },
  aspirin: {
    name: 'Aspirin',
    formula: 'C₉H₈O₄',
    atoms: [
      { id: 0, element: 'C', x: 0.000, y: 0.000, z: 0.000 },
      { id: 1, element: 'C', x: 1.400, y: 0.000, z: 0.000 },
      { id: 2, element: 'C', x: 2.100, y: 1.210, z: 0.000 },
      { id: 3, element: 'C', x: 1.400, y: 2.420, z: 0.000 },
      { id: 4, element: 'C', x: 0.000, y: 2.420, z: 0.000 },
      { id: 5, element: 'C', x: -0.700, y: 1.210, z: 0.000 },
      { id: 6, element: 'C', x: -2.100, y: 1.210, z: 0.000 },
      { id: 7, element: 'O', x: -2.800, y: 0.180, z: 0.000 },
      { id: 8, element: 'O', x: -2.800, y: 2.240, z: 0.000 },
      { id: 9, element: 'C', x: -4.200, y: 2.240, z: 0.000 },
      { id: 10, element: 'O', x: -4.900, y: 1.120, z: 0.000 },
      { id: 11, element: 'C', x: -4.900, y: 3.450, z: 0.000 },
      { id: 12, element: 'O', x: 2.100, y: 3.630, z: 0.000 },
      { id: 13, element: 'H', x: 3.190, y: 1.210, z: 0.000 },
      { id: 14, element: 'H', x: 1.400, y: -1.080, z: 0.000 },
      { id: 15, element: 'H', x: -0.700, y: 3.360, z: 0.000 },
      { id: 16, element: 'H', x: -5.990, y: 3.450, z: 0.000 },
      { id: 17, element: 'H', x: -4.550, y: 4.310, z: 0.890 },
      { id: 18, element: 'H', x: -4.550, y: 4.310, z: -0.890 },
      { id: 19, element: 'H', x: 2.090, y: 4.490, z: 0.000 },
      { id: 20, element: 'H', x: -1.090, y: -1.080, z: 0.000 },
    ],
    bonds: [
      { from: 0, to: 1, order: 2 },
      { from: 0, to: 5, order: 1 },
      { from: 0, to: 20, order: 1 },
      { from: 1, to: 2, order: 1 },
      { from: 1, to: 14, order: 1 },
      { from: 2, to: 3, order: 2 },
      { from: 2, to: 13, order: 1 },
      { from: 3, to: 4, order: 1 },
      { from: 3, to: 12, order: 1 },
      { from: 4, to: 5, order: 2 },
      { from: 4, to: 15, order: 1 },
      { from: 5, to: 6, order: 1 },
      { from: 6, to: 7, order: 2 },
      { from: 6, to: 8, order: 1 },
      { from: 8, to: 9, order: 1 },
      { from: 9, to: 10, order: 2 },
      { from: 9, to: 11, order: 1 },
      { from: 11, to: 16, order: 1 },
      { from: 11, to: 17, order: 1 },
      { from: 11, to: 18, order: 1 },
      { from: 12, to: 19, order: 1 },
    ],
  },
};
