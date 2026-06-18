export interface AtomData {
  id: string;
  element: ElementSymbol;
  position: [number, number, number];
  layerId: string;
}

export interface BondData {
  id: string;
  atom1Id: string;
  atom2Id: string;
}

export interface LayerData {
  id: string;
  name: string;
  description: string;
  atomIds: string[];
  bondIds: string[];
  peelRadius: number;
  peelAngle: [number, number];
}

export interface MoleculeData {
  id: string;
  name: string;
  formula: string;
  description: string;
  atoms: AtomData[];
  bonds: BondData[];
  layers: LayerData[];
  center: [number, number, number];
}

export type ElementSymbol = 'C' | 'H' | 'O' | 'N' | 'P' | 'S';

export const CPK_COLORS: Record<ElementSymbol, string> = {
  C: '#909090',
  H: '#ffffff',
  O: '#ff3030',
  N: '#3050f8',
  P: '#ff8000',
  S: '#ffff30',
};

export const ATOMIC_RADII: Record<ElementSymbol, number> = {
  C: 0.7,
  H: 0.4,
  O: 0.65,
  N: 0.65,
  P: 0.9,
  S: 0.8,
};

export const ELEMENT_NAMES: Record<ElementSymbol, string> = {
  C: '碳',
  H: '氢',
  O: '氧',
  N: '氮',
  P: '磷',
  S: '硫',
};

const waterAtoms: AtomData[] = [
  { id: 'o1', element: 'O', position: [0, 0, 0], layerId: 'oxygen-layer' },
  { id: 'h1', element: 'H', position: [0.958, 0, 0], layerId: 'hydrogen-layer' },
  { id: 'h2', element: 'H', position: [-0.24, 0.928, 0], layerId: 'hydrogen-layer' },
];

const waterBonds: BondData[] = [
  { id: 'b1', atom1Id: 'o1', atom2Id: 'h1' },
  { id: 'b2', atom1Id: 'o1', atom2Id: 'h2' },
];

const waterLayers: LayerData[] = [
  {
    id: 'oxygen-layer',
    name: '氧原子层',
    description: '中心氧原子',
    atomIds: ['o1'],
    bondIds: [],
    peelRadius: 2.5,
    peelAngle: [0, 0],
  },
  {
    id: 'hydrogen-layer',
    name: '氢原子层',
    description: '两个氢原子',
    atomIds: ['h1', 'h2'],
    bondIds: ['b1', 'b2'],
    peelRadius: 3,
    peelAngle: [0, Math.PI / 2],
  },
];

const benzeneAtoms: AtomData[] = [];
const benzeneBonds: BondData[] = [];
const benzeneRadius = 1.39;

for (let i = 0; i < 6; i++) {
  const angle = (i * Math.PI) / 3;
  const x = Math.cos(angle) * benzeneRadius;
  const y = Math.sin(angle) * benzeneRadius;
  benzeneAtoms.push({
    id: `c${i + 1}`,
    element: 'C',
    position: [x, y, 0],
    layerId: 'carbon-ring',
  });

  const hX = Math.cos(angle) * (benzeneRadius + 1.09);
  const hY = Math.sin(angle) * (benzeneRadius + 1.09);
  benzeneAtoms.push({
    id: `h${i + 1}`,
    element: 'H',
    position: [hX, hY, 0],
    layerId: 'hydrogen-ring',
  });

  benzeneBonds.push({
    id: `cc${i + 1}`,
    atom1Id: `c${i + 1}`,
    atom2Id: `c${((i + 1) % 6) + 1}`,
  });

  benzeneBonds.push({
    id: `ch${i + 1}`,
    atom1Id: `c${i + 1}`,
    atom2Id: `h${i + 1}`,
  });
}

const benzeneLayers: LayerData[] = [
  {
    id: 'carbon-ring',
    name: '环状碳骨架层',
    description: '六个碳原子组成的芳香环',
    atomIds: benzeneAtoms.filter(a => a.element === 'C').map(a => a.id),
    bondIds: benzeneBonds.filter(b => b.atom1Id.startsWith('c') && b.atom2Id.startsWith('c')).map(b => b.id),
    peelRadius: 3.5,
    peelAngle: [0, 0],
  },
  {
    id: 'hydrogen-ring',
    name: '氢原子外层',
    description: '六个氢原子',
    atomIds: benzeneAtoms.filter(a => a.element === 'H').map(a => a.id),
    bondIds: benzeneBonds.filter(b => b.atom2Id.startsWith('h')).map(b => b.id),
    peelRadius: 4.5,
    peelAngle: [0, 0],
  },
];

const glucoseAtoms: AtomData[] = [];
const glucoseBonds: BondData[] = [];

const ringPositions: [number, number, number][] = [
  [0, 1.5, 0],
  [1.3, 0.7, 0],
  [1.3, -0.7, 0],
  [0, -1.5, 0],
  [-1.3, -0.7, 0],
  [-1.3, 0.7, 0],
];

for (let i = 0; i < 5; i++) {
  glucoseAtoms.push({
    id: `c${i + 1}`,
    element: 'C',
    position: ringPositions[i],
    layerId: 'pyranose-ring',
  });
}
glucoseAtoms.push({
  id: 'o6',
  element: 'O',
  position: ringPositions[5],
  layerId: 'pyranose-ring',
});

for (let i = 0; i < 5; i++) {
  const next = (i + 1) % 6;
  glucoseBonds.push({
    id: `ring-bond-${i + 1}`,
    atom1Id: i < 4 ? `c${i + 1}` : 'o6',
    atom2Id: next < 5 ? `c${next + 1}` : 'o6',
  });
}
glucoseBonds.push({
  id: 'ring-bond-6',
  atom1Id: 'o6',
  atom2Id: 'c1',
});

const hydroxylPositions: { carbonId: string; offset: [number, number, number] }[] = [
  { carbonId: 'c1', offset: [0.5, 2.2, 0.3] },
  { carbonId: 'c2', offset: [2.2, 1.2, -0.3] },
  { carbonId: 'c3', offset: [2.2, -1.2, 0.3] },
  { carbonId: 'c4', offset: [0.5, -2.2, -0.3] },
  { carbonId: 'c5', offset: [-2.2, -1.2, 0.3] },
];

let ohIndex = 1;
hydroxylPositions.forEach(({ carbonId, offset }, idx) => {
  const carbon = glucoseAtoms.find(a => a.id === carbonId)!;
  const oPos: [number, number, number] = [
    carbon.position[0] + offset[0],
    carbon.position[1] + offset[1],
    carbon.position[2] + offset[2],
  ];
  const oId = `oh-o${ohIndex}`;
  glucoseAtoms.push({
    id: oId,
    element: 'O',
    position: oPos,
    layerId: 'hydroxyl-groups',
  });
  glucoseBonds.push({
    id: `oh-bond-c-o-${ohIndex}`,
    atom1Id: carbonId,
    atom2Id: oId,
  });

  const hPos: [number, number, number] = [
    oPos[0] + offset[0] * 0.4,
    oPos[1] + offset[1] * 0.4,
    oPos[2] + offset[2] * 0.4 + 0.3,
  ];
  const hId = `oh-h${ohIndex}`;
  glucoseAtoms.push({
    id: hId,
    element: 'H',
    position: hPos,
    layerId: 'hydroxyl-hydrogens',
  });
  glucoseBonds.push({
    id: `oh-bond-o-h-${ohIndex}`,
    atom1Id: oId,
    atom2Id: hId,
  });

  const ch2Id = `ch2-h${idx + 1}`;
  const ch2Pos: [number, number, number] = [
    carbon.position[0] - offset[0] * 0.3,
    carbon.position[1] - offset[1] * 0.3,
    carbon.position[2] - offset[2] * 0.3 + 0.5,
  ];
  glucoseAtoms.push({
    id: ch2Id,
    element: 'H',
    position: ch2Pos,
    layerId: 'ring-hydrogens',
  });
  glucoseBonds.push({
    id: `ch2-bond-${idx + 1}`,
    atom1Id: carbonId,
    atom2Id: ch2Id,
  });

  ohIndex++;
});

const ch2ohOId = 'ch2oh-o';
const ch2ohCId = 'c6';
const ch2ohCPos: [number, number, number] = [-2.5, 1.5, 0.3];
glucoseAtoms.push({
  id: ch2ohCId,
  element: 'C',
  position: ch2ohCPos,
  layerId: 'side-chain',
});
glucoseBonds.push({
  id: 'c5-c6-bond',
  atom1Id: 'c5',
  atom2Id: ch2ohCId,
});

const ch2ohOPos: [number, number, number] = [-3.8, 1.8, 0.5];
glucoseAtoms.push({
  id: ch2ohOId,
  element: 'O',
  position: ch2ohOPos,
  layerId: 'hydroxyl-groups',
});
glucoseBonds.push({
  id: 'c6-o-bond',
  atom1Id: ch2ohCId,
  atom2Id: ch2ohOId,
});

const ch2ohHId = 'ch2oh-h1';
glucoseAtoms.push({
  id: ch2ohHId,
  element: 'H',
  position: [-4.3, 2.5, 0.7] as [number, number, number],
  layerId: 'hydroxyl-hydrogens',
});
glucoseBonds.push({
  id: 'ch2oh-o-h-bond',
  atom1Id: ch2ohOId,
  atom2Id: ch2ohHId,
});

const ch2ohH2Id = 'ch2oh-h2';
glucoseAtoms.push({
  id: ch2ohH2Id,
  element: 'H',
  position: [-2.2, 2.5, -0.2] as [number, number, number],
  layerId: 'ring-hydrogens',
});
glucoseBonds.push({
  id: 'ch2oh-c-h2-bond',
  atom1Id: ch2ohCId,
  atom2Id: ch2ohH2Id,
});

const glucoseLayers: LayerData[] = [
  {
    id: 'pyranose-ring',
    name: '吡喃环骨架层',
    description: '5个碳原子和1个氧原子组成的六元环',
    atomIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'o6'],
    bondIds: glucoseBonds.filter(b => b.id.startsWith('ring-bond')).map(b => b.id),
    peelRadius: 4,
    peelAngle: [0, 0],
  },
  {
    id: 'side-chain',
    name: '侧链碳层',
    description: 'CH2OH侧链的碳原子',
    atomIds: [ch2ohCId],
    bondIds: ['c5-c6-bond'],
    peelRadius: 4.5,
    peelAngle: [Math.PI, 0],
  },
  {
    id: 'hydroxyl-groups',
    name: '羟基氧层',
    description: '所有羟基的氧原子',
    atomIds: glucoseAtoms.filter(a => a.element === 'O' && a.id !== 'o6').map(a => a.id),
    bondIds: glucoseBonds.filter(b => 
      (b.atom1Id.startsWith('oh-o') || b.atom2Id.startsWith('oh-o')) && 
      !b.id.startsWith('oh-bond-o-h')
    ).map(b => b.id).concat(['c6-o-bond']),
    peelRadius: 5.5,
    peelAngle: [0, Math.PI / 4],
  },
  {
    id: 'ring-hydrogens',
    name: '环上氢层',
    description: '直接连接在环上的氢原子',
    atomIds: glucoseAtoms.filter(a => a.id.startsWith('ch2-h')).map(a => a.id).concat([ch2ohH2Id]),
    bondIds: glucoseBonds.filter(b => b.id.startsWith('ch2-bond')).map(b => b.id).concat(['ch2oh-c-h2-bond']),
    peelRadius: 6,
    peelAngle: [0, Math.PI / 2],
  },
  {
    id: 'hydroxyl-hydrogens',
    name: '羟基氢层',
    description: '羟基上的氢原子',
    atomIds: glucoseAtoms.filter(a => a.id.startsWith('oh-h')).map(a => a.id).concat([ch2ohHId]),
    bondIds: glucoseBonds.filter(b => b.id.startsWith('oh-bond-o-h')).map(b => b.id).concat(['ch2oh-o-h-bond']),
    peelRadius: 7,
    peelAngle: [0, Math.PI],
  },
];

const dnaBaseAtoms: AtomData[] = [];
const dnaBaseBonds: BondData[] = [];

const adenineAtoms: AtomData[] = [];
const adenineBonds: BondData[] = [];

const adenineRing1: [number, number, number][] = [
  [0, 1.5, 0],
  [1.3, 0.7, 0],
  [1.3, -0.7, 0],
  [0, -1.5, 0],
  [-1.3, -0.7, 0],
  [-1.3, 0.7, 0],
];

const adenineElements: ElementSymbol[] = ['N', 'C', 'N', 'C', 'C', 'C'];

for (let i = 0; i < 6; i++) {
  adenineAtoms.push({
    id: `a-pyrimidine-${i}`,
    element: adenineElements[i],
    position: [adenineRing1[i][0] - 2, adenineRing1[i][1], 0],
    layerId: 'adenine-pyrimidine',
  });
}

for (let i = 0; i < 6; i++) {
  adenineBonds.push({
    id: `a-pyrimidine-bond-${i}`,
    atom1Id: `a-pyrimidine-${i}`,
    atom2Id: `a-pyrimidine-${(i + 1) % 6}`,
  });
}

const imidazoleOffsetX = -2;
const imidazolePos: [number, number, number][] = [
  [-1.3 + imidazoleOffsetX, -0.7, 0],
  [-2.6 + imidazoleOffsetX, -1.2, 0],
  [-3.2 + imidazoleOffsetX, 0, 0],
  [-2.6 + imidazoleOffsetX, 1.2, 0],
  [-1.3 + imidazoleOffsetX, 0.7, 0],
];
const imidazoleElements: ElementSymbol[] = ['C', 'N', 'C', 'N', 'C'];

for (let i = 0; i < 5; i++) {
  adenineAtoms.push({
    id: `a-imidazole-${i}`,
    element: imidazoleElements[i],
    position: imidazolePos[i],
    layerId: 'adenine-imidazole',
  });
}

for (let i = 0; i < 5; i++) {
  adenineBonds.push({
    id: `a-imidazole-bond-${i}`,
    atom1Id: `a-imidazole-${i}`,
    atom2Id: `a-imidazole-${(i + 1) % 5}`,
  });
}

adenineBonds.push({
  id: 'a-fusion-bond-1',
  atom1Id: 'a-pyrimidine-4',
  atom2Id: 'a-imidazole-0',
});
adenineBonds.push({
  id: 'a-fusion-bond-2',
  atom1Id: 'a-pyrimidine-5',
  atom2Id: 'a-imidazole-4',
});

const aminoH1Pos: [number, number, number] = [1.3 - 2, 2.0, 0.4];
const aminoH2Pos: [number, number, number] = [1.3 - 2, 2.0, -0.4];
adenineAtoms.push({
  id: 'a-amino-h1',
  element: 'H',
  position: aminoH1Pos,
  layerId: 'adenine-hydrogens',
});
adenineAtoms.push({
  id: 'a-amino-h2',
  element: 'H',
  position: aminoH2Pos,
  layerId: 'adenine-hydrogens',
});
adenineBonds.push({
  id: 'a-amino-bond-h1',
  atom1Id: 'a-pyrimidine-0',
  atom2Id: 'a-amino-h1',
});
adenineBonds.push({
  id: 'a-amino-bond-h2',
  atom1Id: 'a-pyrimidine-0',
  atom2Id: 'a-amino-h2',
});

const imidazoleHPos: [number, number, number] = [-4.2, 0, 0];
adenineAtoms.push({
  id: 'a-imidazole-h',
  element: 'H',
  position: imidazoleHPos,
  layerId: 'adenine-hydrogens',
});
adenineBonds.push({
  id: 'a-imidazole-h-bond',
  atom1Id: 'a-imidazole-2',
  atom2Id: 'a-imidazole-h',
});

dnaBaseAtoms.push(...adenineAtoms);
dnaBaseBonds.push(...adenineBonds);

const thymineAtoms: AtomData[] = [];
const thymineBonds: BondData[] = [];

const thymineRing: [number, number, number][] = [
  [0, 1.5, 0],
  [1.3, 0.7, 0],
  [1.3, -0.7, 0],
  [0, -1.5, 0],
  [-1.3, -0.7, 0],
  [-1.3, 0.7, 0],
];
const thymineElements: ElementSymbol[] = ['N', 'C', 'N', 'C', 'C', 'C'];

for (let i = 0; i < 6; i++) {
  thymineAtoms.push({
    id: `t-pyrimidine-${i}`,
    element: thymineElements[i],
    position: [thymineRing[i][0] + 4, thymineRing[i][1], 0],
    layerId: 'thymine-pyrimidine',
  });
}

for (let i = 0; i < 6; i++) {
  thymineBonds.push({
    id: `t-pyrimidine-bond-${i}`,
    atom1Id: `t-pyrimidine-${i}`,
    atom2Id: `t-pyrimidine-${(i + 1) % 6}`,
  });
}

const o2Pos: [number, number, number] = [2.6 + 4, 1.4, 0];
thymineAtoms.push({
  id: 't-o2',
  element: 'O',
  position: o2Pos,
  layerId: 'thymine-oxygen',
});
thymineBonds.push({
  id: 't-o2-bond',
  atom1Id: 't-pyrimidine-1',
  atom2Id: 't-o2',
});

const o4Pos: [number, number, number] = [2.6 + 4, -1.4, 0];
thymineAtoms.push({
  id: 't-o4',
  element: 'O',
  position: o4Pos,
  layerId: 'thymine-oxygen',
});
thymineBonds.push({
  id: 't-o4-bond',
  atom1Id: 't-pyrimidine-3',
  atom2Id: 't-o4',
});

const methylPos: [number, number, number] = [-2.6 + 4, -1.0, 0];
thymineAtoms.push({
  id: 't-methyl-c',
  element: 'C',
  position: methylPos,
  layerId: 'thymine-methyl',
});
thymineBonds.push({
  id: 't-methyl-bond',
  atom1Id: 't-pyrimidine-4',
  atom2Id: 't-methyl-c',
});

const methylH1Pos: [number, number, number] = [-3.2 + 4, -1.8, 0.4];
const methylH2Pos: [number, number, number] = [-3.2 + 4, -1.8, -0.4];
const methylH3Pos: [number, number, number] = [-3.0 + 4, -0.2, 0];
thymineAtoms.push(
  { id: 't-methyl-h1', element: 'H', position: methylH1Pos, layerId: 'thymine-hydrogens' },
  { id: 't-methyl-h2', element: 'H', position: methylH2Pos, layerId: 'thymine-hydrogens' },
  { id: 't-methyl-h3', element: 'H', position: methylH3Pos, layerId: 'thymine-hydrogens' },
);
thymineBonds.push(
  { id: 't-methyl-h-bond-1', atom1Id: 't-methyl-c', atom2Id: 't-methyl-h1' },
  { id: 't-methyl-h-bond-2', atom1Id: 't-methyl-c', atom2Id: 't-methyl-h2' },
  { id: 't-methyl-h-bond-3', atom1Id: 't-methyl-c', atom2Id: 't-methyl-h3' },
);

const n1HPos: [number, number, number] = [0 + 4, 2.4, 0];
thymineAtoms.push({
  id: 't-n1-h',
  element: 'H',
  position: n1HPos,
  layerId: 'thymine-hydrogens',
});
thymineBonds.push({
  id: 't-n1-h-bond',
  atom1Id: 't-pyrimidine-0',
  atom2Id: 't-n1-h',
});

const n3HPos: [number, number, number] = [0 + 4, -2.4, 0];
thymineAtoms.push({
  id: 't-n3-h',
  element: 'H',
  position: n3HPos,
  layerId: 'thymine-hydrogens',
});
thymineBonds.push({
  id: 't-n3-h-bond',
  atom1Id: 't-pyrimidine-2',
  atom2Id: 't-n3-h',
});

dnaBaseAtoms.push(...thymineAtoms);
dnaBaseBonds.push(...thymineBonds);

const dnaBaseLayers: LayerData[] = [
  {
    id: 'adenine-pyrimidine',
    name: '腺嘌呤嘧啶环层',
    description: '腺嘌呤的六元嘧啶环',
    atomIds: adenineAtoms.filter(a => a.id.startsWith('a-pyrimidine')).map(a => a.id),
    bondIds: adenineBonds.filter(b => b.id.startsWith('a-pyrimidine-bond')).map(b => b.id),
    peelRadius: 3.5,
    peelAngle: [Math.PI, 0],
  },
  {
    id: 'adenine-imidazole',
    name: '腺嘌呤咪唑环层',
    description: '腺嘌呤的五元咪唑环',
    atomIds: adenineAtoms.filter(a => a.id.startsWith('a-imidazole-')).map(a => a.id),
    bondIds: adenineBonds.filter(b => b.id.startsWith('a-imidazole-bond')).map(b => b.id).concat(['a-fusion-bond-1', 'a-fusion-bond-2']),
    peelRadius: 4.5,
    peelAngle: [Math.PI, Math.PI / 4],
  },
  {
    id: 'thymine-pyrimidine',
    name: '胸腺嘧啶嘧啶环层',
    description: '胸腺嘧啶的六元嘧啶环',
    atomIds: thymineAtoms.filter(a => a.id.startsWith('t-pyrimidine')).map(a => a.id),
    bondIds: thymineBonds.filter(b => b.id.startsWith('t-pyrimidine-bond')).map(b => b.id),
    peelRadius: 3.5,
    peelAngle: [0, 0],
  },
  {
    id: 'thymine-oxygen',
    name: '胸腺嘧啶氧层',
    description: '胸腺嘧啶的两个氧原子',
    atomIds: ['t-o2', 't-o4'],
    bondIds: ['t-o2-bond', 't-o4-bond'],
    peelRadius: 5,
    peelAngle: [0, Math.PI / 2],
  },
  {
    id: 'thymine-methyl',
    name: '胸腺嘧啶甲基层',
    description: '胸腺嘧啶的甲基碳',
    atomIds: ['t-methyl-c'],
    bondIds: ['t-methyl-bond'],
    peelRadius: 5,
    peelAngle: [0, -Math.PI / 2],
  },
  {
    id: 'adenine-hydrogens',
    name: '腺嘌呤氢层',
    description: '腺嘌呤的所有氢原子',
    atomIds: adenineAtoms.filter(a => a.element === 'H').map(a => a.id),
    bondIds: adenineBonds.filter(b => {
      const a1 = adenineAtoms.find(a => a.id === b.atom1Id);
      const a2 = adenineAtoms.find(a => a.id === b.atom2Id);
      return (a1?.element === 'H' || a2?.element === 'H');
    }).map(b => b.id),
    peelRadius: 6,
    peelAngle: [Math.PI, Math.PI / 2],
  },
  {
    id: 'thymine-hydrogens',
    name: '胸腺嘧啶氢层',
    description: '胸腺嘧啶的所有氢原子',
    atomIds: thymineAtoms.filter(a => a.element === 'H').map(a => a.id),
    bondIds: thymineBonds.filter(b => {
      const a1 = thymineAtoms.find(a => a.id === b.atom1Id);
      const a2 = thymineAtoms.find(a => a.id === b.atom2Id);
      return (a1?.element === 'H' || a2?.element === 'H');
    }).map(b => b.id),
    peelRadius: 6,
    peelAngle: [0, Math.PI],
  },
];

export const MOLECULES: MoleculeData[] = [
  {
    id: 'water',
    name: '水分子',
    formula: 'H₂O',
    description: '水分子由一个氧原子和两个氢原子组成，呈V形结构',
    atoms: waterAtoms,
    bonds: waterBonds,
    layers: waterLayers,
    center: [0, 0, 0],
  },
  {
    id: 'benzene',
    name: '苯环',
    formula: 'C₆H₆',
    description: '苯是最简单的芳香烃，由六个碳原子组成平面六边形环',
    atoms: benzeneAtoms,
    bonds: benzeneBonds,
    layers: benzeneLayers,
    center: [0, 0, 0],
  },
  {
    id: 'glucose',
    name: '葡萄糖',
    formula: 'C₆H₁₂O₆',
    description: '葡萄糖是一种单糖，是生物体内最重要的能量来源',
    atoms: glucoseAtoms,
    bonds: glucoseBonds,
    layers: glucoseLayers,
    center: [0, 0, 0],
  },
  {
    id: 'dna-base',
    name: 'DNA碱基对',
    formula: 'A-T',
    description: '腺嘌呤(A)与胸腺嘧啶(T)通过氢键配对形成DNA碱基对',
    atoms: dnaBaseAtoms,
    bonds: dnaBaseBonds,
    layers: dnaBaseLayers,
    center: [1, 0, 0],
  },
];

export function getAtomById(molecule: MoleculeData, atomId: string): AtomData | undefined {
  return molecule.atoms.find(a => a.id === atomId);
}

export function getBondById(molecule: MoleculeData, bondId: string): BondData | undefined {
  return molecule.bonds.find(b => b.id === bondId);
}

export function getLayerById(molecule: MoleculeData, layerId: string): LayerData | undefined {
  return molecule.layers.find(l => l.id === layerId);
}

export function getLayerByAtomId(molecule: MoleculeData, atomId: string): LayerData | undefined {
  return molecule.layers.find(l => l.atomIds.includes(atomId));
}

export function calculateBondLength(atom1: AtomData, atom2: AtomData): number {
  const dx = atom1.position[0] - atom2.position[0];
  const dy = atom1.position[1] - atom2.position[1];
  const dz = atom1.position[2] - atom2.position[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function getAdjacentAtoms(molecule: MoleculeData, atomId: string): AtomData[] {
  const adjacent: AtomData[] = [];
  for (const bond of molecule.bonds) {
    if (bond.atom1Id === atomId) {
      const atom = getAtomById(molecule, bond.atom2Id);
      if (atom) adjacent.push(atom);
    } else if (bond.atom2Id === atomId) {
      const atom = getAtomById(molecule, bond.atom1Id);
      if (atom) adjacent.push(atom);
    }
  }
  return adjacent;
}

export function calculateAverageBondLength(molecule: MoleculeData, layerId: string): number {
  const layer = getLayerById(molecule, layerId);
  if (!layer || layer.bondIds.length === 0) return 0;
  
  let totalLength = 0;
  let count = 0;
  
  for (const bondId of layer.bondIds) {
    const bond = getBondById(molecule, bondId);
    if (bond) {
      const a1 = getAtomById(molecule, bond.atom1Id);
      const a2 = getAtomById(molecule, bond.atom2Id);
      if (a1 && a2) {
        totalLength += calculateBondLength(a1, a2);
        count++;
      }
    }
  }
  
  return count > 0 ? totalLength / count : 0;
}
