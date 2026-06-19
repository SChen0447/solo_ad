export interface AtomData {
  element: string;
  x: number;
  y: number;
  z: number;
}

export interface BondData {
  atom1: number;
  atom2: number;
  order: number;
}

export interface MoleculeData {
  name: string;
  formula: string;
  atoms: AtomData[];
  bonds: BondData[];
}

const BENZ_RADIUS = 1.4;
const CH_BOND = 1.09;

const methane: MoleculeData = {
  name: '甲烷',
  formula: 'CH₄',
  atoms: [
    { element: 'C', x: 0, y: 0, z: 0 },
    { element: 'H', x: 0.629, y: 0.629, z: 0.629 },
    { element: 'H', x: -0.629, y: -0.629, z: 0.629 },
    { element: 'H', x: -0.629, y: 0.629, z: -0.629 },
    { element: 'H', x: 0.629, y: -0.629, z: -0.629 }
  ],
  bonds: [
    { atom1: 0, atom2: 1, order: 1 },
    { atom1: 0, atom2: 2, order: 1 },
    { atom1: 0, atom2: 3, order: 1 },
    { atom1: 0, atom2: 4, order: 1 }
  ]
};

const benzeneAtoms: AtomData[] = [];
const benzeneBonds: BondData[] = [];

for (let i = 0; i < 6; i++) {
  const angle = (i * Math.PI) / 3;
  benzeneAtoms.push({
    element: 'C',
    x: BENZ_RADIUS * Math.cos(angle),
    y: BENZ_RADIUS * Math.sin(angle),
    z: 0
  });
}

for (let i = 0; i < 6; i++) {
  const angle = (i * Math.PI) / 3;
  benzeneAtoms.push({
    element: 'H',
    x: (BENZ_RADIUS + CH_BOND) * Math.cos(angle),
    y: (BENZ_RADIUS + CH_BOND) * Math.sin(angle),
    z: 0
  });
}

for (let i = 0; i < 6; i++) {
  benzeneBonds.push({ atom1: i, atom2: (i + 1) % 6, order: i % 2 === 0 ? 2 : 1 });
  benzeneBonds.push({ atom1: i, atom2: i + 6, order: 1 });
}

const benzene: MoleculeData = {
  name: '苯',
  formula: 'C₆H₆',
  atoms: benzeneAtoms,
  bonds: benzeneBonds
};

const glucose: MoleculeData = {
  name: '葡萄糖',
  formula: 'C₆H₁₂O₆',
  atoms: [
    { element: 'O', x: 0.627, y: 0.380, z: 0.000 },
    { element: 'C', x: 0.836, y: -0.160, z: 1.425 },
    { element: 'C', x: 0.345, y: 1.129, z: 2.226 },
    { element: 'C', x: 0.731, y: 0.641, z: 3.690 },
    { element: 'C', x: 0.220, y: 1.683, z: 4.638 },
    { element: 'C', x: 0.556, y: 1.128, z: 6.063 },
    { element: 'C', x: 0.060, y: 2.067, z: 6.920 },
    { element: 'O', x: 1.687, y: -0.728, z: 1.540 },
    { element: 'O', x: 0.868, y: 2.434, z: 1.930 },
    { element: 'O', x: 2.142, y: 0.254, z: 3.886 },
    { element: 'O', x: -1.196, y: 1.297, z: 4.419 },
    { element: 'O', x: 1.672, y: 0.395, z: 6.538 },
    { element: 'O', x: 0.232, y: 1.539, z: 8.278 },
    { element: 'H', x: 2.523, y: -0.637, z: 1.562 },
    { element: 'H', x: -0.743, y: 1.341, z: 2.030 },
    { element: 'H', x: 0.235, y: -0.370, z: 4.033 },
    { element: 'H', x: 0.472, y: 2.735, z: 4.519 },
    { element: 'H', x: 0.158, y: -0.290, z: 6.348 },
    { element: 'H', x: -0.989, y: 2.312, z: 6.797 },
    { element: 'H', x: 1.636, y: -0.678, z: 1.837 },
    { element: 'H', x: 1.081, y: 3.204, z: 2.537 },
    { element: 'H', x: 2.336, y: 0.814, z: 4.688 },
    { element: 'H', x: -1.435, y: 2.020, z: 5.022 },
    { element: 'H', x: 1.854, y: 0.803, z: 7.359 }
  ],
  bonds: [
    { atom1: 0, atom2: 1, order: 1 },
    { atom1: 0, atom2: 4, order: 1 },
    { atom1: 1, atom2: 2, order: 1 },
    { atom1: 1, atom2: 7, order: 1 },
    { atom1: 2, atom2: 3, order: 1 },
    { atom1: 2, atom2: 8, order: 1 },
    { atom1: 3, atom2: 4, order: 1 },
    { atom1: 3, atom2: 9, order: 1 },
    { atom1: 4, atom2: 5, order: 1 },
    { atom1: 4, atom2: 10, order: 1 },
    { atom1: 5, atom2: 6, order: 1 },
    { atom1: 5, atom2: 11, order: 1 },
    { atom1: 6, atom2: 12, order: 1 },
    { atom1: 7, atom2: 13, order: 1 },
    { atom1: 8, atom2: 14, order: 1 },
    { atom1: 9, atom2: 15, order: 1 },
    { atom1: 10, atom2: 16, order: 1 },
    { atom1: 11, atom2: 17, order: 1 },
    { atom1: 12, atom2: 18, order: 1 },
    { atom1: 1, atom2: 19, order: 1 },
    { atom1: 2, atom2: 20, order: 1 },
    { atom1: 3, atom2: 21, order: 1 },
    { atom1: 4, atom2: 22, order: 1 },
    { atom1: 5, atom2: 23, order: 1 }
  ]
};

export const molecules: Record<string, MoleculeData> = {
  methane,
  benzene,
  glucose
};

export const moleculeNames: Array<{ key: string; name: string; formula: string }> = [
  { key: 'methane', name: '甲烷', formula: 'CH₄' },
  { key: 'benzene', name: '苯', formula: 'C₆H₆' },
  { key: 'glucose', name: '葡萄糖', formula: 'C₆H₁₂O₆' }
];

export function getMolecule(key: string): MoleculeData | undefined {
  return molecules[key];
}

export function getMoleculeList(): Array<{ key: string; name: string; formula: string }> {
  return moleculeNames;
}
