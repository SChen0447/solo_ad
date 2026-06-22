export interface AtomData {
  id: number;
  element: string;
  x: number;
  y: number;
  z: number;
}

export interface BondData {
  atom1: number;
  atom2: number;
  order: 1 | 2 | 3;
}

export interface MoleculeData {
  name: string;
  formula: string;
  atoms: AtomData[];
  bonds: BondData[];
}

export const ELEMENT_PROPERTIES: Record<string, {
  color: number;
  radius: number;
  mass: number;
  name: string;
}> = {
  C: { color: 0x808080, radius: 0.4, mass: 12.01, name: '碳' },
  N: { color: 0x3050F8, radius: 0.35, mass: 14.01, name: '氮' },
  O: { color: 0xFF0D0D, radius: 0.3, mass: 16.00, name: '氧' },
  H: { color: 0xFFFFFF, radius: 0.25, mass: 1.008, name: '氢' }
};

export const MOLECULES: Record<string, MoleculeData> = {
  caffeine: {
    name: '咖啡因',
    formula: 'C8H10N4O2',
    atoms: [
      { id: 0, element: 'N', x: -1.229, y: 0.030, z: -0.260 },
      { id: 1, element: 'C', x: -0.155, y: 0.708, z: 0.304 },
      { id: 2, element: 'N', x: 1.054, y: 0.110, z: -0.035 },
      { id: 3, element: 'C', x: 0.949, y: -1.151, z: -0.775 },
      { id: 4, element: 'C', x: -0.378, y: -1.174, z: -1.057 },
      { id: 5, element: 'N', x: -1.208, y: -0.087, z: 1.028 },
      { id: 6, element: 'C', x: 2.173, y: -1.560, z: -0.868 },
      { id: 7, element: 'C', x: -1.186, y: -2.053, z: -1.901 },
      { id: 8, element: 'O', x: 2.811, y: 0.861, z: 0.403 },
      { id: 9, element: 'O', x: -0.595, y: 1.655, z: 1.064 },
      { id: 10, element: 'C', x: -2.591, y: 0.603, z: -0.871 },
      { id: 11, element: 'C', x: -1.246, y: -0.077, z: 2.468 },
      { id: 12, element: 'C', x: 3.138, y: -0.749, z: -0.150 },
      { id: 13, element: 'C', x: 2.348, y: -2.938, z: -1.654 },
      { id: 14, element: 'H', x: -3.278, y: 1.331, z: -0.387 },
      { id: 15, element: 'H', x: -2.554, y: 1.038, z: -1.888 },
      { id: 16, element: 'H', x: -3.052, y: -0.336, z: -0.968 },
      { id: 17, element: 'H', x: -2.233, y: -0.462, z: 2.683 },
      { id: 18, element: 'H', x: -0.809, y: 0.904, z: 2.880 },
      { id: 19, element: 'H', x: -0.749, y: -0.784, z: 3.106 },
      { id: 20, element: 'H', x: 3.505, y: -3.240, z: -1.712 },
      { id: 21, element: 'H', x: 1.809, y: -3.590, z: -0.950 },
      { id: 22, element: 'H', x: 2.034, y: -2.989, z: -2.687 }
    ],
    bonds: [
      { atom1: 0, atom2: 1, order: 1 },
      { atom1: 0, atom2: 4, order: 1 },
      { atom1: 0, atom2: 10, order: 1 },
      { atom1: 1, atom2: 2, order: 1 },
      { atom1: 1, atom2: 9, order: 2 },
      { atom1: 2, atom2: 3, order: 1 },
      { atom1: 2, atom2: 8, order: 2 },
      { atom1: 2, atom2: 12, order: 1 },
      { atom1: 3, atom2: 4, order: 1 },
      { atom1: 3, atom2: 6, order: 1 },
      { atom1: 4, atom2: 7, order: 2 },
      { atom1: 5, atom2: 1, order: 1 },
      { atom1: 5, atom2: 4, order: 1 },
      { atom1: 5, atom2: 11, order: 1 },
      { atom1: 6, atom2: 12, order: 2 },
      { atom1: 6, atom2: 13, order: 1 },
      { atom1: 7, atom2: 14, order: 1 },
      { atom1: 7, atom2: 15, order: 1 },
      { atom1: 7, atom2: 16, order: 1 },
      { atom1: 10, atom2: 14, order: 1 },
      { atom1: 10, atom2: 15, order: 1 },
      { atom1: 10, atom2: 16, order: 1 },
      { atom1: 11, atom2: 17, order: 1 },
      { atom1: 11, atom2: 18, order: 1 },
      { atom1: 11, atom2: 19, order: 1 },
      { atom1: 13, atom2: 20, order: 1 },
      { atom1: 13, atom2: 21, order: 1 },
      { atom1: 13, atom2: 22, order: 1 }
    ]
  },
  salicylic_acid: {
    name: '水杨酸',
    formula: 'C7H6O3',
    atoms: [
      { id: 0, element: 'C', x: -1.055, y: 0.048, z: 0.055 },
      { id: 1, element: 'C', x: 0.315, y: 0.339, z: -0.115 },
      { id: 2, element: 'C', x: 1.062, y: -0.222, z: -1.230 },
      { id: 3, element: 'C', x: 0.424, y: -1.096, z: -2.198 },
      { id: 4, element: 'C', x: -0.946, y: -1.364, z: -2.008 },
      { id: 5, element: 'C', x: -1.681, y: -0.830, z: -0.872 },
      { id: 6, element: 'C', x: 2.586, y: 0.069, z: -1.462 },
      { id: 7, element: 'O', x: -2.075, y: 0.496, z: 1.008 },
      { id: 8, element: 'O', x: -1.636, y: -1.723, z: -2.882 },
      { id: 9, element: 'O', x: 3.101, y: -0.511, z: -2.485 },
      { id: 10, element: 'O', x: 3.334, y: 0.818, z: -0.647 },
      { id: 11, element: 'H', x: 1.823, y: 1.013, z: 0.701 },
      { id: 12, element: 'H', x: 0.990, y: -1.514, z: -3.054 },
      { id: 13, element: 'H', x: -0.834, y: 0.884, z: 1.768 },
      { id: 14, element: 'H', x: -2.718, y: -0.006, z: -0.701 },
      { id: 15, element: 'H', x: 4.297, y: 0.984, z: -0.825 }
    ],
    bonds: [
      { atom1: 0, atom2: 1, order: 2 },
      { atom1: 0, atom2: 5, order: 1 },
      { atom1: 0, atom2: 7, order: 1 },
      { atom1: 1, atom2: 2, order: 1 },
      { atom1: 1, atom2: 11, order: 1 },
      { atom1: 2, atom2: 3, order: 2 },
      { atom1: 2, atom2: 6, order: 1 },
      { atom1: 3, atom2: 4, order: 1 },
      { atom1: 3, atom2: 12, order: 1 },
      { atom1: 4, atom2: 5, order: 2 },
      { atom1: 4, atom2: 8, order: 1 },
      { atom1: 5, atom2: 14, order: 1 },
      { atom1: 6, atom2: 9, order: 2 },
      { atom1: 6, atom2: 10, order: 1 },
      { atom1: 7, atom2: 13, order: 1 },
      { atom1: 10, atom2: 15, order: 1 }
    ]
  },
  aspirin: {
    name: '阿司匹林',
    formula: 'C9H8O4',
    atoms: [
      { id: 0, element: 'C', x: -1.015, y: -0.054, z: 0.002 },
      { id: 1, element: 'C', x: 0.363, y: 0.241, z: -0.115 },
      { id: 2, element: 'C', x: 1.138, y: -0.302, z: -1.221 },
      { id: 3, element: 'C', x: 0.500, y: -1.154, z: -2.201 },
      { id: 4, element: 'C', x: -0.868, y: -1.420, z: -2.072 },
      { id: 5, element: 'C', x: -1.627, y: -0.914, z: -0.946 },
      { id: 6, element: 'C', x: 2.651, y: 0.026, z: -1.329 },
      { id: 7, element: 'C', x: -1.876, y: 0.506, z: 1.182 },
      { id: 8, element: 'O', x: -1.162, y: -1.717, z: -3.086 },
      { id: 9, element: 'O', x: 3.305, y: -0.554, z: -2.278 },
      { id: 10, element: 'O', x: 3.200, y: 0.846, z: -0.388 },
      { id: 11, element: 'O', x: -3.152, y: 0.742, z: 1.032 },
      { id: 12, element: 'O', x: -1.203, y: 0.928, z: 2.250 },
      { id: 13, element: 'H', x: 1.799, y: 0.934, z: 0.682 },
      { id: 14, element: 'H', x: 1.068, y: -1.558, z: -3.071 },
      { id: 15, element: 'H', x: -2.695, y: -1.156, z: -0.844 },
      { id: 16, element: 'H', x: 4.245, y: 1.045, z: -0.461 },
      { id: 17, element: 'H', x: -1.712, y: 1.277, z: 3.043 },
      { id: 18, element: 'H', x: 0.151, y: -2.221, z: 0.837 },
      { id: 19, element: 'H', x: 0.882, y: -2.017, z: 0.750 },
      { id: 20, element: 'H', x: -0.494, y: -2.677, z: 1.067 }
    ],
    bonds: [
      { atom1: 0, atom2: 1, order: 2 },
      { atom1: 0, atom2: 5, order: 1 },
      { atom1: 0, atom2: 7, order: 1 },
      { atom1: 1, atom2: 2, order: 1 },
      { atom1: 1, atom2: 13, order: 1 },
      { atom1: 2, atom2: 3, order: 2 },
      { atom1: 2, atom2: 6, order: 1 },
      { atom1: 3, atom2: 4, order: 1 },
      { atom1: 3, atom2: 14, order: 1 },
      { atom1: 4, atom2: 5, order: 2 },
      { atom1: 4, atom2: 8, order: 1 },
      { atom1: 5, atom2: 15, order: 1 },
      { atom1: 6, atom2: 9, order: 2 },
      { atom1: 6, atom2: 10, order: 1 },
      { atom1: 7, atom2: 11, order: 2 },
      { atom1: 7, atom2: 12, order: 1 },
      { atom1: 10, atom2: 16, order: 1 },
      { atom1: 12, atom2: 17, order: 1 },
      { atom1: 12, atom2: 18, order: 1 },
      { atom1: 12, atom2: 19, order: 1 },
      { atom1: 12, atom2: 20, order: 1 }
    ]
  }
};

export function getBondLength(atom1: AtomData, atom2: AtomData): number {
  const dx = atom2.x - atom1.x;
  const dy = atom2.y - atom1.y;
  const dz = atom2.z - atom1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
