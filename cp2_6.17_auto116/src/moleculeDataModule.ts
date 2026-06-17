import type { Molecule } from './eventBus';

const WATER_MOLECULE: Molecule = {
  id: 'h2o',
  name: '水',
  formula: 'H₂O',
  atoms: [
    { element: 'O', elementName: '氧', atomicNumber: 8, color: '#ff4444', position: [0, 0, 0.12], radius: 0.66 },
    { element: 'H', elementName: '氢', atomicNumber: 1, color: '#ffffff', position: [0.76, 0, -0.48], radius: 0.31 },
    { element: 'H', elementName: '氢', atomicNumber: 1, color: '#ffffff', position: [-0.76, 0, -0.48], radius: 0.31 }
  ],
  bonds: [
    { atomIndex1: 0, atomIndex2: 1, bondOrder: 1 },
    { atomIndex1: 0, atomIndex2: 2, bondOrder: 1 }
  ]
};

const METHANE_MOLECULE: Molecule = {
  id: 'ch4',
  name: '甲烷',
  formula: 'CH₄',
  atoms: [
    { element: 'C', elementName: '碳', atomicNumber: 6, color: '#808080', position: [0, 0, 0], radius: 0.77 },
    { element: 'H', elementName: '氢', atomicNumber: 1, color: '#ffffff', position: [0.629, 0.629, 0.629], radius: 0.31 },
    { element: 'H', elementName: '氢', atomicNumber: 1, color: '#ffffff', position: [-0.629, -0.629, 0.629], radius: 0.31 },
    { element: 'H', elementName: '氢', atomicNumber: 1, color: '#ffffff', position: [0.629, -0.629, -0.629], radius: 0.31 },
    { element: 'H', elementName: '氢', atomicNumber: 1, color: '#ffffff', position: [-0.629, 0.629, -0.629], radius: 0.31 }
  ],
  bonds: [
    { atomIndex1: 0, atomIndex2: 1, bondOrder: 1 },
    { atomIndex1: 0, atomIndex2: 2, bondOrder: 1 },
    { atomIndex1: 0, atomIndex2: 3, bondOrder: 1 },
    { atomIndex1: 0, atomIndex2: 4, bondOrder: 1 }
  ]
};

const BENZENE_MOLECULE: Molecule = {
  id: 'c6h6',
  name: '苯',
  formula: 'C₆H₆',
  atoms: [
    { element: 'C', elementName: '碳', atomicNumber: 6, color: '#808080', position: [1.39, 0, 0], radius: 0.77 },
    { element: 'C', elementName: '碳', atomicNumber: 6, color: '#808080', position: [0.695, 1.203, 0], radius: 0.77 },
    { element: 'C', elementName: '碳', atomicNumber: 6, color: '#808080', position: [-0.695, 1.203, 0], radius: 0.77 },
    { element: 'C', elementName: '碳', atomicNumber: 6, color: '#808080', position: [-1.39, 0, 0], radius: 0.77 },
    { element: 'C', elementName: '碳', atomicNumber: 6, color: '#808080', position: [-0.695, -1.203, 0], radius: 0.77 },
    { element: 'C', elementName: '碳', atomicNumber: 6, color: '#808080', position: [0.695, -1.203, 0], radius: 0.77 },
    { element: 'H', elementName: '氢', atomicNumber: 1, color: '#ffffff', position: [2.47, 0, 0], radius: 0.31 },
    { element: 'H', elementName: '氢', atomicNumber: 1, color: '#ffffff', position: [1.235, 2.137, 0], radius: 0.31 },
    { element: 'H', elementName: '氢', atomicNumber: 1, color: '#ffffff', position: [-1.235, 2.137, 0], radius: 0.31 },
    { element: 'H', elementName: '氢', atomicNumber: 1, color: '#ffffff', position: [-2.47, 0, 0], radius: 0.31 },
    { element: 'H', elementName: '氢', atomicNumber: 1, color: '#ffffff', position: [-1.235, -2.137, 0], radius: 0.31 },
    { element: 'H', elementName: '氢', atomicNumber: 1, color: '#ffffff', position: [1.235, -2.137, 0], radius: 0.31 }
  ],
  bonds: [
    { atomIndex1: 0, atomIndex2: 1, bondOrder: 1.5 },
    { atomIndex1: 1, atomIndex2: 2, bondOrder: 1.5 },
    { atomIndex1: 2, atomIndex2: 3, bondOrder: 1.5 },
    { atomIndex1: 3, atomIndex2: 4, bondOrder: 1.5 },
    { atomIndex1: 4, atomIndex2: 5, bondOrder: 1.5 },
    { atomIndex1: 5, atomIndex2: 0, bondOrder: 1.5 },
    { atomIndex1: 0, atomIndex2: 6, bondOrder: 1 },
    { atomIndex1: 1, atomIndex2: 7, bondOrder: 1 },
    { atomIndex1: 2, atomIndex2: 8, bondOrder: 1 },
    { atomIndex1: 3, atomIndex2: 9, bondOrder: 1 },
    { atomIndex1: 4, atomIndex2: 10, bondOrder: 1 },
    { atomIndex1: 5, atomIndex2: 11, bondOrder: 1 }
  ]
};

const MOLECULES: Molecule[] = [WATER_MOLECULE, METHANE_MOLECULE, BENZENE_MOLECULE];

export function getMoleculeList(): Molecule[] {
  return MOLECULES;
}

export function getMoleculeById(id: string): Molecule | undefined {
  return MOLECULES.find((m) => m.id === id);
}
